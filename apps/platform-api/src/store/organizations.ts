import { randomUUID } from 'node:crypto'

import { slugify } from './env.js'
import {
  baseProfile,
  DEFAULT_BILLING_EMAIL,
  DEFAULT_ORG_REQUIRES_MFA,
  DEFAULT_STRIPE_CUSTOMER_ID,
  DEFAULT_USAGE_BILLING_ENABLED,
  PLATFORM_DEBUG_ENABLED,
  PLATFORM_PROJECT_REF,
  PLAN_LABELS,
} from '../config/defaults.js'
import { getPlatformDb } from '../db/client.js'
import { toOrganization } from '../db/mappers.js'
import { getProfile } from './profile.js'
import type {
  CreateOrganizationBody,
  GetSubscriptionResponse,
  Organization,
  OrganizationDetailResponse,
  OrganizationProjectsResponse,
} from './types.js'

const db = getPlatformDb()
const CURRENT_PROFILE_ID = baseProfile.id

const toStringRecord = (value: unknown): Record<string, string> | null => {
  if (!value || typeof value !== 'object') return null
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      entry == null ? '' : String(entry),
    ])
  )
}

const TIER_TO_PLAN: Record<CreateOrganizationBody['tier'], Organization['plan']['id']> = {
  tier_free: 'free',
  tier_payg: 'pro',
  tier_pro: 'pro',
  tier_team: 'team',
  tier_enterprise: 'enterprise',
}

const generateUniqueOrgSlug = async (name: string) => {
  const base = slugify(name) || `org-${randomUUID().slice(0, 8)}`
  let candidate = base
  let attempt = 1

  while (attempt < 50) {
    const existing = await db
      .selectFrom('organizations')
      .select(['id'])
      .where('slug', '=', candidate)
      .executeTakeFirst()
    if (!existing) return candidate
    attempt += 1
    candidate = `${base}-${attempt}`
  }
  throw new Error('Failed to generate unique organization slug')
}

const fetchCurrentProfileId = async (): Promise<number> => {
  const profile = await getProfile()
  return profile.id
}

export const listOrganizations = async (): Promise<Organization[]> => {
  const profileId = await fetchCurrentProfileId()

  const rows = await db
    .selectFrom('organizations')
    .leftJoin('organization_members', (join) =>
      join
        .onRef('organization_members.organization_id', '=', 'organizations.id')
        .on('organization_members.profile_id', '=', profileId)
    )
    .selectAll('organizations')
    .select(['organization_members.is_owner'])
    .orderBy('organizations.inserted_at', 'asc')
    .execute()

  return rows.map((row) => {
    const membership =
      row.is_owner === null || row.is_owner === undefined
        ? undefined
        : {
            id: 0,
            organization_id: row.id,
            profile_id: profileId,
            role_ids: [],
            metadata: {},
            mfa_enabled: false,
            is_owner: row.is_owner ?? false,
            inserted_at: row.inserted_at,
            updated_at: row.updated_at,
          }

    return toOrganization({
      organization: row,
      membership,
    })
  })
}

export const getSubscriptionForOrg = (org: Organization): GetSubscriptionResponse => ({
  addons: [],
  billing_cycle_anchor: 0,
  billing_partner: org.billing_partner as GetSubscriptionResponse['billing_partner'],
  billing_via_partner: false,
  cached_egress_enabled: false,
  current_period_end: 0,
  current_period_start: 0,
  customer_balance: 0,
  next_invoice_at: 0,
  payment_method_type: 'card',
  plan: { ...org.plan },
  project_addons: [],
  scheduled_plan_change: null,
  usage_billing_enabled: org.usage_billing_enabled,
})

export const listOrganizationProjects = async (
  slug: string
): Promise<OrganizationProjectsResponse | undefined> => {
  const organization = await db
    .selectFrom('organizations')
    .selectAll()
    .where('slug', '=', slug)
    .executeTakeFirst()
  if (!organization) return undefined

  const projects = await db
    .selectFrom('projects')
    .selectAll()
    .where('organization_id', '=', organization.id)
    .orderBy('inserted_at', 'asc')
    .execute()

  const visibleProjects = projects.filter(
    (project) => PLATFORM_DEBUG_ENABLED || project.ref !== PLATFORM_PROJECT_REF
  )

  return {
    pagination: {
      count: visibleProjects.length,
      limit: visibleProjects.length,
      offset: 0,
    },
    projects: visibleProjects.map((project) => ({
      cloud_provider: project.cloud_provider,
      databases: [
        {
          cloud_provider: project.cloud_provider,
          identifier: project.ref,
          region: project.region,
          status: 'ACTIVE_HEALTHY',
          type: 'PRIMARY',
        },
      ],
      inserted_at: project.inserted_at.toISOString(),
      is_branch: false,
      name: project.name,
      ref: project.ref,
      region: project.region,
      status: project.status,
    })),
  }
}

