import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { DataType, newDb } from 'pg-mem'
import { randomUUID } from 'node:crypto'
import type { Kysely } from 'kysely'
import type { PlatformDatabase } from '../src/db/schema.js'

const mocks = vi.hoisted(() => ({
  provisionProjectStack: vi.fn(),
  destroyProjectStack: vi.fn(),
  stopProjectStack: vi.fn(),
  waitForRuntimeHealth: vi.fn(),
}))

// NOTE: These tests still mock the runtime agent. Keep adding cases until we can
// swap in the real agent/Docker harness for an end-to-end provisioning run.

const stateModuleMock = vi.hoisted(() => ({
  PROJECTS_ROOT: '',
  DATA_DIR: '',
  STATE_FILE: '',
  saveState: vi.fn(),
  ensureProjectRuntime: vi.fn(),
  removeProjectRuntime: vi.fn(),
  updateProject: vi.fn(),
  state: { projectRuntimes: {} },
}))

vi.mock('../src/provisioner.js', () => ({
  provisionProjectStack: mocks.provisionProjectStack,
  destroyProjectStack: mocks.destroyProjectStack,
  stopProjectStack: mocks.stopProjectStack,
}))

vi.mock('../src/provisioning/health.js', () => ({
  waitForRuntimeHealth: mocks.waitForRuntimeHealth,
}))

vi.mock('../src/store/state.js', () => stateModuleMock)

const sanitizeMigrationSql = (sql: string) =>
  sql
    .replace(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\s*/g, '')
    .replace(/CREATE EXTENSION IF NOT EXISTS "pgcrypto";\s*/g, '')
    .replace(/ADD VALUE IF NOT EXISTS/g, 'ADD VALUE')
    .replace(/COMMENT ON SCHEMA platform IS 'Supabase platform control-plane schema.';\s*/g, '')

const MIGRATIONS_DIR = fileURLToPath(new URL('../migrations', import.meta.url))

