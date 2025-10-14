import { existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

import { getPlatformDb } from '../db/client.js'
import { PROJECTS_ROOT } from './state.js'

export interface ProjectRuntimeRecord {
  project_id: number
  root_dir: string
}

const ensureDir = (path: string) => {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true })
  }
}

export const ensureProjectRuntime = async (
  projectRef: string,
  projectId: number
): Promise<ProjectRuntimeRecord> => {
  const db = getPlatformDb()
  const rootDir = resolve(PROJECTS_ROOT, projectRef)
  ensureDir(rootDir)

  const existing = await db
    .selectFrom('project_runtimes')
    .select(['project_id', 'root_dir'])
    .where('project_id', '=', projectId)
    .executeTakeFirst()

  if (existing) {
    if (existing.root_dir !== rootDir) {
      await db
        .updateTable('project_runtimes')
        .set({
          root_dir: rootDir,
          updated_at: new Date(),
        })
        .where('project_id', '=', projectId)
        .execute()
    }
    return { project_id: projectId, root_dir: rootDir }
  }

  await db
    .insertInto('project_runtimes')
    .values({
      project_id: projectId,
      root_dir: rootDir,
    })
    .execute()

  return { project_id: projectId, root_dir: rootDir }
}

export const removeProjectRuntime = async (projectId: number) => {
  const db = getPlatformDb()
  await db.deleteFrom('project_runtimes').where('project_id', '=', projectId).execute()
}
