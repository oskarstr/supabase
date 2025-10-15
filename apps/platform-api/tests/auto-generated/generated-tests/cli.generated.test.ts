import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { build } from '../../../src/app'
import type { FastifyInstance } from 'fastify'

describe('cli endpoints (auto-generated)', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await build()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it.skip('creates login', async () => {
    // TODO: Implement POST /platform/cli/login
    const response = await app.inject({
    method: 'POST',
    url: `/api/platform/cli/login`,
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
