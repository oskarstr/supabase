import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { build } from '../../../src/app'
import type { FastifyInstance } from 'fastify'

describe('organizations endpoints (auto-generated)', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await build()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it.skip('lists daily', async () => {
    // TODO: Implement GET /platform/organizations/{slug}/usage/daily
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/organizations/test-org/usage/daily`,
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

  it.skip('creates authorizations by ID', async () => {
    // TODO: Implement POST /platform/organizations/{slug}/oauth/authorizations/{id}
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/organizations/test-org/oauth/authorizations/1`,
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

  it.skip('deletes authorizations by ID', async () => {
    // TODO: Implement DELETE /platform/organizations/{slug}/oauth/authorizations/{id}
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/platform/organizations/test-org/oauth/authorizations/1`,
      headers: {
        Authorization: 'Bearer test-token',
      },
    })

    expect(response.statusCode).toBe(204)
  })

  it('creates available-versions', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/organizations/test-org/available-versions`,
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

  it.skip('creates dpa', async () => {
    // TODO: Implement POST /platform/organizations/${slug}/documents/dpa
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/organizations/$test-org/documents/dpa`,
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

  it.skip('lists redirect', async () => {
    // TODO: Implement GET /platform/organizations/{slug}/cloud-marketplace/redirect
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/organizations/test-org/cloud-marketplace/redirect`,
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

  it.skip('retrieves invoices by ID', async () => {
    // TODO: Implement GET /platform/organizations/{slug}/billing/invoices/{invoiceId}
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/organizations/test-org/billing/invoices/{invoiceId}`,
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

  it.skip('lists invoices', async () => {
    // TODO: Implement GET /platform/organizations/{slug}/billing/invoices
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/organizations/test-org/billing/invoices`,
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

  it.skip('lists upcoming', async () => {
    // TODO: Implement GET /platform/organizations/{slug}/billing/invoices/upcoming
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/organizations/test-org/billing/invoices/upcoming`,
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

  it.skip('creates revoke', async () => {
    // TODO: Implement POST /platform/organizations/{slug}/oauth/apps/{id}/revoke
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/organizations/test-org/oauth/apps/1/revoke`,
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

  it('lists apps', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/organizations/test-org/oauth/apps`,
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

  it.skip('creates apps', async () => {
    // TODO: Implement POST /platform/organizations/{slug}/oauth/apps
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/organizations/test-org/oauth/apps`,
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

  it.skip('deletes apps by ID', async () => {
    // TODO: Implement DELETE /platform/organizations/{slug}/oauth/apps/{id}
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/platform/organizations/test-org/oauth/apps/1`,
      headers: {
        Authorization: 'Bearer test-token',
      },
    })

    expect(response.statusCode).toBe(204)
  })

  it.skip('updates apps by ID', async () => {
    // TODO: Implement PUT /platform/organizations/{slug}/oauth/apps/{id}
    const response = await app.inject({
      method: 'PUT',
      url: `/api/platform/organizations/test-org/oauth/apps/1`,
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

  it('lists apps', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/organizations/test-org/oauth/apps`,
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

  it.skip('creates invitations by ID', async () => {
    // TODO: Implement POST /platform/organizations/{slug}/members/invitations/{token}
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/organizations/test-org/members/invitations/{token}`,
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

  it.skip('creates invitations', async () => {
    // TODO: Implement POST /platform/organizations/{slug}/members/invitations
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/organizations/test-org/members/invitations`,
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

  it.skip('deletes invitations by ID', async () => {
    // TODO: Implement DELETE /platform/organizations/{slug}/members/invitations/{id}
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/platform/organizations/test-org/members/invitations/1`,
      headers: {
        Authorization: 'Bearer test-token',
      },
    })

    expect(response.statusCode).toBe(204)
  })

  it.skip('retrieves invitations by ID', async () => {
    // TODO: Implement GET /platform/organizations/{slug}/members/invitations/{token}
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/organizations/test-org/members/invitations/{token}`,
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

  it.skip('updates members by ID', async () => {
    // TODO: Implement PATCH /platform/organizations/{slug}/members/{gotrue_id}
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/platform/organizations/test-org/members/{gotrue_id}`,
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

  it.skip('lists roles', async () => {
    // TODO: Implement GET /platform/organizations/{slug}/roles
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/organizations/test-org/roles`,
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

  it.skip('lists audit', async () => {
    // TODO: Implement GET /platform/organizations/{slug}/audit
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/organizations/test-org/audit`,
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

  it.skip('retrieves fly by ID', async () => {
    // TODO: Implement GET /platform/organizations/fly/{fly_organization_id}
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/organizations/fly/{fly_organization_id}`,
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

  it.skip('creates organizations', async () => {
    // TODO: Implement POST /platform/organizations
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/organizations`,
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

  it.skip('creates cloud-marketplace', async () => {
    // TODO: Implement POST /platform/organizations/cloud-marketplace
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/organizations/cloud-marketplace`,
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

  it.skip('creates top-up', async () => {
    // TODO: Implement POST /platform/organizations/{slug}/billing/credits/top-up
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/organizations/test-org/billing/credits/top-up`,
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

  it.skip('lists customer', async () => {
    // TODO: Implement GET /platform/organizations/{slug}/customer
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/organizations/test-org/customer`,
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

  it.skip('handles customer', async () => {
    // TODO: Implement PUT /platform/organizations/{slug}/customer
    const response = await app.inject({
      method: 'PUT',
      url: `/api/platform/organizations/test-org/customer`,
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

  it.skip('deletes organizations by ID', async () => {
    // TODO: Implement DELETE /platform/organizations/{slug}
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/platform/organizations/test-org`,
      headers: {
        Authorization: 'Bearer test-token',
      },
    })

    expect(response.statusCode).toBe(204)
  })

  it.skip('handles link', async () => {
    // TODO: Implement PUT /platform/organizations/{slug}/cloud-marketplace/link
    const response = await app.inject({
      method: 'PUT',
      url: `/api/platform/organizations/test-org/cloud-marketplace/link`,
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

  it.skip('deletes members by ID', async () => {
    // TODO: Implement DELETE /platform/organizations/{slug}/members/{gotrue_id}
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/platform/organizations/test-org/members/{gotrue_id}`,
      headers: {
        Authorization: 'Bearer test-token',
      },
    })

    expect(response.statusCode).toBe(204)
  })

  it.skip('lists members', async () => {
    // TODO: Implement GET /platform/organizations/{slug}/members
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/organizations/test-org/members`,
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

  it.skip('lists invitations', async () => {
    // TODO: Implement GET /platform/organizations/{slug}/members/invitations
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/organizations/test-org/members/invitations`,
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

  it.skip('handles enforcement', async () => {
    // TODO: Implement PATCH /platform/organizations/{slug}/members/mfa/enforcement
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/platform/organizations/test-org/members/mfa/enforcement`,
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

  it.skip('lists enforcement', async () => {
    // TODO: Implement GET /platform/organizations/{slug}/members/mfa/enforcement
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/organizations/test-org/members/mfa/enforcement`,
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

  it.skip('handles default', async () => {
    // TODO: Implement PUT /platform/organizations/{slug}/payments/default
    const response = await app.inject({
      method: 'PUT',
      url: `/api/platform/organizations/test-org/payments/default`,
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

  it.skip('deletes payments', async () => {
    // TODO: Implement DELETE /platform/organizations/{slug}/payments
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/platform/organizations/test-org/payments`,
      headers: {
        Authorization: 'Bearer test-token',
      },
    })

    expect(response.statusCode).toBe(204)
  })

  it.skip('creates setup-intent', async () => {
    // TODO: Implement POST /platform/organizations/{slug}/payments/setup-intent
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/organizations/test-org/payments/setup-intent`,
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

  it.skip('lists payments', async () => {
    // TODO: Implement GET /platform/organizations/{slug}/payments
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/organizations/test-org/payments`,
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

  it.skip('creates project-claim by ID', async () => {
    // TODO: Implement POST /v1/organizations/{slug}/project-claim/{token}
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/organizations/test-org/project-claim/{token}`,
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

  it.skip('retrieves project-claim by ID', async () => {
    // TODO: Implement GET /v1/organizations/{slug}/project-claim/{token}
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/organizations/test-org/project-claim/{token}`,
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

  it('retrieves organizations by ID', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/organizations/test-org`,
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

  it.skip('lists tax-ids', async () => {
    // TODO: Implement GET /platform/organizations/{slug}/tax-ids
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/organizations/test-org/tax-ids`,
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

  it.skip('handles tax-ids', async () => {
    // TODO: Implement PUT /platform/organizations/{slug}/tax-ids
    const response = await app.inject({
      method: 'PUT',
      url: `/api/platform/organizations/test-org/tax-ids`,
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

  it.skip('deletes tax-ids', async () => {
    // TODO: Implement DELETE /platform/organizations/{slug}/tax-ids
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/platform/organizations/test-org/tax-ids`,
      headers: {
        Authorization: 'Bearer test-token',
      },
    })

    expect(response.statusCode).toBe(204)
  })

  it.skip('updates organizations by ID', async () => {
    // TODO: Implement PATCH /platform/organizations/{slug}
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/platform/organizations/test-org`,
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

  it('lists organizations', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/organizations`,
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
        name: expect.any(String),
        slug: expect.any(String),
      })
    }
  })

  it('lists projects', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/organizations/test-org/projects`,
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

  it.skip('creates sso', async () => {
    // TODO: Implement POST /platform/organizations/{slug}/sso
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/organizations/test-org/sso`,
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

  it.skip('lists sso', async () => {
    // TODO: Implement GET /platform/organizations/{slug}/sso
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/organizations/test-org/sso`,
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

  it.skip('handles sso', async () => {
    // TODO: Implement PUT /platform/organizations/{slug}/sso
    const response = await app.inject({
      method: 'PUT',
      url: `/api/platform/organizations/test-org/sso`,
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

  it.skip('lists plans', async () => {
    // TODO: Implement GET /platform/organizations/{slug}/billing/plans
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/organizations/test-org/billing/plans`,
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

  it.skip('creates confirm-subscription', async () => {
    // TODO: Implement POST /platform/organizations/confirm-subscription
    const response = await app.inject({
      method: 'POST',
      url: `/api/platform/organizations/confirm-subscription`,
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

  it.skip('lists subscription', async () => {
    // TODO: Implement GET /platform/organizations/{slug}/billing/subscription
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/organizations/test-org/billing/subscription`,
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

  it.skip('handles subscription', async () => {
    // TODO: Implement PUT /platform/organizations/{slug}/billing/subscription
    const response = await app.inject({
      method: 'PUT',
      url: `/api/platform/organizations/test-org/billing/subscription`,
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

  it.skip('lists usage', async () => {
    // TODO: Implement GET /platform/organizations/{slug}/usage
    const response = await app.inject({
      method: 'GET',
      url: `/api/platform/organizations/test-org/usage`,
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
