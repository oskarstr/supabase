import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { parse as parseEnv } from 'dotenv'

import { destroyProjectStack, provisionProjectStack } from '../provisioner.js'
import { buildRestUrl } from './env.js'
import {
  DEFAULT_BRANCH_ENABLED,
  DEFAULT_CLOUD_PROVIDER,
  DEFAULT_DB_HOST,
  DEFAULT_DB_VERSION,
  DEFAULT_INFRA_SIZE,
  DEFAULT_PHYSICAL_BACKUPS,
  DEFAULT_REGION,
  DEFAULT_REST_URL,
  ensureProjectRuntime,
  InternalProject,
  nowIso,
  ProjectRuntime,
  removeProjectRuntime,
  saveState,
  state,
  updateProject,
} from './state.js'
import type {
  CreateProjectBody,
  CreateProjectResponse,
  Organization,
  ProjectDetail,
  RemoveProjectResponse,
} from './types.js'

const ensureDir = (path: string) => {
  mkdirSync(path, { recursive: true })
}

const ensureOrganization = (slug: string): Organization => {
  const org = state.organizations.find((organization) => organization.slug === slug)
  if (!org) {
    throw new Error(`Organization ${slug} not found`)
  }
  return org
}

export const listProjectDetails = (): ProjectDetail[] =>
  state.projects.map(({ anonKey: _anon, serviceKey: _service, ...detail }) => ({
    ...detail,
  }))

export const getProject = (ref: string): ProjectDetail | undefined => {
  const project = state.projects.find((item) => item.ref === ref)
  if (!project) return undefined

  const { anonKey: _anon, serviceKey: _svc, ...detail } = project
  return { ...detail }
}

const scheduleProvisioning = async (
  project: InternalProject,
  org: Organization,
  dbPass: string,
  runtime: ProjectRuntime
) => {
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

const scheduleRemoval = async (project: InternalProject, org: Organization, runtime: ProjectRuntime) => {
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

export const createProject = (body: CreateProjectBody): CreateProjectResponse => {
  const org = ensureOrganization(body.organization_slug)

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

export const deleteProject = (ref: string): RemoveProjectResponse | undefined => {
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
