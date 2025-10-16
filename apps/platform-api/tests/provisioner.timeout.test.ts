import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const baseContext = {
  projectId: 1,
  ref: 'test-ref',
  name: 'Test Project',
  organizationSlug: 'org',
  cloudProvider: 'LOCAL',
  region: 'local',
  databasePassword: 'password',
  projectRoot: '/tmp/test-ref',
  excludedServices: [],
}

describe('provisionProjectStack orchestrator timeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    delete process.env.PLATFORM_ORCHESTRATOR_URL
    delete process.env.PLATFORM_ORCHESTRATOR_TOKEN
    delete process.env.PLATFORM_ORCHESTRATOR_TIMEOUT_MS
  })

  it('aborts when the orchestrator does not respond before the timeout', async () => {
    vi.resetModules()
    process.env.PLATFORM_ORCHESTRATOR_URL = 'http://runtime-agent:8085'
    process.env.PLATFORM_ORCHESTRATOR_TIMEOUT_MS = '10'

    vi.doMock('../src/provisioning/runtime.js', () => ({
      prepareSupabaseRuntime: vi.fn().mockResolvedValue(undefined),
    }))

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation((_input: any, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const error = new Error('aborted')
            error.name = 'AbortError'
            reject(error)
          })
        })
      })

    const { provisionProjectStack } = await import('../src/provisioner.js')

    const promise = provisionProjectStack(baseContext)
    await vi.advanceTimersByTimeAsync(10)

    await expect(promise).rejects.toThrow(/timed out/i)
    expect(fetchSpy).toHaveBeenCalledOnce()
  })
})
