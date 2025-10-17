import Fastify from 'fastify'
import { randomUUID } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { constants } from '@supabase/shared-types'

import { PERMISSION_MATRIX } from '../src/config/permission-matrix.js'

import { authenticateRequest } from '../src/plugins/authenticate.js'
import {
  authHeaders,
  createTestJwt,
  TEST_JWT_SECRET,
  TEST_USER_EMAIL,
  TEST_USER_ID,
} from './utils/auth.js'
import { initTestDatabase } from './utils/db.js'
import { captureEnv, patchEnv, restoreEnv } from './utils/env.js'

const { PermissionAction } = constants

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

describe('profile permissions route', () => {
  let app: Awaited<ReturnType<typeof createApp>>
  let platformDb: Awaited<ReturnType<typeof import('../src/db/client.js')['getPlatformDb']>>
  let defaultOrganizationSlug = ''
  let defaultOrganizationId = 0
  let defaultProjectRef = ''

  const ownerHeaders = () => authHeaders()

  const headersForSubject = (sub: string, email?: string) => ({
    authorization: `Bearer ${createTestJwt({ sub, email })}`,
  })

  const roleIdForBaseRole = async (organizationId: number, baseRoleId: number) => {
    const row = await platformDb
      .selectFrom('organization_roles')
      .select(['id'])
      .where('organization_id', '=', organizationId)
      .where('base_role_id', '=', baseRoleId)
      .executeTakeFirst()
    return Number(row?.id ?? 0)
  }

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
  })

  it('returns wildcard permissions for an organization owner', async () => {
    const { ensureProfile } = await import('../src/store/profile.js')
    const ownerProfile = await ensureProfile(TEST_USER_ID, TEST_USER_EMAIL)

    const ownerRoleId = await roleIdForBaseRole(defaultOrganizationId, 1)
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

    const response = await app.inject({
      method: 'GET',
      url: '/api/platform/profile/permissions',
      headers: ownerHeaders(),
    })

    expect(response.statusCode).toBe(200)
    const permissions = response.json() as AccessControlPermissionResponse[]
    expect(permissions.length).toBeGreaterThan(0)
    const wildcard = permissions.find((entry) => entry.organization_slug === defaultOrganizationSlug)
    expect(wildcard?.actions).toEqual(['%'])
    expect(wildcard?.resources).toEqual(['%'])
    expect(wildcard?.project_refs).toBeNull()
    expect(wildcard?.project_ids).toBeNull()
  })

  it('returns no permissions for a profile without memberships', async () => {
    const subjectId = randomUUID()
    const subjectEmail = 'no-memberships@example.com'
    const { ensureProfile } = await import('../src/store/profile.js')
    await ensureProfile(subjectId, subjectEmail)

    const response = await app.inject({
      method: 'GET',
      url: '/api/platform/profile/permissions',
      headers: headersForSubject(subjectId, subjectEmail),
    })

    expect(response.statusCode).toBe(200)
    const permissions = response.json() as AccessControlPermissionResponse[]
    expect(permissions).toHaveLength(0)
  })

  it('returns project-scoped permissions for developer roles using scoped metadata', async () => {
    const developerId = randomUUID()
    const developerEmail = 'developer@example.com'
    const { ensureProfile } = await import('../src/store/profile.js')
    const developerProfile = await ensureProfile(developerId, developerEmail)

    const developerRoleId = await roleIdForBaseRole(defaultOrganizationId, 3)
    const { upsertOrganizationMemberRole } = await import(
      '../src/store/organization-members.js'
    )

    await upsertOrganizationMemberRole(defaultOrganizationSlug, developerProfile, developerRoleId, [
      defaultProjectRef,
    ])

    const response = await app.inject({
      method: 'GET',
      url: '/api/platform/profile/permissions',
      headers: headersForSubject(developerId, developerEmail),
    })

    expect(response.statusCode).toBe(200)
    const permissions = response.json() as AccessControlPermissionResponse[]
    expect(permissions.length).toBeGreaterThan(0)

    const scopedPermissions = permissions.filter(
      (entry) =>
        entry.organization_slug === defaultOrganizationSlug &&
        entry.project_refs?.includes(defaultProjectRef)
    )
    expect(scopedPermissions.length).toBeGreaterThan(0)
    const hasNonWildcardResource = scopedPermissions.some((permission) =>
      permission.resources.some((resource) => resource !== '%')
    )
    expect(hasNonWildcardResource).toBe(true)

    const organizationPermissions = permissions.filter(
      (entry) =>
        entry.organization_slug === defaultOrganizationSlug && entry.project_refs === null
    )

    const integrationPermissions = organizationPermissions.filter((permission) =>
      permission.resources.some((resource) =>
        ['integrations.github_connections', 'integrations.vercel_connections'].includes(resource)
      )
    )
    expect(integrationPermissions.length).toBe(0)

    const previewBranchPermissions = permissions.filter((permission) =>
      permission.resources.includes('preview_branches')
    )
    expect(previewBranchPermissions.length).toBe(0)
  })

  it('grants billing management permissions to organization-level developers', async () => {
    const developerId = randomUUID()
    const developerEmail = 'org-developer@example.com'
    const { ensureProfile } = await import('../src/store/profile.js')
    const developerProfile = await ensureProfile(developerId, developerEmail)

    const developerRoleId = await roleIdForBaseRole(defaultOrganizationId, 3)
    const { upsertOrganizationMemberRole } = await import(
      '../src/store/organization-members.js'
    )

    await upsertOrganizationMemberRole(defaultOrganizationSlug, developerProfile, developerRoleId)

    const response = await app.inject({
      method: 'GET',
      url: '/api/platform/profile/permissions',
      headers: headersForSubject(developerId, developerEmail),
    })

    expect(response.statusCode).toBe(200)
    const permissions = response.json() as AccessControlPermissionResponse[]
    const organizationPermissions = permissions.filter(
      (entry) =>
        entry.organization_slug === defaultOrganizationSlug && entry.project_refs === null
    )

    const billingWrite = organizationPermissions.find(
      (permission) =>
        permission.resources.includes('stripe.customer') &&
        permission.actions.includes(PermissionAction.BILLING_WRITE)
    )
    expect(billingWrite).toBeDefined()
  })

  it('unions permissions across multiple organization memberships', async () => {
    const memberId = randomUUID()
    const memberEmail = 'multi-org@example.com'
    const { ensureProfile } = await import('../src/store/profile.js')
    const memberProfile = await ensureProfile(memberId, memberEmail)

    const { upsertOrganizationMemberRole } = await import('../src/store/organization-members.js')
    const { createOrganization } = await import('../src/store/organizations.js')

    const secondaryOrg = await createOrganization(memberProfile, {
      name: 'Secondary Organization',
      tier: 'tier_free',
    })

    const developerRoleId = await roleIdForBaseRole(defaultOrganizationId, 3)
    await upsertOrganizationMemberRole(defaultOrganizationSlug, memberProfile, developerRoleId, [
      defaultProjectRef,
    ])

    const response = await app.inject({
      method: 'GET',
      url: '/api/platform/profile/permissions',
      headers: headersForSubject(memberId, memberEmail),
    })

    expect(response.statusCode).toBe(200)
    const permissions = response.json() as AccessControlPermissionResponse[]
    expect(permissions.length).toBeGreaterThanOrEqual(2)

    const primaryResources = permissions.filter(
      (entry) =>
        entry.organization_slug === defaultOrganizationSlug &&
        entry.project_refs?.includes(defaultProjectRef)
    )
    expect(primaryResources.length).toBeGreaterThan(0)
    const hasPrimaryNonWildcard = primaryResources.some((permission) =>
      permission.resources.some((resource) => resource !== '%')
    )
    expect(hasPrimaryNonWildcard).toBe(true)

    const secondary = permissions.find((entry) => entry.organization_slug === secondaryOrg.slug)
    expect(secondary?.project_refs).toBeNull()
    expect(secondary?.actions).toEqual(['%'])
    expect(secondary?.resources).toEqual(['%'])
  })

  it('grants administrators the permissions defined in the matrix', async () => {
    const adminId = randomUUID()
    const adminEmail = 'matrix-admin@example.com'
    const { ensureProfile } = await import('../src/store/profile.js')
    const adminProfile = await ensureProfile(adminId, adminEmail)

    const adminRoleId = await roleIdForBaseRole(defaultOrganizationId, 2)
    const { upsertOrganizationMemberRole } = await import('../src/store/organization-members.js')

    await upsertOrganizationMemberRole(defaultOrganizationSlug, adminProfile, adminRoleId)

    const response = await app.inject({
      method: 'GET',
      url: '/api/platform/profile/permissions',
      headers: headersForSubject(adminId, adminEmail),
    })

    expect(response.statusCode).toBe(200)
    const permissions = response.json() as AccessControlPermissionResponse[]

    const matrixEntries = PERMISSION_MATRIX.filter((entry) => entry.roles.includes('admin'))
    matrixEntries.forEach((entry) => {
      const match = permissions.find((permission) => {
        if (permission.organization_slug !== defaultOrganizationSlug) return false
        if (!permission.actions.includes(entry.action)) return false
        if (!permission.resources.includes(entry.resource)) return false
        return permission.project_refs === null
      })
      expect(match).toBeDefined()
    })
  })

  it('limits read-only members to read access', async () => {
    const readOnlyId = randomUUID()
    const readOnlyEmail = 'readonly@example.com'
    const { ensureProfile } = await import('../src/store/profile.js')
    const readOnlyProfile = await ensureProfile(readOnlyId, readOnlyEmail)

    const readOnlyRoleId = await roleIdForBaseRole(defaultOrganizationId, 4)
    const { upsertOrganizationMemberRole } = await import(
      '../src/store/organization-members.js'
    )

    await upsertOrganizationMemberRole(defaultOrganizationSlug, readOnlyProfile, readOnlyRoleId, [
      defaultProjectRef,
    ])

    const response = await app.inject({
      method: 'GET',
      url: '/api/platform/profile/permissions',
      headers: headersForSubject(readOnlyId, readOnlyEmail),
    })

    expect(response.statusCode).toBe(200)
    const permissions = response.json() as AccessControlPermissionResponse[]
    const scoped = permissions.filter(
      (entry) =>
        entry.project_refs?.includes(defaultProjectRef) &&
        entry.organization_slug === defaultOrganizationSlug
    )
    expect(scoped.length).toBeGreaterThan(0)
    const readOnlyMatrix = PERMISSION_MATRIX.filter(
      (entry) => entry.roles.includes('read_only') && entry.scope === 'project'
    )

    const allowedPairs = new Set(
      readOnlyMatrix.map((entry) => `${entry.resource}::${entry.action}`)
    )

    scoped.forEach((permission) => {
      expect(permission.project_refs).toContain(defaultProjectRef)
      permission.resources.forEach((resource) => {
        permission.actions.forEach((action) => {
          expect(allowedPairs.has(`${resource}::${action}`)).toBe(true)
        })
      })
    })

    const hasStorageContentAccess = permissions.some((permission) =>
      permission.resources.includes('user_content')
    )
    expect(hasStorageContentAccess).toBe(false)
  })
})

type AccessControlPermissionResponse = {
  actions: string[]
  condition: unknown
  organization_id: number | null
  organization_slug: string
  project_ids: number[] | null
  project_refs: string[] | null
  resources: string[]
  restrictive?: boolean | null
}
