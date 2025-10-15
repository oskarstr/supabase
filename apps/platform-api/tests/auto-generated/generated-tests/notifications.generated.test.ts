import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { build } from '../../../src/app'
import type { FastifyInstance } from 'fastify'

describe('notifications endpoints (auto-generated)', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await build()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it.skip('handles archive-all', async () => {
    // TODO: Implement PATCH /platform/notifications/archive-all
    const response = await app.inject({
    method: 'PATCH',
    url: `/api/platform/notifications/archive-all`,
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

  it('lists notifications', async () => {
    const response = await app.inject({
    method: 'GET',
    url: `/api/platform/notifications`,
    headers: {
      Authorization: 'Bearer test-token',
    },
    })

    expect(response.statusCode).toBe(200)
    const payload = response.json()
    expect(payload).toBeDefined()
  })

  it('lists summary', async () => {
    const response = await app.inject({
    method: 'GET',
    url: `/api/platform/notifications/summary`,
    headers: {
      Authorization: 'Bearer test-token',
    },
    })

    expect(response.statusCode).toBe(200)
    const payload = response.json()
    expect(payload).toBeDefined()
  })

  it.skip('handles notifications', async () => {
    // TODO: Implement PATCH /platform/notifications
    const response = await app.inject({
    method: 'PATCH',
    url: `/api/platform/notifications`,
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
