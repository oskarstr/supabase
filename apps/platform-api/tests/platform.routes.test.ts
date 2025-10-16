import Fastify, { type FastifyInstance } from 'fastify'
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

describe('platform routes', () => {
  let app: FastifyInstance
  let defaultProjectRef = ''
  let defaultOrganizationSlug = ''
  let platformProjectRef = ''
  let platformProjectSchema = ''

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
    const migrationPath = resolve(process.cwd(), 'migrations/0001_initial.sql')
    memDb.public.registerFunction({
      name: 'gen_random_uuid',
      returns: DataType.uuid,
      implementation: () => randomUUID(),
    })

    const migrationSql = await readFile(migrationPath, 'utf-8')
    const sanitizedSql = migrationSql
      .replace(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\s*/g, '')
      .replace(/CREATE EXTENSION IF NOT EXISTS "pgcrypto";\s*/g, '')
      .replace(/COMMENT ON SCHEMA platform IS 'Supabase platform control-plane schema.';\s*/g, '')
    memDb.public.none(sanitizedSql)

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
  })

  afterAll(async () => {
    delete (globalThis as any).__PLATFORM_TEST_POOL__
    const { destroyDb } = await import('../src/db/client.js')
    await destroyDb()
  })

  beforeEach(async () => {
    process.env.PLATFORM_API_REPO_ROOT = process.cwd()
    app = await buildApp()
  })

  afterEach(async () => {
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
})
