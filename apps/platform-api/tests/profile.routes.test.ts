import Fastify from 'fastify'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { newDb, DataType } from 'pg-mem'
import { readdirSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'

import platformRoutes from '../src/routes/platform.js'
import { authenticateRequest } from '../src/plugins/authenticate.js'
import { createTestJwt, TEST_JWT_SECRET } from './utils/auth.js'

const sanitizeMigrationSql = (sql: string) =>
  sql
    .replace(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\s*/g, '')
    .replace(/CREATE EXTENSION IF NOT EXISTS "pgcrypto";\s*/g, '')
    .replace(/ADD VALUE IF NOT EXISTS/g, 'ADD VALUE')
    .replace(/COMMENT ON SCHEMA platform IS 'Supabase platform control-plane schema.';\s*/g, '')

const MIGRATIONS_DIR = resolve(process.cwd(), 'migrations')

const createApp = async () => {
  const app = Fastify({ logger: false })
  await app.register(async (instance) => {
    instance.addHook('preHandler', authenticateRequest)
    await instance.register(platformRoutes, { prefix: '/api/platform' })
  })
  await app.ready()
  return app
}

describe('profile routes', () => {
  let app: Awaited<ReturnType<typeof createApp>>

  beforeEach(async () => {
    vi.resetModules()
    process.env.JWT_SECRET = TEST_JWT_SECRET
    process.env.PLATFORM_DB_URL = 'pg-mem'
    process.env.SUPABASE_DB_URL = 'pg-mem'
    process.env.PLATFORM_API_REPO_ROOT = process.cwd()

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
      const sql = await readFile(resolve(MIGRATIONS_DIR, file), 'utf-8')
      memDb.public.none(sanitizeMigrationSql(sql))
    }

    const { Pool: MemPool } = memDb.adapters.createPg()
    globalThis.__PLATFORM_TEST_POOL__ = new MemPool()

    const { seedDefaults } = await import('../src/db/seed.js')
    await seedDefaults()

    app = await createApp()
  })

  afterEach(async () => {
    await app.close()
    const { destroyDb } = await import('../src/db/client.js')
    await destroyDb()
    delete (globalThis as any).__PLATFORM_TEST_POOL__
  })

  const authHeaders = (payload: Record<string, unknown> = {}) => ({
    authorization: `Bearer ${createTestJwt({ sub: 'test-user', ...payload })}`,
  })

  it('returns 404 when profile is not found', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/platform/profile',
      headers: authHeaders(),
    })
    if (response.statusCode !== 404) {
      throw new Error(`GET /profile -> ${response.statusCode}: ${response.body}`)
    }
    expect(response.statusCode).toBe(404)
  })

  it('creates a profile and returns it', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/platform/profile',
      headers: authHeaders({ email: 'test@example.com' }),
    })
    expect(create.statusCode).toBe(201)
    const created = create.json()
    expect(created.primary_email).toBe('test@example.com')

    const get = await app.inject({
      method: 'GET',
      url: '/api/platform/profile',
      headers: authHeaders(),
    })
    expect(get.statusCode).toBe(200)
    expect(get.json().gotrue_id).toBe('test-user')
  })

  it('updates the profile', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/platform/profile',
      headers: authHeaders({ email: 'test@example.com' }),
    })

    const patch = await app.inject({
      method: 'PATCH',
      url: '/api/platform/profile',
      headers: authHeaders(),
      payload: {
        first_name: 'Test',
        last_name: 'User',
        username: 'tester',
        primary_email: 'updated@example.com',
      },
    })

    expect(patch.statusCode).toBe(200)
    expect(patch.json()).toMatchObject({
      first_name: 'Test',
      last_name: 'User',
      username: 'tester',
      primary_email: 'updated@example.com',
    })
  })

  it('returns empty permissions for users without memberships', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/platform/profile',
      headers: authHeaders({ email: 'test@example.com' }),
    })

    const permissions = await app.inject({
      method: 'GET',
      url: '/api/platform/profile/permissions',
      headers: authHeaders(),
    })

    expect(permissions.statusCode).toBe(200)
    expect(permissions.json()).toEqual([])
  })
})
