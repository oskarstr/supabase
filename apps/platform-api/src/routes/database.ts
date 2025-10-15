import type { FastifyPluginAsync } from 'fastify'

import { listDatabaseBackups } from '../store/index.js'

const databaseRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { ref: string } }>('/database/:ref/backups', async (request, reply) => {
    return reply.send(listDatabaseBackups(request.params.ref))
  })
}

export default databaseRoutes
