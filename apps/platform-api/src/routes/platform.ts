import type { FastifyPluginAsync } from 'fastify'

import {
  createProject,
  deleteProject,
  getProfile,
  getProject,
  getSubscriptionForOrg,
  listOrganizationProjects,
  listOrganizations,
} from '../store.js'
import type { Organization } from '../store.js'

const platformRoutes: FastifyPluginAsync = async (app) => {
  app.get('/platform/profile', async (_request, reply) => {
    return reply.send(getProfile())
  })

  app.get('/platform/organizations', async (_request, reply) => {
    return reply.send(listOrganizations())
  })

  app.get<{ Params: { slug: string } }>(
    '/platform/organizations/:slug/projects',
    async (request, reply) => {
      const result = listOrganizationProjects(request.params.slug)
      if (!result) {
        return reply.code(404).send({ message: 'Organization not found' })
      }
      return reply.send(result)
    }
  )

  app.get<{ Params: { slug: string } }>(
    '/platform/organizations/:slug/billing/subscription',
    async (request, reply) => {
      const org = listOrganizations().find(
        (organization: Organization) => organization.slug === request.params.slug
      )
      if (!org) {
        return reply.code(404).send({ message: 'Organization not found' })
      }
      return reply.send(getSubscriptionForOrg(org))
    }
  )

  app.get<{ Params: { ref: string } }>('/platform/projects/:ref', async (request, reply) => {
    const project = getProject(request.params.ref)
    if (!project) {
      return reply.code(404).send({ message: 'Project not found' })
    }
    return reply.send(project)
  })

  app.post<{ Body: Parameters<typeof createProject>[0] }>(
    '/platform/projects',
    async (request, reply) => {
      try {
        const response = createProject(request.body)
        return reply.code(201).send(response)
      } catch (error) {
        request.log.error({ err: error }, 'Failed to create project')
        return reply.code(400).send({ message: (error as Error).message })
      }
    }
  )

  app.delete<{ Params: { ref: string } }>(
    '/platform/projects/:ref',
    async (request, reply) => {
      const removed = deleteProject(request.params.ref)
      if (!removed) {
        return reply.code(404).send({ message: 'Project not found' })
      }
      return reply.send(removed)
    }
  )
}

export default platformRoutes
