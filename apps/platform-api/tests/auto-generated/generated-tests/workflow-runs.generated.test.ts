import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { build } from '../../../src/app'
import type { FastifyInstance } from 'fastify'

describe('workflow-runs endpoints (auto-generated)', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await build()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it.skip('lists logs', async () => {
    // TODO: Implement GET /platform/workflow-runs/{workflow_run_id}/logs
    const response = await app.inject({
    method: 'GET',
    url: `/api/platform/workflow-runs/{workflow_run_id}/logs`,
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

  it.skip('lists logs', async () => {
    // TODO: Implement GET /platform/workflow-runs/{workflow_run_id}/logs
    const response = await app.inject({
    method: 'GET',
    url: `/api/platform/workflow-runs/{workflow_run_id}/logs`,
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

  it.skip('lists workflow-runs', async () => {
    // TODO: Implement GET /platform/workflow-runs
    const response = await app.inject({
    method: 'GET',
    url: `/api/platform/workflow-runs`,
    headers: {
      Authorization: 'Bearer test-token',
    },
    })

    expect(response.statusCode).toBe(200)
    const payload = response.json()
    expect(payload).toBeDefined()
  })
})
