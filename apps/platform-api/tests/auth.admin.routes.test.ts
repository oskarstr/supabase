import Fastify from 'fastify'
import { randomUUID } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { authenticateRequest } from '../src/plugins/authenticate.js'
import { createFetchStub, createSequentialFetchStub } from './utils/gotrue.js'
import {
  authHeaders,
  createTestJwt,
  TEST_JWT_SECRET,
  TEST_USER_EMAIL,
  TEST_USER_ID,
} from './utils/auth.js'
import { initTestDatabase } from './utils/db.js'
import { captureEnv, patchEnv, restoreEnv } from './utils/env.js'
import { roleScopedProjectsMetadata } from './utils/metadata.js'

const createApp = async () => {
  const { default: platformRoutes } = await import('../src/routes/platform.js')
  const app = Fastify({ logger: false })
  await app.register(async (instance) => {
    instance.addHook('preHandler', authenticateRequest)
    await instance.register(platformRoutes, { prefix: '/api/platform' })
  })
  await app.ready()
  return app
}

describe('platform auth admin routes', () => {
  const originalEnv = captureEnv()
  let app: Awaited<ReturnType<typeof createApp>>
  let platformDb: Awaited<ReturnType<typeof import('../src/db/client.js')['getPlatformDb']>>
  let defaultOrganizationSlug = ''
  let defaultOrganizationId = 0
  let defaultProjectRef = ''

  const ownerHeaders = () => authHeaders()

  const headersForSubject = (sub: string, email?: string) => ({
    authorization: `Bearer ${createTestJwt({ sub, email })}`,
  })

  const roleIdForBaseRole = async (baseRoleId: number) => {
    const row = await platformDb
      .selectFrom('organization_roles')
      .select(['id'])
      .where('organization_id', '=', defaultOrganizationId)
      .where('base_role_id', '=', baseRoleId)
      .executeTakeFirst()
    if (!row?.id) {
      throw new Error(`Role with base_role_id ${baseRoleId} not found`)
    }
    return Number(row.id)
  }

  beforeEach(async () => {
    vi.resetModules()
    patchEnv({
      JWT_SECRET: TEST_JWT_SECRET,
      PLATFORM_DB_URL: 'pg-mem',
      SUPABASE_DB_URL: 'pg-mem',
      PLATFORM_API_REPO_ROOT: process.cwd(),
    })

    await initTestDatabase()

    const defaults = await import('../src/config/defaults.js')
    defaultOrganizationSlug = defaults.DEFAULT_ORG_SLUG
    defaultProjectRef = defaults.DEFAULT_PROJECT_REF

    const { seedDefaults } = await import('../src/db/seed.js')
    await seedDefaults()

    const { getPlatformDb } = await import('../src/db/client.js')
    platformDb = getPlatformDb()

    const organization = await platformDb
      .selectFrom('organizations')
      .select(['id'])
      .where('slug', '=', defaultOrganizationSlug)
      .executeTakeFirst()
    defaultOrganizationId = Number(organization?.id ?? 0)

    app = await createApp()
  })

  afterEach(async () => {
    await app.close()
    const { destroyDb } = await import('../src/db/client.js')
    await destroyDb()
    delete (globalThis as any).__PLATFORM_TEST_POOL__
    restoreEnv(originalEnv)
    vi.unstubAllGlobals()
  })

  it('allows an owner to create an auth user', async () => {
    const { ensureProfile } = await import('../src/store/profile.js')
    const ownerProfile = await ensureProfile(TEST_USER_ID, TEST_USER_EMAIL)

    await platformDb
      .deleteFrom('organization_members')
      .where('organization_id', '=', defaultOrganizationId)
      .where('profile_id', '=', ownerProfile.id)
      .execute()

    const ownerRoleId = await roleIdForBaseRole(1)

    await platformDb
      .insertInto('organization_members')
      .values({
        organization_id: defaultOrganizationId,
        profile_id: ownerProfile.id,
        role_ids: [ownerRoleId],
        metadata: {},
        mfa_enabled: false,
        is_owner: true,
      })
      .execute()

    const fetchSpy = createFetchStub(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(input.toString())
      expect(url.pathname.endsWith('/auth/v1/admin/users')).toBe(true)
      expect(init?.method).toBe('POST')
      return new Response(JSON.stringify({ id: 'go-true-id' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    })

    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/auth/${defaultProjectRef}/users`,
      headers: ownerHeaders(),
      payload: {
        email: 'created@example.com',
        email_confirm: true,
        password: 'secret',
      },
    })

    expect(response.statusCode).toBe(201)
    const payload = response.json() as { id?: string }
    expect(payload.id).toBe('go-true-id')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('rejects read-only members attempting to create users', async () => {
    const { ensureProfile } = await import('../src/store/profile.js')
    const subjectId = randomUUID()
    const subjectEmail = 'readonly@example.com'
    const readOnlyProfile = await ensureProfile(subjectId, subjectEmail)

    const readOnlyRoleId = await roleIdForBaseRole(4)

    await platformDb
      .insertInto('organization_members')
      .values({
        organization_id: defaultOrganizationId,
        profile_id: readOnlyProfile.id,
        role_ids: [readOnlyRoleId],
        metadata: {},
        mfa_enabled: false,
        is_owner: false,
      })
      .execute()

    createFetchStub(async () => {
      throw new Error('Should not forward request to GoTrue')
    })

    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/auth/${defaultProjectRef}/users`,
      headers: headersForSubject(subjectId, subjectEmail),
      payload: {
        email: 'blocked@example.com',
        email_confirm: true,
        password: 'secret',
      },
    })

    expect(response.statusCode).toBe(403)
  })

  it('forwards soft delete flags when removing users', async () => {
    const { ensureProfile } = await import('../src/store/profile.js')
    const ownerProfile = await ensureProfile(TEST_USER_ID, TEST_USER_EMAIL)

    await platformDb
      .deleteFrom('organization_members')
      .where('organization_id', '=', defaultOrganizationId)
      .where('profile_id', '=', ownerProfile.id)
      .execute()

    const ownerRoleId = await roleIdForBaseRole(1)

    await platformDb
      .insertInto('organization_members')
      .values({
        organization_id: defaultOrganizationId,
        profile_id: ownerProfile.id,
        role_ids: [ownerRoleId],
        metadata: {},
        mfa_enabled: false,
        is_owner: true,
      })
      .execute()

    const spy = createFetchStub(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(input.toString())
      expect(url.searchParams.get('soft_delete')).toBe('true')
      expect(init?.method).toBe('DELETE')
      return new Response(null, { status: 204 })
    })

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/platform/auth/${defaultProjectRef}/users/target-user?soft_delete=true`,
      headers: ownerHeaders(),
    })

    expect(response.statusCode).toBe(204)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('allows scoped developers to call validate spam with fallback paths', async () => {
    const { ensureProfile } = await import('../src/store/profile.js')
    const developerId = randomUUID()
    const developerEmail = 'developer@example.com'
    const developerProfile = await ensureProfile(developerId, developerEmail)

    const developerRoleId = await roleIdForBaseRole(3)

    await platformDb
      .insertInto('organization_members')
      .values({
        organization_id: defaultOrganizationId,
        profile_id: developerProfile.id,
        role_ids: [developerRoleId],
        metadata: roleScopedProjectsMetadata([{ roleId: developerRoleId, projects: [defaultProjectRef] }]),
        mfa_enabled: false,
        is_owner: false,
      })
      .execute()

    const fetchSpy = createSequentialFetchStub([
      () =>
        new Response(JSON.stringify({ message: 'legacy' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }),
      () =>
        new Response(JSON.stringify({ rules: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    ])

    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/auth/${defaultProjectRef}/validate/spam`,
      headers: headersForSubject(developerId, developerEmail),
      payload: {
        subject: 'Hello',
        content: 'World',
      },
    })

    expect(response.statusCode).toBe(200)
    expect((response.json() as { rules: unknown[] }).rules).toHaveLength(0)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('returns 404 when the project does not exist', async () => {
    createFetchStub(async () => {
      throw new Error('Unexpected fetch call')
    })

    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/auth/missing-project/users`,
      headers: ownerHeaders(),
      payload: {
        email: 'missing@example.com',
        email_confirm: true,
        password: 'secret',
      },
    })

    expect(response.statusCode).toBe(404)
  })
})
