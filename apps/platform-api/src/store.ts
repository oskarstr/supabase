import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { destroyProjectStack, provisionProjectStack } from './provisioner'

type CloudProvider = 'AWS' | 'FLY' | 'AWS_K8S' | 'AWS_NIMBUS'

type ComputeSize =
  | 'pico'
  | 'nano'
  | 'micro'
  | 'small'
  | 'medium'
  | 'large'
  | 'xlarge'
  | '2xlarge'
  | '4xlarge'
  | '8xlarge'
  | '12xlarge'
  | '16xlarge'
  | '24xlarge'
  | '24xlarge_optimized_memory'
  | '24xlarge_optimized_cpu'
  | '24xlarge_high_memory'
  | '48xlarge'
  | '48xlarge_optimized_memory'
  | '48xlarge_optimized_cpu'
  | '48xlarge_high_memory'

type ProjectStatus =
  | 'INACTIVE'
  | 'ACTIVE_HEALTHY'
  | 'ACTIVE_UNHEALTHY'
  | 'COMING_UP'
  | 'UNKNOWN'
  | 'GOING_DOWN'
  | 'INIT_FAILED'
  | 'REMOVED'
  | 'RESTORING'
  | 'UPGRADING'
  | 'PAUSING'
  | 'RESTORE_FAILED'
  | 'RESTARTING'
  | 'PAUSE_FAILED'
  | 'RESIZING'

type RegionSelection =
  | { code: string; type: 'specific' }
  | { code: 'americas' | 'emea' | 'apac'; type: 'smartGroup' }

export interface Profile {
  auth0_id: string
  disabled_features: string[]
  first_name: string
  free_project_limit: number
  gotrue_id: string
  id: number
  is_alpha_user: boolean
  is_sso_user: boolean
  last_name: string
  mobile: string
  primary_email: string
  username: string
}

export interface Organization {
  billing_email: string | null
  billing_partner: string | null
  id: number
  is_owner: boolean
  name: string
  opt_in_tags: string[]
  organization_requires_mfa: boolean
  plan: {
    id: 'free' | 'pro' | 'team' | 'enterprise'
    name: string
  }
  restriction_data: Record<string, string> | null
  restriction_status: string | null
  slug: string
  stripe_customer_id: string | null
  subscription_id: string | null
  usage_billing_enabled: boolean
}

export interface ProjectDetail {
  cloud_provider: CloudProvider
  connectionString: string | null
  db_host: string
  dbVersion?: string
  id: number
  infra_compute_size?: ComputeSize
  inserted_at: string
  is_branch_enabled: boolean
  is_physical_backups_enabled: boolean
  name: string
  organization_id: number
  ref: string
  region: string
  restUrl: string
  status: ProjectStatus
  subscription_id: string
}

export interface OrganizationProjectsResponse {
  pagination: {
    count: number
    limit: number
    offset: number
  }
  projects: {
    cloud_provider: CloudProvider
    databases: {
      cloud_provider: CloudProvider
      identifier: string
      region: string
      status: 'ACTIVE_HEALTHY'
      type: 'PRIMARY'
    }[]
    inserted_at: string
    is_branch: boolean
    name: string
    ref: string
    region: string
    status: ProjectStatus
  }[]
}

export interface CreateProjectBody {
  auth_site_url?: string
  cloud_provider: CloudProvider
  db_pass: string
  db_region?: string
  desired_instance_size?: ComputeSize
  name: string
  organization_slug: string
  postgres_engine?: string
  region_selection?: RegionSelection
}

export interface CreateProjectResponse {
  anon_key: string
  cloud_provider: CloudProvider
  endpoint: string
  id: number
  infra_compute_size?: ComputeSize
  inserted_at: string | null
  is_branch_enabled: boolean
  is_physical_backups_enabled: boolean
  name: string
  organization_id: number
  organization_slug: string
  preview_branch_refs: string[]
  ref: string
  region: string
  service_key: string
  status: ProjectStatus
  subscription_id: string | null
}

export interface RemoveProjectResponse {
  id: number
  name: string
  ref: string
}

export interface GetSubscriptionResponse {
  addons: {
    name: string
    price: number
    supabase_prod_id: string
  }[]
  billing_cycle_anchor: number
  billing_partner?: 'fly' | 'aws_marketplace' | 'vercel_marketplace'
  billing_via_partner: boolean
  cached_egress_enabled: boolean
  current_period_end: number
  current_period_start: number
  customer_balance: number
  next_invoice_at: number
  payment_method_type: string
  plan: {
    id: 'free' | 'pro' | 'team' | 'enterprise'
    name: string
  }
  project_addons: unknown[]
  scheduled_plan_change: null
  usage_billing_enabled: boolean
}

