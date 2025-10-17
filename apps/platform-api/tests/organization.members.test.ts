import Fastify from 'fastify'
import { randomUUID } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { authenticateRequest } from '../src/plugins/authenticate.js'
import {
  authHeaders,
  TEST_JWT_SECRET,
  TEST_USER_EMAIL,
  TEST_USER_ID,
  createTestJwt,
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

  const adminRoleId = async () => {
    const row = await platformDb
      .selectFrom('organization_roles')
      .select(['id'])
      .where('organization_id', '=', defaultOrganizationId)
      .where('name', '=', 'Administrator')
      .executeTakeFirst()
    if (!row?.id) {
      throw new Error('Administrator role not found')
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

  const headersForSubject = (sub: string, email?: string) => ({
    authorization: `Bearer ${createTestJwt({ sub, email })}`,
  })

  const originalEnv = captureEnv()

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
    restoreEnv(originalEnv)
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

  it('appends new roles without overwriting existing assignments', async () => {
    const targetUserId = randomUUID()
    const targetEmail = 'multi-role@example.com'
    const { ensureProfile } = await import('../src/store/profile.js')
    const targetProfile = await ensureProfile(targetUserId, targetEmail)

    const devRoleId = await developerRoleId()
    const adminRoleIdValue = await adminRoleId()

    const first = await app.inject({
      method: 'PATCH',
      url: `/api/platform/organizations/${defaultOrganizationSlug}/members/${targetUserId}`,
      headers: ownerHeaders(),
      payload: {
        role_id: devRoleId,
        role_scoped_projects: ['project-1'],
      },
    })

    expect(first.statusCode).toBe(200)
    expect(first.json()).toMatchObject({ role_ids: [devRoleId] })

    const second = await app.inject({
      method: 'PATCH',
      url: `/api/platform/organizations/${defaultOrganizationSlug}/members/${targetUserId}`,
      headers: ownerHeaders(),
      payload: {
        role_id: adminRoleIdValue,
      },
    })

    expect(second.statusCode).toBe(200)
    const secondPayload = second.json() as { role_ids: number[] }
    expect(secondPayload.role_ids).toEqual([adminRoleIdValue, devRoleId])

    const membership = await platformDb
      .selectFrom('organization_members')
      .select(['role_ids', 'metadata'])
      .where('organization_id', '=', defaultOrganizationId)
      .where('profile_id', '=', targetProfile.id)
      .executeTakeFirst()

    expect(membership?.role_ids).toEqual([adminRoleIdValue, devRoleId])
    const metadata = (membership?.metadata as Record<string, unknown>) ?? {}
    const scoped = (
      metadata as { role_scoped_projects?: Record<string, string[]> }
    ).role_scoped_projects
    expect(scoped?.[String(devRoleId)]).toEqual(['project-1'])
    expect(scoped?.[String(adminRoleIdValue)]).toBeUndefined()
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
    const created = create.json() as {
      invited_email: string
      role_id: number
      metadata?: Record<string, unknown>
    }
    expect(created.invited_email).toBe('invitee@example.com')
    expect(created.role_id).toBe(roleId)
    const invitationMetadata = (
      created.metadata as { role_scoped_projects?: Record<string, string[]> }
    )?.role_scoped_projects
    expect(invitationMetadata?.[String(roleId)]).toEqual(['project-one', 'project-two'])

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

  it('returns invitation metadata by token for the invited user', async () => {
    const roleId = await developerRoleId()
    const inviteEmail = 'lookup@example.com'
    const targetUserId = randomUUID()

    const create = await app.inject({
      method: 'POST',
      url: `/api/platform/organizations/${defaultOrganizationSlug}/members/invitations`,
      headers: ownerHeaders(),
      payload: {
        email: inviteEmail,
        role_id: roleId,
      },
    })
    expect(create.statusCode).toBe(201)
    const invitation = create.json() as { token: string }

    const { ensureProfile } = await import('../src/store/profile.js')
    await ensureProfile(targetUserId, inviteEmail)

    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/organizations/${defaultOrganizationSlug}/members/invitations/${invitation.token}`,
      headers: headersForSubject(targetUserId, inviteEmail),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      token_does_not_exist: false,
      expired_token: false,
      email_match: true,
      authorized_user: true,
    })
  })

  it('rejects invitation acceptance when email mismatches', async () => {
    const roleId = await developerRoleId()
    const create = await app.inject({
      method: 'POST',
      url: `/api/platform/organizations/${defaultOrganizationSlug}/members/invitations`,
      headers: ownerHeaders(),
      payload: {
        email: 'mismatch@example.com',
        role_id: roleId,
      },
    })
    expect(create.statusCode).toBe(201)
    const invitation = create.json() as { token: string }

    const mismatchUserId = randomUUID()
    const { ensureProfile } = await import('../src/store/profile.js')
    await ensureProfile(mismatchUserId, 'other@example.com')

    const accept = await app.inject({
      method: 'POST',
      url: `/api/platform/organizations/${defaultOrganizationSlug}/members/invitations/${invitation.token}`,
      headers: headersForSubject(mismatchUserId, 'other@example.com'),
    })

    expect(accept.statusCode).toBe(400)
  })

  it('accepts invitation and creates membership for invited user', async () => {
    const roleId = await developerRoleId()
    const inviteEmail = 'accept@example.com'
    const targetUserId = randomUUID()

    const create = await app.inject({
      method: 'POST',
      url: `/api/platform/organizations/${defaultOrganizationSlug}/members/invitations`,
      headers: ownerHeaders(),
      payload: {
        email: inviteEmail,
        role_id: roleId,
        role_scoped_projects: ['alpha'],
      },
    })
    expect(create.statusCode).toBe(201)
    const invitation = create.json() as { token: string }

    const { ensureProfile } = await import('../src/store/profile.js')
    const profile = await ensureProfile(targetUserId, inviteEmail)

    const accept = await app.inject({
      method: 'POST',
      url: `/api/platform/organizations/${defaultOrganizationSlug}/members/invitations/${invitation.token}`,
      headers: headersForSubject(targetUserId, inviteEmail),
    })
    expect(accept.statusCode).toBe(201)

    const member = await platformDb
      .selectFrom('organization_members')
      .select(['metadata', 'role_ids'])
      .where('organization_id', '=', defaultOrganizationId)
      .where('profile_id', '=', profile.id)
      .executeTakeFirst()

    expect(member?.role_ids).toEqual([roleId])
    const metadata = (member?.metadata as Record<string, unknown>) ?? {}
    expect(metadata.role_scoped_projects).toEqual(
      roleScopedProjectsMetadata([{ roleId, projects: ['alpha'] }]).role_scoped_projects
    )

    const invitationRow = await platformDb
      .selectFrom('organization_invitations')
      .select(['accepted_at'])
      .where('organization_id', '=', defaultOrganizationId)
      .where('token', '=', invitation.token)
      .executeTakeFirst()
    expect(invitationRow?.accepted_at).not.toBeNull()

    const lookup = await app.inject({
      method: 'GET',
      url: `/api/platform/organizations/${defaultOrganizationSlug}/members/invitations/${invitation.token}`,
      headers: headersForSubject(targetUserId, inviteEmail),
    })
    expect(lookup.statusCode).toBe(200)
    expect(lookup.json()).toMatchObject({ token_does_not_exist: true })
  })

  it('rejects invitation acceptance when the assigned role no longer exists', async () => {
    const roleId = await developerRoleId()
    const inviteEmail = 'missing-role@example.com'
    const targetUserId = randomUUID()

    const create = await app.inject({
      method: 'POST',
      url: `/api/platform/organizations/${defaultOrganizationSlug}/members/invitations`,
      headers: ownerHeaders(),
      payload: {
        email: inviteEmail,
        role_id: roleId,
      },
    })
    expect(create.statusCode).toBe(201)
    const invitation = create.json() as { token: string }

    await platformDb
      .deleteFrom('organization_roles')
      .where('id', '=', roleId)
      .execute()

    const { ensureProfile } = await import('../src/store/profile.js')
    await ensureProfile(targetUserId, inviteEmail)

    const accept = await app.inject({
      method: 'POST',
      url: `/api/platform/organizations/${defaultOrganizationSlug}/members/invitations/${invitation.token}`,
      headers: headersForSubject(targetUserId, inviteEmail),
    })
    expect(accept.statusCode).toBe(400)
  })

  it('prevents accepting expired invitations', async () => {
    const roleId = await developerRoleId()
    const inviteEmail = 'expired@example.com'
    const targetUserId = randomUUID()

    const create = await app.inject({
      method: 'POST',
      url: `/api/platform/organizations/${defaultOrganizationSlug}/members/invitations`,
      headers: ownerHeaders(),
      payload: {
        email: inviteEmail,
        role_id: roleId,
      },
    })
    expect(create.statusCode).toBe(201)
    const invitation = create.json() as { token: string }

    await platformDb
      .updateTable('organization_invitations')
      .set({ expires_at: new Date(Date.now() - 60_000).toISOString() })
      .where('organization_id', '=', defaultOrganizationId)
      .where('token', '=', invitation.token)
      .execute()

    const { ensureProfile } = await import('../src/store/profile.js')
    await ensureProfile(targetUserId, inviteEmail)

    const accept = await app.inject({
      method: 'POST',
      url: `/api/platform/organizations/${defaultOrganizationSlug}/members/invitations/${invitation.token}`,
      headers: headersForSubject(targetUserId, inviteEmail),
    })
    expect(accept.statusCode).toBe(400)
  })
})
