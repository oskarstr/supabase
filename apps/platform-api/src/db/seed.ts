import { resolve } from 'node:path'

import {
  baseOrganizations,
  baseProfile,
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
  nowIso,
} from '../config/defaults.js'
import { PROJECTS_ROOT } from '../store/state.js'
import { getPlatformDb } from './client.js'
import { sql } from 'kysely'

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

        if (!existingInvite) {
          await trx
            .insertInto('organization_invitations')
            .values({
              organization_id: organizationId,
              invited_email: invite.invited_email,
              role_id: role.id,
            })
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
            .raw(
              `SELECT setval(pg_get_serial_sequence('${table}', 'id'), ${maxId})`
            )
            .execute(trx)
        }
      }
    }
  })

  console.log('[platform-db] default seed complete')
}
