import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { build } from '../../../src/app'
import type { FastifyInstance } from 'fastify'

describe('storage endpoints (auto-generated)', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await build()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it.skip('creates buckets', async () => {
    // TODO: Implement POST /platform/storage/{ref}/buckets
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/storage/test-project-ref/buckets`,
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

  it.skip('creates empty', async () => {
    // TODO: Implement POST /platform/storage/{ref}/buckets/{id}/empty
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/storage/test-project-ref/buckets/1/empty`,
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

  it.skip('deletes buckets by ID', async () => {
    // TODO: Implement DELETE /platform/storage/{ref}/buckets/{id}
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/platform/storage/test-project-ref/buckets/1`,
      headers: {
        Authorization: 'Bearer test-token',
      },
    })

    expect(response.statusCode).toBe(204)
  })

  it.skip('creates empty', async () => {
    // TODO: Implement POST /platform/storage/{ref}/buckets/{id}/empty
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/storage/test-project-ref/buckets/1/empty`,
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

  it.skip('deletes objects', async () => {
    // TODO: Implement DELETE /platform/storage/{ref}/buckets/{id}/objects
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/platform/storage/test-project-ref/buckets/1/objects`,
      headers: {
        Authorization: 'Bearer test-token',
      },
    })

    expect(response.statusCode).toBe(204)
  })

  it.skip('creates public-url', async () => {
    // TODO: Implement POST /platform/storage/{ref}/buckets/{id}/objects/public-url
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/storage/test-project-ref/buckets/1/objects/public-url`,
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

  it.skip('creates sign', async () => {
    // TODO: Implement POST /platform/storage/{ref}/buckets/{id}/objects/sign
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/storage/test-project-ref/buckets/1/objects/sign`,
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

  it.skip('creates list', async () => {
    // TODO: Implement POST /platform/storage/{ref}/buckets/{id}/objects/list
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/storage/test-project-ref/buckets/1/objects/list`,
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

  it.skip('updates buckets by ID', async () => {
    // TODO: Implement PATCH /platform/storage/{ref}/buckets/{id}
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/platform/storage/test-project-ref/buckets/1`,
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

  it.skip('lists buckets', async () => {
    // TODO: Implement GET /platform/storage/{ref}/buckets
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/storage/test-project-ref/buckets`,
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

  it.skip('creates move', async () => {
    // TODO: Implement POST /platform/storage/{ref}/buckets/{id}/objects/move
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/storage/test-project-ref/buckets/1/objects/move`,
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

  it.skip('creates credentials', async () => {
    // TODO: Implement POST /platform/storage/{ref}/credentials
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/storage/test-project-ref/credentials`,
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

  it.skip('deletes credentials by ID', async () => {
    // TODO: Implement DELETE /platform/storage/{ref}/credentials/{id}
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/platform/storage/test-project-ref/credentials/1`,
      headers: {
        Authorization: 'Bearer test-token',
      },
    })

    expect(response.statusCode).toBe(204)
  })

  it.skip('lists credentials', async () => {
    // TODO: Implement GET /platform/storage/{ref}/credentials
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/storage/test-project-ref/credentials`,
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

  it.skip('creates archive', async () => {
    // TODO: Implement POST /platform/storage/{ref}/archive
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/storage/test-project-ref/archive`,
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

  it.skip('lists archive', async () => {
    // TODO: Implement GET /platform/storage/{ref}/archive
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/storage/test-project-ref/archive`,
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
