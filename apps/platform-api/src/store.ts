import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { config as loadEnv, parse as parseEnv } from 'dotenv'

import { destroyProjectStack, provisionProjectStack } from './provisioner.js'

const moduleDir = dirname(fileURLToPath(import.meta.url))

const providedRepoRootRaw = process.env.PLATFORM_API_REPO_ROOT?.trim()
const repoRoot = providedRepoRootRaw && providedRepoRootRaw.length > 0 ? resolve(providedRepoRootRaw) : resolve(moduleDir, '../../..')

const envFiles = ['.env', 'docker/.env']
for (const relativePath of envFiles) {
  const envPath = resolve(repoRoot, relativePath)
  if (existsSync(envPath)) {
    loadEnv({ path: envPath, override: false })
  }
}

const envString = (key: string, fallback?: string) => {
  const value = process.env[key]
  if (value === undefined) return fallback
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : fallback
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')
const buildRestUrl = (base: string) => `${trimTrailingSlash(base)}/rest/v1/`

export type CloudProvider = 'AWS' | 'FLY' | 'AWS_K8S' | 'AWS_NIMBUS'
export const CLOUD_PROVIDERS: CloudProvider[] = ['AWS', 'FLY', 'AWS_K8S', 'AWS_NIMBUS']

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

type RegionSmartGroup = {
  code: 'americas' | 'emea' | 'apac'
  name: string
  type: 'smartGroup'
}

type RegionSpecific = {
  code: string
  name: string
  provider: CloudProvider
  status?: 'capacity' | 'other'
  type: 'specific'
}

export interface RegionsInfo {
  all: {
    smartGroup: RegionSmartGroup[]
    specific: RegionSpecific[]
  }
  recommendations: {
    smartGroup: RegionSmartGroup
    specific: RegionSpecific[]
  }
}

type PostgresEngine = '15' | '17' | '17-oriole'
type ReleaseChannel = 'ga' | 'beta' | 'preview'

export interface AvailableVersionsResponse {
  available_versions: {
    postgres_engine: PostgresEngine
    release_channel: ReleaseChannel
    version: string
  }[]
}

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

export interface CreateOrganizationBody {
  name: string
  tier: 'tier_payg' | 'tier_pro' | 'tier_free' | 'tier_team' | 'tier_enterprise'
  kind?: string
  size?: string
  payment_method?: string
  billing_name?: string | null
  address?: Record<string, unknown> | null
  tax_id?: Record<string, unknown> | null
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
  projectRuntimes: Record<string, ProjectRuntime>
}

const DATA_DIR = resolve(moduleDir, '../data')
const STATE_FILE = resolve(DATA_DIR, 'state.json')
const PROJECTS_ROOT = resolve(DATA_DIR, 'projects')

interface ProjectRuntime {
  ref: string
  rootDir: string
  createdAt: string
}

const DEFAULT_ORG_ID = 1
const DEFAULT_ORG_NAME = envString('STUDIO_DEFAULT_ORGANIZATION', 'Local Organization') ?? 'Local Organization'
const DEFAULT_ORG_SLUG =
  envString('STUDIO_DEFAULT_ORGANIZATION_SLUG', slugify(DEFAULT_ORG_NAME) || 'local-org') ?? 'local-org'
const DEFAULT_BILLING_EMAIL = envString('STUDIO_DEFAULT_BILLING_EMAIL') ?? null
const rawBillingPartner = envString('STUDIO_DEFAULT_BILLING_PARTNER')
const DEFAULT_BILLING_PARTNER =
  rawBillingPartner === 'fly' || rawBillingPartner === 'aws_marketplace' || rawBillingPartner === 'vercel_marketplace'
    ? rawBillingPartner
    : null
const DEFAULT_PLAN_ID = (envString('STUDIO_DEFAULT_PLAN', 'enterprise') ?? 'enterprise') as Organization['plan']['id']
const PLAN_LABELS: Record<Organization['plan']['id'], string> = {
  free: 'Free',
  pro: 'Pro',
  team: 'Team',
  enterprise: 'Enterprise',
}
const DEFAULT_PLAN_NAME = PLAN_LABELS[DEFAULT_PLAN_ID]
const DEFAULT_USAGE_BILLING_ENABLED = envString('STUDIO_USAGE_BILLING_ENABLED', 'false') === 'true'
const DEFAULT_ORG_REQUIRES_MFA = envString('STUDIO_ORGANIZATION_REQUIRES_MFA', 'false') === 'true'
const DEFAULT_STRIPE_CUSTOMER_ID = envString('STUDIO_DEFAULT_STRIPE_CUSTOMER_ID') ?? null
const DEFAULT_SUBSCRIPTION_ID = envString('STUDIO_DEFAULT_SUBSCRIPTION_ID') ?? null
const DEFAULT_ORG_OPT_IN_TAGS =
  envString('STUDIO_DEFAULT_ORG_OPT_IN_TAGS')
    ?.split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0) ?? []

