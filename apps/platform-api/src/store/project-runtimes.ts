import { existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

import { getPlatformDb } from '../db/client.js'
import {
  PROJECT_PORT_BASE,
  PROJECT_PORT_MAX,
  PROJECT_PORT_STEP,
} from '../provisioning/ports.js'
import { PROJECTS_ROOT } from './state.js'

export interface ProjectRuntimeRecord {
  project_id: number
  root_dir: string
  excluded_services: string[]
  port_base: number
}

const ensureDir = (path: string) => {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true })
  }
}

const isUniqueViolation = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: string }).code === '23505'

const findNextAvailablePortBase = async (
  projectId: number | undefined,
  options: { db?: ReturnType<typeof getPlatformDb> } = {}
): Promise<number> => {
  const db = options.db ?? getPlatformDb()
  let query = db
    .selectFrom('project_runtimes')
    .select('port_base')
    .where('port_base', 'is not', null)

  if (projectId !== undefined) {
    query = query.where('project_id', '!=', projectId)
  }

  const rows = await query.orderBy('port_base', 'asc').execute()
  const used = new Set<number>()
  for (const row of rows) {
    if (typeof row.port_base === 'number') {
      used.add(row.port_base)
    }
  }

  let candidate = PROJECT_PORT_BASE
  while (used.has(candidate)) {
    candidate += PROJECT_PORT_STEP
    if (candidate + 3 > PROJECT_PORT_MAX) {
      throw new Error('No available project runtime port ranges remain')
    }
  }

  return candidate
}

const assignPortBaseToExisting = async (
  projectId: number,
  updates: { root_dir: string; excluded_services: string[] },
  db = getPlatformDb()
): Promise<number> => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = await findNextAvailablePortBase(projectId, { db })

    try {
      await db
        .updateTable('project_runtimes')
        .set({
          root_dir: updates.root_dir,
          excluded_services: updates.excluded_services,
          port_base: candidate,
          updated_at: new Date(),
        })
        .where('project_id', '=', projectId)
        .execute()

      return candidate
    } catch (error) {
      if (isUniqueViolation(error)) {
        continue
      }
      throw error
    }
  }

  throw new Error('Failed to allocate unique project runtime port range')
}

export const ensureProjectRuntime = async (
  projectRef: string,
  projectId: number,
  options: { excludedServices?: string[] } = {}
): Promise<ProjectRuntimeRecord> => {
  const db = getPlatformDb()
  const rootDir = resolve(PROJECTS_ROOT, projectRef)
  ensureDir(rootDir)
  const normalizedExcluded =
    options.excludedServices
      ?.map((service) => service.trim())
      .filter((service) => service.length > 0) ?? []

  const existing = await db
    .selectFrom('project_runtimes')
    .select(['project_id', 'root_dir', 'excluded_services', 'port_base'])
    .where('project_id', '=', projectId)
    .executeTakeFirst()

  if (existing) {
    const existingExcluded = existing.excluded_services ?? []
    const hasExcludedUpdate =
      options.excludedServices !== undefined &&
      normalizedExcluded.join(',') !== existingExcluded.join(',')
    const targetExcluded = hasExcludedUpdate ? normalizedExcluded : existingExcluded

    if (existing.port_base == null) {
      const portBase = await assignPortBaseToExisting(
        projectId,
        {
          root_dir: rootDir,
          excluded_services: targetExcluded,
        },
        db
      )

      return {
        project_id: projectId,
        root_dir: rootDir,
        excluded_services: targetExcluded,
        port_base: portBase,
      }
    }

    const updates: Record<string, unknown> = {}
    if (existing.root_dir !== rootDir) {
      updates.root_dir = rootDir
    }
    if (hasExcludedUpdate) {
      updates.excluded_services = normalizedExcluded
    }

    if (Object.keys(updates).length > 0) {
      await db
        .updateTable('project_runtimes')
        .set({
          ...updates,
          updated_at: new Date(),
        })
        .where('project_id', '=', projectId)
        .execute()
    }

    return {
      project_id: projectId,
      root_dir: rootDir,
      excluded_services: hasExcludedUpdate ? normalizedExcluded : existingExcluded,
      port_base: existing.port_base,
    }
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const portBase = await findNextAvailablePortBase(undefined, { db })
    try {
      await db
        .insertInto('project_runtimes')
        .values({
          project_id: projectId,
          root_dir: rootDir,
          excluded_services: normalizedExcluded,
          port_base: portBase,
        })
        .execute()

      return {
        project_id: projectId,
        root_dir: rootDir,
        excluded_services: normalizedExcluded,
        port_base: portBase,
      }
    } catch (error) {
      if (isUniqueViolation(error)) {
        continue
      }
      throw error
    }
  }

  throw new Error('Failed to allocate unique project runtime port range')
}

export const getProjectRuntime = async (
  projectId: number
): Promise<ProjectRuntimeRecord | undefined> => {
  const db = getPlatformDb()
  const row = await db
    .selectFrom('project_runtimes')
    .select(['project_id', 'root_dir', 'excluded_services', 'port_base'])
    .where('project_id', '=', projectId)
    .executeTakeFirst()

  if (!row) return undefined
  return {
    project_id: row.project_id,
    root_dir: row.root_dir,
    excluded_services: row.excluded_services ?? [],
    port_base: row.port_base ?? PROJECT_PORT_BASE,
  }
}

export const removeProjectRuntime = async (projectId: number) => {
  const db = getPlatformDb()
  await db.deleteFrom('project_runtimes').where('project_id', '=', projectId).execute()
}
