import { randomUUID } from 'node:crypto'

import { slugify } from './env.js'
import {
  DEFAULT_BILLING_EMAIL,
  DEFAULT_ORG_REQUIRES_MFA,
  DEFAULT_STRIPE_CUSTOMER_ID,
  DEFAULT_USAGE_BILLING_ENABLED,
  PLAN_LABELS,
  state,
  saveState,
} from './state.js'
import type {
  CreateOrganizationBody,
  GetSubscriptionResponse,
  Organization,
  OrganizationDetailResponse,
  OrganizationProjectsResponse,
} from './types.js'

export const listOrganizations = () => state.organizations

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

export const listOrganizationProjects = (
  slug: string
): OrganizationProjectsResponse | undefined => {
  const org = state.organizations.find((organization) => organization.slug === slug)
  if (!org) return undefined

  const orgProjects = state.projects.filter((project) => project.organization_id === org.id)

  return {
    pagination: {
      count: orgProjects.length,
      limit: orgProjects.length,
      offset: 0,
    },
    projects: orgProjects.map((project) => ({
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
      inserted_at: project.inserted_at,
      is_branch: false,
      name: project.name,
      ref: project.ref,
      region: project.region,
      status: project.status,
    })),
  }
}

const TIER_TO_PLAN: Record<CreateOrganizationBody['tier'], Organization['plan']['id']> = {
  tier_free: 'free',
  tier_payg: 'pro',
  tier_pro: 'pro',
  tier_team: 'team',
  tier_enterprise: 'enterprise',
}

const nextOrganizationId = () =>
  state.organizations.reduce((max, organization) => Math.max(max, organization.id), 0) + 1

const generateUniqueOrgSlug = (name: string) => {
  const base = slugify(name) || `org-${randomUUID().slice(0, 8)}`
  const existing = new Set(state.organizations.map((organization) => organization.slug))
  if (!existing.has(base)) return base
  let suffix = 2
  while (existing.has(`${base}-${suffix}`)) {
    suffix += 1
  }
  return `${base}-${suffix}`
}

export const createOrganization = (body: CreateOrganizationBody): Organization => {
  const name = body.name?.trim()
  if (!name) {
    throw new Error('Organization name is required')
  }

  const id = nextOrganizationId()
  const slug = generateUniqueOrgSlug(name)
  const planId = TIER_TO_PLAN[body.tier] ?? 'free'

  const organization: Organization = {
    billing_email: state.profile.primary_email ?? DEFAULT_BILLING_EMAIL,
    billing_partner: null,
    id,
    is_owner: true,
    name,
    opt_in_tags: [],
    organization_requires_mfa: DEFAULT_ORG_REQUIRES_MFA,
    plan: { id: planId, name: PLAN_LABELS[planId] ?? PLAN_LABELS.free },
    restriction_data: null,
    restriction_status: null,
    slug,
    stripe_customer_id: DEFAULT_STRIPE_CUSTOMER_ID,
    subscription_id: planId === 'free' ? null : randomUUID(),
    usage_billing_enabled: DEFAULT_USAGE_BILLING_ENABLED,
  }

  state.organizations.push(organization)
  saveState(state)

  return { ...organization }
}

export const getOrganizationDetail = (
  slug: string
): OrganizationDetailResponse | undefined => {
  const organization = state.organizations.find((org) => org.slug === slug)
  if (!organization) return undefined

  const projects = state.projects
    .filter((project) => project.organization_id === organization.id)
    .map((project) => ({
      cloud_provider: project.cloud_provider,
      id: project.id,
      infra_compute_size: project.infra_compute_size,
      inserted_at: project.inserted_at,
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
    }))

  return {
    billing_email: organization.billing_email,
    billing_partner: organization.billing_partner,
    has_oriole_project: false,
    id: organization.id,
    name: organization.name,
    opt_in_tags: [...organization.opt_in_tags],
    plan: { ...organization.plan },
    projects,
    restriction_data: organization.restriction_data,
    restriction_status: organization.restriction_status,
    slug: organization.slug,
    stripe_customer_id: organization.stripe_customer_id,
    subscription_id: organization.subscription_id,
    usage_billing_enabled: organization.usage_billing_enabled,
  }
}