const DEFAULT_FIRST_NAME = envString('STUDIO_DEFAULT_FIRST_NAME', 'Local') ?? 'Local'
const DEFAULT_LAST_NAME = envString('STUDIO_DEFAULT_LAST_NAME', 'Admin') ?? 'Admin'
const DEFAULT_PRIMARY_EMAIL = envString('STUDIO_DEFAULT_PRIMARY_EMAIL', 'admin@example.com') ?? 'admin@example.com'
const DEFAULT_USERNAME = envString('STUDIO_DEFAULT_USERNAME', 'admin') ?? 'admin'
const DEFAULT_AUTH0_ID = envString('STUDIO_DEFAULT_AUTH0_ID', 'local|user') ?? 'local|user'
const DEFAULT_MOBILE = envString('STUDIO_DEFAULT_MOBILE', '') ?? ''
const DEFAULT_FREE_PROJECT_LIMIT = (() => {
  const parsed = Number.parseInt(envString('STUDIO_FREE_PROJECT_LIMIT') ?? '', 10)
  return Number.isFinite(parsed) ? parsed : 10
})()
const DEFAULT_IS_ALPHA_USER = envString('STUDIO_DEFAULT_ALPHA_USER', 'false') === 'true'
const DEFAULT_IS_SSO_USER = envString('STUDIO_DEFAULT_SSO_USER', 'false') === 'true'

const DEFAULT_PROJECT_NAME = envString('STUDIO_DEFAULT_PROJECT', 'Local Project') ?? 'Local Project'
const DEFAULT_PROJECT_REF =
  envString('STUDIO_DEFAULT_PROJECT_REF')
    ? envString('STUDIO_DEFAULT_PROJECT_REF')!
    : slugify(DEFAULT_PROJECT_NAME) || 'default'
const DEFAULT_REGION = envString('STUDIO_DEFAULT_REGION', 'local') ?? 'local'
const DEFAULT_CLOUD_PROVIDER = (envString('STUDIO_DEFAULT_CLOUD_PROVIDER', 'AWS') ?? 'AWS') as CloudProvider
const DEFAULT_DB_VERSION = envString('STUDIO_DEFAULT_DB_VERSION', '15') ?? '15'
const DEFAULT_INFRA_SIZE = (envString('STUDIO_DEFAULT_COMPUTE_SIZE', 'micro') ?? 'micro') as ComputeSize
const defaultDbUrl = envString('SUPABASE_DB_URL', envString('DATABASE_URL')) ?? ''
const DEFAULT_CONNECTION_STRING = defaultDbUrl.length > 0 ? defaultDbUrl : null
const DEFAULT_DB_HOST = (() => {
  if (defaultDbUrl.length > 0) {
    try {
      return new URL(defaultDbUrl).hostname
    } catch {
      /* noop */
    }
  }
  return envString('POSTGRES_HOST', 'localhost') ?? 'localhost'
})()
const defaultRestBase = envString('SUPABASE_PUBLIC_URL', 'http://localhost:54321') ?? 'http://localhost:54321'
const DEFAULT_REST_URL = buildRestUrl(defaultRestBase)
const DEFAULT_ANON_KEY = envString('ANON_KEY', randomUUID()) ?? randomUUID()
const DEFAULT_SERVICE_KEY = envString('SERVICE_ROLE_KEY', randomUUID()) ?? randomUUID()
const DEFAULT_PROJECT_SUBSCRIPTION_ID = envString('STUDIO_DEFAULT_PROJECT_SUBSCRIPTION_ID') ?? randomUUID()
const DEFAULT_BRANCH_ENABLED = envString('STUDIO_DEFAULT_BRANCH_ENABLED', 'false') === 'true'
const DEFAULT_PHYSICAL_BACKUPS = envString('STUDIO_DEFAULT_PHYSICAL_BACKUPS', 'false') === 'true'

