import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ProvisionContext } from '../src/provisioner.js'

vi.mock('../src/provisioning/runtime.js', () => ({
  prepareSupabaseRuntime: vi.fn(async () => undefined),
}))

describe('provisioner orchestrator timeout', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.useFakeTimers()
    process.env.PLATFORM_ORCHESTRATOR_URL = 'http://runtime-agent:8085'
    process.env.PLATFORM_ORCHESTRATOR_TIMEOUT_MS = '100'
    delete process.env.PLATFORM_API_PROVISION_CMD
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.resetModules()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key]
      }
    }
    Object.assign(process.env, originalEnv)
  })

  it('fails when orchestrator does not respond before timeout', async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<never>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const error = new Error('aborted')
          ;(error as any).name = 'AbortError'
          reject(error)
        })
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const { provisionProjectStack } = await import('../src/provisioner.js')
    const context: ProvisionContext = {
      projectId: 1,
      ref: 'test-ref',
      name: 'Test Project',
      organizationSlug: 'org',
      cloudProvider: 'LOCAL',
      region: 'local',
      databasePassword: 'secret',
      projectRoot: '/tmp/project',
      excludedServices: [],
    }

    const promise = provisionProjectStack(context)
    await vi.advanceTimersByTimeAsync(150)

    await expect(promise).rejects.toThrowError(/timed out after 100ms/)
  })
})
