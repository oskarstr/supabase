import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { build } from '../../../src/app'
import type { FastifyInstance } from 'fastify'

describe('branches endpoints (auto-generated)', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await build()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it.skip('deletes branches by ID', async () => {
    // TODO: Implement DELETE /v1/branches/{branch_id_or_ref}
    const response = await app.inject({
    method: 'DELETE',
    url: `/api/v1/branches/{branch_id_or_ref}`,
    headers: {
      Authorization: 'Bearer test-token',
    },
    })

    expect(response.statusCode).toBe(204)
  })

  it.skip('lists diff', async () => {
    // TODO: Implement GET /v1/branches/{branch_id_or_ref}/diff
    const response = await app.inject({
    method: 'GET',
    url: `/api/v1/branches/{branch_id_or_ref}/diff`,
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

  it.skip('creates merge', async () => {
    // TODO: Implement POST /v1/branches/{branch_id_or_ref}/merge
    const response = await app.inject({
    method: 'POST',
    url: `/api/v1/branches/{branch_id_or_ref}/merge`,
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
      id: expect.any(Number)
    })
  })

  it.skip('creates push', async () => {
    // TODO: Implement POST /v1/branches/{branch_id_or_ref}/push
    const response = await app.inject({
    method: 'POST',
    url: `/api/v1/branches/{branch_id_or_ref}/push`,
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
      id: expect.any(Number)
    })
  })

  it.skip('retrieves branches by ID', async () => {
    // TODO: Implement GET /v1/branches/{branch_id_or_ref}
    const response = await app.inject({
    method: 'GET',
    url: `/api/v1/branches/{branch_id_or_ref}`,
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

  it.skip('creates reset', async () => {
    // TODO: Implement POST /v1/branches/{branch_id_or_ref}/reset
    const response = await app.inject({
    method: 'POST',
    url: `/api/v1/branches/{branch_id_or_ref}/reset`,
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
      id: expect.any(Number)
    })
  })

  it.skip('updates branches by ID', async () => {
    // TODO: Implement PATCH /v1/branches/{branch_id_or_ref}
    const response = await app.inject({
    method: 'PATCH',
    url: `/api/v1/branches/{branch_id_or_ref}`,
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
      id: expect.any(Number)
    })
  })
})
