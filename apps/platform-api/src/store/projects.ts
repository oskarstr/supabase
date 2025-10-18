import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { resolve } from 'node:path'

import { parse as parseEnv } from 'dotenv'

import {
  DEFAULT_BRANCH_ENABLED,
  DEFAULT_CLOUD_PROVIDER,
  DEFAULT_DB_HOST,
  DEFAULT_DB_VERSION,
  DEFAULT_INFRA_SIZE,
  DEFAULT_PHYSICAL_BACKUPS,
  DEFAULT_REGION,
  DEFAULT_REST_URL,
  PLATFORM_DEBUG_ENABLED,
  PLATFORM_PROJECT_REF,
} from '../config/defaults.js'
import { getPlatformDb } from '../db/client.js'
import { toOrganization, toProjectDetail } from '../db/mappers.js'
import type { ProjectsTable } from '../db/schema.js'
import { destroyProjectStack, provisionProjectStack, stopProjectStack } from '../provisioner.js'
import { waitForRuntimeHealth } from '../provisioning/health.js'
import { normalizeExcludedServices } from '../provisioning/services.js'
import { buildRestUrl, runtimePublicHost } from './env.js'
import {
  ensureProjectRuntime,
  getProjectRuntime,
  removeProjectRuntime,
} from './project-runtimes.js'
import type { ProjectRuntimeRecord } from './project-runtimes.js'
import type {
  CreateProjectBody,
  CreateProjectResponse,
  Organization,
  ProjectDetail,
  RemoveProjectResponse,
} from './types.js'

const db = getPlatformDb()

const sanitizeRef = (value: string) => value.toLowerCase().replace(/[^a-z0-9-]/g, '-')
const isPlatformProjectRef = (ref: string) => ref === PLATFORM_PROJECT_REF

const generateUniqueRef = async (name: string) => {
  const base = sanitizeRef(name) || `proj-${randomUUID().slice(0, 8)}`
  let candidate = base
  let attempt = 1

  while (attempt < 100) {
    const existing = await db
      .selectFrom('projects')
      .select('id')
      .where('ref', '=', candidate)
      .executeTakeFirst()
    if (!existing) return candidate
    attempt += 1
    candidate = `${base}-${attempt}`
  }
  throw new Error('Failed to generate unique project ref')
}

type ProjectUpdate = Partial<
  Pick<
    ProjectsTable,
    | 'status'
    | 'rest_url'
    | 'connection_string'
    | 'db_host'
    | 'db_version'
    | 'anon_key'
    | 'service_key'
  >
>

const updateProject = async (ref: string, values: ProjectUpdate) => {
  await db
    .updateTable('projects')
    .set({
      ...values,
      updated_at: new Date(),
    })
    .where('ref', '=', ref)
    .execute()
}

const readProvisionedEnv = (runtimeRoot: string) => {
  const candidatePaths = [resolve(runtimeRoot, '.env'), resolve(runtimeRoot, 'supabase/.env')]

  for (const envPath of candidatePaths) {
    if (existsSync(envPath)) {
      return parseEnv(readFileSync(envPath, 'utf-8'))
    }
  }

  return null
}

const rewriteUrlHost = (value: string, host: string): string | null => {
  try {
    const url = new URL(value)
    url.hostname = host
    return url.toString()
  } catch {
    return null
  }
}

const scheduleProvisioning = async (
  project: ProjectDetail,
  org: Organization,
  options: {
    runtime: ProjectRuntimeRecord
    dbPassword?: string
  }
) => {
  const runtimeRoot = options.runtime.root_dir
  const excludedServices = options.runtime.excluded_services ?? []
  const existingEnv = readProvisionedEnv(runtimeRoot)
  const databasePassword =
    options.dbPassword && options.dbPassword.length > 0
      ? options.dbPassword
      : existingEnv?.SUPABASE_DB_PASSWORD ?? existingEnv?.POSTGRES_PASSWORD ?? randomUUID()
  const dbVersion = project.dbVersion ?? DEFAULT_DB_VERSION
  try {
    await provisionProjectStack({
      projectId: project.id,
      ref: project.ref,
      name: project.name,
      organizationSlug: org.slug,
      cloudProvider: project.cloud_provider,
      region: project.region,
      databasePassword,
      projectRoot: runtimeRoot,
      excludedServices,
      dbVersion,
    })

    const parsedEnv = readProvisionedEnv(runtimeRoot)
    const updates: ProjectUpdate = {}

    if (parsedEnv?.SUPABASE_ANON_KEY) {
      updates.anon_key = parsedEnv.SUPABASE_ANON_KEY
    }
    if (parsedEnv?.SUPABASE_SERVICE_KEY) {
      updates.service_key = parsedEnv.SUPABASE_SERVICE_KEY
    }

    const publicHost = runtimePublicHost
    const supabaseUrlRaw = parsedEnv?.SUPABASE_URL ?? parsedEnv?.SUPABASE_PUBLIC_URL
    if (supabaseUrlRaw) {
      const restBase =
        publicHost?.length
          ? rewriteUrlHost(supabaseUrlRaw, publicHost) ?? supabaseUrlRaw
          : supabaseUrlRaw
      updates.rest_url = buildRestUrl(restBase)
    }

    const dbUrlRaw = parsedEnv?.DATABASE_URL ?? parsedEnv?.SUPABASE_DB_URL
    if (dbUrlRaw) {
      const publicDbUrl =
        publicHost?.length ? rewriteUrlHost(dbUrlRaw, publicHost) ?? dbUrlRaw : dbUrlRaw
      updates.connection_string = publicDbUrl
      try {
        updates.db_host = new URL(publicDbUrl).hostname
      } catch {
        /* noop */
      }
    }

    if (!updates.db_host && publicHost?.length) {
      updates.db_host = publicHost
    }

    if (parsedEnv?.POSTGRES_VERSION) {
      updates.db_version = parsedEnv.POSTGRES_VERSION
    }

    await waitForRuntimeHealth({
      projectId: project.id,
      excludedServices,
    })

    updates.status = 'ACTIVE_HEALTHY'
    await updateProject(project.ref, updates)
  } catch (error) {
    console.error('[platform-api] provisioning failed', project.ref, error)
    await updateProject(project.ref, { status: 'INIT_FAILED' })
    try {
      await destroyProjectStack({
        ref: project.ref,
        name: project.name,
        organizationSlug: org.slug,
        projectRoot: runtimeRoot,
      })
    } catch (cleanupError) {
      console.warn('[platform-api] failed to cleanup after provisioning failure', {
        ref: project.ref,
        error: cleanupError,
      })
    }
  }
}

