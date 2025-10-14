import type { FastifyPluginAsync } from 'fastify'

import { getNotificationsSummary, listNotifications } from '../store/index.js'
import type { NotificationV2, NotificationsSummary } from '../store/index.js'

const notificationsRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Reply: NotificationV2[] }>('/', async (_request, reply) => {
    return reply.send(listNotifications())
  })

  app.get<{ Reply: NotificationsSummary }>('/summary', async (_request, reply) => {
    return reply.send(getNotificationsSummary())
  })
}

export default notificationsRoutes
