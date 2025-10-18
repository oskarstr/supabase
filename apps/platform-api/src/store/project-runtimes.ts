import { existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

import { getPlatformDb } from '../db/client.js'
import type { PlatformDatabase } from '../db/schema.js'
import { MAX_PORT_SLOT } from '../provisioning/ports.js'
import { PROJECTS_ROOT } from './state.js'
import type { Kysely, Transaction } from 'kysely'

export interface ProjectRuntimeRecord {
  project_id: number
  root_dir: string
  excluded_services: string[]
  port_slot: number
}

const ensureDir = (path: string) => {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true })
  }
}

const UNIQUE_VIOLATION = '23505'

const isUniqueViolation = (error: unknown) =>
  typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === UNIQUE_VIOLATION

type RuntimeDbExecutor = Kysely<PlatformDatabase> | Transaction<PlatformDatabase>

const findAvailablePortSlot = async (executor: RuntimeDbExecutor) => {
  if (MAX_PORT_SLOT < 0) {
    throw new Error('No runtime port slots are available. Adjust the platform port configuration.')
  }

  const rows = await executor
    .selectFrom('project_runtimes')
    .select('port_slot')
    .where('port_slot', 'is not', null)
    .execute()

  const used = new Set(rows.map((row) => Number(row.port_slot)))

  for (let slot = 0; slot <= MAX_PORT_SLOT; slot += 1) {
    if (!used.has(slot)) {
      return slot
    }
  }

  throw new Error(
    'All runtime port slots are exhausted. Remove unused projects or adjust PLATFORM_PROJECT_PORT_BASE/PLATFORM_PROJECT_PORT_STEP.'
  )
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

  const attempt = async (): Promise<ProjectRuntimeRecord> =>
    db.transaction().execute(async (trx) => {
      const existing = await trx
        .selectFrom('project_runtimes')
        .select(['project_id', 'root_dir', 'excluded_services', 'port_slot'])
        .where('project_id', '=', projectId)
        .executeTakeFirst()

      if (existing) {
        const existingExcluded = existing.excluded_services ?? []
        const hasExcludedUpdate =
          options.excludedServices !== undefined &&
          normalizedExcluded.join(',') !== existingExcluded.join(',')

        let portSlot = Number(existing.port_slot)
        const updates: Partial<ProjectRuntimeRecord> & { port_slot?: number } = {}

        if (existing.root_dir !== rootDir) {
          updates.root_dir = rootDir
        }
        if (hasExcludedUpdate) {
          updates.excluded_services = normalizedExcluded
        }
        if (!Number.isInteger(portSlot)) {
          portSlot = await findAvailablePortSlot(trx)
          updates.port_slot = portSlot
        }

        if (Object.keys(updates).length > 0) {
          await trx
            .updateTable('project_runtimes')
            .set({
              ...('root_dir' in updates ? { root_dir: updates.root_dir } : {}),
              ...('excluded_services' in updates
                ? { excluded_services: updates.excluded_services }
                : {}),
              ...('port_slot' in updates ? { port_slot: updates.port_slot } : {}),
              updated_at: new Date(),
            })
            .where('project_id', '=', projectId)
            .execute()
        }

        const resolvedPortSlot = Number.isInteger(portSlot) ? Number(portSlot) : updates.port_slot
        if (!Number.isInteger(resolvedPortSlot)) {
          throw new Error('Failed to resolve a runtime port slot for project runtime update.')
        }

        return {
          project_id: projectId,
          root_dir: rootDir,
          excluded_services: hasExcludedUpdate ? normalizedExcluded : existingExcluded ?? [],
          port_slot: resolvedPortSlot,
        }
      }

      const portSlot = await findAvailablePortSlot(trx)

      await trx
        .insertInto('project_runtimes')
        .values({
          project_id: projectId,
          root_dir: rootDir,
          excluded_services: normalizedExcluded,
          port_slot: portSlot,
        })
        .execute()

      return { project_id: projectId, root_dir: rootDir, excluded_services: normalizedExcluded, port_slot: portSlot }
    })

  while (true) {
    try {
      return await attempt()
    } catch (error) {
      if (isUniqueViolation(error)) {
        continue
      }
      throw error
    }
  }
}

export const getProjectRuntime = async (
  projectId: number
): Promise<ProjectRuntimeRecord | undefined> => {
  const db = getPlatformDb()
  const row = await db
    .selectFrom('project_runtimes')
    .select(['project_id', 'root_dir', 'excluded_services', 'port_slot'])
    .where('project_id', '=', projectId)
    .executeTakeFirst()

  if (!row) return undefined
  return {
    project_id: row.project_id,
    root_dir: row.root_dir,
    excluded_services: row.excluded_services ?? [],
    port_slot: Number(row.port_slot),
  }
}

export const removeProjectRuntime = async (projectId: number) => {
  const db = getPlatformDb()
  await db.deleteFrom('project_runtimes').where('project_id', '=', projectId).execute()
}