const scheduleRemoval = async (project: ProjectDetail, org: Organization, runtimeRoot: string) => {
  try {
    await destroyProjectStack({
      ref: project.ref,
      name: project.name,
      organizationSlug: org.slug,
      projectRoot: runtimeRoot,
    })

    await db.deleteFrom('projects').where('ref', '=', project.ref).execute()
    await removeProjectRuntime(project.id)
    await rm(runtimeRoot, { recursive: true, force: true }).catch((error) => {
      console.warn('[platform-api] failed to delete project runtime directory', {
        ref: project.ref,
        runtimeRoot,
        error,
      })
    })
  } catch (error) {
    console.error('[platform-api] destruction failed', project.ref, error)
    await updateProject(project.ref, { status: 'RESTORE_FAILED' })
  }
}

export const listProjectDetails = async (): Promise<ProjectDetail[]> => {
  const [projectRows, runtimeRows] = await Promise.all([
    db.selectFrom('projects').selectAll().orderBy('inserted_at', 'asc').execute(),
    db.selectFrom('project_runtimes').selectAll().execute(),
  ])

  const runtimeByProjectId = new Map(runtimeRows.map((runtime) => [runtime.project_id, runtime]))

  return projectRows
    .filter((row) => PLATFORM_DEBUG_ENABLED || !isPlatformProjectRef(row.ref))
    .map((row) => toProjectDetail(row, runtimeByProjectId.get(row.id) ?? null))
}

export const getProject = async (ref: string): Promise<ProjectDetail | undefined> => {
  const row = await db.selectFrom('projects').selectAll().where('ref', '=', ref).executeTakeFirst()
  if (!row) return undefined
  if (!PLATFORM_DEBUG_ENABLED && isPlatformProjectRef(row.ref)) {
    return undefined
  }

  const runtime = await getProjectRuntime(row.id)

  return toProjectDetail(row, runtime)
}

export const createProject = async (body: CreateProjectBody): Promise<CreateProjectResponse> => {
  const organization = await db
    .selectFrom('organizations')
    .selectAll()
    .where('slug', '=', body.organization_slug)
    .executeTakeFirst()

  if (!organization) {
    throw new Error(`Organization ${body.organization_slug} not found`)
  }

  const excludedServices = normalizeExcludedServices(body.local_runtime?.exclude_services)
  const ref = await generateUniqueRef(body.name)
  const region =
    body.region_selection && 'code' in body.region_selection
      ? body.region_selection.code
      : body.db_region ?? DEFAULT_REGION

  const insertResult = await db
    .insertInto('projects')
    .values({
      organization_id: organization.id,
      ref,
      name: body.name,
      region,
      cloud_provider: body.cloud_provider ?? DEFAULT_CLOUD_PROVIDER,
      status: 'COMING_UP',
      infra_compute_size: body.desired_instance_size ?? DEFAULT_INFRA_SIZE,
      db_host: DEFAULT_DB_HOST,
      db_version: body.postgres_engine ?? DEFAULT_DB_VERSION,
      connection_string: null,
      rest_url: body.auth_site_url ?? '',
      is_branch_enabled: DEFAULT_BRANCH_ENABLED,
      is_physical_backups_enabled: DEFAULT_PHYSICAL_BACKUPS,
      subscription_id: randomUUID(),
      preview_branch_refs: [],
      anon_key: randomUUID(),
      service_key: randomUUID(),
    })
    .returningAll()
    .executeTakeFirstOrThrow()

  const runtime = await ensureProjectRuntime(insertResult.ref, insertResult.id, {
    excludedServices,
  })

  const organizationSummary = toOrganization({
    organization,
    membership: {
      id: 0,
      organization_id: organization.id,
      profile_id: organization.id,
      role_ids: [],
      metadata: {},
      mfa_enabled: false,
      is_owner: true,
      inserted_at: new Date(),
      updated_at: new Date(),
    },
  })

  const detail = toProjectDetail(insertResult, runtime)

  void scheduleProvisioning(detail, organizationSummary, {
    runtime,
    dbPassword: body.db_pass,
  })

  return {
    anon_key: insertResult.anon_key,
    cloud_provider: insertResult.cloud_provider,
    endpoint: insertResult.rest_url ?? DEFAULT_REST_URL,
    id: insertResult.id,
    infra_compute_size: insertResult.infra_compute_size,
    inserted_at: insertResult.inserted_at.toISOString(),
    is_branch_enabled: insertResult.is_branch_enabled,
    is_physical_backups_enabled: insertResult.is_physical_backups_enabled,
    local_runtime: {
      exclude_services: excludedServices,
    },
    name: insertResult.name,
    organization_id: insertResult.organization_id,
    organization_slug: organization.slug,
    preview_branch_refs: [],
    ref: insertResult.ref,
    region: insertResult.region,
    service_key: insertResult.service_key,
    status: insertResult.status,
    subscription_id: insertResult.subscription_id,
  }
}

