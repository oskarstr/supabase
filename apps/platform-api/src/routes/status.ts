import type { FastifyPluginAsync } from 'fastify'

import { getPlatformStatus } from '../store/index.js'

const statusRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (_request, reply) => {
    return reply.send(getPlatformStatus())
  })
}

export default statusRoutes
