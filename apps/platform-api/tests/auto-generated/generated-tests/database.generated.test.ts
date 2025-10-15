import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { build } from '../../../src/app'
import type { FastifyInstance } from 'fastify'

describe('database endpoints (auto-generated)', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await build()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it.skip('creates download', async () => {
    // TODO: Implement POST /platform/database/{ref}/backups/download
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/database/test-project-ref/backups/download`,
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

  it.skip('lists downloadable-backups', async () => {
    // TODO: Implement GET /platform/database/{ref}/backups/downloadable-backups
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/database/test-project-ref/backups/downloadable-backups`,
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

  it.skip('creates restore-physical', async () => {
    // TODO: Implement POST /platform/database/{ref}/backups/restore-physical
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/database/test-project-ref/backups/restore-physical`,
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

  it.skip('creates restore', async () => {
    // TODO: Implement POST /platform/database/{ref}/backups/restore
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/database/test-project-ref/backups/restore`,
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

  it.skip('lists backups', async () => {
    // TODO: Implement GET /platform/database/{ref}/backups
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/database/test-project-ref/backups`,
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

  it.skip('creates enable-physical-backups', async () => {
    // TODO: Implement POST /platform/database/{ref}/backups/enable-physical-backups
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/database/test-project-ref/backups/enable-physical-backups`,
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

  it.skip('creates hook-enable', async () => {
    // TODO: Implement POST /platform/database/{ref}/hook-enable
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/database/test-project-ref/hook-enable`,
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

  it.skip('creates pitr', async () => {
    // TODO: Implement POST /platform/database/{ref}/backups/pitr
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/database/test-project-ref/backups/pitr`,
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

  it.skip('creates clone', async () => {
    // TODO: Implement POST /platform/database/{ref}/clone
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/database/test-project-ref/clone`,
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

  it.skip('lists clone', async () => {
    // TODO: Implement GET /platform/database/{ref}/clone
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/database/test-project-ref/clone`,
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

  it.skip('lists status', async () => {
    // TODO: Implement GET /platform/database/{ref}/clone/status
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/database/test-project-ref/clone/status`,
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