export const deleteProject = async (ref: string): Promise<RemoveProjectResponse | undefined> => {
  const projectRow = await db
    .selectFrom('projects')
    .selectAll()
    .where('ref', '=', ref)
    .executeTakeFirst()
  if (!projectRow) return undefined

  const organization = await db
    .selectFrom('organizations')
    .selectAll()
    .where('id', '=', projectRow.organization_id)
    .executeTakeFirst()
  if (!organization) return undefined

  const organizationSummary = toOrganization({
    organization,
    membership: {
      id: 0,
      organization_id: organization.id,
      profile_id: organization.id,
      role_ids: [],
      metadata: {},
      mfa_enabled: false,
      is_owner: true,
      inserted_at: new Date(),
      updated_at: new Date(),
    },
  })

  await updateProject(ref, { status: 'GOING_DOWN' })

  const existingRuntime = await getProjectRuntime(projectRow.id)
  const runtime = await ensureProjectRuntime(projectRow.ref, projectRow.id, {
    excludedServices: existingRuntime?.excluded_services,
  })

  const detail = toProjectDetail(projectRow, runtime)
  void scheduleRemoval(detail, organizationSummary, runtime.root_dir)

  return {
    id: projectRow.id,
    name: projectRow.name,
    ref: projectRow.ref,
  }
}

export const pauseProject = async (ref: string): Promise<ProjectDetail | undefined> => {
  const projectRow = await db
    .selectFrom('projects')
    .selectAll()
    .where('ref', '=', ref)
    .executeTakeFirst()
  if (!projectRow) return undefined
  if (!PLATFORM_DEBUG_ENABLED && isPlatformProjectRef(projectRow.ref)) {
    return undefined
  }

  const runtime = await getProjectRuntime(projectRow.id)

  await updateProject(ref, { status: 'PAUSING' })

  if (runtime) {
    try {
      await stopProjectStack({ projectRoot: runtime.root_dir, projectRef: projectRow.ref })
      await updateProject(ref, { status: 'INACTIVE' })
    } catch (error) {
      await updateProject(ref, { status: 'PAUSE_FAILED' })
      throw error
    }
  } else {
    await updateProject(ref, { status: 'INACTIVE' })
  }

  return getProject(ref)
}

export const resumeProject = async (ref: string): Promise<ProjectDetail | undefined> => {
  const projectRow = await db
    .selectFrom('projects')
    .selectAll()
    .where('ref', '=', ref)
    .executeTakeFirst()
  if (!projectRow) return undefined
  if (!PLATFORM_DEBUG_ENABLED && isPlatformProjectRef(projectRow.ref)) {
    return undefined
  }

  const existingRuntime = await getProjectRuntime(projectRow.id)
  const runtime = await ensureProjectRuntime(projectRow.ref, projectRow.id, {
    excludedServices: existingRuntime?.excluded_services,
  })

  const organization = await db
    .selectFrom('organizations')
    .selectAll()
    .where('id', '=', projectRow.organization_id)
    .executeTakeFirst()

  if (!organization) {
    throw new Error(`Organization ${projectRow.organization_id} not found for project ${ref}`)
  }

  const organizationSummary = toOrganization({
    organization,
    membership: {
      id: 0,
      organization_id: organization.id,
      profile_id: organization.id,
      role_ids: [],
      metadata: {},
      mfa_enabled: false,
      is_owner: true,
      inserted_at: new Date(),
      updated_at: new Date(),
    },
  })

  await updateProject(ref, { status: 'COMING_UP' })
  const currentDetail = await getProject(ref)

  if (!currentDetail) return undefined

  void scheduleProvisioning(currentDetail, organizationSummary, {
    runtime,
  })

  return currentDetail
}
