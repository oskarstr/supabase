import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { buildRestUrl, envString, platformSrcDir, slugify } from './env.js'
import type {
  AccessTokenWithSecret,
  AuditLogEntry,
  AvailableVersionsResponse,
  CloudProvider,
  Organization,
  Profile,
  ProjectDetail,
  RegionSmartGroup,
  RegionSpecific,
} from './types.js'
import { type ComputeSize } from './types.js'
import type { OAuthAppSummary } from './types.js'

export type InternalProject = ProjectDetail & {
  anonKey: string
  serviceKey: string
}

export interface ProjectRuntime {
  ref: string
  rootDir: string
  createdAt: string
}

export interface State {
  profile: Profile
  organizations: Organization[]
  projects: InternalProject[]
  nextProjectId: number
  projectRuntimes: Record<string, ProjectRuntime>
  accessTokens?: AccessTokenWithSecret[]
  auditLogs?: AuditLogEntry[]
}

export const DATA_DIR = resolve(platformSrcDir, '../data')
export const STATE_FILE = resolve(DATA_DIR, 'state.json')
export const PROJECTS_ROOT = resolve(DATA_DIR, 'projects')

export const DEFAULT_ORG_ID = 1
export const DEFAULT_ORG_NAME =
  envString('STUDIO_DEFAULT_ORGANIZATION', 'Local Organization') ?? 'Local Organization'
export const DEFAULT_ORG_SLUG =
  envString('STUDIO_DEFAULT_ORGANIZATION_SLUG', slugify(DEFAULT_ORG_NAME) || 'local-org') ??
  'local-org'
export const DEFAULT_BILLING_EMAIL = envString('STUDIO_DEFAULT_BILLING_EMAIL') ?? null

const rawBillingPartner = envString('STUDIO_DEFAULT_BILLING_PARTNER')
export const DEFAULT_BILLING_PARTNER =
  rawBillingPartner === 'fly' || rawBillingPartner === 'aws_marketplace' || rawBillingPartner === 'vercel_marketplace'
    ? rawBillingPartner
    : null

export const PLAN_LABELS: Record<Organization['plan']['id'], string> = {
  free: 'Free',
  pro: 'Pro',
  team: 'Team',
  enterprise: 'Enterprise',
}

export const DEFAULT_PLAN_ID =
  (envString('STUDIO_DEFAULT_PLAN', 'enterprise') ?? 'enterprise') as Organization['plan']['id']
export const DEFAULT_PLAN_NAME = PLAN_LABELS[DEFAULT_PLAN_ID]

export const DEFAULT_USAGE_BILLING_ENABLED =
  envString('STUDIO_USAGE_BILLING_ENABLED', 'false') === 'true'
export const DEFAULT_ORG_REQUIRES_MFA =
  envString('STUDIO_ORGANIZATION_REQUIRES_MFA', 'false') === 'true'
export const DEFAULT_STRIPE_CUSTOMER_ID = envString('STUDIO_DEFAULT_STRIPE_CUSTOMER_ID') ?? null
export const DEFAULT_SUBSCRIPTION_ID = envString('STUDIO_DEFAULT_SUBSCRIPTION_ID') ?? null
export const DEFAULT_ORG_OPT_IN_TAGS =
  envString('STUDIO_DEFAULT_ORG_OPT_IN_TAGS')
    ?.split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0) ?? []

export const DEFAULT_FIRST_NAME = envString('STUDIO_DEFAULT_FIRST_NAME', 'Local') ?? 'Local'
export const DEFAULT_LAST_NAME = envString('STUDIO_DEFAULT_LAST_NAME', 'Admin') ?? 'Admin'
export const DEFAULT_PRIMARY_EMAIL =
  envString('STUDIO_DEFAULT_PRIMARY_EMAIL', 'admin@example.com') ?? 'admin@example.com'
export const DEFAULT_USERNAME = envString('STUDIO_DEFAULT_USERNAME', 'admin') ?? 'admin'
export const DEFAULT_AUTH0_ID = envString('STUDIO_DEFAULT_AUTH0_ID', 'local|user') ?? 'local|user'
export const DEFAULT_MOBILE = envString('STUDIO_DEFAULT_MOBILE', '') ?? ''
export const DEFAULT_FREE_PROJECT_LIMIT = (() => {
  const parsed = Number.parseInt(envString('STUDIO_FREE_PROJECT_LIMIT') ?? '', 10)
  return Number.isFinite(parsed) ? parsed : 10
})()
export const DEFAULT_IS_ALPHA_USER = envString('STUDIO_DEFAULT_ALPHA_USER', 'false') === 'true'
export const DEFAULT_IS_SSO_USER = envString('STUDIO_DEFAULT_SSO_USER', 'false') === 'true'

export const DEFAULT_PROJECT_NAME =
  envString('STUDIO_DEFAULT_PROJECT', 'Local Project') ?? 'Local Project'
