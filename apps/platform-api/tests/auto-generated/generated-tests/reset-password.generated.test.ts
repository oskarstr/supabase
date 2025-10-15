import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { build } from '../../../src/app'
import type { FastifyInstance } from 'fastify'

describe('reset-password endpoints (auto-generated)', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await build()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it.skip('creates reset-password', async () => {
    // TODO: Implement POST /platform/reset-password
    const response = await app.inject({
    method: 'POST',
    url: `/api/platform/reset-password`,
    headers: {
      Authorization: 'Bearer test-token',
    },
    payload: {
      // TODO: Add appropriate request body
    },
    })

    expect(response.statusCode).toBe(200)
    const payload = response.json()
    expect(payload).toBeDefined()
  })
})
