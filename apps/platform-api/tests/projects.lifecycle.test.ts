import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { readFile } from 'node:fs/promises'
import { DataType, newDb } from 'pg-mem'
import { randomUUID } from 'node:crypto'

const mocks = vi.hoisted(() => ({
  provisionProjectStack: vi.fn(),
  destroyProjectStack: vi.fn(),
  stopProjectStack: vi.fn(),
  waitForRuntimeHealth: vi.fn(),
}))

vi.mock('../src/provisioner.js', () => ({
  provisionProjectStack: mocks.provisionProjectStack,
  destroyProjectStack: mocks.destroyProjectStack,
  stopProjectStack: mocks.stopProjectStack,
}))

vi.mock('../src/provisioning/health.js', () => ({
  waitForRuntimeHealth: mocks.waitForRuntimeHealth,
}))

const sanitizeMigrationSql = (sql: string) =>
  sql
    .replace(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\s*/g, '')
    .replace(/CREATE EXTENSION IF NOT EXISTS "pgcrypto";\s*/g, '')
    .replace(/ADD VALUE IF NOT EXISTS/g, 'ADD VALUE')
    .replace(/COMMENT ON SCHEMA platform IS 'Supabase platform control-plane schema.';\s*/g, '')

describe('project lifecycle integration', () => {
  let tempRoot: string
  let defaults: typeof import('../src/config/defaults.js')

  const originalEnv = { ...process.env }

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

    const memDb = newDb()
    const migrationsDir = resolve(process.cwd(), 'migrations')
    memDb.public.registerFunction({
      name: 'gen_random_uuid',
      returns: DataType.uuid,
      implementation: () => randomUUID(),
    })
    const migrationFiles = readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort()

    for (const file of migrationFiles) {
      const sql = await readFile(resolve(migrationsDir, file), 'utf-8')
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

    mocks.provisionProjectStack.mockImplementation(async ({ projectRoot }) => {
      const supabaseDir = join(projectRoot, 'supabase')
      mkdirSync(supabaseDir, { recursive: true })
      writeFileSync(
        join(supabaseDir, '.env'),
        `SUPABASE_ANON_KEY=${anonKey}\nSUPABASE_SERVICE_KEY=${serviceKey}\nSUPABASE_DB_URL=${dbUrl}\nPOSTGRES_VERSION=15\n`
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

    expect(response.status).toBe('COMING_UP')
    expect(mocks.provisionProjectStack).toHaveBeenCalledTimes(1)
    expect(mocks.destroyProjectStack).not.toHaveBeenCalled()

    await vi.waitFor(async () => {
      const row = await db
        .selectFrom('projects')
        .select(['status', 'ref', 'anon_key', 'service_key', 'connection_string'])
        .where('ref', '=', 'runtime-test')
        .executeTakeFirst()
      expect(row?.status).toBe('ACTIVE_HEALTHY')
      expect(row?.anon_key).toBe(anonKey)
      expect(row?.service_key).toBe(serviceKey)
      expect(row?.connection_string).toBe(dbUrl)
    })

    expect(mocks.waitForRuntimeHealth).toHaveBeenCalledTimes(1)
    expect(mocks.destroyProjectStack).toHaveBeenCalledTimes(0)
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

    await vi.waitFor(async () => {
      const row = await db
        .selectFrom('projects')
        .select(['status'])
        .where('ref', '=', 'runtime-failure')
        .executeTakeFirst()
      expect(row?.status).toBe('INIT_FAILED')
    })

    expect(mocks.destroyProjectStack).toHaveBeenCalledTimes(1)
  })

  it('removes project data and runtime directory on delete', async () => {
    const projectRef = 'runtime-delete'

    mocks.provisionProjectStack.mockImplementation(async ({ projectRoot }) => {
      const supabaseDir = join(projectRoot, 'supabase')
      mkdirSync(supabaseDir, { recursive: true })
      writeFileSync(join(supabaseDir, '.env'), 'SUPABASE_DB_URL=postgres://host/db\n')
    })
    mocks.waitForRuntimeHealth.mockResolvedValue(undefined)
    mocks.destroyProjectStack.mockResolvedValue(undefined)

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

    await vi.waitFor(async () => {
      const row = await db
        .selectFrom('projects')
        .select('status')
        .where('ref', '=', projectRef)
        .executeTakeFirst()
      expect(row?.status).toBe('ACTIVE_HEALTHY')
    })

    const runtimeRoot = join(tempRoot, projectRef)
    expect(mocks.waitForRuntimeHealth).toHaveBeenCalled()

    const deleteResponse = await deleteProject(projectRef)
    expect(deleteResponse).toMatchObject({ ref: projectRef })

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

      expect(mocks.destroyProjectStack).toHaveBeenCalledWith(
        expect.objectContaining({ projectRoot: runtimeRoot })
      )

      expect(existsSync(runtimeRoot)).toBe(false)
    })
  })
})
