import Fastify from 'fastify'
import { randomUUID } from 'node:crypto'
import { readdirSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DataType, newDb } from 'pg-mem'

import { authenticateRequest } from '../src/plugins/authenticate.js'
import {
  authHeaders,
  TEST_JWT_SECRET,
  TEST_USER_EMAIL,
  TEST_USER_ID,
  createTestJwt,
} from './utils/auth.js'

const sanitizeMigrationSql = (sql: string) =>
  sql
    .replace(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\s*/g, '')
    .replace(/CREATE EXTENSION IF NOT EXISTS "pgcrypto";\s*/g, '')
    .replace(/ADD VALUE IF NOT EXISTS/g, 'ADD VALUE')
    .replace(/COMMENT ON SCHEMA platform IS 'Supabase platform control-plane schema.';\s*/g, '')

const MIGRATIONS_DIR = resolve(process.cwd(), 'migrations')

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

describe('organization member routes', () => {
  let app: Awaited<ReturnType<typeof createApp>>
  let platformDb: Awaited<ReturnType<typeof import('../src/db/client.js')['getPlatformDb']>>
  let defaultOrganizationSlug = ''
  let defaultOrganizationId = 0

  const withAuth = (headers: Record<string, string> = {}) => ({
    ...authHeaders(),
    ...headers,
  })

  const developerRoleId = async () => {
    const row = await platformDb
      .selectFrom('organization_roles')
      .select(['id'])
      .where('organization_id', '=', defaultOrganizationId)
      .where('name', '=', 'Developer')
      .executeTakeFirst()
    if (!row?.id) {
      throw new Error('Developer role not found')
    }
    return row.id
  }

  const invitationList = async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/organizations/${defaultOrganizationSlug}/members/invitations`,
      headers: ownerHeaders(),
    })
    expect(response.statusCode).toBe(200)
    return response.json() as { invitations: Array<{ id: number; invited_email: string }> }
  }

  const ownerHeaders = () => withAuth()

  const headersForSubject = (sub: string) => ({
    authorization: `Bearer ${createTestJwt({ sub })}`,
  })

  beforeEach(async () => {
    vi.resetModules()
    process.env.JWT_SECRET = TEST_JWT_SECRET
    process.env.PLATFORM_DB_URL = 'pg-mem'
    process.env.SUPABASE_DB_URL = 'pg-mem'
    process.env.PLATFORM_API_REPO_ROOT = process.cwd()

    const memDb = newDb()
    memDb.public.registerFunction({
      name: 'gen_random_uuid',
      returns: DataType.uuid,
      implementation: () => randomUUID(),
    })

    const migrationFiles = readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith('.sql'))
      .sort()

    for (const file of migrationFiles) {
      const sql = await readFile(resolve(MIGRATIONS_DIR, file), 'utf-8')
      memDb.public.none(sanitizeMigrationSql(sql))
    }

    const { Pool: MemPool } = memDb.adapters.createPg()
    globalThis.__PLATFORM_TEST_POOL__ = new MemPool()

    const defaults = await import('../src/config/defaults.js')
    defaultOrganizationSlug = defaults.DEFAULT_ORG_SLUG

    const { seedDefaults } = await import('../src/db/seed.js')
    await seedDefaults()

    const { getPlatformDb } = await import('../src/db/client.js')
    platformDb = getPlatformDb()

    const organization = await platformDb
      .selectFrom('organizations')
      .select(['id'])
      .where('slug', '=', defaultOrganizationSlug)
      .executeTakeFirst()
    defaultOrganizationId = organization?.id ?? 0

    const { ensureProfile } = await import('../src/store/profile.js')
    const ownerProfile = await ensureProfile(TEST_USER_ID, TEST_USER_EMAIL)

    await platformDb
      .deleteFrom('organization_members')
      .where('organization_id', '=', defaultOrganizationId)
      .where('profile_id', '=', ownerProfile.id)
      .execute()

    await platformDb
      .insertInto('organization_members')
      .values({
        organization_id: defaultOrganizationId,
        profile_id: ownerProfile.id,
        role_ids: [1],
        metadata: {},
        mfa_enabled: false,
        is_owner: true,
      })
      .execute()

    app = await createApp()
  })

  afterEach(async () => {
    await app.close()
    const { destroyDb } = await import('../src/db/client.js')
    await destroyDb()
    delete (globalThis as any).__PLATFORM_TEST_POOL__
  })

  it('allows an owner to assign a role to an existing profile', async () => {
    const targetUserId = randomUUID()
    const targetEmail = 'member@example.com'
    const { ensureProfile } = await import('../src/store/profile.js')
    await ensureProfile(targetUserId, targetEmail)

    const roleId = await developerRoleId()

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/platform/organizations/${defaultOrganizationSlug}/members/${targetUserId}`,
      headers: ownerHeaders(),
      payload: {
        role_id: roleId,
        role_scoped_projects: ['project-1'],
      },
    })

    expect(response.statusCode).toBe(200)
    const payload = response.json()
    expect(payload.role_ids).toEqual([roleId])

    const members = await app.inject({
      method: 'GET',
      url: `/api/platform/organizations/${defaultOrganizationSlug}/members`,
      headers: ownerHeaders(),
    })
    expect(members.statusCode).toBe(200)
    const parsed = members.json() as Array<{ gotrue_id: string; role_ids: number[] }>
    const found = parsed.find((member) => member.gotrue_id === targetUserId)
    expect(found?.role_ids).toEqual([roleId])
  })

  it('prevents non-admin members from mutating membership', async () => {
    const developerId = randomUUID()
    const { ensureProfile } = await import('../src/store/profile.js')
    const devProfile = await ensureProfile(developerId, 'developer@example.com')

    await platformDb
      .insertInto('organization_members')
      .values({
        organization_id: defaultOrganizationId,
        profile_id: devProfile.id,
        role_ids: [3],
        metadata: {},
        mfa_enabled: false,
        is_owner: false,
      })
      .execute()

    const targetUserId = randomUUID()
    await ensureProfile(targetUserId, 'target@example.com')

    const roleId = await developerRoleId()

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/platform/organizations/${defaultOrganizationSlug}/members/${targetUserId}`,
      headers: withAuth(headersForSubject(developerId)),
      payload: { role_id: roleId },
    })

    expect(response.statusCode).toBe(403)
  })

  it('prevents removing the organization owner', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/platform/organizations/${defaultOrganizationSlug}/members/${TEST_USER_ID}`,
      headers: ownerHeaders(),
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ message: 'Cannot remove organization owner' })
  })

  it('removes an existing member', async () => {
    const targetUserId = randomUUID()
    const { ensureProfile } = await import('../src/store/profile.js')
    const profile = await ensureProfile(targetUserId, 'remove-me@example.com')

    await platformDb
      .insertInto('organization_members')
      .values({
        organization_id: defaultOrganizationId,
        profile_id: profile.id,
        role_ids: [3],
        metadata: {},
        mfa_enabled: false,
        is_owner: false,
      })
      .execute()

    const del = await app.inject({
      method: 'DELETE',
      url: `/api/platform/organizations/${defaultOrganizationSlug}/members/${targetUserId}`,
      headers: ownerHeaders(),
    })
    expect(del.statusCode).toBe(204)

    const members = await app.inject({
      method: 'GET',
      url: `/api/platform/organizations/${defaultOrganizationSlug}/members`,
      headers: ownerHeaders(),
    })
    const parsed = members.json() as Array<{ gotrue_id: string }>
    expect(parsed.find((member) => member.gotrue_id === targetUserId)).toBeUndefined()
  })

  it('allows an owner to create an invitation', async () => {
    const roleId = await developerRoleId()

    const create = await app.inject({
      method: 'POST',
      url: `/api/platform/organizations/${defaultOrganizationSlug}/members/invitations`,
      headers: ownerHeaders(),
      payload: {
        email: 'invitee@example.com',
        role_id: roleId,
        role_scoped_projects: ['project-one', 'project-two'],
      },
    })

    expect(create.statusCode).toBe(201)
    const created = create.json() as { invited_email: string; role_id: number; metadata?: { role_scoped_projects?: string[] } }
    expect(created.invited_email).toBe('invitee@example.com')
    expect(created.role_id).toBe(roleId)
    expect(created.metadata?.role_scoped_projects).toEqual(['project-one', 'project-two'])

    const invitations = await invitationList()
    expect(invitations.invitations.some((invite) => invite.invited_email === 'invitee@example.com')).toBe(true)
  })

  it('prevents non-admin members from creating invitations', async () => {
    const developerId = randomUUID()
    const { ensureProfile } = await import('../src/store/profile.js')
    const devProfile = await ensureProfile(developerId, 'dev-invite@example.com')

    await platformDb
      .insertInto('organization_members')
      .values({
        organization_id: defaultOrganizationId,
        profile_id: devProfile.id,
        role_ids: [3],
        metadata: {},
        mfa_enabled: false,
        is_owner: false,
      })
      .execute()

    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/organizations/${defaultOrganizationSlug}/members/invitations`,
      headers: withAuth(headersForSubject(developerId)),
      payload: {
        email: 'reject@example.com',
        role_id: await developerRoleId(),
      },
    })

    expect(response.statusCode).toBe(403)
  })

  it('removes invitations by id', async () => {
    const roleId = await developerRoleId()
    const create = await app.inject({
      method: 'POST',
      url: `/api/platform/organizations/${defaultOrganizationSlug}/members/invitations`,
      headers: ownerHeaders(),
      payload: {
        email: 'delete-me@example.com',
        role_id: roleId,
      },
    })
    expect(create.statusCode).toBe(201)
    const created = create.json() as { id: number }

    const del = await app.inject({
      method: 'DELETE',
      url: `/api/platform/organizations/${defaultOrganizationSlug}/members/invitations/${created.id}`,
      headers: ownerHeaders(),
    })
    expect(del.statusCode).toBe(204)

    const invitations = await invitationList()
    expect(invitations.invitations.some((invite) => invite.invited_email === 'delete-me@example.com')).toBe(false)
  })
})
