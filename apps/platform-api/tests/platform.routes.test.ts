import Fastify, { type FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import platformRoutes from '../src/routes/platform.js'
import { state } from '../src/store/state.js'

async function buildApp() {
  const app = Fastify({ logger: false })
  await app.register(platformRoutes, { prefix: '/api/platform' })
  await app.ready()
  return app
}

describe('platform routes', () => {
  let app: FastifyInstance

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
    const projectRef = state.projects[0]?.ref
    expect(projectRef).toBeTruthy()

    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/pg-meta/${projectRef}/query?key=schemas`,
      payload: {
        query: 'select schema_name from information_schema.schemata;',
      },
    })

    expect(response.statusCode).toBe(201)
    const payload = response.json()
    expect(Array.isArray(payload)).toBe(true)
  })

  it('serves project configuration endpoints for known projects', async () => {
    const projectRef = state.projects[0]?.ref
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

  it('exposes storage buckets and credentials', async () => {
    const projectRef = state.projects[0]?.ref
    expect(projectRef).toBeTruthy()

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
  })

  it('returns project content data and counts', async () => {
    const projectRef = state.projects[0]?.ref
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
    const projectRef = state.projects[0]?.ref
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
    const organizationSlug = state.organizations[0]?.slug
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

  it('lists replication sources', async () => {
    const projectRef = state.projects[0]?.ref
    expect(projectRef).toBeTruthy()

    const replication = await app.inject({
      method: 'GET',
      url: `/api/platform/replication/${projectRef}/sources`,
    })
    expect(replication.statusCode).toBe(200)
    expect(Array.isArray(replication.json())).toBe(true)
  })

  it('serves disk, analytics, auth, and integration stubs', async () => {
    const projectRef = state.projects[0]?.ref
    const organizationSlug = state.organizations[0]?.slug
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
      payload: { sql: 'select 1', iso_timestamp_start: new Date().toISOString(), iso_timestamp_end: new Date().toISOString() },
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

    const authPatch = await app.inject({
      method: 'PATCH',
      url: `/api/platform/auth/${projectRef}/config`,
      payload: { DISABLE_SIGNUP: false },
    })
    expect(authPatch.statusCode).toBe(200)

    const authHooks = await app.inject({
      method: 'PATCH',
      url: `/api/platform/auth/${projectRef}/config/hooks`,
      payload: {},
    })
    expect(authHooks.statusCode).toBe(200)

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
})
