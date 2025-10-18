import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import { sql } from 'kysely'

import { baseProfile, DEFAULT_ORG_ID } from '../src/config/defaults.js'
import { initTestDatabase } from './utils/db.js'
import { captureEnv, patchEnv, restoreEnv } from './utils/env.js'
import { createFetchStub } from './utils/gotrue.js'
import { roleScopedProjectsMetadata } from './utils/metadata.js'

describe('bootstrap admin reconciliation', () => {
  const originalEnv = captureEnv()

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(async () => {
    const { destroyDb } = await import('../src/db/client.js')
    await destroyDb()
    delete (globalThis as any).__PLATFORM_TEST_POOL__
    if ((globalThis as any).__PLATFORM_TEST_FETCH__) {
      delete (globalThis as any).__PLATFORM_TEST_FETCH__
    }
    restoreEnv(originalEnv)
    vi.restoreAllMocks()
  })

  const initMemDatabase = async () => {
    await initTestDatabase()
  }

  const baseEnv = {
    PLATFORM_DB_URL: 'pg-mem',
    SUPABASE_DB_URL: 'pg-mem',
    PLATFORM_API_REPO_ROOT: process.cwd(),
    SUPABASE_GOTRUE_URL: 'http://localhost:9999/auth/v1',
    SUPABASE_SERVICE_KEY: 'service-key',
    SUPABASE_ANON_KEY: 'anon-key',
    PLATFORM_ADMIN_PASSWORD: 'supabase',
  }

  const setEnv = (overrides: Record<string, string>) => {
    patchEnv(baseEnv, overrides)
  }

  it('aligns platform profile gotrue_id with the GoTrue admin user', async () => {
    const expectedUserId = '11111111-2222-3333-4444-555555555555'
    await initMemDatabase()

    const fetchSpy = createFetchStub(async (input: RequestInfo | URL) => {
      const url = input.toString()
      if (url.endsWith('/admin/users')) {
        return new Response(JSON.stringify({ user: { id: expectedUserId } }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response(null, { status: 404 })
    })

    setEnv({ PLATFORM_ADMIN_EMAIL: 'admin@example.com' })

    const { seedDefaults } = await import('../src/db/seed.js')
    await seedDefaults()

    const { getPlatformDb } = await import('../src/db/client.js')
    const db = getPlatformDb()
    const row = await db
      .selectFrom('profiles')
      .select(['gotrue_id'])
      .where('id', '=', 1)
      .executeTakeFirst()

    expect(row?.gotrue_id).toBe(expectedUserId)
  })

  it('updates profile identity when the admin email changes', async () => {
    const initialUserId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    const updatedUserId = 'ffffffff-1111-2222-3333-444444444444'

    await initMemDatabase()

    let callIndex = 0
    const fetchSpy = createFetchStub(async (input: RequestInfo | URL) => {
      const url = input.toString()
      if (url.endsWith('/admin/users')) {
        const ids = [initialUserId, updatedUserId]
        const id = ids[Math.min(callIndex, ids.length - 1)]
        callIndex += 1
        return new Response(JSON.stringify({ user: { id } }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response(null, { status: 404 })
    })

    const { seedDefaults } = await import('../src/db/seed.js')
    const { getPlatformDb } = await import('../src/db/client.js')
    const db = getPlatformDb()

    setEnv({ PLATFORM_ADMIN_EMAIL: 'admin@example.com' })
    await seedDefaults()

    let profile = await db
      .selectFrom('profiles')
      .select(['gotrue_id', 'primary_email'])
      .where('id', '=', 1)
      .executeTakeFirst()

    expect(profile?.gotrue_id).toBe(initialUserId)
    expect(profile?.primary_email).toBe('admin@example.com')

    setEnv({ PLATFORM_ADMIN_EMAIL: 'new-admin@example.com' })
    await seedDefaults()

    profile = await db
      .selectFrom('profiles')
      .select(['gotrue_id', 'primary_email'])
      .where('id', '=', 1)
      .executeTakeFirst()

    expect(profile?.gotrue_id).toBe(updatedUserId)
    expect(profile?.primary_email).toBe('new-admin@example.com')
  })

  it('retries GoTrue reconciliation before succeeding', async () => {
    await initMemDatabase()

    const expectedUserId = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff'
    const responses = [
      new Response('temporarily unavailable', { status: 503 }),
      new Response('still booting', { status: 502 }),
      new Response(JSON.stringify({ user: { id: expectedUserId } }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    ]

    const fetchSpy = createFetchStub(async (input: RequestInfo | URL) => {
      const url = input.toString()
      if (url.endsWith('/admin/users')) {
        return responses.shift() ?? new Response(null, { status: 500 })
      }
      return new Response(null, { status: 404 })
    })

    setEnv({
      PLATFORM_ADMIN_EMAIL: 'admin@example.com',
      PLATFORM_ADMIN_SEED_RETRY_ATTEMPTS: '4',
      PLATFORM_ADMIN_SEED_RETRY_DELAY_MS: '5',
      PLATFORM_ADMIN_SEED_MAX_DELAY_MS: '10',
    })

    const { seedDefaults } = await import('../src/db/seed.js')
    await seedDefaults()

    const { getPlatformDb } = await import('../src/db/client.js')
    const db = getPlatformDb()
    const profile = await db
      .selectFrom('profiles')
      .select(['gotrue_id'])
      .where('id', '=', 1)
      .executeTakeFirst()

    expect(fetchSpy).toHaveBeenCalledTimes(3)
    expect(profile?.gotrue_id).toBe(expectedUserId)
  })

  it('reassigns memberships back to the seeded admin profile', async () => {
    await initMemDatabase()

    const initialUserId = '99999999-aaaa-bbbb-cccc-dddddddddddd'
    const reconciledUserId = 'eeeeeeee-ffff-0000-1111-222222222222'

    let callCount = 0
    const fetchSpy = createFetchStub(async (input: RequestInfo | URL) => {
      const url = input.toString()
      if (url.endsWith('/admin/users')) {
        const ids = [initialUserId, reconciledUserId]
        const id = ids[Math.min(callCount, ids.length - 1)]
        callCount += 1
        return new Response(JSON.stringify({ user: { id } }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response(null, { status: 404 })
    })

    const { seedDefaults } = await import('../src/db/seed.js')
    const { getPlatformDb } = await import('../src/db/client.js')
    const db = getPlatformDb()

    setEnv({ PLATFORM_ADMIN_EMAIL: 'admin@example.com' })
    await seedDefaults()

    // Simulate a fresh login that created a secondary profile/membership
    const { ensureProfile } = await import('../src/store/profile.js')
    const secondaryUserId = reconciledUserId
    const duplicateProfile = await ensureProfile(secondaryUserId, 'admin@example.com')

    await db
      .updateTable('organization_members')
      .set({
        profile_id: duplicateProfile.id,
        role_ids: [1],
        metadata: {},
        is_owner: true,
      })
      .where('profile_id', '=', 1)
      .execute()

    setEnv({ PLATFORM_ADMIN_EMAIL: 'admin@example.com' })
    await seedDefaults()

    const profiles = await db
      .selectFrom('profiles')
      .select(['id', 'gotrue_id'])
      .orderBy('id', 'asc')
      .execute()

    expect(profiles).toEqual([
      expect.objectContaining({ id: 1, gotrue_id: reconciledUserId }),
    ])

    const membership = await db
      .selectFrom('organization_members')
      .select(['profile_id', 'role_ids', 'is_owner'])
      .where('organization_id', '=', 1)
      .executeTakeFirst()

    expect(membership?.profile_id).toBe(1)
    expect(membership?.role_ids).toEqual([1])
    expect(membership?.is_owner).toBe(true)
  })

  it('fails when GoTrue never returns the admin user', async () => {
    await initMemDatabase()

    const fetchSpy = createFetchStub(async (input: RequestInfo | URL) => {
      const url = input.toString()
      if (url.endsWith('/admin/users')) {
        return new Response('temporarily unavailable', { status: 503 })
      }
      return new Response(null, { status: 404 })
    })

    setEnv({
      PLATFORM_ADMIN_EMAIL: 'admin@example.com',
      PLATFORM_ADMIN_SEED_RETRY_ATTEMPTS: '2',
      PLATFORM_ADMIN_SEED_RETRY_DELAY_MS: '0',
      PLATFORM_ADMIN_SEED_MAX_DELAY_MS: '0',
    })

    const { seedDefaults } = await import('../src/db/seed.js')
    await expect(seedDefaults()).rejects.toThrow(/Failed to ensure platform admin account/)

    const { getPlatformDb } = await import('../src/db/client.js')
    const db = getPlatformDb()
    const profileRows = await db.selectFrom('profiles').select(['id']).execute()
    expect(profileRows).toHaveLength(0)
  })

  it('merges duplicate admin memberships and retains invitations', async () => {
    await initMemDatabase()

    const adminUserId = 'cccccccc-dddd-eeee-ffff-000000000000'
    const fetchSpy = createFetchStub(async (input: RequestInfo | URL) => {
      const url = input.toString()
      if (url.endsWith('/admin/users')) {
        return new Response(JSON.stringify({ user: { id: adminUserId } }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response(null, { status: 404 })
    })

    const { seedDefaults } = await import('../src/db/seed.js')
    const { getPlatformDb } = await import('../src/db/client.js')
    const db = getPlatformDb()

    setEnv({ PLATFORM_ADMIN_EMAIL: 'admin@example.com' })
    await seedDefaults()

    const roles = await db
      .selectFrom('organization_roles')
      .select(['id', 'base_role_id'])
      .where('organization_id', '=', DEFAULT_ORG_ID)
      .execute()
    const ownerRoleId = Number(roles.find((role) => role.base_role_id === 1)?.id)
    const developerRoleId = Number(roles.find((role) => role.base_role_id === 3)?.id)
    expect(ownerRoleId).toBeGreaterThan(0)
    expect(developerRoleId).toBeGreaterThan(0)

    await db
      .updateTable('organization_members')
      .set({
        role_ids: [ownerRoleId, developerRoleId],
        metadata: roleScopedProjectsMetadata([
          { roleId: developerRoleId, projects: ['existing-project'] },
        ]),
      })
      .where('organization_id', '=', DEFAULT_ORG_ID)
      .where('profile_id', '=', baseProfile.id)
      .execute()

    const duplicateProfileId = 998
    const duplicateGotrueId = randomUUID()

    await db
      .insertInto('profiles')
      .values({
        id: duplicateProfileId,
        gotrue_id: duplicateGotrueId,
        auth0_id: 'duplicate|auth0',
        username: 'admin-duplicate',
        first_name: 'Dupe',
        last_name: 'Admin',
        primary_email: baseProfile.primary_email,
        mobile: baseProfile.mobile ?? '',
        free_project_limit: baseProfile.free_project_limit,
        is_alpha_user: baseProfile.is_alpha_user,
        is_sso_user: baseProfile.is_sso_user,
        disabled_features: [],
      })
      .execute()

    await db
      .insertInto('organization_members')
      .values({
        organization_id: DEFAULT_ORG_ID,
        profile_id: duplicateProfileId,
        role_ids: [developerRoleId],
        metadata: roleScopedProjectsMetadata([
          { roleId: developerRoleId, projects: ['dup-project'] },
        ]),
        mfa_enabled: false,
        is_owner: false,
      })
      .execute()

    const invitationToken = randomUUID()
    await db
      .insertInto('organization_invitations')
      .values({
        organization_id: DEFAULT_ORG_ID,
        invited_email: 'duplicate-invitee@example.com',
        role_id: developerRoleId,
        token: invitationToken,
        metadata: {},
        expires_at: new Date(Date.now() + 86_400_000).toISOString(),
        invited_by_profile_id: duplicateProfileId,
      })
      .execute()

    await seedDefaults()

    const mergedMembership = await db
      .selectFrom('organization_members')
      .select(['metadata', 'role_ids'])
      .where('organization_id', '=', DEFAULT_ORG_ID)
      .where('profile_id', '=', baseProfile.id)
      .executeTakeFirst()

    expect(mergedMembership?.role_ids).toEqual(
      expect.arrayContaining([ownerRoleId, developerRoleId])
    )
    const mergedMetadata = (mergedMembership?.metadata as Record<string, unknown>) ?? {}
    const mergedScopes = mergedMetadata.role_scoped_projects as Record<string, string[]> | undefined
    expect(mergedScopes?.[String(developerRoleId)]).toEqual(['dup-project', 'existing-project'])

    const invitationRow = await db
      .selectFrom('organization_invitations')
      .select(['invited_by_profile_id'])
      .where('token', '=', invitationToken)
      .executeTakeFirst()
    expect(invitationRow?.invited_by_profile_id).toBe(baseProfile.id)

    const duplicateProfiles = await db
      .selectFrom('profiles')
      .select(['id'])
      .where('id', '=', duplicateProfileId)
      .execute()
    expect(duplicateProfiles).toHaveLength(0)
  })

  it('realigns foreign key references when consolidating duplicate admin profiles', async () => {
    await initMemDatabase()

    const adminUserId = 'eeeeeeee-ffff-0000-1111-222222222222'

    const fetchSpy = createFetchStub(async (input: RequestInfo | URL) => {
      const url = input.toString()
      if (url.endsWith('/admin/users')) {
        return new Response(JSON.stringify({ user: { id: adminUserId } }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response(null, { status: 404 })
    })

    const { seedDefaults } = await import('../src/db/seed.js')
    const { getPlatformDb } = await import('../src/db/client.js')
    const db = getPlatformDb()

    setEnv({ PLATFORM_ADMIN_EMAIL: 'admin@example.com' })
    await seedDefaults()

    const duplicateProfileId = 997
    const duplicateGotrueId = randomUUID()

    await db
      .insertInto('profiles')
      .values({
        id: duplicateProfileId,
        gotrue_id: duplicateGotrueId,
        auth0_id: 'duplicate|auth0',
        username: 'admin-duplicate-fk',
        first_name: 'Dupe',
        last_name: 'Reference',
        primary_email: baseProfile.primary_email,
        mobile: baseProfile.mobile ?? '',
        free_project_limit: baseProfile.free_project_limit,
        is_alpha_user: baseProfile.is_alpha_user,
        is_sso_user: baseProfile.is_sso_user,
        disabled_features: [],
      })
      .execute()

    await sql`
      CREATE TABLE IF NOT EXISTS ${sql.raw('platform.audit_actor_profiles')} (
        id BIGSERIAL PRIMARY KEY,
        actor_profile_id BIGINT NOT NULL REFERENCES ${sql.raw('platform.profiles')} (id)
      )
    `.execute(db)

    await sql`
      INSERT INTO ${sql.raw('platform.audit_actor_profiles')} (actor_profile_id)
      VALUES (${duplicateProfileId})
    `.execute(db)

    await seedDefaults()

    const updated = await sql<{ actor_profile_id: number }>`
      SELECT actor_profile_id
      FROM ${sql.raw('platform.audit_actor_profiles')}
      ORDER BY id DESC
      LIMIT 1
    `.execute(db)

    expect(updated.rows?.[0]?.actor_profile_id).toBe(baseProfile.id)

    await sql`DROP TABLE IF EXISTS ${sql.raw('platform.audit_actor_profiles')}`.execute(db)
    expect(fetchSpy).toHaveBeenCalled()
  })

  it('preserves owner metadata when reasserting ownership', async () => {
    await initMemDatabase()

    const adminUserId = 'dddddddd-eeee-ffff-1111-222222222222'
    const fetchSpy = createFetchStub(async (input: RequestInfo | URL) => {
      const url = input.toString()
      if (url.endsWith('/admin/users')) {
        return new Response(JSON.stringify({ user: { id: adminUserId } }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response(null, { status: 404 })
    })

    const { seedDefaults } = await import('../src/db/seed.js')
    const { getPlatformDb } = await import('../src/db/client.js')
    const db = getPlatformDb()

    setEnv({ PLATFORM_ADMIN_EMAIL: 'admin@example.com' })
    await seedDefaults()

    const complexMetadata = {
      nested: { flag: true },
      ...roleScopedProjectsMetadata([{ roleId: 1, projects: ['project-x'] }]),
    }

    await db
      .updateTable('organization_members')
      .set({
        is_owner: false,
        metadata: complexMetadata,
      })
      .where('organization_id', '=', DEFAULT_ORG_ID)
      .where('profile_id', '=', baseProfile.id)
      .execute()

    await seedDefaults()

    const membership = await db
      .selectFrom('organization_members')
      .select(['metadata', 'is_owner'])
      .where('organization_id', '=', DEFAULT_ORG_ID)
      .where('profile_id', '=', baseProfile.id)
      .executeTakeFirst()

    expect(membership?.is_owner).toBe(true)
    expect(membership?.metadata).toEqual({
      nested: { flag: true },
      role_scoped_projects: { '1': ['project-x'] },
    })
  })
})
