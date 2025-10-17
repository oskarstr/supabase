import { vi } from 'vitest'

type FetchHandler = (input: RequestInfo | URL, init?: RequestInit | undefined) => Promise<Response>

export const createFetchStub = (handler: FetchHandler) => {
  const fetchSpy = vi.fn(handler)
  ;(globalThis as any).__PLATFORM_TEST_FETCH__ = fetchSpy
  vi.stubGlobal('fetch', fetchSpy)
  return fetchSpy
}

export const createSequentialFetchStub = (responses: Array<Response | (() => Response)>) =>
  createFetchStub(async () => {
    const next = responses.shift()
    if (typeof next === 'function') {
      return (next as () => Response)()
    }
    if (next) {
      return next
    }
    return new Response(null, { status: 500 })
  })
