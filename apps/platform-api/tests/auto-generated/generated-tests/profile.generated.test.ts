import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { build } from '../../../src/app'
import type { FastifyInstance } from 'fastify'

describe('profile endpoints (auto-generated)', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await build()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it.skip('creates access-tokens', async () => {
    // TODO: Implement POST /platform/profile/access-tokens
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/profile/access-tokens`,
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

  it.skip('deletes access-tokens by ID', async () => {
    // TODO: Implement DELETE /platform/profile/access-tokens/{id}
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/platform/profile/access-tokens/1`,
      headers: {
        Authorization: 'Bearer test-token',
      },
    })

    expect(response.statusCode).toBe(204)
  })

  it('lists access-tokens', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/profile/access-tokens`,
      headers: {
        Authorization: 'Bearer test-token',
      },
    })

    expect(response.statusCode).toBe(200)
    const payload = response.json()
    expect(payload).toBeDefined()
  })

  it('creates audit-login', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/profile/audit-login`,
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

  it.skip('lists permissions', async () => {
    // TODO: Implement GET /platform/profile/permissions
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/profile/permissions`,
      headers: {
        Authorization: 'Bearer test-token',
      },
    })

    expect(response.statusCode).toBe(200)
    const payload = response.json()
    expect(payload).toBeDefined()
  })

  it('lists audit', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/profile/audit`,
      headers: {
        Authorization: 'Bearer test-token',
      },
    })

    expect(response.statusCode).toBe(200)
    const payload = response.json()
    expect(payload).toBeDefined()
  })

  it.skip('creates profile', async () => {
    // TODO: Implement POST /platform/profile
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/profile`,
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

  it('lists profile', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/profile`,
      headers: {
        Authorization: 'Bearer test-token',
      },
    })

    expect(response.statusCode).toBe(200)
    const payload = response.json()
    expect(payload).toBeDefined()
  })

  it.skip('handles profile', async () => {
    // TODO: Implement PATCH /platform/profile
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/platform/profile`,
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
