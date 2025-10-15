import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { build } from '../../../src/app'
import type { FastifyInstance } from 'fastify'

describe('projects-resource-warnings endpoints (auto-generated)', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await build()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it.skip('lists projects-resource-warnings', async () => {
    // TODO: Implement GET /platform/projects-resource-warnings
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/projects-resource-warnings`,
      headers: {
        Authorization: 'Bearer test-token',
      },
    })

    expect(response.statusCode).toBe(200)
    const payload = response.json()
    expect(Array.isArray(payload)).toBe(true)
    if (payload.length > 0) {
      expect(payload[0]).toMatchObject({
        id: expect.any(Number),
        ref: expect.any(String),
        name: expect.any(String),
      })
    }
  })
})