type InternalProject = ProjectDetail & {
  anonKey: string
  serviceKey: string
}

interface State {
  profile: Profile
  organizations: Organization[]
  projects: InternalProject[]
  nextProjectId: number
}

const DATA_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../data')
const STATE_FILE = resolve(DATA_DIR, 'state.json')

const DEFAULT_ORG_ID = 1
const DEFAULT_ORG_SLUG = 'local-org'

const baseProfile: Profile = {
  auth0_id: 'local|user',
  disabled_features: [],
  first_name: 'Local',
  free_project_limit: 10,
  gotrue_id: randomUUID(),
  id: 1,
  is_alpha_user: false,
  is_sso_user: false,
  last_name: 'Admin',
  mobile: '',
  primary_email: 'admin@example.com',
  username: 'admin',
}

const baseOrganizations: Organization[] = [
  {
    billing_email: null,
    billing_partner: null,
    id: DEFAULT_ORG_ID,
    is_owner: true,
    name: 'Local Organization',
    opt_in_tags: [],
    organization_requires_mfa: false,
    plan: { id: 'enterprise', name: 'Enterprise' },
    restriction_data: null,
    restriction_status: null,
    slug: DEFAULT_ORG_SLUG,
    stripe_customer_id: null,
    subscription_id: null,
    usage_billing_enabled: false,
  },
]

const nowIso = () => new Date().toISOString()

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true })
  }
}

function defaultState(): State {
  const defaultProject: InternalProject = {
    cloud_provider: 'AWS',
    connectionString: null,
    db_host: 'localhost',
    dbVersion: '15',
    id: DEFAULT_ORG_ID,
    infra_compute_size: 'micro',
    inserted_at: nowIso(),
    is_branch_enabled: false,
    is_physical_backups_enabled: false,
    name: 'Local Project',
    organization_id: DEFAULT_ORG_ID,
    ref: 'local-project',
    region: 'local',
    restUrl: 'http://localhost:54321/rest/v1/',
    status: 'ACTIVE_HEALTHY',
    subscription_id: randomUUID(),
    anonKey: randomUUID(),
    serviceKey: randomUUID(),
  }

  return {
    profile: { ...baseProfile },
    organizations: baseOrganizations.map((org) => ({ ...org })),
    projects: [defaultProject],
    nextProjectId: defaultProject.id + 1,
  }
}

function loadState(): State {
  ensureDataDir()
  if (!existsSync(STATE_FILE)) {
    const initial = defaultState()
    saveState(initial)
    return initial
  }

  const raw = JSON.parse(readFileSync(STATE_FILE, 'utf-8')) as Partial<State>

  const rawProjects = Array.isArray(raw.projects) ? raw.projects : []
  const projects = rawProjects.map((project) => ({
    ...project,
    anonKey: project.anonKey ?? randomUUID(),
    serviceKey: project.serviceKey ?? randomUUID(),
  }))

  const nextProjectId =
    raw.nextProjectId ?? projects.reduce((max, project) => Math.max(max, project.id), 0) + 1

  return {
    profile:
      raw.profile && typeof raw.profile === 'object'
        ? (raw.profile as Profile)
        : { ...baseProfile },
    organizations:
      Array.isArray(raw.organizations) && raw.organizations.length > 0
        ? raw.organizations.map((org) => ({ ...org }))
        : baseOrganizations.map((org) => ({ ...org })),
    projects,
    nextProjectId,
  }
}

function saveState(current: State) {
  ensureDataDir()
  writeFileSync(STATE_FILE, JSON.stringify(current, null, 2), 'utf-8')
}

const state = loadState()

function updateProject(ref: string, updater: (project: InternalProject) => InternalProject | void) {
  const index = state.projects.findIndex((project) => project.ref === ref)
  if (index === -1) return

  const current = state.projects[index]
  const updated = updater(current)
  if (updated) {
    state.projects[index] = updated
  }
  saveState(state)
}

