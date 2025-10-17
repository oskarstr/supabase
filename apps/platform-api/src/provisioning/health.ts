import { setTimeout as sleep } from 'node:timers/promises'

import { allocateProjectPorts } from './ports.js'

const HEALTH_HOST = process.env.PLATFORM_RUNTIME_HEALTH_HOST?.trim() || '127.0.0.1'
const HEALTH_TIMEOUT_MS = Number.parseInt(process.env.PLATFORM_RUNTIME_HEALTH_TIMEOUT_MS ?? '', 10)
const DEFAULT_TIMEOUT_MS =
  Number.isFinite(HEALTH_TIMEOUT_MS) && HEALTH_TIMEOUT_MS > 0 ? HEALTH_TIMEOUT_MS : 120_000
const DEFAULT_INTERVAL_MS = 2_000

interface WaitForHealthOptions {
  projectId: number
  excludedServices: string[]
  timeoutMs?: number
  intervalMs?: number
}

const fetchWithTimeout = async (url: string, signal: AbortSignal) => {
  const response = await fetch(url, { method: 'HEAD', signal })
  if (!response.ok) {
    throw new Error(`Health check failed for ${url} (${response.status})`)
  }
}

const checkRest = async (port: number, abortSignal: AbortSignal) => {
  const restReadyUrl = `http://${HEALTH_HOST}:${port}/rest-admin/v1/ready`
  await fetchWithTimeout(restReadyUrl, abortSignal)
}

const checkEdgeFunctions = async (port: number, abortSignal: AbortSignal) => {
  const functionsUrl = `http://${HEALTH_HOST}:${port}/functions/v1/_internal/health`
  await fetchWithTimeout(functionsUrl, abortSignal)
}

export const waitForRuntimeHealth = async ({
  projectId,
  excludedServices,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  intervalMs = DEFAULT_INTERVAL_MS,
}: WaitForHealthOptions): Promise<void> => {
  const ports = allocateProjectPorts(projectId)
  const deadline = Date.now() + timeoutMs
  const shouldCheckFunctions = !excludedServices.includes('edge-runtime')
  const shouldCheckRest =
    !excludedServices.includes('postgrest') && !excludedServices.includes('kong')

  if (!shouldCheckRest && !shouldCheckFunctions) {
    return
  }

  while (Date.now() < deadline) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), intervalMs)

    try {
      const checks: Promise<void>[] = []
      if (shouldCheckRest) {
        checks.push(checkRest(ports.api, controller.signal))
      }
      if (shouldCheckFunctions) {
        checks.push(checkEdgeFunctions(ports.api, controller.signal))
      }

      await Promise.all(checks)
      clearTimeout(timeout)
      return
    } catch (error) {
      clearTimeout(timeout)
      await sleep(intervalMs)
    }
  }

  throw new Error('Timed out waiting for Supabase runtime to become healthy')
}
