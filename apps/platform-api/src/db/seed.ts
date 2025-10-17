import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'

import {
  baseOrganizations,
  baseProfile,
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_ANON_KEY,
  DEFAULT_BRANCH_ENABLED,
  DEFAULT_CLOUD_PROVIDER,
  DEFAULT_CONNECTION_STRING,
  DEFAULT_DB_HOST,
  DEFAULT_DB_VERSION,
  DEFAULT_INFRA_SIZE,
  DEFAULT_ORG_ID,
  DEFAULT_ORG_SLUG,
  DEFAULT_PHYSICAL_BACKUPS,
  DEFAULT_PROJECT_NAME,
  DEFAULT_PROJECT_REF,
  DEFAULT_PROJECT_SUBSCRIPTION_ID,
  DEFAULT_REGION,
  DEFAULT_REST_URL,
  DEFAULT_SERVICE_KEY,
  PLATFORM_DEBUG_ENABLED,
  PLATFORM_PROJECT_ANON_KEY,
  PLATFORM_PROJECT_NAME,
  PLATFORM_PROJECT_REF,
  PLATFORM_PROJECT_SERVICE_KEY,
  PLATFORM_PROJECT_SUBSCRIPTION_ID,
  nowIso,
} from '../config/defaults.js'
import { PROJECTS_ROOT } from '../store/state.js'
import { sql } from 'kysely'
import { getPlatformDb } from './client.js'

const OWNER_ROLE = {
  base_role_id: 1,
  name: 'Owner',
  description: 'Full access to organization management features.',
}

const DEFAULT_ROLE_DEFS = [
  OWNER_ROLE,
  {
    base_role_id: 2,
    name: 'Administrator',
    description: 'Manage projects and members.',
  },
  {
    base_role_id: 3,
    name: 'Developer',
    description: 'Developer access to project resources.',
  },
  {
    base_role_id: 4,
    name: 'Read-only',
    description: 'Read-only access to project resources.',
  },
]

const DEFAULT_INVITATIONS = [
  {
    invited_email: 'new-contributor@example.com',
    role_base_id: 3,
  },
]

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    if (ms <= 0) {
      resolve()
      return
    }
    setTimeout(resolve, ms)
  })

const mergeRoleIds = (...roleSets: Array<readonly unknown[] | null | undefined>): number[] => {
  const seen = new Set<number>()
  for (const roles of roleSets) {
    if (!Array.isArray(roles)) continue
    for (const role of roles) {
      const value = Number(role)
      if (Number.isFinite(value)) {
        seen.add(value)
      }
    }
  }
  return Array.from(seen).sort((a, b) => a - b)
}

const sanitizeProjectRefs = (input: unknown): string[] => {
  if (!Array.isArray(input)) return []
  const refs = new Set<string>()
  for (const value of input) {
    if (typeof value !== 'string') continue
    const normalized = value.trim()
    if (normalized.length > 0) {
      refs.add(normalized)
    }
  }
  return Array.from(refs).sort()
}

const normalizeRoleScopedRecord = (value: unknown): Record<string, string[]> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const record: Record<string, string[]> = {}
  for (const [roleId, refs] of Object.entries(value as Record<string, unknown>)) {
    const sanitized = sanitizeProjectRefs(refs)
    if (sanitized.length > 0) {
      record[roleId] = sanitized
    }
  }
  return record
}

const mergeMemberMetadata = (
  primary: Record<string, unknown> | null | undefined,
  secondary: Record<string, unknown> | null | undefined
): Record<string, unknown> => {
  const primaryRecord = (primary ?? {}) as Record<string, unknown>
  const secondaryRecord = (secondary ?? {}) as Record<string, unknown>
  const merged: Record<string, unknown> = { ...secondaryRecord, ...primaryRecord }

  const scopedUnion = new Map<string, Set<string>>()
  const addEntries = (value: unknown) => {
    const normalized = normalizeRoleScopedRecord(value)
    for (const [roleId, refs] of Object.entries(normalized)) {
      if (!scopedUnion.has(roleId)) {
        scopedUnion.set(roleId, new Set<string>())
      }
      const bucket = scopedUnion.get(roleId)!
      refs.forEach((ref) => bucket.add(ref))
    }
  }

  addEntries(secondaryRecord['role_scoped_projects'])
  addEntries(primaryRecord['role_scoped_projects'])

  if (scopedUnion.size > 0) {
    const roleScopedProjects: Record<string, string[]> = {}
    for (const [roleId, refs] of scopedUnion.entries()) {
      const values = Array.from(refs).sort()
      if (values.length > 0) {
        roleScopedProjects[roleId] = values
      }
    }
    if (Object.keys(roleScopedProjects).length > 0) {
      merged.role_scoped_projects = roleScopedProjects
    } else {
      delete merged.role_scoped_projects
    }
  } else if ('role_scoped_projects' in merged) {
    delete merged.role_scoped_projects
  }

  return merged
}

