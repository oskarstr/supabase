import { setTimeout as sleep } from 'node:timers/promises'

import { prepareSupabaseRuntime } from './provisioning/runtime.js'

interface OrchestratorExecutionResult {
  stdout?: string
  stderr?: string
  duration_ms?: number
}

interface OrchestratorResponse {
  status: string
  result?: OrchestratorExecutionResult
  error?: string
}

export interface ProvisionContext {
  projectId: number
  ref: string
  name: string
  organizationSlug: string
  cloudProvider: string
  region: string
  databasePassword: string
  projectRoot: string
  excludedServices: string[]
  portSlot: number
}

export interface DestroyContext {
  ref: string
  name: string
  organizationSlug: string
  projectRoot: string
}

const parseDelay = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

const PROVISION_DELAY_MS = parseDelay(process.env.PROVISIONING_DELAY_MS, 1_000)
const DESTRUCTION_DELAY_MS = parseDelay(process.env.DESTRUCTION_DELAY_MS, 1_000)
const ORCHESTRATOR_URL = process.env.PLATFORM_ORCHESTRATOR_URL?.trim() || ''
const ORCHESTRATOR_TOKEN = process.env.PLATFORM_ORCHESTRATOR_TOKEN?.trim()
const ORCHESTRATOR_TIMEOUT_MS = parseDelay(process.env.PLATFORM_ORCHESTRATOR_TIMEOUT_MS, 15 * 60_000)

const renderTemplate = (template: string, context: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_match, key: string) => context[key] ?? '')

