import type { FastifyPluginAsync } from 'fastify'

import { listReplicationSources } from '../store/index.js'

const replicationRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { ref: string } }>(
    '/replication/:ref/sources',
    async (request, reply) => {
      return reply.send(listReplicationSources(request.params.ref))
    }
  )
}

export default replicationRoutes
