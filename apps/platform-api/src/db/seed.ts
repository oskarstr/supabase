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

const normalizeBillingPartner = (
  value: string | null | undefined
): 'fly' | 'aws_marketplace' | 'vercel_marketplace' | null => {
  if (value === 'fly' || value === 'aws_marketplace' || value === 'vercel_marketplace') {
    return value
  }
  return null
}

export const seedDefaults = async () => {
  const runtimeAdminEmail =
    process.env.PLATFORM_ADMIN_EMAIL?.trim() || DEFAULT_ADMIN_EMAIL
  const runtimeAdminPassword =
    process.env.PLATFORM_ADMIN_PASSWORD?.trim() || DEFAULT_ADMIN_PASSWORD

  const adminIdentity = await ensureAdminAuthUser(runtimeAdminEmail, runtimeAdminPassword)
  const adminUserId = adminIdentity?.userId ?? null
  const adminEmail = adminIdentity?.email ?? runtimeAdminEmail

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
        .select(['id'])
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

  if (adminUserId) {
    await db
      .updateTable('profiles')
      .set({
        gotrue_id: adminUserId,
        primary_email: adminEmail,
      })
      .where('id', '=', baseProfile.id)
      .execute()
  }

  console.log('[platform-db] default seed complete')
}

type AdminUserIdentity = {
  userId: string
  email: string
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

    if (response.status === 409) {
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

    const users = (await lookup.json().catch(() => [])) as Array<{ id: string }> | undefined
    const userId = users?.[0]?.id
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
