import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { build } from '../../../src/app'
import type { FastifyInstance } from 'fastify'

describe('pg-meta endpoints (auto-generated)', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await build()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('lists extensions', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/pg-meta/test-project-ref/extensions`,
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

  it('lists policies', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/pg-meta/test-project-ref/policies`,
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

  it('lists publications', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/pg-meta/test-project-ref/publications`,
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

  it('lists triggers', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/pg-meta/test-project-ref/triggers`,
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

  it('lists types', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/pg-meta/test-project-ref/types`,
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

  it('lists foreign-tables', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/pg-meta/test-project-ref/foreign-tables`,
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

  it('lists materialized-views', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/pg-meta/test-project-ref/materialized-views`,
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

  it('lists column-privileges', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/pg-meta/test-project-ref/column-privileges`,
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

  it('creates query', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/pg-meta/test-project-ref/query`,
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

  it('lists tables', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/pg-meta/test-project-ref/tables`,
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

  it('lists views', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/pg-meta/test-project-ref/views`,
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
