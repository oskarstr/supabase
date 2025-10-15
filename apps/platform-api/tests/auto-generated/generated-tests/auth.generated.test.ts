import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { build } from '../../../src/app'
import type { FastifyInstance } from 'fastify'

describe('auth endpoints (auto-generated)', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await build()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it.skip('lists config', async () => {
    // TODO: Implement GET /platform/auth/{ref}/config
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/auth/test-project-ref/config`,
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

  it.skip('handles config', async () => {
    // TODO: Implement PATCH /platform/auth/{ref}/config
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/platform/auth/test-project-ref/config`,
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
      id: expect.any(Number),
    })
  })

  it.skip('handles hooks', async () => {
    // TODO: Implement PATCH /platform/auth/{ref}/config/hooks
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/platform/auth/test-project-ref/config/hooks`,
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
      id: expect.any(Number),
    })
  })

  it.skip('creates users', async () => {
    // TODO: Implement POST /platform/auth/{ref}/users
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/auth/test-project-ref/users`,
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
      id: expect.any(Number),
    })
  })

  it.skip('deletes factors', async () => {
    // TODO: Implement DELETE /platform/auth/{ref}/users/{id}/factors
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/platform/auth/test-project-ref/users/1/factors`,
      headers: {
        Authorization: 'Bearer test-token',
      },
    })

    expect(response.statusCode).toBe(204)
  })

  it.skip('deletes users by ID', async () => {
    // TODO: Implement DELETE /platform/auth/{ref}/users/{id}
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/platform/auth/test-project-ref/users/1`,
      headers: {
        Authorization: 'Bearer test-token',
      },
    })

    expect(response.statusCode).toBe(204)
  })

  it.skip('creates invite', async () => {
    // TODO: Implement POST /platform/auth/{ref}/invite
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/auth/test-project-ref/invite`,
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
      id: expect.any(Number),
    })
  })

  it.skip('creates recover', async () => {
    // TODO: Implement POST /platform/auth/{ref}/recover
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/auth/test-project-ref/recover`,
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
      id: expect.any(Number),
    })
  })

  it.skip('creates magiclink', async () => {
    // TODO: Implement POST /platform/auth/{ref}/magiclink
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/auth/test-project-ref/magiclink`,
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
      id: expect.any(Number),
    })
  })

  it.skip('creates otp', async () => {
    // TODO: Implement POST /platform/auth/{ref}/otp
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/auth/test-project-ref/otp`,
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
      id: expect.any(Number),
    })
  })

  it.skip('updates users by ID', async () => {
    // TODO: Implement PATCH /platform/auth/{ref}/users/{id}
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/platform/auth/test-project-ref/users/1`,
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
      id: expect.any(Number),
    })
  })

  it.skip('creates spam', async () => {
    // TODO: Implement POST /platform/auth/{ref}/validate/spam
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/auth/test-project-ref/validate/spam`,
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
      id: expect.any(Number),
    })
  })
})
