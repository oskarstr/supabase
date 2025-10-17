import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { newDb, DataType } from 'pg-mem'
import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import { readdirSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const MIGRATIONS_DIR = new URL('../migrations', import.meta.url)
const MIGRATIONS_PATH = fileURLToPath(MIGRATIONS_DIR)

const sanitizeMigrationSql = (sql: string) =>
  sql
    .replace(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\s*/g, '')
    .replace(/CREATE EXTENSION IF NOT EXISTS "pgcrypto";\s*/g, '')
    .replace(/ADD VALUE IF NOT EXISTS/g, 'ADD VALUE')
    .replace(/COMMENT ON SCHEMA platform IS 'Supabase platform control-plane schema.';\s*/g, '')

describe('bootstrap admin reconciliation', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(async () => {
    const { destroyDb } = await import('../src/db/client.js')
    await destroyDb()
    delete (globalThis as any).__PLATFORM_TEST_POOL__
    if ((globalThis as any).__PLATFORM_TEST_FETCH__) {
      delete (globalThis as any).__PLATFORM_TEST_FETCH__
    }
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key]
      }
    }
    Object.assign(process.env, originalEnv)
    vi.restoreAllMocks()
  })

  const initMemDatabase = async () => {
    const memDb = newDb()
    memDb.public.registerFunction({
      name: 'gen_random_uuid',
      returns: DataType.uuid,
      implementation: () => randomUUID(),
    })
    const migrationFiles = readdirSync(MIGRATIONS_PATH)
      .filter((file) => file.endsWith('.sql'))
      .sort()

    for (const file of migrationFiles) {
      const sql = await readFile(join(MIGRATIONS_PATH, file), 'utf-8')
      memDb.public.none(sanitizeMigrationSql(sql))
    }

    const { Pool: MemPool } = memDb.adapters.createPg()
    ;(globalThis as any).__PLATFORM_TEST_POOL__ = new MemPool()
  }

  const baseEnv = {
    PLATFORM_DB_URL: 'pg-mem',
    SUPABASE_DB_URL: 'pg-mem',
    PLATFORM_API_REPO_ROOT: process.cwd(),
    SUPABASE_GOTRUE_URL: 'http://localhost:9999/auth/v1',
    SUPABASE_SERVICE_KEY: 'service-key',
    SUPABASE_ANON_KEY: 'anon-key',
    PLATFORM_ADMIN_PASSWORD: 'supabase',
  }

  const setEnv = (overrides: Record<string, string>) => {
    Object.assign(process.env, baseEnv, overrides)
  }

  it('aligns platform profile gotrue_id with the GoTrue admin user', async () => {
    const expectedUserId = '11111111-2222-3333-4444-555555555555'
    await initMemDatabase()

    const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString()
      if (url.endsWith('/admin/users')) {
        return new Response(
          JSON.stringify({ user: { id: expectedUserId } }),
          {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }
      return new Response(null, { status: 404 })
    })

    ;(globalThis as any).__PLATFORM_TEST_FETCH__ = fetchSpy
    vi.stubGlobal('fetch', fetchSpy)

    setEnv({ PLATFORM_ADMIN_EMAIL: 'admin@example.com' })

    const { seedDefaults } = await import('../src/db/seed.js')
    await seedDefaults()

    const { getPlatformDb } = await import('../src/db/client.js')
    const db = getPlatformDb()
    const row = await db
      .selectFrom('profiles')
      .select(['gotrue_id'])
      .where('id', '=', 1)
      .executeTakeFirst()

    expect(row?.gotrue_id).toBe(expectedUserId)
  })

  it('updates profile identity when the admin email changes', async () => {
    const initialUserId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    const updatedUserId = 'ffffffff-1111-2222-3333-444444444444'

    await initMemDatabase()

    let callIndex = 0
    const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString()
      if (url.endsWith('/admin/users')) {
        const ids = [initialUserId, updatedUserId]
        const id = ids[Math.min(callIndex, ids.length - 1)]
        callIndex += 1
        return new Response(JSON.stringify({ user: { id } }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response(null, { status: 404 })
    })

    ;(globalThis as any).__PLATFORM_TEST_FETCH__ = fetchSpy
    vi.stubGlobal('fetch', fetchSpy)

    const { seedDefaults } = await import('../src/db/seed.js')
    const { getPlatformDb } = await import('../src/db/client.js')
    const db = getPlatformDb()

    setEnv({ PLATFORM_ADMIN_EMAIL: 'admin@example.com' })
    await seedDefaults()

    let profile = await db
      .selectFrom('profiles')
      .select(['gotrue_id', 'primary_email'])
      .where('id', '=', 1)
      .executeTakeFirst()

    expect(profile?.gotrue_id).toBe(initialUserId)
    expect(profile?.primary_email).toBe('admin@example.com')

    setEnv({ PLATFORM_ADMIN_EMAIL: 'new-admin@example.com' })
    await seedDefaults()

    profile = await db
      .selectFrom('profiles')
      .select(['gotrue_id', 'primary_email'])
      .where('id', '=', 1)
      .executeTakeFirst()

    expect(profile?.gotrue_id).toBe(updatedUserId)
    expect(profile?.primary_email).toBe('new-admin@example.com')
  })
})