const rawProjectRef = envString('STUDIO_DEFAULT_PROJECT_REF')
export const DEFAULT_PROJECT_REF =
  rawProjectRef && rawProjectRef.trim().length > 0
    ? rawProjectRef.trim()
    : slugify(DEFAULT_PROJECT_NAME) || 'default'
export const DEFAULT_REGION = envString('STUDIO_DEFAULT_REGION', 'local') ?? 'local'
export const DEFAULT_CLOUD_PROVIDER =
  (envString('STUDIO_DEFAULT_CLOUD_PROVIDER', 'AWS') ?? 'AWS') as CloudProvider
export const DEFAULT_DB_VERSION = envString('STUDIO_DEFAULT_DB_VERSION', '15') ?? '15'
export const DEFAULT_INFRA_SIZE =
  (envString('STUDIO_DEFAULT_COMPUTE_SIZE', 'micro') ?? 'micro') as ComputeSize

const defaultDbUrl = envString('SUPABASE_DB_URL', envString('DATABASE_URL')) ?? ''
export const DEFAULT_CONNECTION_STRING = defaultDbUrl.length > 0 ? defaultDbUrl : null
export const DEFAULT_DB_HOST = (() => {
  if (defaultDbUrl.length > 0) {
    try {
      return new URL(defaultDbUrl).hostname
    } catch {
      /* noop */
    }
  }
  return envString('POSTGRES_HOST', 'localhost') ?? 'localhost'
})()

const defaultRestBase =
  envString('SUPABASE_PUBLIC_URL', 'http://localhost:54321') ?? 'http://localhost:54321'
export const DEFAULT_REST_URL = buildRestUrl(defaultRestBase)
export const DEFAULT_ANON_KEY = envString('ANON_KEY', randomUUID()) ?? randomUUID()
export const DEFAULT_SERVICE_KEY =
  envString('SERVICE_ROLE_KEY', randomUUID()) ?? randomUUID()
export const DEFAULT_PROJECT_SUBSCRIPTION_ID =
  envString('STUDIO_DEFAULT_PROJECT_SUBSCRIPTION_ID') ?? randomUUID()
export const DEFAULT_BRANCH_ENABLED =
  envString('STUDIO_DEFAULT_BRANCH_ENABLED', 'false') === 'true'
export const DEFAULT_PHYSICAL_BACKUPS =
  envString('STUDIO_DEFAULT_PHYSICAL_BACKUPS', 'false') === 'true'

export const REGION_SMART_GROUPS: RegionSmartGroup[] = [
  { code: 'americas', name: 'Americas', type: 'smartGroup' },
  { code: 'emea', name: 'Europe, Middle East, and Africa', type: 'smartGroup' },
  { code: 'apac', name: 'Asia Pacific', type: 'smartGroup' },
]

export const REGION_SPECIFICS: Record<CloudProvider, RegionSpecific[]> = {
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

export const DEFAULT_AVAILABLE_VERSIONS: AvailableVersionsResponse['available_versions'] = [
  { postgres_engine: '15', release_channel: 'ga', version: '15.5.0' },
  { postgres_engine: '17', release_channel: 'beta', version: '17.0.0' },
  { postgres_engine: '17-oriole', release_channel: 'preview', version: '0.1.0' },
]

export const DEFAULT_AUTHORIZED_APPS: OAuthAppSummary[] = [
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

export const DEFAULT_PUBLISHED_APPS: OAuthAppSummary[] = [
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

export const baseProfile: Profile = {
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

export const baseOrganizations: Organization[] = [
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

export const nowIso = () => new Date().toISOString()

const ensureDir = (path: string) => {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true })
  }
}

const ensureDataDir = () => {
  ensureDir(DATA_DIR)
  ensureDir(PROJECTS_ROOT)
}

const resolveRuntimeRoot = (ref: string, candidate?: string) => {
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

const defaultState = (): State => {
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
    accessTokens: [],
    auditLogs: [],
  }
}

const loadState = (): State => {
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
    accessTokens: Array.isArray(raw.accessTokens) ? [...raw.accessTokens] : [],
    auditLogs: Array.isArray(raw.auditLogs) ? [...raw.auditLogs] : [],
  }
}

export const state: State = loadState()

export const saveState = (current: State = state) => {
  ensureDataDir()
  writeFileSync(STATE_FILE, JSON.stringify(current, null, 2), 'utf-8')
}

export const ensureProjectRuntime = (ref: string): ProjectRuntime => {
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

export const removeProjectRuntime = (ref: string) => {
  if (state.projectRuntimes[ref]) {
    delete state.projectRuntimes[ref]
    saveState(state)
  }
}

export const updateProject = (
  ref: string,
  updater: (project: InternalProject) => InternalProject | void
) => {
  const index = state.projects.findIndex((project) => project.ref === ref)
  if (index === -1) return

  const current = state.projects[index]
  const updated = updater(current)
  if (updated) {
    state.projects[index] = updated
  }
  saveState(state)
}

for (const ref of Object.keys(state.projectRuntimes)) {
  ensureProjectRuntime(ref)
}
