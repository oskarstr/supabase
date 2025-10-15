import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { build } from '../../../src/app'
import type { FastifyInstance } from 'fastify'

describe('projects endpoints (auto-generated)', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await build()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it.skip('retrieves resources by ID', async () => {
    // TODO: Implement GET /platform/projects/{ref}/resources/{id}
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/test-project-ref/resources/1`,
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

  it.skip('updates resources by ID', async () => {
    // TODO: Implement PATCH /platform/projects/{ref}/resources/{id}
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/platform/projects/test-project-ref/resources/1`,
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

  it('lists branches', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/test-project-ref/branches`,
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

  it.skip('retrieves actions by ID', async () => {
    // TODO: Implement GET /v1/projects/{ref}/actions/{run_id}
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/test-project-ref/actions/{run_id}`,
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

  it.skip('lists logs', async () => {
    // TODO: Implement GET /v1/projects/{ref}/actions/{run_id}/logs
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/test-project-ref/actions/{run_id}/logs`,
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

  it.skip('lists actions', async () => {
    // TODO: Implement GET /v1/projects/{ref}/actions
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/test-project-ref/actions`,
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

  it.skip('lists infra-monitoring', async () => {
    // TODO: Implement GET /platform/projects/{ref}/infra-monitoring
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/test-project-ref/infra-monitoring`,
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

  it.skip('lists daily-stats', async () => {
    // TODO: Implement GET /platform/projects/{ref}/daily-stats
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/test-project-ref/daily-stats`,
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

  it.skip('retrieves api-keys by ID', async () => {
    // TODO: Implement GET /v1/projects/{ref}/api-keys/{id}
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/test-project-ref/api-keys/1`,
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

  it.skip('updates api-keys by ID', async () => {
    // TODO: Implement PATCH /v1/projects/{ref}/api-keys/{id}
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/projects/test-project-ref/api-keys/1`,
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

  it.skip('creates api-keys', async () => {
    // TODO: Implement POST /v1/projects/{ref}/api-keys
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/test-project-ref/api-keys`,
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

  it.skip('deletes api-keys by ID', async () => {
    // TODO: Implement DELETE /v1/projects/{ref}/api-keys/{id}
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/test-project-ref/api-keys/1`,
      headers: {
        Authorization: 'Bearer test-token',
      },
    })

    expect(response.statusCode).toBe(204)
  })

  it('lists api-keys', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/test-project-ref/api-keys`,
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

  it.skip('handles legacy', async () => {
    // TODO: Implement PUT /v1/projects/{ref}/api-keys/legacy
    const response = await app.inject({
      method: 'PUT',
      url: `/api/v1/projects/test-project-ref/api-keys/legacy`,
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

  it.skip('lists legacy', async () => {
    // TODO: Implement GET /v1/projects/{ref}/api-keys/legacy
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/test-project-ref/api-keys/legacy`,
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

  it.skip('creates temporary', async () => {
    // TODO: Implement POST /platform/projects/{ref}/api-keys/temporary
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/projects/test-project-ref/api-keys/temporary`,
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

  it.skip('handles postgrest', async () => {
    // TODO: Implement PATCH /platform/projects/{ref}/config/postgrest
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/platform/projects/test-project-ref/config/postgrest`,
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

  it.skip('deletes network-bans', async () => {
    // TODO: Implement DELETE /v1/projects/{ref}/network-bans
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/test-project-ref/network-bans`,
      headers: {
        Authorization: 'Bearer test-token',
      },
    })

    expect(response.statusCode).toBe(204)
  })

  it.skip('creates retrieve', async () => {
    // TODO: Implement POST /v1/projects/{ref}/network-bans/retrieve
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/test-project-ref/network-bans/retrieve`,
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

  it.skip('creates branches', async () => {
    // TODO: Implement POST /v1/projects/{ref}/branches
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/test-project-ref/branches`,
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

  it('lists branches', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/test-project-ref/branches`,
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

  it.skip('lists disk', async () => {
    // TODO: Implement GET /platform/projects/{ref}/disk
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/test-project-ref/disk`,
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

  it.skip('creates disk', async () => {
    // TODO: Implement POST /platform/projects/{ref}/disk
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/projects/test-project-ref/disk`,
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

  it.skip('lists custom-config', async () => {
    // TODO: Implement GET /platform/projects/{ref}/disk/custom-config
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/test-project-ref/disk/custom-config`,
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

  it.skip('creates custom-config', async () => {
    // TODO: Implement POST /platform/projects/{ref}/disk/custom-config
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/projects/test-project-ref/disk/custom-config`,
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

  it.skip('lists util', async () => {
    // TODO: Implement GET /platform/projects/{ref}/disk/util
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/test-project-ref/disk/util`,
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

  it.skip('handles secrets', async () => {
    // TODO: Implement PATCH /platform/projects/{ref}/config/secrets
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/platform/projects/test-project-ref/config/secrets`,
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

  it.skip('lists update-status', async () => {
    // TODO: Implement GET /platform/projects/{ref}/config/secrets/update-status
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/test-project-ref/config/secrets/update-status`,
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

  it.skip('handles sensitivity', async () => {
    // TODO: Implement PATCH /platform/projects/{ref}/settings/sensitivity
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/platform/projects/test-project-ref/settings/sensitivity`,
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

  it.skip('creates resize', async () => {
    // TODO: Implement POST /platform/projects/{ref}/resize
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/projects/test-project-ref/resize`,
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

  it.skip('lists postgrest', async () => {
    // TODO: Implement GET /platform/projects/{ref}/config/postgrest
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/test-project-ref/config/postgrest`,
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

  it.skip('handles postgrest', async () => {
    // TODO: Implement PATCH /platform/projects/{ref}/config/postgrest
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/platform/projects/test-project-ref/config/postgrest`,
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

  it.skip('lists settings', async () => {
    // TODO: Implement GET /platform/projects/{ref}/settings
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/test-project-ref/settings`,
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

  it.skip('lists storage', async () => {
    // TODO: Implement GET /platform/projects/{ref}/config/storage
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/test-project-ref/config/storage`,
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

  it.skip('handles storage', async () => {
    // TODO: Implement PATCH /platform/projects/{ref}/config/storage
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/platform/projects/test-project-ref/config/storage`,
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

  it.skip('creates temporary-disable', async () => {
    // TODO: Implement POST /v1/projects/{ref}/readonly/temporary-disable
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/test-project-ref/readonly/temporary-disable`,
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

  it.skip('lists versions', async () => {
    // TODO: Implement GET /platform/projects/{ref}/restore/versions
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/test-project-ref/restore/versions`,
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

  it.skip('lists eligibility', async () => {
    // TODO: Implement GET /v1/projects/{ref}/upgrade/eligibility
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/test-project-ref/upgrade/eligibility`,
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

  it('lists status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/test-project-ref/upgrade/status`,
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

  it.skip('lists count', async () => {
    // TODO: Implement GET /platform/projects/{ref}/content/count
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/test-project-ref/content/count`,
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

  it.skip('deletes content', async () => {
    // TODO: Implement DELETE /platform/projects/{ref}/content
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/platform/projects/test-project-ref/content`,
      headers: {
        Authorization: 'Bearer test-token',
      },
    })

    expect(response.statusCode).toBe(204)
  })

  it.skip('retrieves item by ID', async () => {
    // TODO: Implement GET /platform/projects/{ref}/content/item/{id}
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/test-project-ref/content/item/1`,
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

  it.skip('lists content', async () => {
    // TODO: Implement GET /platform/projects/{ref}/content
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/test-project-ref/content`,
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

  it.skip('creates content', async () => {
    // TODO: Implement POST /platform/projects/{ref}/content
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/projects/test-project-ref/content`,
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

  it.skip('lists content', async () => {
    // TODO: Implement GET /platform/projects/{ref}/content
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/test-project-ref/content`,
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

  it.skip('handles content', async () => {
    // TODO: Implement PUT /platform/projects/{ref}/content
    const response = await app.inject({
      method: 'PUT',
      url: `/api/platform/projects/test-project-ref/content`,
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

  it.skip('retrieves folders by ID', async () => {
    // TODO: Implement GET /platform/projects/{ref}/content/folders/{id}
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/test-project-ref/content/folders/1`,
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

  it.skip('creates folders', async () => {
    // TODO: Implement POST /platform/projects/{ref}/content/folders
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/projects/test-project-ref/content/folders`,
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

  it.skip('updates folders by ID', async () => {
    // TODO: Implement PATCH /platform/projects/{ref}/content/folders/{id}
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/platform/projects/test-project-ref/content/folders/1`,
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

  it.skip('deletes folders', async () => {
    // TODO: Implement DELETE /platform/projects/{ref}/content/folders
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/platform/projects/test-project-ref/content/folders`,
      headers: {
        Authorization: 'Bearer test-token',
      },
    })

    expect(response.statusCode).toBe(204)
  })

  it.skip('lists folders', async () => {
    // TODO: Implement GET /platform/projects/{ref}/content/folders
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/test-project-ref/content/folders`,
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

  it.skip('lists content', async () => {
    // TODO: Implement GET /platform/projects/{ref}/content
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/test-project-ref/content`,
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

  it.skip('creates activate', async () => {
    // TODO: Implement POST /v1/projects/{ref}/custom-hostname/activate
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/test-project-ref/custom-hostname/activate`,
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

  it.skip('creates initialize', async () => {
    // TODO: Implement POST /v1/projects/{ref}/custom-hostname/initialize
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/test-project-ref/custom-hostname/initialize`,
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

  it.skip('deletes custom-hostname', async () => {
    // TODO: Implement DELETE /v1/projects/{ref}/custom-hostname
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/test-project-ref/custom-hostname`,
      headers: {
        Authorization: 'Bearer test-token',
      },
    })

    expect(response.statusCode).toBe(204)
  })

  it.skip('lists custom-hostname', async () => {
    // TODO: Implement GET /v1/projects/{ref}/custom-hostname
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/test-project-ref/custom-hostname`,
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

  it.skip('creates reverify', async () => {
    // TODO: Implement POST /v1/projects/{ref}/custom-hostname/reverify
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/test-project-ref/custom-hostname/reverify`,
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

  it.skip('handles db-password', async () => {
    // TODO: Implement PATCH /platform/projects/{ref}/db-password
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/platform/projects/test-project-ref/db-password`,
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

  it.skip('handles migrations', async () => {
    // TODO: Implement PUT /v1/projects/{ref}/database/migrations
    const response = await app.inject({
      method: 'PUT',
      url: `/api/v1/projects/test-project-ref/database/migrations`,
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

  it.skip('lists pgbouncer', async () => {
    // TODO: Implement GET /platform/projects/{ref}/config/pgbouncer
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/test-project-ref/config/pgbouncer`,
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

  it.skip('handles pgbouncer', async () => {
    // TODO: Implement PATCH /platform/projects/{ref}/config/pgbouncer
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/platform/projects/test-project-ref/config/pgbouncer`,
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

  it.skip('lists status', async () => {
    // TODO: Implement GET /platform/projects/{ref}/config/pgbouncer/status
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/test-project-ref/config/pgbouncer/status`,
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

  it.skip('lists supavisor', async () => {
    // TODO: Implement GET /platform/projects/{ref}/config/supavisor
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/test-project-ref/config/supavisor`,
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

  it.skip('handles supavisor', async () => {
    // TODO: Implement PATCH /platform/projects/{ref}/config/supavisor
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/platform/projects/test-project-ref/config/supavisor`,
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

  it.skip('lists rest', async () => {
    // TODO: Implement GET /platform/projects/{ref}/api/rest
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/test-project-ref/api/rest`,
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

  it.skip('retrieves functions by ID', async () => {
    // TODO: Implement GET /v1/projects/{ref}/functions/{function_slug}
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/test-project-ref/functions/{function_slug}`,
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

  it.skip('deletes functions by ID', async () => {
    // TODO: Implement DELETE /v1/projects/{ref}/functions/{function_slug}
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/test-project-ref/functions/{function_slug}`,
      headers: {
        Authorization: 'Bearer test-token',
      },
    })

    expect(response.statusCode).toBe(204)
  })

  it.skip('creates deploy', async () => {
    // TODO: Implement POST /v1/projects/{ref}/functions/deploy
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/test-project-ref/functions/deploy`,
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

  it.skip('lists functions', async () => {
    // TODO: Implement GET /v1/projects/{ref}/functions
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/test-project-ref/functions`,
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

  it.skip('updates functions by ID', async () => {
    // TODO: Implement PATCH /v1/projects/{ref}/functions/{function_slug}
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/projects/test-project-ref/functions/{function_slug}`,
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

  it.skip('creates signing-keys', async () => {
    // TODO: Implement POST /v1/projects/{ref}/config/auth/signing-keys
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/test-project-ref/config/auth/signing-keys`,
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

  it.skip('deletes signing-keys by ID', async () => {
    // TODO: Implement DELETE /v1/projects/{ref}/config/auth/signing-keys/{id}
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/test-project-ref/config/auth/signing-keys/1`,
      headers: {
        Authorization: 'Bearer test-token',
      },
    })

    expect(response.statusCode).toBe(204)
  })

  it.skip('updates signing-keys by ID', async () => {
    // TODO: Implement PATCH /v1/projects/{ref}/config/auth/signing-keys/{id}
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/projects/test-project-ref/config/auth/signing-keys/1`,
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

  it.skip('lists signing-keys', async () => {
    // TODO: Implement GET /v1/projects/{ref}/config/auth/signing-keys
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/test-project-ref/config/auth/signing-keys`,
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

  it.skip('creates legacy', async () => {
    // TODO: Implement POST /v1/projects/{ref}/config/auth/signing-keys/legacy
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/test-project-ref/config/auth/signing-keys/legacy`,
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

  it.skip('lists legacy', async () => {
    // TODO: Implement GET /v1/projects/{ref}/config/auth/signing-keys/legacy
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/test-project-ref/config/auth/signing-keys/legacy`,
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

  it.skip('creates exceptions', async () => {
    // TODO: Implement POST /platform/projects/{ref}/notifications/advisor/exceptions
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/projects/test-project-ref/notifications/advisor/exceptions`,
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

  it.skip('deletes exceptions', async () => {
    // TODO: Implement DELETE /platform/projects/{ref}/notifications/advisor/exceptions
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/platform/projects/test-project-ref/notifications/advisor/exceptions`,
      headers: {
        Authorization: 'Bearer test-token',
      },
    })

    expect(response.statusCode).toBe(204)
  })

  it.skip('lists run-lints', async () => {
    // TODO: Implement GET /platform/projects/{ref}/run-lints
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/test-project-ref/run-lints`,
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

  it.skip('lists exceptions', async () => {
    // TODO: Implement GET /platform/projects/{ref}/notifications/advisor/exceptions
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/test-project-ref/notifications/advisor/exceptions`,
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

  it.skip('creates log-drains', async () => {
    // TODO: Implement POST /platform/projects/{ref}/analytics/log-drains
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/projects/test-project-ref/analytics/log-drains`,
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

  it.skip('deletes log-drains by ID', async () => {
    // TODO: Implement DELETE /platform/projects/{ref}/analytics/log-drains/{token}
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/platform/projects/test-project-ref/analytics/log-drains/{token}`,
      headers: {
        Authorization: 'Bearer test-token',
      },
    })

    expect(response.statusCode).toBe(204)
  })

  it.skip('lists log-drains', async () => {
    // TODO: Implement GET /platform/projects/{ref}/analytics/log-drains
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/test-project-ref/analytics/log-drains`,
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

  it.skip('updates log-drains by ID', async () => {
    // TODO: Implement PUT /platform/projects/{ref}/analytics/log-drains/{token}
    const response = await app.inject({
      method: 'PUT',
      url: `/api/platform/projects/test-project-ref/analytics/log-drains/{token}`,
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

  it.skip('creates logs.all', async () => {
    // TODO: Implement POST /platform/projects/{ref}/analytics/endpoints/logs.all
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/projects/test-project-ref/analytics/endpoints/logs.all`,
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

  it.skip('creates logs.all', async () => {
    // TODO: Implement POST /platform/projects/{ref}/analytics/endpoints/logs.all
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/projects/test-project-ref/analytics/endpoints/logs.all`,
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

  it.skip('creates logs.all', async () => {
    // TODO: Implement POST /platform/projects/{ref}/analytics/endpoints/logs.all
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/projects/test-project-ref/analytics/endpoints/logs.all`,
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

  it.skip('creates logs.all', async () => {
    // TODO: Implement POST /platform/projects/{ref}/analytics/endpoints/logs.all
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/projects/test-project-ref/analytics/endpoints/logs.all`,
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

  it.skip('creates logs.all', async () => {
    // TODO: Implement POST /platform/projects/{ref}/analytics/endpoints/logs.all
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/projects/test-project-ref/analytics/endpoints/logs.all`,
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

  it.skip('creates logs.all', async () => {
    // TODO: Implement POST /platform/projects/{ref}/analytics/endpoints/logs.all
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/projects/test-project-ref/analytics/endpoints/logs.all`,
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

  it.skip('lists network-restrictions', async () => {
    // TODO: Implement GET /v1/projects/{ref}/network-restrictions
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/test-project-ref/network-restrictions`,
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

  it.skip('creates apply', async () => {
    // TODO: Implement POST /v1/projects/{ref}/network-restrictions/apply
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/test-project-ref/network-restrictions/apply`,
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

  it.skip('lists rest', async () => {
    // TODO: Implement GET /platform/projects/{ref}/api/rest
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/test-project-ref/api/rest`,
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

  it('lists available-regions', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/available-regions`,
      headers: {
        Authorization: 'Bearer test-token',
      },
    })

    expect(response.statusCode).toBe(200)
    const payload = response.json()
    expect(Array.isArray(payload)).toBe(true)
    if (payload.length > 0) {
      expect(payload[0]).toMatchObject({
        id: expect.any(Number),
        ref: expect.any(String),
        name: expect.any(String),
      })
    }
  })

  it.skip('retrieves fly by ID', async () => {
    // TODO: Implement GET /platform/projects/fly/{fly_extension_id}
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/fly/{fly_extension_id}`,
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

  it.skip('creates projects', async () => {
    // TODO: Implement POST /platform/projects
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/projects`,
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

  it('deletes projects by ID', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/platform/projects/test-project-ref`,
      headers: {
        Authorization: 'Bearer test-token',
      },
    })

    expect(response.statusCode).toBe(204)
  })

  it('retrieves projects by ID', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/test-project-ref`,
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

  it.skip('creates pause', async () => {
    // TODO: Implement POST /platform/projects/{ref}/pause
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/projects/test-project-ref/pause`,
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

  it.skip('lists status', async () => {
    // TODO: Implement GET /platform/projects/{ref}/pause/status
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/test-project-ref/pause/status`,
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

  it.skip('creates restart', async () => {
    // TODO: Implement POST /platform/projects/{ref}/restart
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/projects/test-project-ref/restart`,
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

  it.skip('creates restart-services', async () => {
    // TODO: Implement POST /platform/projects/{ref}/restart-services
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/projects/test-project-ref/restart-services`,
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
    // TODO: Implement POST /platform/projects/{ref}/restore
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/projects/test-project-ref/restore`,
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

  it.skip('lists service-versions', async () => {
    // TODO: Implement GET /platform/projects/{ref}/service-versions
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/test-project-ref/service-versions`,
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
    // TODO: Implement GET /platform/projects/{ref}/status
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/test-project-ref/status`,
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

  it.skip('creates transfer', async () => {
    // TODO: Implement POST /platform/projects/{ref}/transfer
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/projects/test-project-ref/transfer`,
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

  it.skip('creates preview', async () => {
    // TODO: Implement POST /platform/projects/{ref}/transfer/preview
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/projects/test-project-ref/transfer/preview`,
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

  it.skip('lists typescript', async () => {
    // TODO: Implement GET /v1/projects/{ref}/types/typescript
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/test-project-ref/types/typescript`,
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

  it.skip('updates projects by ID', async () => {
    // TODO: Implement PATCH /platform/projects/{ref}
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/platform/projects/test-project-ref`,
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

  it.skip('creates upgrade', async () => {
    // TODO: Implement POST /v1/projects/{ref}/upgrade
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/test-project-ref/upgrade`,
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

  it('lists projects', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/projects`,
      headers: {
        Authorization: 'Bearer test-token',
      },
    })

    expect(response.statusCode).toBe(200)
    const payload = response.json()
    expect(Array.isArray(payload)).toBe(true)
    if (payload.length > 0) {
      expect(payload[0]).toMatchObject({
        id: expect.any(Number),
        ref: expect.any(String),
        name: expect.any(String),
      })
    }
  })

  it('lists projects', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/projects`,
      headers: {
        Authorization: 'Bearer test-token',
      },
    })

    expect(response.statusCode).toBe(200)
    const payload = response.json()
    expect(Array.isArray(payload)).toBe(true)
    if (payload.length > 0) {
      expect(payload[0]).toMatchObject({
        id: expect.any(Number),
        ref: expect.any(String),
        name: expect.any(String),
      })
    }
  })

  it.skip('lists load-balancers', async () => {
    // TODO: Implement GET /platform/projects/{ref}/load-balancers
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/test-project-ref/load-balancers`,
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

  it.skip('creates remove', async () => {
    // TODO: Implement POST /v1/projects/{ref}/read-replicas/remove
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/test-project-ref/read-replicas/remove`,
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

  it.skip('creates setup', async () => {
    // TODO: Implement POST /v1/projects/{ref}/read-replicas/setup
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/test-project-ref/read-replicas/setup`,
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

  it.skip('lists databases', async () => {
    // TODO: Implement GET /platform/projects/{ref}/databases
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/test-project-ref/databases`,
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

  it.skip('lists databases-statuses', async () => {
    // TODO: Implement GET /platform/projects/{ref}/databases-statuses
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/test-project-ref/databases-statuses`,
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

  it.skip('handles realtime', async () => {
    // TODO: Implement PATCH /platform/projects/{ref}/config/realtime
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/platform/projects/test-project-ref/config/realtime`,
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

  it.skip('lists realtime', async () => {
    // TODO: Implement GET /platform/projects/{ref}/config/realtime
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/test-project-ref/config/realtime`,
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

  it.skip('lists logs.all', async () => {
    // TODO: Implement GET /platform/projects/{ref}/analytics/endpoints/logs.all
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/test-project-ref/analytics/endpoints/logs.all`,
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

  it.skip('creates secrets', async () => {
    // TODO: Implement POST /v1/projects/{ref}/secrets
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/test-project-ref/secrets`,
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

  it.skip('deletes secrets', async () => {
    // TODO: Implement DELETE /v1/projects/{ref}/secrets
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/test-project-ref/secrets`,
      headers: {
        Authorization: 'Bearer test-token',
      },
    })

    expect(response.statusCode).toBe(204)
  })

  it.skip('lists secrets', async () => {
    // TODO: Implement GET /v1/projects/{ref}/secrets
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/test-project-ref/secrets`,
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

  it.skip('lists health', async () => {
    // TODO: Implement GET /v1/projects/{ref}/health
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/test-project-ref/health`,
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

  it.skip('lists ssl-enforcement', async () => {
    // TODO: Implement GET /v1/projects/{ref}/ssl-enforcement
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/test-project-ref/ssl-enforcement`,
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

  it.skip('handles ssl-enforcement', async () => {
    // TODO: Implement PUT /v1/projects/{ref}/ssl-enforcement
    const response = await app.inject({
      method: 'PUT',
      url: `/api/v1/projects/test-project-ref/ssl-enforcement`,
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

  it.skip('deletes addons by ID', async () => {
    // TODO: Implement DELETE /platform/projects/{ref}/billing/addons/{addon_variant}
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/platform/projects/test-project-ref/billing/addons/{addon_variant}`,
      headers: {
        Authorization: 'Bearer test-token',
      },
    })

    expect(response.statusCode).toBe(204)
  })

  it.skip('creates addons', async () => {
    // TODO: Implement POST /platform/projects/{ref}/billing/addons
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/projects/test-project-ref/billing/addons`,
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

  it.skip('lists addons', async () => {
    // TODO: Implement GET /platform/projects/{ref}/billing/addons
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/projects/test-project-ref/billing/addons`,
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

  it.skip('creates third-party-auth', async () => {
    // TODO: Implement POST /v1/projects/{ref}/config/auth/third-party-auth
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/test-project-ref/config/auth/third-party-auth`,
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

  it.skip('deletes third-party-auth by ID', async () => {
    // TODO: Implement DELETE /v1/projects/{ref}/config/auth/third-party-auth/{tpa_id}
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/test-project-ref/config/auth/third-party-auth/{tpa_id}`,
      headers: {
        Authorization: 'Bearer test-token',
      },
    })

    expect(response.statusCode).toBe(204)
  })

  it.skip('lists third-party-auth', async () => {
    // TODO: Implement GET /v1/projects/{ref}/config/auth/third-party-auth
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/test-project-ref/config/auth/third-party-auth`,
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
