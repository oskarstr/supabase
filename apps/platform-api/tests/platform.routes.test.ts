import Fastify, { type FastifyInstance } from 'fastify'
import { readdirSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { DataType, newDb } from 'pg-mem'
import { randomUUID } from 'node:crypto'

async function buildApp() {
  const platformRoutes = (await import('../src/routes/platform.js')).default
  const apiV1Routes = (await import('../src/routes/api-v1.js')).default
  const app = Fastify({ logger: false })
  await app.register(platformRoutes, { prefix: '/api/platform' })
  await app.register(apiV1Routes, { prefix: '/api/v1' })
  await app.ready()
  return app
}

type PlatformDb = Awaited<ReturnType<typeof import('../src/db/client.js')['getPlatformDb']>>

const toUrl = (input: Parameters<typeof fetch>[0]) => {
  if (typeof input === 'string') {
    return new URL(input)
  }
  if (input instanceof URL) {
    return input
  }
  return new URL(input.url)
}

const sanitizeMigrationSql = (sql: string) =>
  sql
    .replace(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\s*/g, '')
    .replace(/CREATE EXTENSION IF NOT EXISTS "pgcrypto";\s*/g, '')
    .replace(/ADD VALUE IF NOT EXISTS/g, 'ADD VALUE')
    .replace(/COMMENT ON SCHEMA platform IS 'Supabase platform control-plane schema.';\s*/g, '')

const MIGRATIONS_DIR = resolve(process.cwd(), 'migrations')

describe('platform routes', () => {
  let app: FastifyInstance
  let defaultProjectRef = ''
  let defaultOrganizationSlug = ''
  let platformProjectRef = ''
  let platformProjectSchema = ''
  let platformDb: PlatformDb
  let originalProjectStatus = 'ACTIVE_HEALTHY'
  let originalProjectServiceKey = ''

  const loadDefaultProject = async () => {
    if (!platformDb) {
      throw new Error('platformDb not initialized')
    }

    const project = await platformDb
      .selectFrom('projects')
      .select(['ref', 'status', 'service_key'])
      .where('ref', '=', defaultProjectRef)
      .executeTakeFirst()

    if (!project) {
      throw new Error(`Failed to load project ${defaultProjectRef}`)
    }

    return project
  }

  const updateDefaultProject = async (patch: Partial<{ status: string; service_key: string }>) => {
    if (!platformDb) {
      throw new Error('platformDb not initialized')
    }

    await platformDb
      .updateTable('projects')
      .set(patch)
      .where('ref', '=', defaultProjectRef)
      .execute()
  }

  beforeAll(async () => {
    vi.resetModules()
    process.env.PLATFORM_DEBUG = 'true'
    process.env.PLATFORM_DB_URL = 'pg-mem'
    process.env.SUPABASE_DB_URL = 'pg-mem'
    process.env.PLATFORM_API_REPO_ROOT = process.cwd()
    process.env.PLATFORM_APPLY_MIGRATIONS = 'false'

    const defaults = await import('../src/config/defaults.js')
    defaultOrganizationSlug = defaults.DEFAULT_ORG_SLUG
    defaultProjectRef = defaults.DEFAULT_PROJECT_REF
    platformProjectRef = defaults.PLATFORM_PROJECT_REF
    platformProjectSchema = defaults.PLATFORM_PROJECT_SCHEMA

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
    try {
      memDb.public.none("ALTER TYPE platform.cloud_provider ADD VALUE 'LOCAL';")
    } catch {
      /* ignore if value already exists */
    }

    const { Pool: MemPool } = memDb.adapters.createPg()
    globalThis.__PLATFORM_TEST_POOL__ = new MemPool()

    const { seedDefaults } = await import('../src/db/seed.js')
    await seedDefaults()
    const { listProjectDetails } = await import('../src/store/projects.js')
    const projects = await listProjectDetails()
    if (!defaultProjectRef) {
      defaultProjectRef = projects[0]?.ref ?? ''
    }
    if (!platformProjectRef) {
      const fallbackPlatform = projects.find((project) => project.ref !== defaultProjectRef)
      platformProjectRef = fallbackPlatform?.ref ?? platformProjectRef
    }

    const { getPlatformDb } = await import('../src/db/client.js')
    platformDb = getPlatformDb()
    const project = await loadDefaultProject()
    originalProjectStatus = project.status
    originalProjectServiceKey = project.service_key
  })

  afterAll(async () => {
    delete (globalThis as any).__PLATFORM_TEST_POOL__
    const { destroyDb } = await import('../src/db/client.js')
    await destroyDb()
  })

  beforeEach(async () => {
    process.env.PLATFORM_API_REPO_ROOT = process.cwd()
    if (defaultProjectRef) {
      await updateDefaultProject({
        status: originalProjectStatus,
        service_key: originalProjectServiceKey,
      })
    }
    app = await buildApp()
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    if (defaultProjectRef) {
      await updateDefaultProject({
        status: originalProjectStatus,
        service_key: originalProjectServiceKey,
      })
    }
    await app.close()
  })

  it('returns platform status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/platform/status',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ is_healthy: true })
  })

  it('provides notification summary and feed', async () => {
    const summaryResponse = await app.inject({
      method: 'GET',
      url: '/api/platform/notifications/summary',
    })
    expect(summaryResponse.statusCode).toBe(200)
    expect(summaryResponse.json()).toMatchObject({
      has_critical: false,
      has_warning: false,
      unread_count: 0,
    })

    const feedResponse = await app.inject({
      method: 'GET',
      url: '/api/platform/notifications',
    })
    expect(feedResponse.statusCode).toBe(200)
    const feed = feedResponse.json()
    expect(Array.isArray(feed)).toBe(true)
    expect(feed[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      priority: expect.any(String),
      status: expect.any(String),
    })
  })

  it('runs pg-meta query stub', async () => {
    const projectRef = defaultProjectRef
    expect(projectRef).toBeTruthy()

    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/pg-meta/${projectRef}/query?key=schemas`,
      payload: {
        query: 'select nspname as schema from pg_catalog.pg_namespace limit 5;',
      },
    })

    expect(response.statusCode).toBe(201)
    const payload = response.json()
    expect(Array.isArray(payload)).toBe(true)
  })

  it('serves project configuration endpoints for known projects', async () => {
    const projectRef = defaultProjectRef
    expect(projectRef).toBeTruthy()

    const postgrest = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/${projectRef}/config/postgrest`,
    })
    expect(postgrest.statusCode).toBe(200)
    expect(postgrest.json()).toMatchObject({
      db_schema: 'public, storage',
      role_claim_key: '.role',
    })

    const realtime = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/${projectRef}/config/realtime`,
    })
    expect(realtime.statusCode).toBe(200)
    expect(realtime.json()).toMatchObject({
      private_only: false,
      max_concurrent_users: expect.any(Number),
    })

    const pgbouncer = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/${projectRef}/config/pgbouncer`,
    })
    expect(pgbouncer.statusCode).toBe(200)
    expect(pgbouncer.json()).toMatchObject({
      pgbouncer_enabled: true,
      pool_mode: 'transaction',
    })

    const pgbouncerStatus = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/${projectRef}/config/pgbouncer/status`,
    })
    expect(pgbouncerStatus.statusCode).toBe(200)
    expect(pgbouncerStatus.json()).toEqual({ active: true })

    const storage = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/${projectRef}/config/storage`,
    })
    expect(storage.statusCode).toBe(200)
    expect(storage.json()).toMatchObject({
      capabilities: expect.any(Object),
      fileSizeLimit: expect.any(Number),
    })

    const supavisor = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/${projectRef}/config/supavisor`,
    })
    expect(supavisor.statusCode).toBe(200)
    const pools = supavisor.json()
    expect(Array.isArray(pools)).toBe(true)
    expect(pools.length).toBeGreaterThan(0)
  })

  it('includes the platform debug project with its schema', async () => {
    expect(platformProjectRef).toBeTruthy()
    expect(platformProjectSchema).toBeTruthy()

    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/platform/projects',
    })
    expect(listResponse.statusCode).toBe(200)
    const listPayload = listResponse.json() as {
      projects: Array<{ ref: string }>
    }
    const availableRefs = listPayload.projects.map((project) => project.ref)
    expect(availableRefs).toContain(platformProjectRef)

    const postgrest = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/${platformProjectRef}/config/postgrest`,
    })
    expect(postgrest.statusCode).toBe(200)
    expect(postgrest.json()).toMatchObject({
      db_schema: platformProjectSchema,
    })
  })

  it('exposes storage buckets and credentials', async () => {
    const projectRef = defaultProjectRef
    expect(projectRef).toBeTruthy()

    const storageTimestamp = '2024-01-01T00:00:00.000Z'
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    fetchSpy.mockImplementation(async (input, init) => {
      const url =
        typeof input === 'string'
          ? new URL(input)
          : input instanceof URL
            ? input
            : new URL(String(input))

      if (url.pathname.endsWith('/bucket')) {
        return new Response(
          JSON.stringify([
            {
              id: 'bucket-default',
              name: 'public',
              owner: 'service_role',
              public: true,
              created_at: storageTimestamp,
              updated_at: storageTimestamp,
              allowed_mime_types: ['image/png'],
              file_size_limit: 1048576,
              type: 'STANDARD',
            },
          ]),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      }

      if (url.pathname.endsWith('/s3')) {
        return new Response(
          JSON.stringify({
            data: [
              {
                id: 'cred-1',
                description: 'Supabase Storage access key',
                created_at: storageTimestamp,
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      }

      if (url.pathname.includes('/object/list/')) {
        const parsedBody = typeof init?.body === 'string' ? JSON.parse(init.body) : {}
        expect(parsedBody).toMatchObject({ prefix: '' })

        return new Response(
          JSON.stringify([
            {
              id: 'object-1',
              name: 'hello.sql',
              created_at: storageTimestamp,
              updated_at: storageTimestamp,
              last_accessed_at: storageTimestamp,
              metadata: { mimetype: 'text/plain' },
            },
          ]),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      }

      throw new Error(`Unexpected storage fetch: ${url.toString()}`)
    })

    try {
      const buckets = await app.inject({
        method: 'GET',
        url: `/api/platform/storage/${projectRef}/buckets`,
      })
      expect(buckets.statusCode).toBe(200)
      const bucketPayload = buckets.json()
      expect(Array.isArray(bucketPayload)).toBe(true)
      expect(bucketPayload[0]).toMatchObject({
        id: 'bucket-default',
        public: true,
      })

      const credentials = await app.inject({
        method: 'GET',
        url: `/api/platform/storage/${projectRef}/credentials`,
      })
      expect(credentials.statusCode).toBe(200)
      const credentialPayload = credentials.json()
      expect(Array.isArray(credentialPayload.data)).toBe(true)
      expect(credentialPayload.data[0]).toMatchObject({
        id: expect.any(String),
        description: expect.stringContaining('Supabase'),
      })

      const objectsResponse = await app.inject({
        method: 'POST',
        url: `/api/platform/storage/${projectRef}/buckets/bucket-default/objects/list`,
        payload: { path: '', options: { limit: 10 } },
      })
      expect(objectsResponse.statusCode).toBe(200)
      expect(Array.isArray(objectsResponse.json())).toBe(true)

      const publicUrl = await app.inject({
        method: 'POST',
        url: `/api/platform/storage/${projectRef}/buckets/bucket-default/objects/public-url`,
        payload: { path: 'hello.sql' },
      })
      expect(publicUrl.statusCode).toBe(200)
      expect(publicUrl.json()).toMatchObject({ publicUrl: expect.any(String) })
    } finally {
      fetchSpy.mockRestore()
    }
  })

  it('executes pg-meta queries against the project database', async () => {
    const projectRef = defaultProjectRef
    expect(projectRef).toBeTruthy()

    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/pg-meta/${projectRef}/query`,
      payload: {
        query: 'select 1 as value',
      },
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toEqual([{ value: 1 }])
  })

  it('returns project content data and counts', async () => {
    const projectRef = defaultProjectRef
    expect(projectRef).toBeTruthy()

    const content = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/${projectRef}/content?type=sql`,
    })
    expect(content.statusCode).toBe(200)
    expect(Array.isArray(content.json().data)).toBe(true)

    const count = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/${projectRef}/content/count`,
    })
    expect(count.statusCode).toBe(200)
    expect(count.json()).toMatchObject({ private: expect.any(Number) })

    const folders = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/${projectRef}/content/folders`,
    })
    expect(folders.statusCode).toBe(200)
    expect(Array.isArray(folders.json().data.contents)).toBe(true)
  })

  it('provides project API helpers', async () => {
    const projectRef = defaultProjectRef
    expect(projectRef).toBeTruthy()

    const rest = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/${projectRef}/api/rest`,
    })
    expect(rest.statusCode).toBe(200)
    expect(rest.json()).toMatchObject({ swagger: '2.0' })

    const restHead = await app.inject({
      method: 'HEAD',
      url: `/api/platform/projects/${projectRef}/api/rest`,
    })
    expect(restHead.statusCode).toBe(200)

    const tempKey = await app.inject({
      method: 'POST',
      url: `/api/platform/projects/${projectRef}/api-keys/temporary`,
    })
    expect(tempKey.statusCode).toBe(200)
    expect(tempKey.json()).toMatchObject({ api_key: expect.any(String) })
  })

  it('returns organization metadata and usage', async () => {
    const organizationSlug = defaultOrganizationSlug
    expect(organizationSlug).toBeTruthy()

    const members = await app.inject({
      method: 'GET',
      url: `/api/platform/organizations/${organizationSlug}/members`,
    })
    expect(members.statusCode).toBe(200)
    expect(Array.isArray(members.json())).toBe(true)

    const roles = await app.inject({
      method: 'GET',
      url: `/api/platform/organizations/${organizationSlug}/roles`,
    })
    expect(roles.statusCode).toBe(200)
    expect(Array.isArray(roles.json().org_scoped_roles)).toBe(true)

    const invitations = await app.inject({
      method: 'GET',
      url: `/api/platform/organizations/${organizationSlug}/members/invitations`,
    })
    expect(invitations.statusCode).toBe(200)
    expect(Array.isArray(invitations.json().invitations)).toBe(true)

    const usage = await app.inject({
      method: 'GET',
      url: `/api/platform/organizations/${organizationSlug}/usage/daily`,
    })
    expect(usage.statusCode).toBe(200)
    expect(Array.isArray(usage.json().usages)).toBe(true)
  })

  it('creates a new organization', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/platform/organizations',
      payload: {
        name: 'Seeded Test Org',
        tier: 'tier_free',
      },
    })

    const payload = response.json()
    expect(response.statusCode).toBe(201)
    const org = payload
    expect(org).toMatchObject({
      name: 'Seeded Test Org',
      plan: { id: 'free' },
    })
  })

  it('lists replication sources', async () => {
    const projectRef = defaultProjectRef
    expect(projectRef).toBeTruthy()

    const replication = await app.inject({
      method: 'GET',
      url: `/api/platform/replication/${projectRef}/sources`,
    })
    expect(replication.statusCode).toBe(200)
    expect(Array.isArray(replication.json())).toBe(true)
  })

  it('serves disk, analytics, auth, and integration stubs', async () => {
    const projectRef = defaultProjectRef
    const organizationSlug = defaultOrganizationSlug
    expect(projectRef).toBeTruthy()
    expect(organizationSlug).toBeTruthy()

    let disableSignup = true
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = toUrl(input)
      const method = (init?.method ?? 'GET').toUpperCase()

      if (url.pathname === '/auth/v1/admin/settings' && method === 'GET') {
        return new Response(
          JSON.stringify({
            DISABLE_SIGNUP: disableSignup,
            SITE_URL: `https://${projectRef}.supabase.local`,
            MAILER_SUBJECTS_INVITE: 'Invite',
            EXTERNAL_EMAIL_ENABLED: true,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }

      if (url.pathname === '/auth/v1/admin/settings' && method === 'PATCH') {
        const body =
          typeof init?.body === 'string' && init.body.length > 0 ? JSON.parse(init.body) : {}
        if (typeof body.DISABLE_SIGNUP === 'boolean') {
          disableSignup = body.DISABLE_SIGNUP
        }
        return new Response(
          JSON.stringify({
            DISABLE_SIGNUP: disableSignup,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }

      if (url.pathname === '/auth/v1/admin/settings/hooks' && method === 'PATCH') {
        return new Response(null, { status: 204 })
      }

      throw new Error(`Unexpected auth fetch: ${method} ${url.toString()}`)
    })

    const disk = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/${projectRef}/disk`,
    })
    expect(disk.statusCode).toBe(200)
    expect(disk.json()).toMatchObject({ size_gb: expect.any(Number) })

    const diskConfig = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/${projectRef}/disk/custom-config`,
    })
    expect(diskConfig.statusCode).toBe(200)

    const diskUtil = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/${projectRef}/disk/util`,
    })
    expect(diskUtil.statusCode).toBe(200)

    const loadBalancers = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/${projectRef}/load-balancers`,
    })
    expect(loadBalancers.statusCode).toBe(200)
    expect(Array.isArray(loadBalancers.json())).toBe(true)

    const logDrains = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/${projectRef}/analytics/log-drains`,
    })
    expect(logDrains.statusCode).toBe(200)
    expect(Array.isArray(logDrains.json())).toBe(true)

    const logsGet = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/${projectRef}/analytics/endpoints/logs.all`,
    })
    expect(logsGet.statusCode).toBe(200)
    expect(logsGet.json()).toMatchObject({ result: expect.any(Array) })

    const logsPost = await app.inject({
      method: 'POST',
      url: `/api/platform/projects/${projectRef}/analytics/endpoints/logs.all`,
      payload: {
        sql: 'select 1',
        iso_timestamp_start: new Date().toISOString(),
        iso_timestamp_end: new Date().toISOString(),
      },
    })
    expect(logsPost.statusCode).toBe(200)

    const usageCounts = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/${projectRef}/analytics/endpoints/usage.api-counts?interval=1hr`,
    })
    expect(usageCounts.statusCode).toBe(200)

    const usageRequests = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/${projectRef}/analytics/endpoints/usage.api-requests-count`,
    })
    expect(usageRequests.statusCode).toBe(200)

    const authConfig = await app.inject({
      method: 'GET',
      url: `/api/platform/auth/${projectRef}/config`,
    })
    expect(authConfig.statusCode).toBe(200)
    const authConfigPayload = authConfig.json()
    expect(typeof authConfigPayload.SITE_URL).toBe('string')
    expect(authConfigPayload.SITE_URL).toContain(projectRef)
    expect(typeof authConfigPayload.MAILER_SUBJECTS_INVITE).toBe('string')
    expect(typeof authConfigPayload.EXTERNAL_EMAIL_ENABLED).toBe('boolean')

    const authPatch = await app.inject({
      method: 'PATCH',
      url: `/api/platform/auth/${projectRef}/config`,
      payload: { DISABLE_SIGNUP: false },
    })
    expect(authPatch.statusCode).toBe(200)
    expect(authPatch.json().DISABLE_SIGNUP).toBe(false)

    const authHooks = await app.inject({
      method: 'PATCH',
      url: `/api/platform/auth/${projectRef}/config/hooks`,
      payload: {},
    })
    expect(authHooks.statusCode).toBe(200)
    fetchMock.mockRestore()

    const combinedStats = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/${projectRef}/analytics/endpoints/functions.combined-stats?function_id=edge-fn&interval=1hr`,
    })
    expect(combinedStats.statusCode).toBe(200)
    const combinedPayload = combinedStats.json()
    expect(Array.isArray(combinedPayload.result)).toBe(true)
    expect(combinedPayload.result[0]).toMatchObject({
      timestamp: expect.any(String),
      requests_count: expect.any(Number),
      avg_execution_time: expect.any(Number),
      avg_cpu_time_used: expect.any(Number),
    })

    const reqStats = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/${projectRef}/analytics/endpoints/functions.req-stats?function_id=edge-fn&interval=1hr`,
    })
    expect(reqStats.statusCode).toBe(200)
    const reqPayload = reqStats.json()
    expect(Array.isArray(reqPayload.result)).toBe(true)
    expect(reqPayload.result[0]).toMatchObject({
      timestamp: expect.any(String),
      success_count: expect.any(Number),
      client_err_count: expect.any(Number),
    })

    const resourceUsage = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/${projectRef}/analytics/endpoints/functions.resource-usage?function_id=edge-fn&interval=1hr`,
    })
    expect(resourceUsage.statusCode).toBe(200)
    const resourcePayload = resourceUsage.json()
    expect(Array.isArray(resourcePayload.result)).toBe(true)
    expect(resourcePayload.result[0]).toMatchObject({
      timestamp: expect.any(String),
      avg_cpu_time_used: expect.any(Number),
      avg_memory_used: expect.any(Number),
      max_cpu_time_used: expect.any(Number),
    })

    const backups = await app.inject({
      method: 'GET',
      url: `/api/platform/database/${projectRef}/backups`,
    })
    expect(backups.statusCode).toBe(200)

    const repos = await app.inject({
      method: 'GET',
      url: '/api/platform/integrations/github/repositories',
    })
    expect(repos.statusCode).toBe(200)
  })

  it('provides branch metadata via legacy v1 route', async () => {
    const projectRef = defaultProjectRef
    expect(projectRef).toBeTruthy()

    const branches = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectRef}/branches`,
    })
    expect(branches.statusCode).toBe(200)
    const payload = branches.json()
    expect(Array.isArray(payload)).toBe(true)
    expect(payload[0]).toMatchObject({
      project_ref: projectRef,
      name: expect.any(String),
      status: expect.any(String),
    })

    const apiKeys = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectRef}/api-keys?reveal=false`,
    })
    expect(apiKeys.statusCode).toBe(200)
    const keysPayload = apiKeys.json()
    expect(Array.isArray(keysPayload)).toBe(true)
    expect(keysPayload[0]).toMatchObject({
      name: expect.any(String),
      api_key: expect.any(String),
      type: expect.any(String),
    })

    const functions = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectRef}/functions`,
    })
    expect(functions.statusCode).toBe(200)
    const functionsPayload = functions.json()
    expect(Array.isArray(functionsPayload)).toBe(true)
    expect(functionsPayload[0]).toMatchObject({
      slug: expect.any(String),
      status: 'ACTIVE',
    })

    const upgradeStatus = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectRef}/upgrade/status`,
    })
    expect(upgradeStatus.statusCode).toBe(200)
    expect(upgradeStatus.json()).toMatchObject({
      databaseUpgradeStatus: expect.objectContaining({
        status: expect.any(Number),
        target_version: expect.any(Number),
      }),
    })

    const health = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectRef}/health?services=auth,realtime`,
    })
    expect(health.statusCode).toBe(200)
    const healthPayload = health.json()
    expect(Array.isArray(healthPayload)).toBe(true)
    expect(healthPayload[0]).toMatchObject({
      name: 'auth',
      healthy: true,
    })
  })

  it('returns schema metadata with names for pg-meta queries', async () => {
    const projectRef = defaultProjectRef
    expect(projectRef).toBeTruthy()

    const schemas = await app.inject({
      method: 'POST',
      url: `/api/platform/pg-meta/${projectRef}/query?key=schemas`,
      payload: {
        query: "select 'platform'::text as schema, 'platform'::text as name",
      },
    })
    expect(schemas.statusCode).toBe(201)
    const payload = schemas.json()
    expect(Array.isArray(payload)).toBe(true)
    expect(payload[0]).toMatchObject({
      schema: expect.any(String),
      name: expect.any(String),
    })
  })

  describe('platform auth configuration guards', () => {
    it('returns 503 while the project is provisioning', async () => {
      const projectRef = defaultProjectRef
      expect(projectRef).toBeTruthy()

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
        throw new Error('fetch should not be called when the auth guard fails')
      })

      await updateDefaultProject({ status: 'COMING_UP' })

      const response = await app.inject({
        method: 'GET',
        url: `/api/platform/auth/${projectRef}/config`,
      })

      expect(response.statusCode).toBe(503)
      expect(response.json()).toMatchObject({
        message: `Project ${projectRef} is still provisioning; auth config unavailable`,
      })
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('returns 503 when the project is missing its service key', async () => {
      const projectRef = defaultProjectRef
      expect(projectRef).toBeTruthy()

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
        throw new Error('fetch should not be called without a service key')
      })

      await updateDefaultProject({
        status: originalProjectStatus,
        service_key: '',
      })

      const response = await app.inject({
        method: 'GET',
        url: `/api/platform/auth/${projectRef}/config`,
      })

      expect(response.statusCode).toBe(503)
      expect(response.json()).toMatchObject({
        message: `Project ${projectRef} is missing a service role key for auth config access`,
      })
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('merges the GoTrue payload with defaults when the guard passes', async () => {
      const projectRef = defaultProjectRef
      expect(projectRef).toBeTruthy()

      await updateDefaultProject({
        status: 'ACTIVE_HEALTHY',
        service_key: originalProjectServiceKey,
      })

      const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
        const url = toUrl(input)
        expect(url.pathname).toBe(`/auth/v1/admin/settings`)
        expect(init?.method).toBe('GET')
        expect(init?.headers).toMatchObject({
          Accept: 'application/json',
          apikey: originalProjectServiceKey,
          Authorization: `Bearer ${originalProjectServiceKey}`,
        })
        expect(init?.body).toBeUndefined()

        return new Response(
          JSON.stringify({
            DISABLE_SIGNUP: true,
            MFA_MAX_ENROLLED_FACTORS: 4,
            SITE_URL: 'https://external.example',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      })

      const response = await app.inject({
        method: 'GET',
        url: `/api/platform/auth/${projectRef}/config`,
      })

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.DISABLE_SIGNUP).toBe(true)
      expect(body.MFA_MAX_ENROLLED_FACTORS).toBe(4)
      expect(body.SITE_URL).toBe('https://external.example')
      expect(body.URI_ALLOW_LIST).toBe(`https://${projectRef}.supabase.local`)
      fetchMock.mockRestore()
    })

    it('falls back to the legacy settings path when the admin endpoint is unavailable', async () => {
      const projectRef = defaultProjectRef
      expect(projectRef).toBeTruthy()

      let callCount = 0
      const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
        const url = toUrl(input)
        callCount += 1
        if (callCount === 1) {
          expect(url.pathname).toBe(`/auth/v1/admin/settings`)
          return new Response(JSON.stringify({ message: 'not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        expect(url.pathname).toBe(`/auth/v1/settings`)
        return new Response(JSON.stringify({ DISABLE_SIGNUP: false }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      })

      const response = await app.inject({
        method: 'GET',
        url: `/api/platform/auth/${projectRef}/config`,
      })

      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(response.statusCode).toBe(200)
      expect(response.json().DISABLE_SIGNUP).toBe(false)
      fetchMock.mockRestore()
    })

    it('strips undefined values when patching the auth config', async () => {
      const projectRef = defaultProjectRef
      expect(projectRef).toBeTruthy()

      const payload = {
        DISABLE_SIGNUP: undefined,
        RATE_LIMIT_VERIFY: 9,
      }

      const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
        const url = toUrl(input)
        expect(url.pathname).toBe(`/auth/v1/admin/settings`)
        expect(init?.method).toBe('PATCH')
        expect(init?.headers).toMatchObject({
          'Content-Type': 'application/json',
          apikey: originalProjectServiceKey,
        })

        const body = JSON.parse((init?.body as string) ?? '{}')
        expect(body).toEqual({ RATE_LIMIT_VERIFY: 9 })

        return new Response(JSON.stringify({ RATE_LIMIT_VERIFY: 9 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      })

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/platform/auth/${projectRef}/config`,
        payload,
      })

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toBe(200)
      expect(response.json().RATE_LIMIT_VERIFY).toBe(9)
      fetchMock.mockRestore()
    })
  })

  describe('platform storage guards', () => {
    it('returns 503 while storage is unavailable during provisioning', async () => {
      const projectRef = defaultProjectRef
      expect(projectRef).toBeTruthy()

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
        throw new Error('storage fetch should not run during provisioning guard failure')
      })

      await updateDefaultProject({ status: 'PAUSING' })

      const response = await app.inject({
        method: 'GET',
        url: `/api/platform/storage/${projectRef}/buckets`,
      })

      expect(response.statusCode).toBe(503)
      expect(response.json()).toMatchObject({
        message: `Project ${projectRef} is still provisioning; storage API unavailable`,
      })
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('returns 503 when the project does not have a storage service key', async () => {
      const projectRef = defaultProjectRef
      expect(projectRef).toBeTruthy()

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
        throw new Error('storage fetch should not run without service key')
      })

      await updateDefaultProject({
        status: originalProjectStatus,
        service_key: '',
      })

      const response = await app.inject({
        method: 'GET',
        url: `/api/platform/storage/${projectRef}/buckets`,
      })

      expect(response.statusCode).toBe(503)
      expect(response.json()).toMatchObject({
        message: `Project ${projectRef} is missing a service role key`,
      })
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('proxies bucket requests to storage with the expected headers', async () => {
      const projectRef = defaultProjectRef
      expect(projectRef).toBeTruthy()

      const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
        const url = toUrl(input)
        expect(url.pathname).toBe(`/storage/v1/bucket`)
        expect(init?.method).toBe('GET')
        expect(init?.headers).toMatchObject({
          Accept: 'application/json',
          Authorization: `Bearer ${originalProjectServiceKey}`,
          apikey: originalProjectServiceKey,
        })
        expect(init?.body).toBeUndefined()

        return new Response(
          JSON.stringify([
            { id: 'bucket-one', name: 'bucket-one', owner: 'owner', public: false },
            { id: 'bucket-two', name: 'bucket-two', owner: 'owner', public: true },
          ]),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      })

    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/storage/${projectRef}/buckets`,
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(response.statusCode).toBe(200)
    const buckets = response.json()
    expect(Array.isArray(buckets)).toBe(true)
    expect(buckets).toHaveLength(2)
    expect(buckets[0]).toMatchObject({ id: 'bucket-one', name: 'bucket-one' })
    fetchMock.mockRestore()
  })

    it('sanitizes the path and options when listing storage objects', async () => {
      const projectRef = defaultProjectRef
      expect(projectRef).toBeTruthy()

      const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
        const url = toUrl(input)
        expect(url.pathname).toBe(`/storage/v1/object/list/my-bucket`)
        expect(init?.method).toBe('POST')
        const parsed = JSON.parse((init?.body as string) ?? '{}')
        expect(parsed).toEqual({
          prefix: 'nested/path',
          limit: 5,
          offset: 10,
          search: 'logo',
          sortBy: { column: 'name', order: 'asc' },
        })

        return new Response(JSON.stringify([{ name: 'logo.png' }]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      })

    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/storage/${projectRef}/buckets/my-bucket/objects/list`,
      payload: {
        path: '/nested/path',
          options: {
            limit: 5,
            offset: 10,
            search: 'logo',
            sortBy: { column: 'name', order: 'asc' },
          },
        },
      })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual([{ name: 'logo.png' }])
    fetchMock.mockRestore()
  })

    it('propagates storage API failures with the original status text', async () => {
      const projectRef = defaultProjectRef
      expect(projectRef).toBeTruthy()

      const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
        const url = toUrl(input)
        expect(url.pathname).toBe(`/storage/v1/bucket`)

        return new Response('storage is down', {
          status: 502,
          statusText: 'Bad Gateway',
          headers: { 'Content-Type': 'text/plain' },
        })
      })

      const response = await app.inject({
        method: 'GET',
        url: `/api/platform/storage/${projectRef}/buckets`,
      })

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toBe(500)
      expect(String(response.json().message)).toContain('failed with 502')
      fetchMock.mockRestore()
    })
  })

  describe('platform auth signup proxy', () => {
    it('forwards GoTrue errors without masking the error_description', async () => {
      const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
        const url = toUrl(input)
        expect(url.pathname).toBe('/auth/v1/signup')
        expect(init?.method).toBe('POST')
        const headers = init?.headers as Record<string, string>
        expect(headers).toMatchObject({
          accept: 'application/json',
          'content-type': 'application/json',
        })
        const body = JSON.parse((init?.body as string) ?? '{}')
        expect(body).toMatchObject({ email: 'new-user@example.com', password: 'super-secret' })

        return new Response(
          JSON.stringify({ error_description: 'Signups are currently disabled.' }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      })

      const response = await app.inject({
        method: 'POST',
        url: '/api/platform/auth/signup',
        payload: {
          email: 'new-user@example.com',
          password: 'super-secret',
        },
      })

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toBe(403)
      expect(response.json()).toEqual({ message: 'Signups are currently disabled.' })
    })
  })
})