export const createOrganization = async (body: CreateOrganizationBody): Promise<Organization> => {
  const name = body.name?.trim()
  if (!name) {
    throw new Error('Organization name is required')
  }

  const profileId = await fetchCurrentProfileId()
  const slug = await generateUniqueOrgSlug(name)
  const planId = TIER_TO_PLAN[body.tier] ?? 'free'

  const profile = await getProfile()

  let explicitId: number | undefined
  if (process.env.PLATFORM_DB_URL === 'pg-mem') {
    const maxRow = await db
      .selectFrom('organizations')
      .select(({ fn }) => fn.max('id').as('max_id'))
      .executeTakeFirst()
    explicitId = Number(maxRow?.max_id ?? 0) + 1
  }

  const insertedOrg = await db
    .insertInto('organizations')
    .values({
      ...(explicitId ? { id: explicitId } : {}),
      slug,
      name,
      billing_email: profile.primary_email ?? DEFAULT_BILLING_EMAIL,
      billing_partner: null,
      organization_requires_mfa: DEFAULT_ORG_REQUIRES_MFA,
      usage_billing_enabled: DEFAULT_USAGE_BILLING_ENABLED,
      stripe_customer_id: DEFAULT_STRIPE_CUSTOMER_ID,
      subscription_id: planId === 'free' ? null : randomUUID(),
      plan_id: planId,
      plan_name: PLAN_LABELS[planId] ?? PLAN_LABELS.free,
      opt_in_tags: [],
      restriction_data: null,
      restriction_status: null,
    })
    .returningAll()
    .executeTakeFirstOrThrow()

  await db
    .insertInto('organization_members')
    .values({
      organization_id: insertedOrg.id,
      profile_id: profileId,
      role_ids: [1],
      metadata: {},
      mfa_enabled: false,
      is_owner: true,
    })
    .execute()

  await db
    .insertInto('organization_roles')
    .values([
      {
        organization_id: insertedOrg.id,
        base_role_id: 1,
        name: 'Owner',
        description: 'Full access to organization management features.',
      },
      {
        organization_id: insertedOrg.id,
        base_role_id: 2,
        name: 'Administrator',
        description: 'Manage projects and members.',
      },
      {
        organization_id: insertedOrg.id,
        base_role_id: 3,
        name: 'Developer',
        description: 'Developer access to project resources.',
      },
      {
        organization_id: insertedOrg.id,
        base_role_id: 4,
        name: 'Read-only',
        description: 'Read-only access to project resources.',
      },
    ])
    .execute()

  const developerRole = await db
    .selectFrom('organization_roles')
    .select(['id'])
    .where('organization_id', '=', insertedOrg.id)
    .where('base_role_id', '=', 3)
    .executeTakeFirst()

  if (developerRole?.id) {
    await db
      .insertInto('organization_invitations')
      .values({
        organization_id: insertedOrg.id,
        invited_email: 'new-contributor@example.com',
        role_id: developerRole.id,
      })
      .execute()
  }

  return toOrganization({
    organization: insertedOrg,
    membership: {
      id: 0,
      organization_id: insertedOrg.id,
      profile_id: profileId,
      role_ids: [1],
      metadata: {},
      mfa_enabled: false,
      is_owner: true,
      inserted_at: new Date(),
      updated_at: new Date(),
    },
  })
}

export const getOrganizationDetail = async (
  slug: string
): Promise<OrganizationDetailResponse | undefined> => {
  const organization = await db
    .selectFrom('organizations')
    .selectAll()
    .where('slug', '=', slug)
    .executeTakeFirst()
  if (!organization) return undefined

  const projects = await db
    .selectFrom('projects')
    .selectAll()
    .where('organization_id', '=', organization.id)
    .orderBy('inserted_at', 'asc')
    .execute()

  return {
    billing_email: organization.billing_email,
    billing_partner: organization.billing_partner,
    has_oriole_project: false,
    id: organization.id,
    name: organization.name,
    opt_in_tags: organization.opt_in_tags ?? [],
    plan: { id: organization.plan_id, name: organization.plan_name },
    projects: projects.map((project) => ({
      cloud_provider: project.cloud_provider,
      id: project.id,
      infra_compute_size: project.infra_compute_size,
      inserted_at: project.inserted_at.toISOString(),
      is_branch_enabled: project.is_branch_enabled,
      is_physical_backups_enabled: project.is_physical_backups_enabled,
      name: project.name,
      organization_id: project.organization_id,
      organization_slug: organization.slug,
      preview_branch_refs: [],
      ref: project.ref,
      region: project.region,
      status: project.status,
      subscription_id: project.subscription_id,
    })),
    restriction_data: toStringRecord(organization.restriction_data),
    restriction_status: organization.restriction_status,
    slug: organization.slug,
    stripe_customer_id: organization.stripe_customer_id,
    subscription_id: organization.subscription_id,
    usage_billing_enabled: organization.usage_billing_enabled,
  }
}
