import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { build } from '../../../src/app'
import type { FastifyInstance } from 'fastify'

describe('stripe endpoints (auto-generated)', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await build()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('lists overdue', async () => {
    const response = await app.inject({
    method: 'GET',
    url: `/api/platform/stripe/invoices/overdue`,
    headers: {
      Authorization: 'Bearer test-token',
    },
    })

    expect(response.statusCode).toBe(200)
    const payload = response.json()
    expect(payload).toBeDefined()
  })

  it.skip('creates setup-intent', async () => {
    // TODO: Implement POST /platform/stripe/setup-intent
    const response = await app.inject({
    method: 'POST',
    url: `/api/platform/stripe/setup-intent`,
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
