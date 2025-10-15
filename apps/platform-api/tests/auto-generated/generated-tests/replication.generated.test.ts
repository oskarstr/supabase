import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { build } from '../../../src/app'
import type { FastifyInstance } from 'fastify'

describe('replication endpoints (auto-generated)', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await build()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it.skip('creates destinations-pipelines', async () => {
    // TODO: Implement POST /platform/replication/{ref}/destinations-pipelines
    const response = await app.inject({
    method: 'POST',
    url: `/api/platform/replication/test-project-ref/destinations-pipelines`,
    headers: {
      Authorization: 'Bearer test-token',
    },
    payload: {
      // TODO: Add appropriate request body
    },
    })

    expect(response.statusCode).toBe(200)
    const payload = response.json()
    expect(payload).toMatchObject({
      id: expect.any(Number)
    })
  })

  it.skip('creates tenants-sources', async () => {
    // TODO: Implement POST /platform/replication/{ref}/tenants-sources
    const response = await app.inject({
    method: 'POST',
    url: `/api/platform/replication/test-project-ref/tenants-sources`,
    headers: {
      Authorization: 'Bearer test-token',
    },
    payload: {
      // TODO: Add appropriate request body
    },
    })

    expect(response.statusCode).toBe(200)
    const payload = response.json()
    expect(payload).toMatchObject({
      id: expect.any(Number)
    })
  })

  it.skip('retrieves destinations by ID', async () => {
    // TODO: Implement GET /platform/replication/{ref}/destinations/{destination_id}
    const response = await app.inject({
    method: 'GET',
    url: `/api/platform/replication/test-project-ref/destinations/{destination_id}`,
    headers: {
      Authorization: 'Bearer test-token',
    },
    })

    expect(response.statusCode).toBe(200)
    const payload = response.json()
    expect(payload).toMatchObject({
      id: expect.any(Number)
    })
  })

  it.skip('lists destinations', async () => {
    // TODO: Implement GET /platform/replication/{ref}/destinations
    const response = await app.inject({
    method: 'GET',
    url: `/api/platform/replication/test-project-ref/destinations`,
    headers: {
      Authorization: 'Bearer test-token',
    },
    })

    expect(response.statusCode).toBe(200)
    const payload = response.json()
    expect(payload).toMatchObject({
      id: expect.any(Number)
    })
  })

  it.skip('retrieves pipelines by ID', async () => {
    // TODO: Implement GET /platform/replication/{ref}/pipelines/{pipeline_id}
    const response = await app.inject({
    method: 'GET',
    url: `/api/platform/replication/test-project-ref/pipelines/{pipeline_id}`,
    headers: {
      Authorization: 'Bearer test-token',
    },
    })

    expect(response.statusCode).toBe(200)
    const payload = response.json()
    expect(payload).toMatchObject({
      id: expect.any(Number)
    })
  })

  it.skip('lists status', async () => {
    // TODO: Implement GET /platform/replication/{ref}/pipelines/{pipeline_id}/status
    const response = await app.inject({
    method: 'GET',
    url: `/api/platform/replication/test-project-ref/pipelines/{pipeline_id}/status`,
    headers: {
      Authorization: 'Bearer test-token',
    },
    })

    expect(response.statusCode).toBe(200)
    const payload = response.json()
    expect(payload).toMatchObject({
      id: expect.any(Number)
    })
  })

  it.skip('lists version', async () => {
    // TODO: Implement GET /platform/replication/{ref}/pipelines/{pipeline_id}/version
    const response = await app.inject({
    method: 'GET',
    url: `/api/platform/replication/test-project-ref/pipelines/{pipeline_id}/version`,
    headers: {
      Authorization: 'Bearer test-token',
    },
    })

    expect(response.statusCode).toBe(200)
    const payload = response.json()
    expect(payload).toMatchObject({
      id: expect.any(Number)
    })
  })

  it.skip('lists pipelines', async () => {
    // TODO: Implement GET /platform/replication/{ref}/pipelines
    const response = await app.inject({
    method: 'GET',
    url: `/api/platform/replication/test-project-ref/pipelines`,
    headers: {
      Authorization: 'Bearer test-token',
    },
    })

    expect(response.statusCode).toBe(200)
    const payload = response.json()
    expect(payload).toMatchObject({
      id: expect.any(Number)
    })
  })

  it.skip('lists sources', async () => {
    // TODO: Implement GET /platform/replication/{ref}/sources
    const response = await app.inject({
    method: 'GET',
    url: `/api/platform/replication/test-project-ref/sources`,
    headers: {
      Authorization: 'Bearer test-token',
    },
    })

    expect(response.statusCode).toBe(200)
    const payload = response.json()
    expect(payload).toMatchObject({
      id: expect.any(Number)
    })
  })

  it.skip('creates start', async () => {
    // TODO: Implement POST /platform/replication/{ref}/pipelines/{pipeline_id}/start
    const response = await app.inject({
    method: 'POST',
    url: `/api/platform/replication/test-project-ref/pipelines/{pipeline_id}/start`,
    headers: {
      Authorization: 'Bearer test-token',
    },
    payload: {
      // TODO: Add appropriate request body
    },
    })

    expect(response.statusCode).toBe(200)
    const payload = response.json()
    expect(payload).toMatchObject({
      id: expect.any(Number)
    })
  })

  it.skip('creates stop', async () => {
    // TODO: Implement POST /platform/replication/{ref}/pipelines/{pipeline_id}/stop
    const response = await app.inject({
    method: 'POST',
    url: `/api/platform/replication/test-project-ref/pipelines/{pipeline_id}/stop`,
    headers: {
      Authorization: 'Bearer test-token',
    },
    payload: {
      // TODO: Add appropriate request body
    },
    })

    expect(response.statusCode).toBe(200)
    const payload = response.json()
    expect(payload).toMatchObject({
      id: expect.any(Number)
    })
  })

  it.skip('lists tables', async () => {
    // TODO: Implement GET /platform/replication/{ref}/sources/{source_id}/tables
    const response = await app.inject({
    method: 'GET',
    url: `/api/platform/replication/test-project-ref/sources/{source_id}/tables`,
    headers: {
      Authorization: 'Bearer test-token',
    },
    })

    expect(response.statusCode).toBe(200)
    const payload = response.json()
    expect(payload).toMatchObject({
      id: expect.any(Number)
    })
  })
})
