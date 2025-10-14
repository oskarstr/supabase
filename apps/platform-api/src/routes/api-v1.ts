import type { FastifyPluginAsync } from 'fastify'

import {
  getProjectUpgradeStatus,
  listProjectApiKeys,
  listProjectBranches,
  listProjectFunctions,
  listProjectServiceHealth,
} from '../store/index.js'

const apiV1Routes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { ref: string } }>('/projects/:ref/branches', async (request, reply) => {
    return reply.send(listProjectBranches(request.params.ref))
  })

  app.get<{
    Params: { ref: string }
    Querystring: { reveal?: string | boolean }
  }>('/projects/:ref/api-keys', async (request, reply) => {
    const { reveal } = request.query
    const shouldReveal =
      typeof reveal === 'boolean'
        ? reveal
        : typeof reveal === 'string'
          ? reveal.toLowerCase() === 'true'
          : false
    return reply.send(listProjectApiKeys(request.params.ref, shouldReveal))
  })

  app.get<{ Params: { ref: string } }>(
    '/projects/:ref/functions',
    async (request, reply) => {
      return reply.send(listProjectFunctions(request.params.ref))
    }
  )

  app.get<{ Params: { ref: string } }>('/projects/:ref/upgrade/status', async (request, reply) => {
    return reply.send(getProjectUpgradeStatus(request.params.ref))
  })

  app.get<{
    Params: { ref: string }
    Querystring: { services?: string | string[]; timeout_ms?: string }
  }>(
    '/projects/:ref/health',
    async (request, reply) => {
      const { services } = request.query
      const requested =
        typeof services === 'string'
          ? services.split(',').map((s) => s.trim()).filter(Boolean)
          : Array.isArray(services)
            ? services
            : ['auth', 'db', 'realtime', 'rest', 'storage']
      return reply.send(listProjectServiceHealth(request.params.ref, requested))
    }
  )
}

export default apiV1Routes
