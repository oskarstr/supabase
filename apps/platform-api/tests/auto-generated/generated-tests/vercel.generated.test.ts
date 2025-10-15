import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { build } from '../../../src/app'
import type { FastifyInstance } from 'fastify'

describe('vercel endpoints (auto-generated)', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await build()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it.skip('retrieves redirect by ID', async () => {
    // TODO: Implement GET /platform/vercel/redirect/{installation_id}
    const response = await app.inject({
    method: 'GET',
    url: `/api/platform/vercel/redirect/{installation_id}`,
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