const normalizeBillingPartner = (
  value: string | null | undefined
): 'fly' | 'aws_marketplace' | 'vercel_marketplace' | null => {
  if (value === 'fly' || value === 'aws_marketplace' || value === 'vercel_marketplace') {
    return value
  }
  return null
}

const parsePositiveIntEnv = (value: string | undefined, fallback: number, min = 1, max?: number) => {
  const parsed = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(parsed) || parsed < min) return Math.max(min, fallback)
  if (typeof max === 'number' && parsed > max) return max
  return parsed
}

const adminSeedRetryAttempts = () => {
  if (
    process.env.PLATFORM_DB_URL === 'pg-mem' &&
    process.env.PLATFORM_ADMIN_SEED_RETRY_ATTEMPTS === undefined
  ) {
    return 1
  }
  return parsePositiveIntEnv(process.env.PLATFORM_ADMIN_SEED_RETRY_ATTEMPTS, 5)
}

const adminSeedRetryDelayMs = () => {
  if (
    process.env.PLATFORM_DB_URL === 'pg-mem' &&
    process.env.PLATFORM_ADMIN_SEED_RETRY_DELAY_MS === undefined
  ) {
    return 0
  }
  return parsePositiveIntEnv(process.env.PLATFORM_ADMIN_SEED_RETRY_DELAY_MS, 1000, 0)
}

const adminSeedMaxDelayMs = () => {
  if (
    process.env.PLATFORM_DB_URL === 'pg-mem' &&
    process.env.PLATFORM_ADMIN_SEED_MAX_DELAY_MS === undefined
  ) {
    return 0
  }
  return parsePositiveIntEnv(process.env.PLATFORM_ADMIN_SEED_MAX_DELAY_MS, 10000, 100, 60000)
}

const hasAdminBootstrapConfiguration = (email: string, password: string) => {
  const gotrueUrl =
    process.env.SUPABASE_GOTRUE_URL?.trim() || process.env.GOTRUE_URL?.trim()
  const serviceKey =
    process.env.SUPABASE_SERVICE_KEY?.trim() || process.env.SERVICE_ROLE_KEY?.trim()
  return Boolean(gotrueUrl && serviceKey && email && password)
}

