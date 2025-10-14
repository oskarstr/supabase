import type { FastifyPluginAsync } from 'fastify'

import authRoutes from './auth.js'
import integrationsRoutes from './integrations.js'
import notificationsRoutes from './notifications.js'
import organizationsRoutes from './organizations.js'
import pgMetaRoutes from './pg-meta.js'
import profileRoutes from './profile.js'
import projectResourceWarningsRoutes from './project-resource-warnings.js'
import projectsRoutes from './projects.js'
import replicationRoutes from './replication.js'
import statusRoutes from './status.js'
import storageRoutes from './storage.js'
import stripeRoutes from './stripe.js'
import telemetryRoutes from './telemetry.js'
import databaseRoutes from './database.js'

const platformRoutes: FastifyPluginAsync = async (app) => {
  app.register(statusRoutes, { prefix: '/status' })
  app.register(profileRoutes, { prefix: '/profile' })
  app.register(organizationsRoutes, { prefix: '/organizations' })
  app.register(projectsRoutes, { prefix: '/projects' })
  app.register(projectResourceWarningsRoutes)
  app.register(replicationRoutes)
  app.register(databaseRoutes)
  app.register(integrationsRoutes, { prefix: '/integrations' })
  app.register(notificationsRoutes, { prefix: '/notifications' })
  app.register(storageRoutes, { prefix: '/storage' })
  app.register(telemetryRoutes, { prefix: '/telemetry' })
  app.register(stripeRoutes, { prefix: '/stripe' })
  app.register(pgMetaRoutes)
  app.register(authRoutes, { prefix: '/auth' })
}

export default platformRoutes
