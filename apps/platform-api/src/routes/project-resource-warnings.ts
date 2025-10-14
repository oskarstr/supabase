import type { FastifyPluginAsync } from 'fastify'

import { listProjectResourceWarnings } from '../store/index.js'
import type { ProjectResourceWarningsResponse } from '../store/index.js'

const projectResourceWarningsRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Reply: ProjectResourceWarningsResponse[] }>(
    '/projects-resource-warnings',
    async (_request, reply) => {
      return reply.send(listProjectResourceWarnings())
    }
  )
}

export default projectResourceWarningsRoutes
