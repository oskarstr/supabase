import type { FastifyPluginAsync } from 'fastify'

import {
  getGitHubAuthorization,
  listGitHubConnections,
  listOrganizationIntegrations,
  listUserIntegrations,
} from '../store/index.js'
import type { ListGitHubConnectionsResponse } from '../store/index.js'

const integrationsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (_request, reply) => {
    return reply.send(listUserIntegrations())
  })

  app.get('/github/authorization', async (_request, reply) => {
    return reply.send(getGitHubAuthorization())
  })

  app.get<{ Params: { slug: string } }>('/:slug', async (request, reply) => {
    return reply.send(listOrganizationIntegrations(request.params.slug))
  })

  app.get<{
    Querystring: { organization_id?: string }
    Reply: ListGitHubConnectionsResponse | { message: string }
  }>('/github/connections', async (request, reply) => {
    const organizationIdRaw = request.query.organization_id
    if (!organizationIdRaw) {
      return reply.code(400).send({ message: 'organization_id is required' })
    }
    const organizationId = Number.parseInt(organizationIdRaw, 10)
    if (!Number.isFinite(organizationId)) {
      return reply.code(400).send({ message: 'organization_id must be a number' })
    }
    return reply.send(listGitHubConnections(organizationId))
  })
}

export default integrationsRoutes