const REGION_SMART_GROUPS: RegionSmartGroup[] = [
  { code: 'americas', name: 'Americas', type: 'smartGroup' },
  { code: 'emea', name: 'Europe, Middle East, and Africa', type: 'smartGroup' },
  { code: 'apac', name: 'Asia Pacific', type: 'smartGroup' },
]

const REGION_SPECIFICS: Record<CloudProvider, RegionSpecific[]> = {
  AWS: [
    { code: 'aws-us-east-1', name: 'US East 1 (N. Virginia)', provider: 'AWS', type: 'specific' },
    { code: 'aws-eu-west-1', name: 'EU West 1 (Ireland)', provider: 'AWS', type: 'specific' },
  ],
  FLY: [
    { code: 'fly-ams', name: 'Amsterdam, NL', provider: 'FLY', type: 'specific' },
    { code: 'fly-iad', name: 'Ashburn, VA', provider: 'FLY', type: 'specific' },
  ],
  AWS_K8S: [
    { code: 'aws-k8s-us-east-1', name: 'US East 1 (K8S)', provider: 'AWS_K8S', type: 'specific' },
  ],
  AWS_NIMBUS: [
    { code: 'aws-nimbus-us-east-1', name: 'US East 1 (Nimbus)', provider: 'AWS_NIMBUS', type: 'specific' },
  ],
}

const DEFAULT_AVAILABLE_VERSIONS: AvailableVersionsResponse['available_versions'] = [
  { postgres_engine: '15', release_channel: 'ga', version: '15.5.0' },
  { postgres_engine: '17', release_channel: 'beta', version: '17.0.0' },
  { postgres_engine: '17-oriole', release_channel: 'preview', version: '0.1.0' },
]

export type OAuthAppType = 'authorized' | 'published'

export interface OAuthAppSummary {
  id: string
  name: string
  website: string
  registration_type: 'manual' | 'dynamic'
  scopes: string[]
  authorized_at?: string
  client_id?: string
  created_at?: string
  created_by?: string
  redirect_uris?: string[]
  icon?: string
}

const DEFAULT_AUTHORIZED_APPS: OAuthAppSummary[] = [
  {
    id: 'authorized-app-1',
    name: 'Local Studio CLI',
    website: 'https://supabase.local',
    registration_type: 'manual',
    scopes: ['projects:read', 'rest:read'],
    authorized_at: '2024-01-01T00:00:00.000Z',
    client_id: 'local-cli-client',
    icon: 'https://supabase.com/_next/image?url=%2Fimages%2Fsupabase-logo-icon.png&w=256&q=75',
  },
]

const DEFAULT_PUBLISHED_APPS: OAuthAppSummary[] = [
  {
    id: 'published-app-1',
    name: 'Supabase Studio',
    website: 'https://supabase.com',
    registration_type: 'manual',
    scopes: ['projects:read', 'projects:write'],
    created_at: '2024-01-01T00:00:00.000Z',
    created_by: 'local-admin',
    redirect_uris: ['https://supabase.local/'],
    icon: 'https://supabase.com/_next/image?url=%2Fimages%2Fsupabase-logo-icon.png&w=256&q=75',
  },
]

const baseProfile: Profile = {
  auth0_id: DEFAULT_AUTH0_ID,
  disabled_features: [],
  first_name: DEFAULT_FIRST_NAME,
  free_project_limit: DEFAULT_FREE_PROJECT_LIMIT,
  gotrue_id: randomUUID(),
  id: 1,
  is_alpha_user: DEFAULT_IS_ALPHA_USER,
  is_sso_user: DEFAULT_IS_SSO_USER,
  last_name: DEFAULT_LAST_NAME,
  mobile: DEFAULT_MOBILE,
  primary_email: DEFAULT_PRIMARY_EMAIL,
  username: DEFAULT_USERNAME,
}

