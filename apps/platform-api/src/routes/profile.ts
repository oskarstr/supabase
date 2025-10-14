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
    return reply.send(getProfile())
  })

  app.post('/audit-login', async (_request, reply) => {
    auditAccountLogin()
    return reply.code(201).send()
  })

  app.get<{
    Querystring: { iso_timestamp_start?: string; iso_timestamp_end?: string }
    Reply: AuditLogEntry[]
  }>('/audit', async (request, reply) => {
    const { iso_timestamp_start, iso_timestamp_end } = request.query
    return reply.send(listAuditLogs(iso_timestamp_start, iso_timestamp_end))
  })

  app.get<{ Reply: AccessToken[] }>('/access-tokens', async (_request, reply) => {
    return reply.send(listAccessTokens())
  })

  app.post<{ Body: { name: string }; Reply: AccessTokenWithSecret }>(
    '/access-tokens',
    async (request, reply) => {
      const name = request.body?.name?.trim() || 'Personal Token'
      return reply.code(201).send(createAccessToken(name))
    }
  )

  app.get<{ Params: { id: string }; Reply: AccessToken | { message: string } }>(
    '/access-tokens/:id',
    async (request, reply) => {
      const id = Number.parseInt(request.params.id, 10)
      if (!Number.isFinite(id)) {
        return reply.code(400).send({ message: 'Invalid access token id' })
      }
      const token = getAccessToken(id)
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
      const removed = deleteAccessToken(id)
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
      return reply.send(listPermissions())
    }
  )
}

export default profileRoutes
