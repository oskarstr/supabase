import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'

import { prepareSupabaseRuntime } from './provisioning/runtime.js'

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
const SUPABASE_BIN = process.env.SUPABASE_CLI_PATH?.trim() || 'supabase'
const ORCHESTRATOR_URL = process.env.PLATFORM_ORCHESTRATOR_URL?.trim() || ''
const ORCHESTRATOR_TOKEN = process.env.PLATFORM_ORCHESTRATOR_TOKEN?.trim()

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

    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
    } as any)

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

const runSupabaseCli = async (
  args: string[],
  options: { cwd: string; env?: Record<string, string> }
) => {
  const { spawn } = await import('node:child_process')

  return new Promise<void>((resolve, reject) => {
    const child = spawn(SUPABASE_BIN, args, {
      stdio: 'inherit',
      cwd: options.cwd,
      env: {
        ...process.env,
        SUPABASE_TELEMETRY_DISABLED: 'true',
        ...options.env,
      },
    })

    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`supabase ${args.join(' ')} exited with code ${code}`))
    })
  })
}

export async function provisionProjectStack(context: ProvisionContext) {
  const logEnabled = process.env.PLATFORM_API_LOG_PROVISIONING === 'true'
  if (logEnabled) {
    console.log('[provisioning] start', context)
  }

  await prepareSupabaseRuntime({
    projectId: context.projectId,
    projectRef: context.ref,
    projectName: context.name,
    projectRoot: context.projectRoot,
    databasePassword: context.databasePassword,
  })

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
    await orchestrator.provision({
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
    if (process.env.FAIL_PROVISIONING === 'true') {
      await sleep(PROVISION_DELAY_MS)
      throw new Error('Provisioning failed due to FAIL_PROVISIONING flag')
    }

    try {
      await runSupabaseCli(['stop', '--yes'], {
        cwd: context.projectRoot,
      })
    } catch (error) {
      if (logEnabled) {
        console.warn('[provisioning] initial stop failed (continuing)', {
          ref: context.ref,
          error,
        })
      }
    }

    // NOTE: Until the platform owns provisioning end-to-end, we rely on the Supabase CLI to
    // bootstrap the local stack. We bind it to the same docker network as our compose overlay so
    // the control plane can talk to the runtime without host-only port shims. Once the dedicated
    // orchestrator lands, this call becomes the integration point to swap the backend out.
    // The CLI probes 127.0.0.1 from inside its process, which fails when it runs inside the
    // platform-api container. We skip that built-in probe and run platform-managed health checks
    // instead so the future orchestrator can plug into the same lifecycle.
    const startArgs = ['start', '--ignore-health-check', '--yes', '--network-id', networkId]
    if (context.excludedServices.length > 0) {
      startArgs.push('-x', context.excludedServices.join(','))
    }

    await runSupabaseCli(startArgs, {
      cwd: context.projectRoot,
    })
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

  const orchestrator = useOrchestrator()
  if (orchestrator) {
    await orchestrator.destroy({
      project_ref: context.ref,
      project_root: context.projectRoot,
      organization_slug: context.organizationSlug,
    })
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
    const supabaseDir = resolve(context.projectRoot, 'supabase')
    if (existsSync(supabaseDir)) {
      try {
        await runSupabaseCli(['stop', '--yes'], {
          cwd: context.projectRoot,
        })
      } catch (error) {
        if (process.env.FAIL_DESTRUCTION === 'true') {
          throw error
        }
        console.warn('[provisioning] supabase stop failed during destroy', {
          ref: context.ref,
          error,
        })
      }
    }

    if (process.env.FAIL_DESTRUCTION === 'true') {
      await sleep(DESTRUCTION_DELAY_MS)
      throw new Error('Destruction failed due to FAIL_DESTRUCTION flag')
    }
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
    await orchestrator.stop({
      project_ref: context.projectRef,
      project_root: context.projectRoot,
    })
  } else {
    await runSupabaseCli(['stop', '--yes'], {
      cwd: context.projectRoot,
    })
  }

  if (logEnabled) {
    console.log('[provisioning] pause complete')
  }
}