const baseOrganizations: Organization[] = [
  {
    billing_email: DEFAULT_BILLING_EMAIL,
    billing_partner: DEFAULT_BILLING_PARTNER,
    id: DEFAULT_ORG_ID,
    is_owner: true,
    name: DEFAULT_ORG_NAME,
    opt_in_tags: [...DEFAULT_ORG_OPT_IN_TAGS],
    organization_requires_mfa: DEFAULT_ORG_REQUIRES_MFA,
    plan: { id: DEFAULT_PLAN_ID, name: DEFAULT_PLAN_NAME },
    restriction_data: null,
    restriction_status: null,
    slug: DEFAULT_ORG_SLUG,
    stripe_customer_id: DEFAULT_STRIPE_CUSTOMER_ID,
    subscription_id: DEFAULT_SUBSCRIPTION_ID,
    usage_billing_enabled: DEFAULT_USAGE_BILLING_ENABLED,
  },
]

const nowIso = () => new Date().toISOString()

function ensureDir(path: string) {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true })
  }
}

function ensureDataDir() {
  ensureDir(DATA_DIR)
  ensureDir(PROJECTS_ROOT)
}

function resolveRuntimeRoot(ref: string, candidate?: string) {
  const trimmed = candidate?.trim()
  const fallback = resolve(PROJECTS_ROOT, ref)

  const ensureFallback = () => {
    ensureDir(fallback)
    return fallback
  }

  if (!trimmed) {
    return ensureFallback()
  }

  if (!trimmed.startsWith(PROJECTS_ROOT)) {
    return ensureFallback()
  }

  try {
    ensureDir(trimmed)
    return trimmed
  } catch (error) {
    console.warn('[platform-api] falling back to project runtime root', {
      ref,
      preferred: trimmed,
      error: error instanceof Error ? error.message : error,
    })
    return ensureFallback()
  }
}

function defaultState(): State {
  const defaultProject: InternalProject = {
    cloud_provider: DEFAULT_CLOUD_PROVIDER,
    connectionString: DEFAULT_CONNECTION_STRING,
    db_host: DEFAULT_DB_HOST,
    dbVersion: DEFAULT_DB_VERSION,
    id: DEFAULT_ORG_ID,
    infra_compute_size: DEFAULT_INFRA_SIZE,
    inserted_at: nowIso(),
    is_branch_enabled: DEFAULT_BRANCH_ENABLED,
    is_physical_backups_enabled: DEFAULT_PHYSICAL_BACKUPS,
    name: DEFAULT_PROJECT_NAME,
    organization_id: DEFAULT_ORG_ID,
    ref: DEFAULT_PROJECT_REF,
    region: DEFAULT_REGION,
    restUrl: DEFAULT_REST_URL,
    status: 'ACTIVE_HEALTHY',
    subscription_id: DEFAULT_PROJECT_SUBSCRIPTION_ID,
    anonKey: DEFAULT_ANON_KEY,
    serviceKey: DEFAULT_SERVICE_KEY,
  }

  const runtimeRoot = resolve(PROJECTS_ROOT, defaultProject.ref)

  return {
    profile: { ...baseProfile },
    organizations: baseOrganizations.map((org) => ({ ...org })),
    projects: [defaultProject],
    nextProjectId: defaultProject.id + 1,
    projectRuntimes: {
      [defaultProject.ref]: {
        ref: defaultProject.ref,
        rootDir: runtimeRoot,
        createdAt: nowIso(),
      },
    },
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

  const projectRuntimes: Record<string, ProjectRuntime> =
    raw.projectRuntimes && typeof raw.projectRuntimes === 'object'
      ? (raw.projectRuntimes as Record<string, ProjectRuntime>)
      : projects.length > 0
        ? {
            [projects[0].ref]: {
              ref: projects[0].ref,
              rootDir: resolve(PROJECTS_ROOT, projects[0].ref),
              createdAt: nowIso(),
            },
          }
        : {}

  for (const [ref, runtime] of Object.entries(projectRuntimes)) {
    runtime.rootDir = resolveRuntimeRoot(ref, runtime.rootDir)
  }

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
    projectRuntimes,
  }
}

function saveState(current: State) {
  ensureDataDir()
  writeFileSync(STATE_FILE, JSON.stringify(current, null, 2), 'utf-8')
}

const state = loadState()

for (const ref of Object.keys(state.projectRuntimes)) {
  ensureProjectRuntime(ref)
}

