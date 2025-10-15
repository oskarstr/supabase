import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { build } from '../../../src/app'
import type { FastifyInstance } from 'fastify'

describe('integrations endpoints (auto-generated)', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await build()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it.skip('creates authorization', async () => {
    // TODO: Implement POST /platform/integrations/github/authorization
    const response = await app.inject({
    method: 'POST',
    url: `/api/platform/integrations/github/authorization`,
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

  it('lists authorization', async () => {
    const response = await app.inject({
    method: 'GET',
    url: `/api/platform/integrations/github/authorization`,
    headers: {
      Authorization: 'Bearer test-token',
    },
    })

    expect(response.statusCode).toBe(200)
    const payload = response.json()
    expect(payload).toBeDefined()
  })

  it.skip('retrieves branches by ID', async () => {
    // TODO: Implement GET /platform/integrations/github/branches/{connectionId}
    const response = await app.inject({
    method: 'GET',
    url: `/api/platform/integrations/github/branches/{connectionId}`,
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

  it.skip('creates connections', async () => {
    // TODO: Implement POST /platform/integrations/github/connections
    const response = await app.inject({
    method: 'POST',
    url: `/api/platform/integrations/github/connections`,
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

  it.skip('deletes connections by ID', async () => {
    // TODO: Implement DELETE /platform/integrations/github/connections/{connection_id}
    const response = await app.inject({
    method: 'DELETE',
    url: `/api/platform/integrations/github/connections/{connection_id}`,
    headers: {
      Authorization: 'Bearer test-token',
    },
    })

    expect(response.statusCode).toBe(204)
  })

  it.skip('updates connections by ID', async () => {
    // TODO: Implement PATCH /platform/integrations/github/connections/{connection_id}
    const response = await app.inject({
    method: 'PATCH',
    url: `/api/platform/integrations/github/connections/{connection_id}`,
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

  it('lists connections', async () => {
    const response = await app.inject({
    method: 'GET',
    url: `/api/platform/integrations/github/connections`,
    headers: {
      Authorization: 'Bearer test-token',
    },
    })

    expect(response.statusCode).toBe(200)
    const payload = response.json()
    expect(payload).toBeDefined()
  })

  it('lists repositories', async () => {
    const response = await app.inject({
    method: 'GET',
    url: `/api/platform/integrations/github/repositories`,
    headers: {
      Authorization: 'Bearer test-token',
    },
    })

    expect(response.statusCode).toBe(200)
    const payload = response.json()
    expect(payload).toBeDefined()
  })

  it('retrieves integrations by ID', async () => {
    const response = await app.inject({
    method: 'GET',
    url: `/api/platform/integrations/test-org`,
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

  it('lists integrations', async () => {
    const response = await app.inject({
    method: 'GET',
    url: `/api/platform/integrations`,
    headers: {
      Authorization: 'Bearer test-token',
    },
    })

    expect(response.statusCode).toBe(200)
    const payload = response.json()
    expect(payload).toBeDefined()
  })

  it.skip('creates connections', async () => {
    // TODO: Implement POST /platform/integrations/vercel/connections
    const response = await app.inject({
    method: 'POST',
    url: `/api/platform/integrations/vercel/connections`,
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

  it.skip('deletes connections by ID', async () => {
    // TODO: Implement DELETE /platform/integrations/vercel/connections/{connection_id}
    const response = await app.inject({
    method: 'DELETE',
    url: `/api/platform/integrations/vercel/connections/{connection_id}`,
    headers: {
      Authorization: 'Bearer test-token',
    },
    })

    expect(response.statusCode).toBe(204)
  })

  it.skip('updates connections by ID', async () => {
    // TODO: Implement PATCH /platform/integrations/vercel/connections/{connection_id}
    const response = await app.inject({
    method: 'PATCH',
    url: `/api/platform/integrations/vercel/connections/{connection_id}`,
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

  it.skip('creates vercel', async () => {
    // TODO: Implement POST /platform/integrations/vercel
    const response = await app.inject({
    method: 'POST',
    url: `/api/platform/integrations/vercel`,
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
