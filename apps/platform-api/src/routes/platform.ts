import type { FastifyPluginAsync } from 'fastify'

import authRoutes from './auth.js'
import integrationsRoutes from './integrations.js'
import notificationsRoutes from './notifications.js'
import organizationsRoutes from './organizations.js'
import pgMetaRoutes from './pg-meta.js'
import profileRoutes from './profile.js'
import projectResourceWarningsRoutes from './project-resource-warnings.js'
import projectsRoutes from './projects.js'
import stripeRoutes from './stripe.js'
import telemetryRoutes from './telemetry.js'

const platformRoutes: FastifyPluginAsync = async (app) => {
  app.register(profileRoutes, { prefix: '/profile' })
  app.register(organizationsRoutes, { prefix: '/organizations' })
  app.register(projectsRoutes, { prefix: '/projects' })
  app.register(projectResourceWarningsRoutes)
  app.register(integrationsRoutes, { prefix: '/integrations' })
  app.register(notificationsRoutes, { prefix: '/notifications' })
  app.register(telemetryRoutes, { prefix: '/telemetry' })
  app.register(stripeRoutes, { prefix: '/stripe' })
  app.register(pgMetaRoutes)
  app.register(authRoutes)
}

export default platformRoutes