function ensureProjectRuntime(ref: string): ProjectRuntime {
  const existing = state.projectRuntimes[ref]

  if (existing) {
    existing.rootDir = resolveRuntimeRoot(ref, existing.rootDir)
    saveState(state)
    return existing
  }

  const runtime: ProjectRuntime = {
    ref,
    rootDir: resolveRuntimeRoot(ref),
    createdAt: nowIso(),
  }

  state.projectRuntimes[ref] = runtime
  saveState(state)
  return runtime
}

function removeProjectRuntime(ref: string) {
  if (state.projectRuntimes[ref]) {
    delete state.projectRuntimes[ref]
    saveState(state)
  }
}

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

async function scheduleProvisioning(
  project: InternalProject,
  org: Organization,
  dbPass: string,
  runtime: ProjectRuntime
) {
  try {
    ensureDir(runtime.rootDir)

    await provisionProjectStack({
      ref: project.ref,
      name: project.name,
      organizationSlug: org.slug,
      cloudProvider: project.cloud_provider,
      region: project.region,
      databasePassword: dbPass,
      projectRoot: runtime.rootDir,
    })

    let nextAnonKey = project.anonKey
    let nextServiceKey = project.serviceKey
    let nextRestUrl = project.restUrl || DEFAULT_REST_URL
    let nextConnection = project.connectionString
    let nextDbHost = project.db_host
    let nextDbVersion = project.dbVersion

    const envPath = resolve(runtime.rootDir, '.env')
    if (existsSync(envPath)) {
      const parsed = parseEnv(readFileSync(envPath, 'utf-8'))

      if (parsed.SUPABASE_ANON_KEY) {
        nextAnonKey = parsed.SUPABASE_ANON_KEY
      }
      if (parsed.SUPABASE_SERVICE_KEY) {
        nextServiceKey = parsed.SUPABASE_SERVICE_KEY
      }

      const supabaseUrl = parsed.SUPABASE_URL ?? parsed.SUPABASE_PUBLIC_URL
      if (supabaseUrl) {
        nextRestUrl = buildRestUrl(supabaseUrl)
      }

      const dbUrl = parsed.DATABASE_URL ?? parsed.SUPABASE_DB_URL
      if (dbUrl) {
        nextConnection = dbUrl
        try {
          nextDbHost = new URL(dbUrl).hostname
        } catch {
          /* noop */
        }
      }

      if (parsed.POSTGRES_VERSION) {
        nextDbVersion = parsed.POSTGRES_VERSION
      }
    }

    updateProject(project.ref, (current) => ({
      ...current,
      status: 'ACTIVE_HEALTHY',
      restUrl: nextRestUrl,
      connectionString: nextConnection ?? current.connectionString,
      db_host: nextDbHost,
      dbVersion: nextDbVersion ?? current.dbVersion,
      anonKey: nextAnonKey,
      serviceKey: nextServiceKey,
    }))
  } catch (error) {
    console.error('[platform-api] provisioning failed', project.ref, error)
    updateProject(project.ref, (current) => ({
      ...current,
      status: 'INIT_FAILED',
    }))
  }
}

