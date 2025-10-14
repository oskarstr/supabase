import type { FastifyPluginAsync } from 'fastify'

import { listProjectTables } from '../store/index.js'
import type { PostgresTableSummary } from '../store/index.js'

const pgMetaRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { ref: string }; Reply: PostgresTableSummary[] }>(
    '/pg-meta/:ref/tables',
    async (request, reply) => {
      return reply.send(listProjectTables(request.params.ref))
    }
  )
}

export default pgMetaRoutes
