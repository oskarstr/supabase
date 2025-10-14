import type { FastifyPluginAsync } from 'fastify'

import { getNotificationsSummary } from '../store/index.js'
import type { NotificationsSummary } from '../store/index.js'

const notificationsRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Reply: NotificationsSummary }>('/summary', async (_request, reply) => {
    return reply.send(getNotificationsSummary())
  })
}

export default notificationsRoutes