const runCommand = async (
  commandTemplate: string,
  context: Record<string, string>,
  options: { cwd?: string } = {}
) => {
  const command = renderTemplate(commandTemplate, context)
  const { spawn } = await import('node:child_process')

  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, {
      stdio: 'inherit',
      shell: true,
      cwd: options.cwd,
      env: {
        ...process.env,
        ...context,
      },
    })

    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Command '${command}' exited with code ${code}`))
    })
  })
}

const useOrchestrator = () => {
  if (ORCHESTRATOR_URL.length === 0) {
    return null
  }

  const baseUrl = ORCHESTRATOR_URL.replace(/\/+$/, '')

  const doFetch = async (path: string, init: { method: string; body?: string }) => {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    }
    if (ORCHESTRATOR_TOKEN) {
      headers['authorization'] = `Bearer ${ORCHESTRATOR_TOKEN}`
    }

    const controller = ORCHESTRATOR_TIMEOUT_MS > 0 ? new AbortController() : null
    const timeoutId = controller
      ? setTimeout(() => controller.abort(), ORCHESTRATOR_TIMEOUT_MS)
      : null

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers,
        signal: controller?.signal,
      } as RequestInit)

      if (!response.ok) {
        const message = await response.text()
        throw new Error(
          `orchestrator request failed (${response.status} ${response.statusText}): ${message}`
        )
      }

      if (response.headers.get('content-type')?.includes('application/json')) {
        return response.json()
      }

      return null
    } catch (error) {
      if (controller && error instanceof Error && error.name === 'AbortError') {
        throw new Error(
          `orchestrator request timed out after ${ORCHESTRATOR_TIMEOUT_MS}ms (${path})`
        )
      }
      throw error
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }

  return {
    provision: (payload: Record<string, unknown>) =>
      doFetch('/v1/projects/provision', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    stop: (payload: Record<string, unknown>) =>
      doFetch('/v1/projects/stop', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    destroy: (payload: Record<string, unknown>) =>
      doFetch('/v1/projects/destroy', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  }
}

export async function provisionProjectStack(context: ProvisionContext) {
  const logEnabled = process.env.PLATFORM_API_LOG_PROVISIONING === 'true'
  if (logEnabled) {
    console.log('[provisioning] start', context)
  }

  await prepareSupabaseRuntime({
    projectRef: context.ref,
    projectName: context.name,
    projectRoot: context.projectRoot,
    databasePassword: context.databasePassword,
    portSlot: context.portSlot,
  })

  if (process.env.FAIL_PROVISIONING === 'true') {
    await sleep(PROVISION_DELAY_MS)
    throw new Error('Provisioning failed due to FAIL_PROVISIONING flag')
  }

  const explicitNetwork = process.env.PLATFORM_DOCKER_NETWORK?.trim()
  const composeProject = process.env.COMPOSE_PROJECT_NAME?.trim()
  const networkId =
    explicitNetwork && explicitNetwork.length > 0
      ? explicitNetwork
      : composeProject && composeProject.length > 0
        ? `${composeProject}_default`
        : 'supabase_default'

  const orchestrator = useOrchestrator()
  if (orchestrator) {
    const response: OrchestratorResponse | null = await orchestrator.provision({
      project_id: context.projectId,
      project_ref: context.ref,
      project_name: context.name,
      organization_slug: context.organizationSlug,
      project_root: context.projectRoot,
      cloud_provider: context.cloudProvider,
      region: context.region,
      database_password: context.databasePassword,
      excluded_services: context.excludedServices,
      network_id: networkId,
      ignore_health_check: true,
    })
    if (logEnabled && response?.result) {
      console.log('[provisioning] orchestrator result', {
        ref: context.ref,
        status: response.status,
        duration_ms: response.result.duration_ms,
      })
    }
    if (response?.status !== 'completed') {
      throw new Error(
        `orchestrator did not return a completed status (received: ${response?.status ?? 'unknown'})`
      )
    }
  } else if (process.env.PLATFORM_API_PROVISION_CMD) {
    const provisionCommand = process.env.PLATFORM_API_PROVISION_CMD
    await runCommand(
      provisionCommand,
      {
        PROJECT_REF: context.ref,
        PROJECT_NAME: context.name,
        PROJECT_ORG: context.organizationSlug,
        PROJECT_CLOUD_PROVIDER: context.cloudProvider,
        PROJECT_REGION: context.region,
        PROJECT_DB_PASSWORD: context.databasePassword,
        PROJECT_ROOT: context.projectRoot,
      },
      { cwd: context.projectRoot }
    )
  } else {
    throw new Error(
      'Runtime orchestrator not configured. Set PLATFORM_ORCHESTRATOR_URL or PLATFORM_API_PROVISION_CMD.'
    )
  }

  if (logEnabled) {
    console.log('[provisioning] complete', context.ref)
  }
}

export async function destroyProjectStack(context: DestroyContext) {
  const logEnabled = process.env.PLATFORM_API_LOG_PROVISIONING === 'true'
  if (logEnabled) {
    console.log('[provisioning] destroy start', context)
  }

  if (process.env.FAIL_DESTRUCTION === 'true') {
    await sleep(DESTRUCTION_DELAY_MS)
    throw new Error('Destruction failed due to FAIL_DESTRUCTION flag')
  }

  const orchestrator = useOrchestrator()
  if (orchestrator) {
    const response: OrchestratorResponse | null = await orchestrator.destroy({
      project_ref: context.ref,
      project_root: context.projectRoot,
      organization_slug: context.organizationSlug,
    })
    if (logEnabled && response?.result) {
      console.log('[provisioning] orchestrator destroy result', {
        ref: context.ref,
        status: response.status,
        duration_ms: response.result.duration_ms,
      })
    }
    if (response?.status !== 'completed') {
      throw new Error(
        `orchestrator did not return a completed status (received: ${response?.status ?? 'unknown'})`
      )
    }
  } else if (process.env.PLATFORM_API_DESTROY_CMD) {
    const destroyCommand = process.env.PLATFORM_API_DESTROY_CMD
    await runCommand(
      destroyCommand,
      {
        PROJECT_REF: context.ref,
        PROJECT_NAME: context.name,
        PROJECT_ORG: context.organizationSlug,
        PROJECT_ROOT: context.projectRoot,
      },
      { cwd: context.projectRoot }
    )
  } else {
    throw new Error(
      'Runtime orchestrator not configured. Set PLATFORM_ORCHESTRATOR_URL or PLATFORM_API_DESTROY_CMD.'
    )
  }

  if (logEnabled) {
    console.log('[provisioning] destroy complete', context.ref)
  }
}

export interface StopContext {
  projectRoot: string
  projectRef: string
}

export async function stopProjectStack(context: StopContext) {
  const logEnabled = process.env.PLATFORM_API_LOG_PROVISIONING === 'true'
  if (logEnabled) {
    console.log('[provisioning] pause start', context)
  }

  const orchestrator = useOrchestrator()
  if (orchestrator) {
    const response: OrchestratorResponse | null = await orchestrator.stop({
      project_ref: context.projectRef,
      project_root: context.projectRoot,
    })
    if (logEnabled && response?.result) {
      console.log('[provisioning] orchestrator stop result', {
        ref: context.projectRef,
        status: response.status,
        duration_ms: response.result.duration_ms,
      })
    }
    if (response?.status !== 'completed') {
      throw new Error(
        `orchestrator did not return a completed status (received: ${response?.status ?? 'unknown'})`
      )
    }
  } else {
    throw new Error('Runtime orchestrator not configured. Set PLATFORM_ORCHESTRATOR_URL.')
  }

  if (logEnabled) {
    console.log('[provisioning] pause complete')
  }
}