describe('project lifecycle integration', () => {
  let tempRoot: string
  let defaults: typeof import('../src/config/defaults.js')

  const originalEnv = { ...process.env }
  type PlatformDb = Kysely<PlatformDatabase>

  const waitForProjectStatus = async (db: PlatformDb, ref: string, status: string) => {
    await vi.waitFor(async () => {
      const row = await db
        .selectFrom('projects')
        .select('status')
        .where('ref', '=', ref)
        .executeTakeFirst()
      expect(row?.status).toBe(status)
    })
  }

  const fetchProjectRow = async (db: PlatformDb, ref: string) =>
    db.selectFrom('projects').selectAll().where('ref', '=', ref).executeTakeFirst()

  const fetchRuntimeRow = async (db: PlatformDb, projectId: number) =>
    db
      .selectFrom('project_runtimes')
      .select(['project_id', 'root_dir', 'excluded_services'])
      .where('project_id', '=', projectId)
      .executeTakeFirst()

  beforeEach(async () => {
    vi.resetModules()
    mocks.provisionProjectStack.mockReset()
    mocks.destroyProjectStack.mockReset()
    mocks.stopProjectStack.mockReset()
    mocks.waitForRuntimeHealth.mockReset()

    tempRoot = mkdtempSync(join(tmpdir(), 'platform-projects-'))
    process.env.PLATFORM_PROJECTS_ROOT = tempRoot
    process.env.PLATFORM_DB_URL = 'pg-mem'
    process.env.SUPABASE_DB_URL = 'pg-mem'
    process.env.PLATFORM_APPLY_MIGRATIONS = 'false'
    process.env.PLATFORM_API_REPO_ROOT = process.cwd()

    stateModuleMock.PROJECTS_ROOT = tempRoot
    stateModuleMock.state = { projectRuntimes: {} }
    stateModuleMock.saveState.mockClear()
    stateModuleMock.ensureProjectRuntime.mockClear()
    stateModuleMock.removeProjectRuntime.mockClear()
    stateModuleMock.updateProject.mockClear()

    const memDb = newDb()
    memDb.public.registerFunction({
      name: 'gen_random_uuid',
      returns: DataType.uuid,
      implementation: () => randomUUID(),
    })
    const migrationFiles = readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith('.sql'))
      .sort()

    for (const file of migrationFiles) {
      const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf-8')
      memDb.public.none(sanitizeMigrationSql(sql))
    }
    try {
      memDb.public.none("ALTER TYPE platform.cloud_provider ADD VALUE 'LOCAL';")
    } catch {
      /* ignore if value already exists */
    }
    const { Pool: MemPool } = memDb.adapters.createPg()
    globalThis.__PLATFORM_TEST_POOL__ = new MemPool()

    defaults = await import('../src/config/defaults.js')
    const { seedDefaults } = await import('../src/db/seed.js')
    await seedDefaults()
  })

  afterEach(async () => {
    const { destroyDb } = await import('../src/db/client.js')
    await destroyDb()
    delete (globalThis as any).__PLATFORM_TEST_POOL__
    rmSync(tempRoot, { recursive: true, force: true })
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key]
      }
    }
    Object.assign(process.env, originalEnv)
  })

  it('marks projects healthy after successful provisioning', async () => {
    const anonKey = 'anon-key'
    const serviceKey = 'service-key'
    const dbUrl = 'postgres://postgres:postgres@localhost:5432/postgres'
    const supabaseUrl = 'http://127.0.0.1:54321'

    mocks.provisionProjectStack.mockImplementation(async ({ projectRoot }) => {
      const supabaseDir = join(projectRoot, 'supabase')
      mkdirSync(supabaseDir, { recursive: true })
      writeFileSync(
        join(supabaseDir, '.env'),
        [
          `SUPABASE_ANON_KEY=${anonKey}`,
          `SUPABASE_SERVICE_KEY=${serviceKey}`,
          `SUPABASE_DB_URL=${dbUrl}`,
          `SUPABASE_URL=${supabaseUrl}`,
          'POSTGRES_VERSION=15',
          '',
        ].join('\n')
      )
    })
    mocks.waitForRuntimeHealth.mockResolvedValue(undefined)

    const { createProject } = await import('../src/store/projects.js')
    const { getPlatformDb } = await import('../src/db/client.js')
    const db = getPlatformDb()

    const response = await createProject({
      cloud_provider: 'LOCAL',
      db_pass: 'postgres',
      name: 'runtime-test',
      organization_slug: defaults.DEFAULT_ORG_SLUG,
      postgres_engine: '15',
      region_selection: { code: 'local-dev' },
      local_runtime: { exclude_services: [] },
    })

    expect(response).toMatchObject({ status: 'COMING_UP', ref: 'runtime-test' })
    expect(mocks.provisionProjectStack).toHaveBeenCalledTimes(1)

    await waitForProjectStatus(db, 'runtime-test', 'ACTIVE_HEALTHY')

    const projectRow = await fetchProjectRow(db, 'runtime-test')
    expect(projectRow).toBeTruthy()
    expect(projectRow).toMatchObject({
      status: 'ACTIVE_HEALTHY',
      anon_key: anonKey,
      service_key: serviceKey,
      connection_string: dbUrl,
      rest_url: 'http://127.0.0.1:54321/rest/v1/',
      db_host: 'localhost',
    })
    expect(projectRow?.db_version).toBe('15')

    const runtimeRow = projectRow && (await fetchRuntimeRow(db, projectRow.id))
    const expectedRoot = join(tempRoot, 'runtime-test')
    expect(runtimeRow).toMatchObject({
      project_id: projectRow?.id,
      root_dir: expectedRoot,
      excluded_services: ['logflare', 'vector'],
    })

    const provisionPayload = mocks.provisionProjectStack.mock.calls[0]?.[0]
    expect(provisionPayload).toMatchObject({
      projectId: projectRow?.id,
      ref: 'runtime-test',
      name: 'runtime-test',
      organizationSlug: defaults.DEFAULT_ORG_SLUG,
      cloudProvider: 'LOCAL',
      databasePassword: 'postgres',
      projectRoot: expectedRoot,
      excludedServices: ['logflare', 'vector'],
    })
    expect(typeof provisionPayload.projectId).toBe('number')

    expect(mocks.waitForRuntimeHealth).toHaveBeenCalledTimes(1)
    expect(mocks.waitForRuntimeHealth).toHaveBeenCalledWith({
      projectId: projectRow?.id,
      excludedServices: ['logflare', 'vector'],
    })
    expect(mocks.destroyProjectStack).not.toHaveBeenCalled()
  })

  it('records INIT_FAILED and cleans up when provisioning fails', async () => {
    mocks.provisionProjectStack.mockRejectedValue(new Error('boom'))
    mocks.destroyProjectStack.mockResolvedValue(undefined)

    const { createProject } = await import('../src/store/projects.js')
    const { getPlatformDb } = await import('../src/db/client.js')
    const db = getPlatformDb()

    await createProject({
      cloud_provider: 'LOCAL',
      db_pass: 'postgres',
      name: 'runtime-failure',
      organization_slug: defaults.DEFAULT_ORG_SLUG,
      postgres_engine: '15',
      region_selection: { code: 'local-dev' },
      local_runtime: { exclude_services: [] },
    })

    await waitForProjectStatus(db, 'runtime-failure', 'INIT_FAILED')
    const projectRow = await fetchProjectRow(db, 'runtime-failure')
    expect(projectRow?.status).toBe('INIT_FAILED')
    expect(projectRow?.connection_string).toBeNull()

    expect(mocks.waitForRuntimeHealth).not.toHaveBeenCalled()
    expect(mocks.destroyProjectStack).toHaveBeenCalledTimes(1)

    const cleanupPayload = mocks.destroyProjectStack.mock.calls[0]?.[0]
    expect(cleanupPayload).toMatchObject({
      ref: 'runtime-failure',
      name: 'runtime-failure',
      organizationSlug: defaults.DEFAULT_ORG_SLUG,
      projectRoot: join(tempRoot, 'runtime-failure'),
    })
  })

  it('marks provisioning as failed when runtime health checks do not converge', async () => {
    const projectRef = 'runtime-health-failure'

    mocks.provisionProjectStack.mockImplementation(async ({ projectRoot }) => {
      const supabaseDir = join(projectRoot, 'supabase')
      mkdirSync(supabaseDir, { recursive: true })
      writeFileSync(
        join(supabaseDir, '.env'),
        'SUPABASE_DB_URL=postgres://postgres:postgres@localhost:5432/postgres\n'
      )
    })
    mocks.waitForRuntimeHealth.mockRejectedValue(new Error('timeout'))
    mocks.destroyProjectStack.mockResolvedValue(undefined)

    const { createProject } = await import('../src/store/projects.js')
    const { getPlatformDb } = await import('../src/db/client.js')
    const db = getPlatformDb()

    await createProject({
      cloud_provider: 'LOCAL',
      db_pass: 'postgres',
      name: projectRef,
      organization_slug: defaults.DEFAULT_ORG_SLUG,
      postgres_engine: '15',
      region_selection: { code: 'local-dev' },
      local_runtime: { exclude_services: [] },
    })

    await waitForProjectStatus(db, projectRef, 'INIT_FAILED')
    const projectRow = await fetchProjectRow(db, projectRef)
    expect(projectRow?.status).toBe('INIT_FAILED')
    expect(projectRow?.connection_string).toBeNull()
    expect(projectRow?.rest_url).toBe('')

    expect(mocks.provisionProjectStack).toHaveBeenCalledTimes(1)
    expect(mocks.waitForRuntimeHealth).toHaveBeenCalledTimes(1)
    expect(mocks.destroyProjectStack).toHaveBeenCalledTimes(1)

    const cleanupPayload = mocks.destroyProjectStack.mock.calls[0]?.[0]
    expect(cleanupPayload).toMatchObject({
      ref: projectRef,
      projectRoot: join(tempRoot, projectRef),
    })
  })

  it('normalizes runtime excluded services before provisioning and health checks', async () => {
    mocks.provisionProjectStack.mockResolvedValue(undefined)
    mocks.waitForRuntimeHealth.mockResolvedValue(undefined)

    const { createProject } = await import('../src/store/projects.js')
    const { getPlatformDb } = await import('../src/db/client.js')
    const db = getPlatformDb()

    const response = await createProject({
      cloud_provider: 'LOCAL',
      db_pass: 'postgres',
      name: 'runtime-exclusions',
      organization_slug: defaults.DEFAULT_ORG_SLUG,
      postgres_engine: '15',
      region_selection: { code: 'local-dev' },
      local_runtime: {
        exclude_services: ['  realtime', 'vector', 'vector', 'unknown', 'logflare'],
      },
    })

    expect(response.local_runtime.exclude_services).toEqual(['realtime', 'vector', 'logflare'])

    await waitForProjectStatus(db, 'runtime-exclusions', 'ACTIVE_HEALTHY')
    const projectRow = await fetchProjectRow(db, 'runtime-exclusions')
    expect(projectRow?.status).toBe('ACTIVE_HEALTHY')

    const runtimeRow = projectRow && (await fetchRuntimeRow(db, projectRow.id))
    expect(runtimeRow?.excluded_services).toEqual(['realtime', 'vector', 'logflare'])

    expect(mocks.provisionProjectStack).toHaveBeenCalledTimes(1)
    const provisionPayload = mocks.provisionProjectStack.mock.calls[0]?.[0]
    expect(provisionPayload?.excludedServices).toEqual(['realtime', 'vector', 'logflare'])

    expect(mocks.waitForRuntimeHealth).toHaveBeenCalledWith({
      projectId: projectRow?.id,
      excludedServices: ['realtime', 'vector', 'logflare'],
    })
  })

  it('removes project data and runtime directory on delete', async () => {
    const projectRef = 'runtime-delete'

    mocks.provisionProjectStack.mockImplementation(async ({ projectRoot }) => {
      const supabaseDir = join(projectRoot, 'supabase')
      mkdirSync(supabaseDir, { recursive: true })
      writeFileSync(join(supabaseDir, '.env'), 'SUPABASE_DB_URL=postgres://host/db\n')
    })
    mocks.waitForRuntimeHealth.mockResolvedValue(undefined)
    let releaseDestroy: (() => void) | undefined
    const destroyGate = new Promise<void>((resolve) => {
      releaseDestroy = resolve
    })
    mocks.destroyProjectStack.mockImplementation(async () => {
      await destroyGate
    })

    const { createProject, deleteProject } = await import('../src/store/projects.js')
    const { getPlatformDb } = await import('../src/db/client.js')
    const db = getPlatformDb()

    await createProject({
      cloud_provider: 'LOCAL',
      db_pass: 'postgres',
      name: projectRef,
      organization_slug: defaults.DEFAULT_ORG_SLUG,
      postgres_engine: '15',
      region_selection: { code: 'local-dev' },
      local_runtime: { exclude_services: [] },
    })

    await waitForProjectStatus(db, projectRef, 'ACTIVE_HEALTHY')
    const runtimeRoot = join(tempRoot, projectRef)
    expect(mocks.waitForRuntimeHealth).toHaveBeenCalledTimes(1)
    expect(mocks.waitForRuntimeHealth).toHaveBeenCalledWith({
      projectId: expect.any(Number),
      excludedServices: ['logflare', 'vector'],
    })

    const deleteResponse = await deleteProject(projectRef)
    expect(deleteResponse).toMatchObject({ ref: projectRef })

    const goingDownRow = await fetchProjectRow(db, projectRef)
    expect(goingDownRow?.status).toBe('GOING_DOWN')

    releaseDestroy?.()

    await vi.waitFor(async () => {
      const projectRow = await db
        .selectFrom('projects')
        .select('ref')
        .where('ref', '=', projectRef)
        .executeTakeFirst()
      expect(projectRow).toBeUndefined()

      const runtimeRow = await db
        .selectFrom('project_runtimes')
        .select('project_id')
        .where('root_dir', '=', runtimeRoot)
        .executeTakeFirst()
      expect(runtimeRow).toBeUndefined()

      expect(mocks.destroyProjectStack).toHaveBeenCalledTimes(1)
      expect(mocks.destroyProjectStack).toHaveBeenCalledWith(
        expect.objectContaining({
          ref: projectRef,
          projectRoot: runtimeRoot,
        })
      )

      expect(existsSync(runtimeRoot)).toBe(false)
    })
  })

  it('marks the project as RESTORE_FAILED when runtime destruction errors', async () => {
    const projectRef = 'runtime-delete-failure'

    mocks.provisionProjectStack.mockImplementation(async ({ projectRoot }) => {
      const supabaseDir = join(projectRoot, 'supabase')
      mkdirSync(supabaseDir, { recursive: true })
      writeFileSync(join(supabaseDir, '.env'), 'SUPABASE_DB_URL=postgres://host/db\n')
    })
    mocks.waitForRuntimeHealth.mockResolvedValue(undefined)

    const { createProject, deleteProject } = await import('../src/store/projects.js')
    const { getPlatformDb } = await import('../src/db/client.js')
    const db = getPlatformDb()

    await createProject({
      cloud_provider: 'LOCAL',
      db_pass: 'postgres',
      name: projectRef,
      organization_slug: defaults.DEFAULT_ORG_SLUG,
      postgres_engine: '15',
      region_selection: { code: 'local-dev' },
      local_runtime: { exclude_services: [] },
    })

    await waitForProjectStatus(db, projectRef, 'ACTIVE_HEALTHY')
    const runtimeRoot = join(tempRoot, projectRef)

    mocks.destroyProjectStack.mockRejectedValueOnce(new Error('cleanup failed'))

    const deleteResponse = await deleteProject(projectRef)
    expect(deleteResponse).toMatchObject({ ref: projectRef })

    await waitForProjectStatus(db, projectRef, 'RESTORE_FAILED')
    const projectRow = await fetchProjectRow(db, projectRef)
    expect(projectRow).toMatchObject({ status: 'RESTORE_FAILED' })

    const runtimeRow = projectRow && (await fetchRuntimeRow(db, projectRow.id))
    expect(runtimeRow).toMatchObject({ root_dir: runtimeRoot })
    expect(existsSync(runtimeRoot)).toBe(true)

    expect(mocks.destroyProjectStack).toHaveBeenCalledTimes(1)
    expect(mocks.destroyProjectStack).toHaveBeenCalledWith(
      expect.objectContaining({ ref: projectRef, projectRoot: runtimeRoot })
    )
  })

  it('pauses an active project by stopping its runtime stack', async () => {
    const projectRef = 'runtime-pause'

    mocks.provisionProjectStack.mockImplementation(async ({ projectRoot }) => {
      const supabaseDir = join(projectRoot, 'supabase')
      mkdirSync(supabaseDir, { recursive: true })
      writeFileSync(join(supabaseDir, '.env'), 'SUPABASE_DB_URL=postgres://host/db\n')
    })
    mocks.waitForRuntimeHealth.mockResolvedValue(undefined)
    mocks.stopProjectStack.mockResolvedValue(undefined)

    const { createProject, pauseProject } = await import('../src/store/projects.js')
    const { getPlatformDb } = await import('../src/db/client.js')
    const db = getPlatformDb()

    await createProject({
      cloud_provider: 'LOCAL',
      db_pass: 'postgres',
      name: projectRef,
      organization_slug: defaults.DEFAULT_ORG_SLUG,
      postgres_engine: '15',
      region_selection: { code: 'local-dev' },
      local_runtime: { exclude_services: [] },
    })

    await waitForProjectStatus(db, projectRef, 'ACTIVE_HEALTHY')

    const result = await pauseProject(projectRef)
    expect(result?.status).toBe('INACTIVE')

    const projectRow = await fetchProjectRow(db, projectRef)
    expect(projectRow?.status).toBe('INACTIVE')
    const runtimeRow = projectRow && (await fetchRuntimeRow(db, projectRow.id))
    expect(runtimeRow?.root_dir).toBe(join(tempRoot, projectRef))

    expect(mocks.stopProjectStack).toHaveBeenCalledTimes(1)
    expect(mocks.stopProjectStack).toHaveBeenCalledWith({
      projectRoot: join(tempRoot, projectRef),
      projectRef,
    })
  })

  it('marks pause failures when the runtime stack cannot be stopped', async () => {
    const projectRef = 'runtime-pause-failure'

    mocks.provisionProjectStack.mockImplementation(async ({ projectRoot }) => {
      const supabaseDir = join(projectRoot, 'supabase')
      mkdirSync(supabaseDir, { recursive: true })
      writeFileSync(join(supabaseDir, '.env'), 'SUPABASE_DB_URL=postgres://host/db\n')
    })
    mocks.waitForRuntimeHealth.mockResolvedValue(undefined)

    const { createProject, pauseProject } = await import('../src/store/projects.js')
    const { getPlatformDb } = await import('../src/db/client.js')
    const db = getPlatformDb()

    await createProject({
      cloud_provider: 'LOCAL',
      db_pass: 'postgres',
      name: projectRef,
      organization_slug: defaults.DEFAULT_ORG_SLUG,
      postgres_engine: '15',
      region_selection: { code: 'local-dev' },
      local_runtime: { exclude_services: [] },
    })

    await waitForProjectStatus(db, projectRef, 'ACTIVE_HEALTHY')

    mocks.stopProjectStack.mockRejectedValueOnce(new Error('stop failed'))

    await expect(pauseProject(projectRef)).rejects.toThrow('stop failed')

    const projectRow = await fetchProjectRow(db, projectRef)
    expect(projectRow?.status).toBe('PAUSE_FAILED')
    expect(mocks.stopProjectStack).toHaveBeenCalledTimes(1)
    expect(mocks.stopProjectStack).toHaveBeenCalledWith({
      projectRoot: join(tempRoot, projectRef),
      projectRef,
    })
  })
})
