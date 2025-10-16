import { existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

import type { Transaction } from 'kysely'

import { getPlatformDb } from '../db/client.js'
import type { PlatformDatabase } from '../db/schema.js'
import { derivePortAllocation, findNextAvailablePortBase } from '../provisioning/ports.js'
import type { ProjectPortAllocation } from '../provisioning/ports.js'
import { PROJECTS_ROOT } from './state.js'

export interface ProjectRuntimeRecord {
  project_id: number
  root_dir: string
  excluded_services: string[]
  port_base: number
  ports: ProjectPortAllocation
}

const ensureDir = (path: string) => {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true })
  }
}

const isUniqueViolation = (error: unknown) =>
  typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === '23505'

const derivePorts = (portBase: number) => ({
  port_base: portBase,
  ports: derivePortAllocation(portBase),
})

const allocatePortBase = async (
  trx: Transaction<PlatformDatabase>,
  excludeProjectId: number | null
): Promise<number> => {
  const rows = await trx
    .selectFrom('project_runtimes')
    .select(['project_id', 'port_base'])
    .execute()

  const usedBases = rows
    .filter((row) => (excludeProjectId == null ? true : row.project_id !== excludeProjectId))
    .map((row) => row.port_base ?? undefined)

  return findNextAvailablePortBase(usedBases)
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

  const maxAttempts = 5
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await db.transaction().execute(async (trx) => {
        const existing = await trx
          .selectFrom('project_runtimes')
          .select(['project_id', 'root_dir', 'excluded_services', 'port_base'])
          .where('project_id', '=', projectId)
          .forUpdate()
          .executeTakeFirst()

        if (existing) {
          let portBase = existing.port_base
          const existingExcluded = existing.excluded_services ?? []
          const hasExcludedUpdate =
            options.excludedServices !== undefined &&
            normalizedExcluded.join(',') !== existingExcluded.join(',')

          const updates: Record<string, unknown> = {}
          if (existing.root_dir !== rootDir) {
            updates.root_dir = rootDir
          }
          if (hasExcludedUpdate) {
            updates.excluded_services = normalizedExcluded
          }
          if (portBase == null) {
            portBase = await allocatePortBase(trx, projectId)
            updates.port_base = portBase
          }

          if (Object.keys(updates).length > 0) {
            await trx
              .updateTable('project_runtimes')
              .set({
                ...updates,
                updated_at: new Date(),
              })
              .where('project_id', '=', projectId)
              .execute()
          }

          const ports = derivePorts(portBase ?? existing.port_base!)
          return {
            project_id: projectId,
            root_dir: 'root_dir' in updates ? (updates.root_dir as string) : rootDir,
            excluded_services: hasExcludedUpdate ? normalizedExcluded : existingExcluded ?? [],
            port_base: ports.port_base,
            ports: ports.ports,
          }
        }

        const portBase = await allocatePortBase(trx, null)

        await trx
          .insertInto('project_runtimes')
          .values({
            project_id: projectId,
            root_dir: rootDir,
            excluded_services: normalizedExcluded,
            port_base: portBase,
          })
          .execute()

        const ports = derivePorts(portBase)
        return {
          project_id: projectId,
          root_dir: rootDir,
          excluded_services: normalizedExcluded,
          port_base: ports.port_base,
          ports: ports.ports,
        }
      })
    } catch (error) {
      if (isUniqueViolation(error)) {
        continue
      }
      throw error
    }
  }

  throw new Error('Failed to allocate project runtime ports after multiple attempts')
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
  const ports = derivePorts(row.port_base)
  return {
    project_id: row.project_id,
    root_dir: row.root_dir,
    excluded_services: row.excluded_services ?? [],
    port_base: ports.port_base,
    ports: ports.ports,
  }
}

export const removeProjectRuntime = async (projectId: number) => {
  const db = getPlatformDb()
  await db.deleteFrom('project_runtimes').where('project_id', '=', projectId).execute()
}