export const seedDefaults = async () => {
  const runtimeAdminEmail =
    process.env.PLATFORM_ADMIN_EMAIL?.trim() || DEFAULT_ADMIN_EMAIL
  const runtimeAdminPassword =
    process.env.PLATFORM_ADMIN_PASSWORD?.trim() || DEFAULT_ADMIN_PASSWORD

  const adminIdentity = await ensureAdminIdentityWithRetry(
    runtimeAdminEmail,
    runtimeAdminPassword
  )
  const adminUserId = adminIdentity.userId
  const adminEmail = adminIdentity.email ?? runtimeAdminEmail

  const db = getPlatformDb()

  await db.transaction().execute(async (trx) => {
    const existingProfile = await trx
      .selectFrom('profiles')
      .select(['id'])
      .where('id', '=', baseProfile.id)
      .executeTakeFirst()

    if (!existingProfile) {
      await trx
        .insertInto('profiles')
        .values({
          id: baseProfile.id,
          gotrue_id: baseProfile.gotrue_id,
          auth0_id: baseProfile.auth0_id,
          username: baseProfile.username,
          first_name: baseProfile.first_name,
          last_name: baseProfile.last_name,
          primary_email: baseProfile.primary_email,
          mobile: baseProfile.mobile ?? '',
          free_project_limit: baseProfile.free_project_limit,
          is_alpha_user: baseProfile.is_alpha_user,
          is_sso_user: baseProfile.is_sso_user,
          disabled_features: baseProfile.disabled_features,
        })
        .execute()
    }

    for (const organization of baseOrganizations) {
      const existingOrg = await trx
        .selectFrom('organizations')
        .select(['id'])
        .where('slug', '=', organization.slug)
        .executeTakeFirst()

      let organizationId = existingOrg?.id ?? organization.id

      if (!existingOrg) {
        const insertedOrg = await trx
          .insertInto('organizations')
          .values({
            id: organization.id,
            slug: organization.slug,
            name: organization.name,
            billing_email: organization.billing_email,
            billing_partner: normalizeBillingPartner(organization.billing_partner),
            organization_requires_mfa: organization.organization_requires_mfa,
            usage_billing_enabled: organization.usage_billing_enabled,
            stripe_customer_id: organization.stripe_customer_id,
            subscription_id: organization.subscription_id,
            plan_id: organization.plan.id,
            plan_name: organization.plan.name,
            opt_in_tags: organization.opt_in_tags,
            restriction_status: organization.restriction_status,
            restriction_data: organization.restriction_data,
          })
          .returning('id')
          .executeTakeFirst()

        if (insertedOrg?.id) {
          organizationId = insertedOrg.id
        }
      }

      if (!organizationId) continue

      const member = await trx
        .selectFrom('organization_members')
        .select(['id', 'role_ids'])
        .where('organization_id', '=', organizationId)
        .where('profile_id', '=', baseProfile.id)
        .executeTakeFirst()

      if (!member) {
        await trx
          .insertInto('organization_members')
          .values({
            organization_id: organizationId,
            profile_id: baseProfile.id,
            role_ids: [OWNER_ROLE.base_role_id],
            metadata: {},
            mfa_enabled: false,
            is_owner: true,
          })
          .execute()
      } else {
        const mergedRoles = mergeRoleIds(member.role_ids, [OWNER_ROLE.base_role_id])
        await trx
          .updateTable('organization_members')
          .set({
            role_ids: mergedRoles,
            is_owner: true,
          })
          .where('id', '=', member.id)
          .execute()
      }

      for (const role of DEFAULT_ROLE_DEFS) {
        const existingRole = await trx
          .selectFrom('organization_roles')
          .select(['id'])
          .where('organization_id', '=', organizationId)
          .where('name', '=', role.name)
          .executeTakeFirst()

        if (!existingRole) {
          await trx
            .insertInto('organization_roles')
            .values({
              organization_id: organizationId,
              base_role_id: role.base_role_id,
              name: role.name,
              description: role.description,
            })
            .execute()
        }
      }

      for (const invite of DEFAULT_INVITATIONS) {
        const role = await trx
          .selectFrom('organization_roles')
          .select(['id'])
          .where('organization_id', '=', organizationId)
          .where('base_role_id', '=', invite.role_base_id)
          .executeTakeFirst()

        if (!role) continue

        const existingInvite = await trx
          .selectFrom('organization_invitations')
          .select(['id'])
          .where('organization_id', '=', organizationId)
          .where('invited_email', '=', invite.invited_email)
          .executeTakeFirst()

        const token = randomUUID()
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

        if (!existingInvite) {
          await trx
            .insertInto('organization_invitations')
            .values({
              organization_id: organizationId,
              invited_email: invite.invited_email,
              role_id: role.id,
              metadata: {},
              token,
              expires_at: expiresAt,
            })
            .execute()
        } else {
          await trx
            .updateTable('organization_invitations')
            .set({
              token,
              expires_at: expiresAt,
              metadata: {},
            })
            .where('id', '=', existingInvite.id)
            .execute()
        }
      }
    }

    const existingProject = await trx
      .selectFrom('projects')
      .select(['id'])
      .where('ref', '=', DEFAULT_PROJECT_REF)
      .executeTakeFirst()

    let projectId = existingProject?.id

    if (!existingProject) {
      const insertedProject = await trx
        .insertInto('projects')
        .values({
          organization_id: DEFAULT_ORG_ID,
          ref: DEFAULT_PROJECT_REF,
          name: DEFAULT_PROJECT_NAME,
          region: DEFAULT_REGION,
          cloud_provider: DEFAULT_CLOUD_PROVIDER,
          status: 'ACTIVE_HEALTHY',
          infra_compute_size: DEFAULT_INFRA_SIZE,
          db_host: DEFAULT_DB_HOST,
          db_version: DEFAULT_DB_VERSION,
          connection_string: DEFAULT_CONNECTION_STRING,
          rest_url: DEFAULT_REST_URL,
          is_branch_enabled: DEFAULT_BRANCH_ENABLED,
          is_physical_backups_enabled: DEFAULT_PHYSICAL_BACKUPS,
          subscription_id: DEFAULT_PROJECT_SUBSCRIPTION_ID,
          preview_branch_refs: [],
          anon_key: DEFAULT_ANON_KEY,
          service_key: DEFAULT_SERVICE_KEY,
        })
        .returning('id')
        .executeTakeFirst()

      projectId = insertedProject?.id
    }

    if (!projectId) return

    const runtime = await trx
      .selectFrom('project_runtimes')
      .select(['project_id'])
      .where('project_id', '=', projectId)
      .executeTakeFirst()

    if (!runtime) {
      const rootDir = resolve(PROJECTS_ROOT, DEFAULT_PROJECT_REF)
      await trx
        .insertInto('project_runtimes')
        .values({
          project_id: projectId,
          root_dir: rootDir,
        })
        .execute()
    }

    const platformProject = await trx
      .selectFrom('projects')
      .selectAll()
      .where('ref', '=', PLATFORM_PROJECT_REF)
      .executeTakeFirst()

    let platformProjectId = platformProject?.id

    if (!platformProject) {
      const insertedPlatformProject = await trx
        .insertInto('projects')
        .values({
          organization_id: DEFAULT_ORG_ID,
          ref: PLATFORM_PROJECT_REF,
          name: PLATFORM_PROJECT_NAME,
          region: DEFAULT_REGION,
          cloud_provider: DEFAULT_CLOUD_PROVIDER,
          status: 'ACTIVE_HEALTHY',
          infra_compute_size: DEFAULT_INFRA_SIZE,
          db_host: DEFAULT_DB_HOST,
          db_version: DEFAULT_DB_VERSION,
          connection_string: DEFAULT_CONNECTION_STRING,
          rest_url: DEFAULT_REST_URL,
          is_branch_enabled: false,
          is_physical_backups_enabled: false,
          subscription_id: PLATFORM_PROJECT_SUBSCRIPTION_ID,
          preview_branch_refs: [],
          anon_key: PLATFORM_PROJECT_ANON_KEY,
          service_key: PLATFORM_PROJECT_SERVICE_KEY,
        })
        .returning('id')
        .executeTakeFirst()

      platformProjectId = insertedPlatformProject?.id
    } else if (
      platformProject.anon_key !== PLATFORM_PROJECT_ANON_KEY ||
      platformProject.service_key !== PLATFORM_PROJECT_SERVICE_KEY ||
      platformProject.rest_url !== DEFAULT_REST_URL ||
      platformProject.connection_string !== DEFAULT_CONNECTION_STRING
    ) {
      await trx
        .updateTable('projects')
        .set({
          anon_key: PLATFORM_PROJECT_ANON_KEY,
          service_key: PLATFORM_PROJECT_SERVICE_KEY,
          rest_url: DEFAULT_REST_URL,
          connection_string: DEFAULT_CONNECTION_STRING,
        })
        .where('id', '=', platformProject.id)
        .execute()
    }

    if (platformProjectId) {
      const runtimeRow = await trx
        .selectFrom('project_runtimes')
        .select(['project_id'])
        .where('project_id', '=', platformProjectId)
        .executeTakeFirst()

      if (!runtimeRow) {
        const platformRoot = resolve(PROJECTS_ROOT, PLATFORM_PROJECT_REF)
        await trx
          .insertInto('project_runtimes')
          .values({
            project_id: platformProjectId,
            root_dir: platformRoot,
          })
          .execute()
      }
    }

    if (process.env.PLATFORM_SKIP_SEQUENCE_RESET !== 'true') {
      const sequenceTables = [
        'platform.profiles',
        'platform.organizations',
        'platform.organization_members',
        'platform.organization_roles',
        'platform.organization_invitations',
        'platform.projects',
        'platform.access_tokens',
        'platform.audit_logs',
      ]

      const isTestDb = process.env.PLATFORM_DB_URL === 'pg-mem'

      for (const table of sequenceTables) {
        const result = await sql<{
          max_id: number
        }>`SELECT COALESCE(MAX(id), 0) AS max_id FROM ${sql.raw(table)}`.execute(trx)
        const maxId = Number(result.rows?.[0]?.max_id ?? 0)
        if (maxId === 0) {
          continue
        }
        if (isTestDb) {
          const sequenceName = `${table.split('.').pop()}_id_seq`
          const seqCheck = await sql
            .raw(`SELECT 1 FROM pg_class WHERE relname = '${sequenceName}'`)
            .execute(trx)
          if (seqCheck.rows?.length) {
            await sql.raw(`SELECT setval('${sequenceName}', ${maxId})`).execute(trx)
          }
        } else {
          await sql
            .raw(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), ${maxId})`)
            .execute(trx)
        }
      }
    }
  })

  await reconcileAdminState(db, adminUserId, adminEmail)

  console.log('[platform-db] default seed complete')
}

type AdminUserIdentity = {
  userId: string
  email: string
}

const ensureAdminIdentityWithRetry = async (
  email: string,
  password: string
): Promise<AdminUserIdentity> => {
  if (!hasAdminBootstrapConfiguration(email, password)) {
    console.warn(
      '[platform-db] admin bootstrap skipped: SUPABASE_GOTRUE_URL or service key not configured'
    )
    const fallback = await getPlatformDb()
      .selectFrom('profiles')
      .select(['gotrue_id'])
      .where('id', '=', baseProfile.id)
      .executeTakeFirst()
    return { userId: fallback?.gotrue_id ?? baseProfile.gotrue_id, email }
  }

  const attempts = adminSeedRetryAttempts()
  const baseDelay = adminSeedRetryDelayMs()
  const maxDelay = Math.max(baseDelay, adminSeedMaxDelayMs())

  let attempt = 0
  let delay = baseDelay
  while (attempt < attempts) {
    const identity = await ensureAdminAuthUser(email, password)
    if (identity) {
      return identity
    }

    attempt += 1
    if (attempt >= attempts) {
      break
    }

    console.warn(
      `[platform-db] failed to ensure admin user (attempt ${attempt}/${attempts}), retrying...`
    )

    const waitFor = Math.max(0, Math.min(delay, maxDelay))
    if (waitFor > 0) {
      await sleep(waitFor)
    }
    delay = Math.min(delay * 2 || baseDelay || 1000, maxDelay)
  }

  throw new Error(
    `Failed to ensure platform admin account after ${attempts} attempt${attempts === 1 ? '' : 's'}. ` +
      'Confirm GoTrue is reachable and the PLATFORM_ADMIN_* credentials are correct.'
  )
}

const reconcileAdminState = async (
  db: ReturnType<typeof getPlatformDb>,
  adminUserId: string,
  adminEmail: string
) => {
  await migrateDuplicateAdminProfiles(db, adminUserId, adminEmail)

  await db
    .updateTable('profiles')
    .set({
      gotrue_id: adminUserId,
      primary_email: adminEmail,
    })
    .where('id', '=', baseProfile.id)
    .execute()

  await ensureAdminOwnerMembership(db)
}

const ensureAdminOwnerMembership = async (db: ReturnType<typeof getPlatformDb>) => {
  const memberships = await db
    .selectFrom('organization_members')
    .select(['id', 'role_ids', 'is_owner', 'organization_id', 'metadata'])
    .where('profile_id', '=', baseProfile.id)
    .execute()

  if (memberships.length === 0) {
    await db
      .insertInto('organization_members')
      .values({
        organization_id: DEFAULT_ORG_ID,
        profile_id: baseProfile.id,
        role_ids: [OWNER_ROLE.base_role_id],
        metadata: {},
        mfa_enabled: false,
        is_owner: true,
      })
      .execute()
    return
  }

  for (const membership of memberships) {
    const mergedRoles = mergeRoleIds(membership.role_ids, [OWNER_ROLE.base_role_id])
    const shouldUpdateRoles =
      membership.role_ids?.length !== mergedRoles.length ||
      mergedRoles.some((role, index) => membership.role_ids?.[index] !== role)

    if (!shouldUpdateRoles && membership.is_owner) {
      continue
    }

    await db
      .updateTable('organization_members')
      .set({
        role_ids: mergedRoles,
        is_owner: true,
        metadata: (membership.metadata as Record<string, unknown> | null) ?? {},
      })
      .where('id', '=', membership.id)
      .execute()
  }
}

const migrateDuplicateAdminProfiles = async (
  db: ReturnType<typeof getPlatformDb>,
  adminUserId: string,
  adminEmail: string
) => {
  const duplicates = await db
    .selectFrom('profiles')
    .select(['id'])
    .where('id', '!=', baseProfile.id)
    .where((eb) =>
      eb.or([
        eb('gotrue_id', '=', adminUserId),
        eb('primary_email', '=', adminEmail),
      ])
    )
    .execute()

  if (duplicates.length === 0) return

  const duplicateIds = duplicates.map((row) => Number(row.id))

  const duplicateMemberships = duplicateIds.length
    ? await db
        .selectFrom('organization_members')
        .select(['id', 'organization_id', 'role_ids', 'metadata'])
        .where('profile_id', 'in', duplicateIds)
        .execute()
    : []

  for (const membership of duplicateMemberships) {
    const existing = await db
      .selectFrom('organization_members')
      .select(['id', 'role_ids', 'metadata'])
      .where('organization_id', '=', membership.organization_id)
      .where('profile_id', '=', baseProfile.id)
      .executeTakeFirst()

    const mergedRoles = mergeRoleIds(
      existing?.role_ids,
      membership.role_ids,
      [OWNER_ROLE.base_role_id]
    )

    if (existing) {
      await db
        .updateTable('organization_members')
        .set({
          role_ids: mergedRoles,
          metadata: mergeMemberMetadata(
            (existing.metadata as Record<string, unknown> | null) ?? null,
            (membership.metadata as Record<string, unknown> | null) ?? null
          ),
          is_owner: true,
        })
        .where('id', '=', existing.id)
        .execute()

      await db
        .deleteFrom('organization_members')
        .where('id', '=', membership.id)
        .execute()
    } else {
      await db
        .updateTable('organization_members')
        .set({
          profile_id: baseProfile.id,
          role_ids: mergedRoles,
          metadata: mergeMemberMetadata(
            (membership.metadata as Record<string, unknown> | null) ?? null,
            null
          ),
          is_owner: true,
        })
        .where('id', '=', membership.id)
        .execute()
    }
  }

  if (duplicateIds.length > 0) {
    await db
      .updateTable('organization_invitations')
      .set({ invited_by_profile_id: baseProfile.id })
      .where('invited_by_profile_id', 'in', duplicateIds)
      .execute()
  }

  await db.deleteFrom('profiles').where('id', 'in', duplicateIds).execute()
}

const ensureAdminAuthUser = async (
  email: string,
  password: string
): Promise<AdminUserIdentity | null> => {
  const gotrueUrl = process.env.SUPABASE_GOTRUE_URL?.trim() || process.env.GOTRUE_URL?.trim()
  const serviceKey =
    process.env.SUPABASE_SERVICE_KEY?.trim() || process.env.SERVICE_ROLE_KEY?.trim()
  const apiKey = process.env.SUPABASE_ANON_KEY?.trim() || process.env.ANON_KEY?.trim() || serviceKey

  if (!gotrueUrl || !serviceKey || !email || !password) {
    return null
  }

  const adminEndpoint = `${gotrueUrl.replace(/\/?$/, '')}/admin/users`

  try {
    const response = await fetch(adminEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey ?? '',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
      }),
    })

    if (response.status === 409 || response.status === 422) {
      return await updateAdminPassword(gotrueUrl, serviceKey, apiKey, email, password)
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      console.warn('[platform-db] failed to ensure admin user', {
        status: response.status,
        body: text,
      })
      return null
    }

    const body = (await response.json().catch(() => null)) as
      | { id?: string; user?: { id?: string } }
      | null

    const id = body?.user?.id ?? body?.id
    if (id) {
      return { userId: id, email }
    }
    return null
  } catch (error) {
    console.warn('[platform-db] error ensuring admin user', error)
    return null
  }
}

const updateAdminPassword = async (
  gotrueUrl: string,
  serviceKey: string,
  apiKey: string | undefined,
  email: string,
  password: string
): Promise<AdminUserIdentity | null> => {
  const baseUrl = gotrueUrl.replace(/\/?$/, '')
  const headers = {
    'Content-Type': 'application/json',
    apikey: apiKey ?? serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  }

  try {
    const lookup = await fetch(`${baseUrl}/admin/users?email=${encodeURIComponent(email)}`, {
      headers,
    })

    if (!lookup.ok) {
      return null
    }

    const lookupPayload = (await lookup.json().catch(() => undefined)) as
      | { users?: Array<{ id: string }> }
      | Array<{ id: string }>
      | undefined

    const userId = Array.isArray(lookupPayload)
      ? lookupPayload[0]?.id
      : lookupPayload?.users?.[0]?.id
    if (!userId) {
      return null
    }

    const update = await fetch(`${baseUrl}/admin/users/${userId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        password,
        email_confirm: true,
      }),
    })

    if (!update.ok) {
      const text = await update.text().catch(() => '')
      console.warn('[platform-db] failed to update admin password', {
        status: update.status,
        body: text,
      })
      return null
    }

    return { userId, email }
  } catch (error) {
    console.warn('[platform-db] error updating admin password', error)
    return null
  }
}
