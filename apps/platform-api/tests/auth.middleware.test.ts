import Fastify from 'fastify'
import { beforeEach, describe, expect, it } from 'vitest'

import { authenticateRequest } from '../src/plugins/authenticate.js'
import { authHeaders, createTestJwt, TEST_JWT_SECRET } from './utils/auth.js'

const buildApp = async () => {
  const app = Fastify({ logger: false })
  app.addHook('preHandler', authenticateRequest)
  app.get('/secure', async (request) => ({ auth: request.auth }))
  await app.ready()
  return app
}

describe('authenticateRequest', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = TEST_JWT_SECRET
    delete process.env.SUPABASE_JWT_SECRET
  })

  it('rejects requests without an authorization header', async () => {
    const app = await buildApp()
    const response = await app.inject({ method: 'GET', url: '/secure' })
    expect(response.statusCode).toBe(401)
    await app.close()
  })

  it('rejects malformed tokens', async () => {
    const app = await buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/secure',
      headers: { authorization: 'Bearer not-a-token' },
    })
    expect(response.statusCode).toBe(401)
    await app.close()
  })

  it('rejects expired tokens', async () => {
    const app = await buildApp()
    const expired = createTestJwt({ exp: Math.floor(Date.now() / 1000) - 10 })
    const response = await app.inject({
      method: 'GET',
      url: '/secure',
      headers: { authorization: `Bearer ${expired}` },
    })
    expect(response.statusCode).toBe(401)
    await app.close()
  })

  it('attaches auth context for valid tokens', async () => {
    const app = await buildApp()
    const headers = authHeaders({ sub: 'user-123', email: 'user@example.com', role: 'owner' })
    const response = await app.inject({ method: 'GET', url: '/secure', headers })
    expect(response.statusCode).toBe(200)
    const payload = response.json()
    expect(payload.auth).toMatchObject({
      userId: 'user-123',
      email: 'user@example.com',
      role: 'owner',
    })
    await app.close()
  })
})