async function scheduleProvisioning(project: InternalProject, org: Organization, dbPass: string) {
  try {
    await provisionProjectStack({
      ref: project.ref,
      name: project.name,
      organizationSlug: org.slug,
      cloudProvider: project.cloud_provider,
      region: project.region,
      databasePassword: dbPass,
    })

    updateProject(project.ref, (current) => ({
      ...current,
      status: 'ACTIVE_HEALTHY',
      restUrl: current.restUrl || `https://${current.ref}.supabase.local/rest/v1/`,
    }))
  } catch (error) {
    console.error('[platform-api] provisioning failed', project.ref, error)
    updateProject(project.ref, (current) => ({
      ...current,
      status: 'INIT_FAILED',
    }))
  }
}

async function scheduleRemoval(project: InternalProject, org: Organization) {
  try {
    await destroyProjectStack({
      ref: project.ref,
      name: project.name,
      organizationSlug: org.slug,
    })

    const removalIndex = state.projects.findIndex((item) => item.ref === project.ref)
    if (removalIndex !== -1) {
      state.projects.splice(removalIndex, 1)
      saveState(state)
    }
  } catch (error) {
    console.error('[platform-api] destruction failed', project.ref, error)
    updateProject(project.ref, (current) => ({
      ...current,
      status: 'RESTORE_FAILED',
    }))
  }
}

export function getProfile() {
  return state.profile
}

export function listOrganizations() {
  return state.organizations
}

export function listProjectDetails(): ProjectDetail[] {
  return state.projects.map(({ anonKey: _anon, serviceKey: _service, ...detail }) => ({
    ...detail,
  }))
}

export function getSubscriptionForOrg(org: Organization): GetSubscriptionResponse {
  return {
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
  }
}

export function listOrganizationProjects(slug: string): OrganizationProjectsResponse | undefined {
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

export function getProject(ref: string): ProjectDetail | undefined {
  const project = state.projects.find((item) => item.ref === ref)
  if (!project) return undefined

  const { anonKey: _anon, serviceKey: _svc, ...detail } = project
  return { ...detail }
}

export function createProject(body: CreateProjectBody): CreateProjectResponse {
  const org = state.organizations.find((organization) => organization.slug === body.organization_slug)
  if (!org) {
    throw new Error(`Organization ${body.organization_slug} not found`)
  }

  const projectId = state.nextProjectId++
  const ref = body.name.toLowerCase().replace(/[^a-z0-9-]/g, '-') || `proj-${projectId}`
  const insertedAt = nowIso()

  const region =
    body.region_selection && 'code' in body.region_selection
      ? body.region_selection.code
      : body.db_region ?? 'local'

  const detail: ProjectDetail = {
    cloud_provider: body.cloud_provider,
    connectionString: null,
    db_host: `${ref}.db.local`,
    dbVersion: body.postgres_engine ?? '15',
    id: projectId,
    infra_compute_size: body.desired_instance_size ?? 'micro',
    inserted_at: insertedAt,
    is_branch_enabled: false,
    is_physical_backups_enabled: false,
    name: body.name,
    organization_id: org.id,
    ref,
    region,
    restUrl: body.auth_site_url ?? '',
    status: 'COMING_UP',
    subscription_id: randomUUID(),
  }

  const project: InternalProject = {
    ...detail,
    anonKey: randomUUID(),
    serviceKey: randomUUID(),
  }

  state.projects.push(project)
  saveState(state)

  const response: CreateProjectResponse = {
    anon_key: project.anonKey,
    cloud_provider: project.cloud_provider,
    endpoint: project.restUrl,
    id: project.id,
    infra_compute_size: project.infra_compute_size,
    inserted_at: detail.inserted_at,
    is_branch_enabled: detail.is_branch_enabled,
    is_physical_backups_enabled: detail.is_physical_backups_enabled,
    name: detail.name,
    organization_id: detail.organization_id,
    organization_slug: org.slug,
    preview_branch_refs: [],
    ref: detail.ref,
    region: detail.region,
    service_key: project.serviceKey,
    status: detail.status,
    subscription_id: detail.subscription_id,
  }

  scheduleProvisioning(project, org, body.db_pass).catch((error) => {
    console.error('[platform-api] provisioning task error', error)
  })

  return response
}

export function deleteProject(ref: string): RemoveProjectResponse | undefined {
  const project = state.projects.find((item) => item.ref === ref)
  if (!project) return undefined

  const org = state.organizations.find((item) => item.id === project.organization_id)
  if (!org) return undefined

  updateProject(ref, (current) => ({ ...current, status: 'GOING_DOWN' }))
  scheduleRemoval(project, org).catch((error) => {
    console.error('[platform-api] destruction task error', error)
  })

  return {
    id: project.id,
    name: project.name,
    ref: project.ref,
  }
}
