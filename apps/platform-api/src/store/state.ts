import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  baseOrganizations,
  baseProfile,
  DEFAULT_ANON_KEY,
  DEFAULT_AVAILABLE_VERSIONS,
  DEFAULT_AUTHORIZED_APPS,
  DEFAULT_BILLING_EMAIL,
  DEFAULT_BILLING_PARTNER,
  DEFAULT_BRANCH_ENABLED,
  DEFAULT_CLOUD_PROVIDER,
  DEFAULT_CONNECTION_STRING,
  DEFAULT_DB_HOST,
  DEFAULT_DB_VERSION,
  DEFAULT_FIRST_NAME,
  DEFAULT_INFRA_SIZE,
  DEFAULT_IS_ALPHA_USER,
  DEFAULT_IS_SSO_USER,
  DEFAULT_LAST_NAME,
  DEFAULT_MOBILE,
  DEFAULT_ORG_ID,
  DEFAULT_ORG_NAME,
  DEFAULT_ORG_OPT_IN_TAGS,
  DEFAULT_ORG_REQUIRES_MFA,
  DEFAULT_ORG_SLUG,
  DEFAULT_PHYSICAL_BACKUPS,
  DEFAULT_PUBLISHED_APPS,
  DEFAULT_PRIMARY_EMAIL,
  DEFAULT_PROJECT_NAME,
  DEFAULT_PROJECT_REF,
  DEFAULT_PROJECT_SUBSCRIPTION_ID,
  DEFAULT_REGION,
  DEFAULT_REST_URL,
  DEFAULT_SERVICE_KEY,
  DEFAULT_STRIPE_CUSTOMER_ID,
  DEFAULT_SUBSCRIPTION_ID,
  DEFAULT_USAGE_BILLING_ENABLED,
  DEFAULT_USERNAME,
  nowIso,
  PLAN_LABELS,
  REGION_SMART_GROUPS,
  REGION_SPECIFICS,
} from '../config/defaults.js'
import { platformSrcDir } from './env.js'
import type {
  AccessTokenWithSecret,
  AuditLogEntry,
  Organization,
  Profile,
  ProjectDetail,
} from './types.js'

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

const projectsRootOverride = process.env.PLATFORM_PROJECTS_ROOT?.trim()
export const PROJECTS_ROOT = projectsRootOverride
  ? resolve(projectsRootOverride)
  : resolve(DATA_DIR, 'projects')

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

const writeStateToDisk = (current: State) => {
  ensureDataDir()
  writeFileSync(STATE_FILE, JSON.stringify(current, null, 2), 'utf-8')
}

const loadState = (): State => {
  ensureDataDir()
  if (!existsSync(STATE_FILE)) {
    const initial = defaultState()
    writeStateToDisk(initial)
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

export let state: State = loadState()

export const saveState = (current: State = state) => {
  writeStateToDisk(current)
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
