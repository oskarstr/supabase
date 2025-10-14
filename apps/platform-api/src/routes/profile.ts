import type { FastifyPluginAsync } from 'fastify'

import {
  auditAccountLogin,
  checkPasswordStrength,
  createAccessToken,
  deleteAccessToken,
  getAccessToken,
  getProfile,
  listAccessTokens,
  listAuditLogs,
  listPermissions,
} from '../store/index.js'
import type {
  AccessControlPermission,
  AccessToken,
  AccessTokenWithSecret,
  AuditLogEntry,
} from '../store/index.js'

const profileRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (_request, reply) => {
    const profile = await getProfile()
    return reply.send(profile)
  })

  app.post('/audit-login', async (_request, reply) => {
    await auditAccountLogin()
    return reply.code(201).send()
  })

  app.get<{
    Querystring: { iso_timestamp_start?: string; iso_timestamp_end?: string }
    Reply: AuditLogEntry[]
  }>('/audit', async (request, reply) => {
    const { iso_timestamp_start, iso_timestamp_end } = request.query
    const logs = await listAuditLogs(iso_timestamp_start, iso_timestamp_end)
    return reply.send(logs)
  })

  app.get<{ Reply: AccessToken[] }>('/access-tokens', async (_request, reply) => {
    const tokens = await listAccessTokens()
    return reply.send(tokens)
  })

  app.post<{ Body: { name: string }; Reply: AccessTokenWithSecret }>(
    '/access-tokens',
    async (request, reply) => {
      const name = request.body?.name?.trim() || 'Personal Token'
      const token = await createAccessToken(name)
      return reply.code(201).send(token)
    }
  )

  app.get<{ Params: { id: string }; Reply: AccessToken | { message: string } }>(
    '/access-tokens/:id',
    async (request, reply) => {
      const id = Number.parseInt(request.params.id, 10)
      if (!Number.isFinite(id)) {
        return reply.code(400).send({ message: 'Invalid access token id' })
      }
      const token = await getAccessToken(id)
      if (!token) {
        return reply.code(404).send({ message: 'Access token not found' })
      }
      return reply.send(token)
    }
  )

  app.delete<{ Params: { id: string } }>(
    '/access-tokens/:id',
    async (request, reply) => {
      const id = Number.parseInt(request.params.id, 10)
      if (!Number.isFinite(id)) {
        return reply.code(400).send({ message: 'Invalid access token id' })
      }
      const removed = await deleteAccessToken(id)
      if (!removed) {
        return reply.code(404).send({ message: 'Access token not found' })
      }
      return reply.send()
    }
  )

  app.post('/password-check', async (_request, reply) => {
    return reply.code(201).send(checkPasswordStrength())
  })

  app.get<{ Reply: AccessControlPermission[] }>(
    '/permissions',
    async (_request, reply) => {
      const permissions = await listPermissions()
      return reply.send(permissions)
    }
  )
}

export default profileRoutes
