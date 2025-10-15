import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { build } from '../../../src/app'
import type { FastifyInstance } from 'fastify'

describe('oauth endpoints (auto-generated)', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await build()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it.skip('retrieves authorizations by ID', async () => {
    // TODO: Implement GET /platform/oauth/authorizations/{id}
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/oauth/authorizations/1`,
      headers: {
        Authorization: 'Bearer test-token',
      },
    })

    expect(response.statusCode).toBe(200)
    const payload = response.json()
    expect(payload).toMatchObject({
      id: expect.any(Number),
    })
  })
})
