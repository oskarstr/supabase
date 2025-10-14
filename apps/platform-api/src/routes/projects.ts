import type { FastifyPluginAsync } from 'fastify'

import {
  CLOUD_PROVIDERS,
  createProject,
  deleteProject,
  getAvailableRegions,
  getJwtSecretUpdateStatus,
  getProject,
  getProjectSettings,
  listProjectAddons,
  listProjectDatabases,
  listProjectDetails,
  listProjectLints,
} from '../store/index.js'
import type {
  CloudProvider,
  DatabaseDetailSummary,
  JwtSecretUpdateStatusSummary,
  ProjectAddonsResponseSummary,
  ProjectLintSummary,
  ProjectSettingsSummary,
} from '../store/index.js'

const projectsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (_request, reply) => {
    const projects = listProjectDetails()
    return reply.send({
      pagination: {
        count: projects.length,
        limit: projects.length,
        offset: 0,
      },
      projects,
    })
  })

  app.get<{
    Querystring: { cloud_provider?: CloudProvider; organization_slug?: string }
  }>('/available-regions', async (request, reply) => {
    const { cloud_provider, organization_slug } = request.query
    if (!cloud_provider || !organization_slug) {
      return reply.code(400).send({ message: 'cloud_provider and organization_slug are required' })
    }
    if (!CLOUD_PROVIDERS.includes(cloud_provider)) {
      return reply.code(400).send({ message: `Unsupported cloud provider: ${cloud_provider}` })
    }
    return reply.send(getAvailableRegions(cloud_provider, organization_slug))
  })

  app.post<{ Body: Parameters<typeof createProject>[0] }>('/', async (request, reply) => {
    try {
      const response = createProject(request.body)
      return reply.code(201).send(response)
    } catch (error) {
      request.log.error({ err: error }, 'Failed to create project')
      return reply.code(400).send({ message: (error as Error).message })
    }
  })

  app.delete<{ Params: { ref: string } }>('/:ref', async (request, reply) => {
    const removed = deleteProject(request.params.ref)
    if (!removed) {
      return reply.code(404).send({ message: 'Project not found' })
    }
    return reply.send(removed)
  })

  app.get<{ Params: { ref: string } }>('/:ref', async (request, reply) => {
    const project = getProject(request.params.ref)
    if (!project) {
      return reply.code(404).send({ message: 'Project not found' })
    }
    return reply.send(project)
  })

  app.get<{ Params: { ref: string }; Reply: ProjectLintSummary[] }>(
    '/:ref/run-lints',
    async (request, reply) => {
      return reply.send(listProjectLints(request.params.ref))
    }
  )

  app.get<{ Params: { ref: string }; Reply: ProjectSettingsSummary | { message: string } }>(
    '/:ref/settings',
    async (request, reply) => {
      const project = getProject(request.params.ref)
      if (!project) {
        return reply.code(404).send({ message: 'Project not found' })
      }
      return reply.send(getProjectSettings(request.params.ref))
    }
  )

  app.get<{ Params: { ref: string }; Reply: ProjectAddonsResponseSummary | { message: string } }>(
    '/:ref/billing/addons',
    async (request, reply) => {
      const project = getProject(request.params.ref)
      if (!project) {
        return reply.code(404).send({ message: 'Project not found' })
      }
      return reply.send(listProjectAddons(request.params.ref))
    }
  )

  app.get<{ Params: { ref: string }; Reply: DatabaseDetailSummary[] | { message: string } }>(
    '/:ref/databases',
    async (request, reply) => {
      const project = getProject(request.params.ref)
      if (!project) {
        return reply.code(404).send({ message: 'Project not found' })
      }
      return reply.send(listProjectDatabases(request.params.ref))
    }
  )

  app.get<{ Params: { ref: string }; Reply: JwtSecretUpdateStatusSummary | { message: string } }>(
    '/:ref/config/secrets/update-status',
    async (request, reply) => {
      const project = getProject(request.params.ref)
      if (!project) {
        return reply.code(404).send({ message: 'Project not found' })
      }
      return reply.send(getJwtSecretUpdateStatus(request.params.ref))
    }
  )
}

export default projectsRoutes