async function scheduleRemoval(project: InternalProject, org: Organization, runtime: ProjectRuntime) {
  try {
    await destroyProjectStack({
      ref: project.ref,
      name: project.name,
      organizationSlug: org.slug,
      projectRoot: runtime.rootDir,
    })

    const removalIndex = state.projects.findIndex((item) => item.ref === project.ref)
    if (removalIndex !== -1) {
      state.projects.splice(removalIndex, 1)
      saveState(state)
    }
    removeProjectRuntime(project.ref)
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

export function listOAuthApps(slug: string, type: OAuthAppType): OAuthAppSummary[] | undefined {
  const org = state.organizations.find((organization) => organization.slug === slug)
  if (!org) return undefined
  const source = type === 'authorized' ? DEFAULT_AUTHORIZED_APPS : DEFAULT_PUBLISHED_APPS
  return source.map((app) => ({ ...app }))
}

const TIER_TO_PLAN: Record<CreateOrganizationBody['tier'], Organization['plan']['id']> = {
  tier_free: 'free',
  tier_payg: 'pro',
  tier_pro: 'pro',
  tier_team: 'team',
  tier_enterprise: 'enterprise',
}

function nextOrganizationId() {
  return (
    state.organizations.reduce((max, organization) => Math.max(max, organization.id), 0) + 1
  )
}

function generateUniqueOrgSlug(name: string) {
  const base = slugify(name) || `org-${randomUUID().slice(0, 8)}`
  const existing = new Set(state.organizations.map((organization) => organization.slug))
  if (!existing.has(base)) return base
  let suffix = 2
  while (existing.has(`${base}-${suffix}`)) {
    suffix += 1
  }
  return `${base}-${suffix}`
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
      : body.db_region ?? DEFAULT_REGION

  const detail: ProjectDetail = {
    cloud_provider: body.cloud_provider ?? DEFAULT_CLOUD_PROVIDER,
    connectionString: null,
    db_host: DEFAULT_DB_HOST,
    dbVersion: body.postgres_engine ?? DEFAULT_DB_VERSION,
    id: projectId,
    infra_compute_size: body.desired_instance_size ?? DEFAULT_INFRA_SIZE,
    inserted_at: insertedAt,
    is_branch_enabled: DEFAULT_BRANCH_ENABLED,
    is_physical_backups_enabled: DEFAULT_PHYSICAL_BACKUPS,
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

  const runtime = ensureProjectRuntime(project.ref)

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

  scheduleProvisioning(project, org, body.db_pass, runtime).catch((error) => {
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
  const runtime = ensureProjectRuntime(project.ref)
  scheduleRemoval(project, org, runtime).catch((error) => {
    console.error('[platform-api] destruction task error', error)
  })

  return {
    id: project.id,
    name: project.name,
    ref: project.ref,
  }
}

export function getAvailableRegions(cloudProvider: CloudProvider, _organizationSlug: string): RegionsInfo {
  const specificRegions = REGION_SPECIFICS[cloudProvider] ?? []
  const recommendedSpecific = specificRegions.length > 0 ? [specificRegions[0]] : []
  const recommendedSmartGroup = REGION_SMART_GROUPS.find((group) => group.code === 'americas') ?? REGION_SMART_GROUPS[0]

  return {
    all: {
      smartGroup: REGION_SMART_GROUPS.map((group) => ({ ...group })),
      specific: specificRegions.map((region) => ({ ...region })),
    },
    recommendations: {
      smartGroup: { ...recommendedSmartGroup },
      specific: recommendedSpecific.map((region) => ({ ...region })),
    },
  }
}

export function listAvailableVersionsForOrganization(
  _organizationSlug: string,
  _provider: CloudProvider,
  _region: string
): AvailableVersionsResponse {
  return {
    available_versions: DEFAULT_AVAILABLE_VERSIONS.map((entry) => ({ ...entry })),
  }
}

export function createOrganization(body: CreateOrganizationBody): Organization {
  const name = body.name?.trim()
  if (!name) {
    throw new Error('Organization name is required')
  }

  const id = nextOrganizationId()
  const slug = generateUniqueOrgSlug(name)
  const planId = TIER_TO_PLAN[body.tier] ?? 'free'

  const organization: Organization = {
    billing_email: state.profile.primary_email ?? null,
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

type OrganizationProjectSummary = {
  cloud_provider: CloudProvider
  disk_volume_size_gb?: number
  engine?: string
  id: number
  infra_compute_size?: ComputeSize
  inserted_at: string | null
  is_branch_enabled: boolean
  is_physical_backups_enabled: boolean | null
  name: string
  organization_id: number
  organization_slug: string
  preview_branch_refs: string[]
  ref: string
  region: string
  status: ProjectStatus
  subscription_id: string | null
}

export interface OrganizationDetailResponse {
  billing_email: string | null
  billing_partner: Organization['billing_partner']
  has_oriole_project: boolean
  id: number
  name: string
  opt_in_tags: string[]
  plan: Organization['plan']
  projects: OrganizationProjectSummary[]
  restriction_data: Organization['restriction_data']
  restriction_status: Organization['restriction_status']
  slug: string
  stripe_customer_id: string | null
  subscription_id: string | null
  usage_billing_enabled: boolean
}

export function getOrganizationDetail(slug: string): OrganizationDetailResponse | undefined {
  const organization = state.organizations.find((org) => org.slug === slug)
  if (!organization) return undefined

  const projects: OrganizationProjectSummary[] = state.projects
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
