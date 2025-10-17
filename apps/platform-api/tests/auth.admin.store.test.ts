import { randomUUID } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createFetchStub, createSequentialFetchStub } from './utils/gotrue.js'
import { initTestDatabase } from './utils/db.js'
import { captureEnv, patchEnv, restoreEnv } from './utils/env.js'

const listFactorsMock = vi.fn()
const deleteFactorMock = vi.fn()
const createClientMock = vi.fn(() => ({
  auth: {
    admin: {
      mfa: {
        listFactors: listFactorsMock,
        deleteFactor: deleteFactorMock,
      },
    },
  },
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}))

describe('auth admin store', () => {
  const originalEnv = captureEnv()
  let defaultProjectRef = ''

  beforeEach(async () => {
    vi.resetModules()
    patchEnv({
      JWT_SECRET: 'test-secret',
      PLATFORM_DB_URL: 'pg-mem',
      SUPABASE_DB_URL: 'pg-mem',
      PLATFORM_API_REPO_ROOT: process.cwd(),
    })

    await initTestDatabase()

    const defaults = await import('../src/config/defaults.js')
    defaultProjectRef = defaults.DEFAULT_PROJECT_REF

    createClientMock.mockClear()
    listFactorsMock.mockReset()
    deleteFactorMock.mockReset()
    listFactorsMock.mockResolvedValue({ data: { factors: [] }, error: null })
    deleteFactorMock.mockResolvedValue({ data: null, error: null })

    const { seedDefaults } = await import('../src/db/seed.js')
    await seedDefaults()
  })

  afterEach(async () => {
    const { destroyDb } = await import('../src/db/client.js')
    await destroyDb()
    delete (globalThis as any).__PLATFORM_TEST_POOL__
    restoreEnv(originalEnv)
    vi.unstubAllGlobals()
  })

  it('creates an auth user via GoTrue admin API', async () => {
    const spy = createFetchStub(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(input.toString())
      expect(url.pathname.endsWith('/auth/v1/admin/users')).toBe(true)
      expect(init?.method).toBe('POST')
      const body = init?.body ? JSON.parse(init.body.toString()) : {}
      expect(body.email).toBe('new-user@example.com')
      expect(body.password).toBe('secret-password')

      return new Response(JSON.stringify({ id: randomUUID() }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    })

    const { createAuthUser } = await import('../src/store/auth-admin.js')

    const payload = await createAuthUser(defaultProjectRef, {
      email: 'new-user@example.com',
      email_confirm: true,
      password: 'secret-password',
    })

    expect(payload?.id).toBeDefined()
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('normalizes GoTrue error messages', async () => {
    createFetchStub(async () => {
      return new Response(JSON.stringify({ msg: 'Email already registered' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    })

    const { createAuthUser } = await import('../src/store/auth-admin.js')

    await expect(
      createAuthUser(defaultProjectRef, {
        email: 'existing@example.com',
        email_confirm: true,
        password: 'password',
      })
    ).rejects.toMatchObject({
      status: 400,
      message: 'Email already registered',
    })
  })

  it('propagates soft delete flag when deleting users', async () => {
    const spy = createFetchStub(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(input.toString())
      expect(url.pathname.endsWith('/auth/v1/admin/users/target-user')).toBe(true)
      expect(url.searchParams.get('soft_delete')).toBe('true')
      expect(init?.method).toBe('DELETE')
      return new Response(null, { status: 204 })
    })

    const { deleteAuthUser } = await import('../src/store/auth-admin.js')

    await deleteAuthUser(defaultProjectRef, 'target-user', { softDelete: true })

    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('falls back to PUT when PATCH is not allowed for user updates', async () => {
    const spy = createSequentialFetchStub([
      () =>
        new Response('method not allowed', {
          status: 405,
          headers: { 'Content-Type': 'text/plain' },
        }),
      () =>
        new Response(JSON.stringify({ id: 'user-id', banned_until: '2025-01-01T00:00:00Z' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    ])

    const { updateAuthUser } = await import('../src/store/auth-admin.js')

    const result = await updateAuthUser(defaultProjectRef, 'user-id', {
      ban_duration: 'P1D',
    })

    expect(result?.id).toBe('user-id')
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('removes MFA factors individually when bulk delete is not supported', async () => {
    listFactorsMock.mockResolvedValueOnce({
      data: { factors: [{ id: 'factor-1' }, { id: 'factor-2' }] },
      error: null,
    })
    deleteFactorMock.mockResolvedValue({ data: null, error: null })

    const spy = createFetchStub(async () => {
      return new Response('method not allowed', {
        status: 405,
        headers: { 'Content-Type': 'text/plain' },
      })
    })

    const { deleteAuthUserFactors } = await import('../src/store/auth-admin.js')

    await deleteAuthUserFactors(defaultProjectRef, 'user-with-factors')

    expect(spy).toHaveBeenCalledTimes(1)
    expect(createClientMock).toHaveBeenCalledTimes(1)
    expect(listFactorsMock).toHaveBeenCalledWith({ userId: 'user-with-factors' })
    expect(deleteFactorMock).toHaveBeenCalledTimes(2)
    expect(deleteFactorMock).toHaveBeenNthCalledWith(1, {
      userId: 'user-with-factors',
      id: 'factor-1',
    })
    expect(deleteFactorMock).toHaveBeenNthCalledWith(2, {
      userId: 'user-with-factors',
      id: 'factor-2',
    })
  })

  it('falls back to legacy validate endpoint when spam validation is unavailable', async () => {
    const spy = createSequentialFetchStub([
      () =>
        new Response(JSON.stringify({ message: 'not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }),
      () =>
        new Response('404 page not found', {
          status: 404,
          headers: { 'Content-Type': 'text/plain' },
        }),
      () =>
        new Response(JSON.stringify({ rules: [{ name: 'rule', desc: 'desc', score: 0.1 }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    ])

    const { validateAuthSpam } = await import('../src/store/auth-admin.js')

    const result = await validateAuthSpam(defaultProjectRef, {
      subject: 'Hello',
      content: 'Test email',
    })

    expect(result.rules).toHaveLength(1)
    expect(spy).toHaveBeenCalledTimes(3)
  })
})
