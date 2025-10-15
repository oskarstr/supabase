import { existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

import { getPlatformDb } from '../db/client.js'
import { PROJECTS_ROOT } from './state.js'

export interface ProjectRuntimeRecord {
  project_id: number
  root_dir: string
  excluded_services: string[]
}

const ensureDir = (path: string) => {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true })
  }
}

export const ensureProjectRuntime = async (
  projectRef: string,
  projectId: number,
  options: { excludedServices?: string[] } = {}
): Promise<ProjectRuntimeRecord> => {
  const db = getPlatformDb()
  const rootDir = resolve(PROJECTS_ROOT, projectRef)
  ensureDir(rootDir)
  const normalizedExcluded = options.excludedServices?.map((service) => service.trim()).filter((service) => service.length > 0) ?? []

  const existing = await db
    .selectFrom('project_runtimes')
    .select(['project_id', 'root_dir', 'excluded_services'])
    .where('project_id', '=', projectId)
    .executeTakeFirst()

  if (existing) {
    const updates: Partial<ProjectRuntimeRecord> = {}
    if (existing.root_dir !== rootDir) {
      updates.root_dir = rootDir
    }
    const existingExcluded = existing.excluded_services ?? []
    const hasExcludedUpdate = options.excludedServices !== undefined &&
      normalizedExcluded.join(',') !== existingExcluded.join(',')

    if (hasExcludedUpdate) {
      updates.excluded_services = normalizedExcluded
    }

    if (Object.keys(updates).length > 0) {
      await db
        .updateTable('project_runtimes')
        .set({
          ...('root_dir' in updates ? { root_dir: updates.root_dir } : {}),
          ...('excluded_services' in updates ? { excluded_services: updates.excluded_services } : {}),
          updated_at: new Date(),
        })
        .where('project_id', '=', projectId)
        .execute()
    }

    return {
      project_id: projectId,
      root_dir: rootDir,
      excluded_services: hasExcludedUpdate ? normalizedExcluded : existingExcluded ?? [],
    }
  }

  await db
    .insertInto('project_runtimes')
    .values({
      project_id: projectId,
      root_dir: rootDir,
      excluded_services: normalizedExcluded,
    })
    .execute()

  return { project_id: projectId, root_dir: rootDir, excluded_services: normalizedExcluded }
}

export const getProjectRuntime = async (projectId: number): Promise<ProjectRuntimeRecord | undefined> => {
  const db = getPlatformDb()
  const row = await db
    .selectFrom('project_runtimes')
    .select(['project_id', 'root_dir', 'excluded_services'])
    .where('project_id', '=', projectId)
    .executeTakeFirst()

  if (!row) return undefined
  return {
    project_id: row.project_id,
    root_dir: row.root_dir,
    excluded_services: row.excluded_services ?? [],
  }
}

export const removeProjectRuntime = async (projectId: number) => {
  const db = getPlatformDb()
  await db.deleteFrom('project_runtimes').where('project_id', '=', projectId).execute()
}
