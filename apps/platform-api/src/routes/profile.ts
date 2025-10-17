import type { FastifyPluginAsync } from 'fastify'

import {
  auditAccountLogin,
  checkPasswordStrength,
  createAccessToken,
  deleteAccessToken,
  getAccessToken,
  getProfileByGotrueId,
  listAccessTokens,
  listAuditLogs,
  listPermissionsForProfile,
  ProfileAlreadyExistsError,
  ProfileNotFoundError,
  updateProfile,
  ensureProfile,
  createProfile,
} from '../store/index.js'
import type {
  AccessControlPermission,
  AccessToken,
  AccessTokenWithSecret,
  AuditLogEntry,
} from '../store/index.js'

type ErrorResponse = { message: string }

const profileRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (request, reply) => {
    const auth = request.auth
    if (!auth) {
      return reply.code(401).send({ message: 'Unauthorized' })
    }

    const profile = await getProfileByGotrueId(auth.userId)
    if (!profile) {
      return reply.code(404).send({ message: "User's profile not found" })
    }

    return reply.send(profile)
  })

  app.post('/audit-login', async (request, reply) => {
    const auth = request.auth
    if (!auth) {
      return reply.code(401).send({ message: 'Unauthorized' })
    }

    const profile = await ensureProfile(auth.userId, auth.email)
    await auditAccountLogin(profile, request.ip)
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

  app.get<{ Reply: AccessToken[] | ErrorResponse }>('/access-tokens', async (request, reply) => {
    const auth = request.auth
    if (!auth) {
      return reply.code(401).send({ message: 'Unauthorized' })
    }
    const profile = await ensureProfile(auth.userId, auth.email)
    if (!profile) {
      return reply.code(404).send({ message: "User's profile not found" })
    }
    const tokens = await listAccessTokens()
    return reply.send(tokens)
  })

  app.post<{ Body: { name: string }; Reply: AccessTokenWithSecret | ErrorResponse }>(
    '/access-tokens',
    async (request, reply) => {
      const auth = request.auth
      if (!auth) {
        return reply.code(401).send({ message: 'Unauthorized' })
      }
      await ensureProfile(auth.userId, auth.email)
      const name = request.body?.name?.trim() || 'Personal Token'
      const token = await createAccessToken(name)
      return reply.code(201).send(token)
    }
  )

  app.get<{ Params: { id: string }; Reply: AccessToken | { message: string } }>(
    '/access-tokens/:id',
    async (request, reply) => {
      const auth = request.auth
      if (!auth) {
        return reply.code(401).send({ message: 'Unauthorized' })
      }
      await ensureProfile(auth.userId, auth.email)
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

  app.delete<{ Params: { id: string } }>('/access-tokens/:id', async (request, reply) => {
    const auth = request.auth
    if (!auth) {
      return reply.code(401).send({ message: 'Unauthorized' })
    }
    await ensureProfile(auth.userId, auth.email)
    const id = Number.parseInt(request.params.id, 10)
    if (!Number.isFinite(id)) {
      return reply.code(400).send({ message: 'Invalid access token id' })
    }
    const removed = await deleteAccessToken(id)
    if (!removed) {
      return reply.code(404).send({ message: 'Access token not found' })
    }
    return reply.send()
  })

  app.post('/password-check', async (_request, reply) => {
    return reply.code(201).send(checkPasswordStrength())
  })

  app.get<{ Reply: AccessControlPermission[] | ErrorResponse }>(
    '/permissions',
    async (request, reply) => {
      const auth = request.auth
      if (!auth) {
        return reply.code(401).send({ message: 'Unauthorized' })
      }
      const profile = await getProfileByGotrueId(auth.userId)
      if (!profile) {
        return reply.send([])
      }
      const permissions = await listPermissionsForProfile(profile.id)
      return reply.send(permissions)
    }
  )

  app.post('/', async (request, reply) => {
    const auth = request.auth
    if (!auth) {
      return reply.code(401).send({ message: 'Unauthorized' })
    }

    try {
      const profile = await createProfile(auth.userId, auth.email)
      await auditAccountLogin(profile, request.ip)
      return reply.code(201).send(profile)
    } catch (error) {
      if (error instanceof ProfileAlreadyExistsError) {
        return reply.code(409).send({ message: error.message })
      }
      request.log.error({ err: error }, 'Failed to create profile')
      return reply.code(500).send({ message: 'Failed to create profile' })
    }
  })

  app.patch<{ Body: { first_name?: string; last_name?: string; username?: string; primary_email?: string } }>(
    '/',
    async (request, reply) => {
      const auth = request.auth
      if (!auth) {
        return reply.code(401).send({ message: 'Unauthorized' })
      }

      try {
        const profile = await updateProfile(auth.userId, {
          first_name: request.body?.first_name,
          last_name: request.body?.last_name,
          username: request.body?.username,
          primary_email: request.body?.primary_email,
        })
        return reply.send(profile)
      } catch (error) {
        if (error instanceof ProfileNotFoundError) {
          return reply.code(404).send({ message: error.message })
        }
        request.log.error({ err: error }, 'Failed to update profile')
        return reply.code(500).send({ message: 'Failed to update profile' })
      }
    }
  )
}

export default profileRoutes
