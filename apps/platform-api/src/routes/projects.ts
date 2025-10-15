import type { FastifyPluginAsync } from 'fastify'

import {
  CLOUD_PROVIDERS,
  createProject,
  deleteProject,
  getAvailableRegions,
  getJwtSecretUpdateStatus,
  getProject,
  getProjectPgbouncerConfig,
  getProjectPgbouncerStatus,
  getProjectDiskAttributes,
  getProjectDiskAutoscaleConfig,
  getProjectDiskUtilization,
  getProjectContentCounts,
  getProjectRestDefinition,
  getProjectPostgrestConfig,
  getProjectRealtimeConfig,
  getProjectStorageConfig,
  getProjectSettings,
  listProjectLoadBalancers,
  listProjectAddons,
  listProjectDatabases,
  listProjectDetails,
  listProjectLints,
  listProjectSupavisorPools,
  listProjectContent,
  listProjectContentFolders,
  createTemporaryApiKey,
  listProjectLogs,
  listProjectLogDrains,
  pauseProject,
  resumeProject,
  listUsageApiCounts,
  listUsageApiRequests,
  listFunctionCombinedStats,
  listFunctionRequestStats,
  listFunctionResourceUsage,
} from '../store/index.js'
import type {
  CloudProvider,
  DiskAttributes,
  DiskAutoscaleConfig,
  DiskUtilizationResponse,
  DatabaseDetailSummary,
  JwtSecretUpdateStatusSummary,
  ProjectContentCountSummary,
  ProjectContentFoldersResponse,
  ProjectContentListResponse,
  PgbouncerConfigResponse,
  PgbouncerStatusResponse,
  PostgrestConfigResponse,
  ProjectAddonsResponseSummary,
  ProjectLintSummary,
  ProjectSettingsSummary,
  RealtimeConfigResponse,
  StorageConfigResponse,
  SupavisorConfigResponse,
  LoadBalancerSummary,
  ProjectLogDrainSummary,
  UsageApiCountSummary,
} from '../store/index.js'

const projectsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (_request, reply) => {
    const projects = await listProjectDetails()
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
      const response = await createProject(request.body)
      return reply.code(201).send(response)
    } catch (error) {
      request.log.error({ err: error }, 'Failed to create project')
      return reply.code(400).send({ message: (error as Error).message })
    }
  })

  app.delete<{ Params: { ref: string } }>('/:ref', async (request, reply) => {
    const removed = await deleteProject(request.params.ref)
    if (!removed) {
      return reply.code(404).send({ message: 'Project not found' })
    }
    return reply.send(removed)
  })

  app.get<{ Params: { ref: string } }>('/:ref', async (request, reply) => {
    const project = await getProject(request.params.ref)
    if (!project) {
      return reply.code(404).send({ message: 'Project not found' })
    }
    return reply.send(project)
  })

  app.get<{
    Params: { ref: string }
    Querystring: { visibility?: string; favorite?: string; type?: string }
    Reply: ProjectContentListResponse
  }>(
    '/:ref/content',
    async (request, reply) => {
      return reply.send(listProjectContent(request.query.visibility, request.query.favorite))
    }
  )

  app.get<{ Params: { ref: string }; Reply: ProjectContentCountSummary }>(
    '/:ref/content/count',
    async (_request, reply) => {
      return reply.send(getProjectContentCounts())
    }
  )

  app.get<{ Params: { ref: string }; Reply: ProjectContentFoldersResponse }>(
    '/:ref/content/folders',
    async (_request, reply) => {
      return reply.send(listProjectContentFolders())
    }
  )

  app.get<{ Params: { ref: string }; Reply: DiskAttributes | { message: string } }>(
    '/:ref/disk',
    async (request, reply) => {
      const project = await getProject(request.params.ref)
      if (!project) {
        return reply.code(404).send({ message: 'Project not found' })
      }
      return reply.send(getProjectDiskAttributes(project.ref))
    }
  )

  app.post<{ Params: { ref: string }; Body: unknown }>(
    '/:ref/disk',
    async (request, reply) => {
      const project = await getProject(request.params.ref)
      if (!project) {
        return reply.code(404).send({ message: 'Project not found' })
      }
      return reply.code(201).send(getProjectDiskAttributes(project.ref))
    }
  )

  app.get<{ Params: { ref: string }; Reply: DiskAutoscaleConfig | { message: string } }>(
    '/:ref/disk/custom-config',
    async (request, reply) => {
      const project = await getProject(request.params.ref)
      if (!project) {
        return reply.code(404).send({ message: 'Project not found' })
      }
      return reply.send(getProjectDiskAutoscaleConfig(project.ref))
    }
  )

  app.post<{ Params: { ref: string }; Body: unknown }>(
    '/:ref/disk/custom-config',
    async (request, reply) => {
      const project = await getProject(request.params.ref)
      if (!project) {
        return reply.code(404).send({ message: 'Project not found' })
      }
      return reply.code(201).send(getProjectDiskAutoscaleConfig(project.ref))
    }
  )

  app.get<{ Params: { ref: string }; Reply: DiskUtilizationResponse | { message: string } }>(
    '/:ref/disk/util',
    async (request, reply) => {
      const project = await getProject(request.params.ref)
      if (!project) {
        return reply.code(404).send({ message: 'Project not found' })
      }
      return reply.send(getProjectDiskUtilization(project.ref))
    }
  )

  app.get<{ Params: { ref: string }; Reply: { status: string } | { message: string } }>(
    '/:ref/status',
    async (request, reply) => {
      const project = await getProject(request.params.ref)
      if (!project) {
        return reply.code(404).send({ message: 'Project not found' })
      }
      return reply.send({ status: project.status })
    }
  )

  app.post<{ Params: { ref: string } }>('/:ref/pause', async (request, reply) => {
    try {
      const project = await pauseProject(request.params.ref)
      if (!project) {
        return reply.code(404).send({ message: 'Project not found' })
      }
      return reply.send(project)
    } catch (error) {
      request.log.error({ err: error }, 'Failed to pause project')
      return reply.code(500).send({ message: 'Failed to pause project' })
    }
  })

  app.post<{ Params: { ref: string } }>('/:ref/resume', async (request, reply) => {
    try {
      const project = await resumeProject(request.params.ref)
      if (!project) {
        return reply.code(404).send({ message: 'Project not found' })
      }
      return reply.send(project)
    } catch (error) {
      request.log.error({ err: error }, 'Failed to resume project')
      return reply.code(500).send({ message: 'Failed to resume project' })
    }
  })

  app.get<{
    Params: { ref: string }
    Reply: PostgrestConfigResponse | { message: string }
  }>(
    '/:ref/config/postgrest',
    async (request, reply) => {
      const project = await getProject(request.params.ref)
      if (!project) {
        return reply.code(404).send({ message: 'Project not found' })
      }
      return reply.send(getProjectPostgrestConfig(project.ref))
    }
  )

  app.get<{
    Params: { ref: string }
    Reply: RealtimeConfigResponse | { message: string }
  }>(
    '/:ref/config/realtime',
    async (request, reply) => {
      const project = await getProject(request.params.ref)
      if (!project) {
        return reply.code(404).send({ message: 'Project not found' })
      }
      return reply.send(getProjectRealtimeConfig(project.ref))
    }
  )

  app.get<{
    Params: { ref: string }
    Reply: PgbouncerConfigResponse | { message: string }
  }>(
    '/:ref/config/pgbouncer',
    async (request, reply) => {
      const project = await getProject(request.params.ref)
      if (!project) {
        return reply.code(404).send({ message: 'Project not found' })
      }
      return reply.send(getProjectPgbouncerConfig(project.ref))
    }
  )

  app.get<{
    Params: { ref: string }
    Reply: PgbouncerStatusResponse | { message: string }
  }>(
    '/:ref/config/pgbouncer/status',
    async (request, reply) => {
      const project = await getProject(request.params.ref)
      if (!project) {
        return reply.code(404).send({ message: 'Project not found' })
      }
      return reply.send(getProjectPgbouncerStatus(project.ref))
    }
  )

  app.get<{
    Params: { ref: string }
    Reply: StorageConfigResponse | { message: string }
  }>(
    '/:ref/config/storage',
    async (request, reply) => {
      const project = await getProject(request.params.ref)
      if (!project) {
        return reply.code(404).send({ message: 'Project not found' })
      }
      return reply.send(getProjectStorageConfig(project.ref))
    }
  )

  app.get<{
    Params: { ref: string }
    Reply: SupavisorConfigResponse[] | { message: string }
  }>(
    '/:ref/config/supavisor',
    async (request, reply) => {
      const project = await getProject(request.params.ref)
      if (!project) {
        return reply.code(404).send({ message: 'Project not found' })
      }
      return reply.send(listProjectSupavisorPools(project.ref))
    }
  )

  app.get<{ Params: { ref: string }; Reply: LoadBalancerSummary[] | { message: string } }>(
    '/:ref/load-balancers',
    async (request, reply) => {
      const project = await getProject(request.params.ref)
      if (!project) {
        return reply.code(404).send({ message: 'Project not found' })
      }
      return reply.send(listProjectLoadBalancers(project.ref))
    }
  )

  app.get<{ Params: { ref: string }; Reply: ProjectLogDrainSummary[] | { message: string } }>(
    '/:ref/analytics/log-drains',
    async (request, reply) => {
      const project = await getProject(request.params.ref)
      if (!project) {
        return reply.code(404).send({ message: 'Project not found' })
      }
      return reply.send(listProjectLogDrains(project.ref))
    }
  )

  app.get<{ Params: { ref: string } }>(
    '/:ref/analytics/endpoints/logs.all',
    async (request, reply) => {
      const project = await getProject(request.params.ref)
      if (!project) {
        return reply.code(404).send({ message: 'Project not found' })
      }
      return reply.send(listProjectLogs(project.ref))
    }
  )

  app.post<{ Params: { ref: string }; Body: Record<string, unknown> }>(
    '/:ref/analytics/endpoints/logs.all',
    async (request, reply) => {
      const project = await getProject(request.params.ref)
      if (!project) {
        return reply.code(404).send({ message: 'Project not found' })
      }
      return reply.send(listProjectLogs(project.ref))
    }
  )

  app.get<{
    Params: { ref: string }
    Querystring: { interval?: string }
  }>(
    '/:ref/analytics/endpoints/usage.api-counts',
    async (request, reply) => {
      const project = await getProject(request.params.ref)
      if (!project) {
        return reply.code(404).send({ message: 'Project not found' })
      }
      return reply.send(listUsageApiCounts(project.ref))
    }
  )

  app.get<{ Params: { ref: string } }>(
    '/:ref/analytics/endpoints/usage.api-requests-count',
    async (request, reply) => {
      const project = await getProject(request.params.ref)
      if (!project) {
        return reply.code(404).send({ message: 'Project not found' })
      }
      return reply.send(listUsageApiRequests(project.ref))
    }
  )

  app.get<{
    Params: { ref: string }
    Querystring: { function_id?: string; interval?: string }
  }>(
    '/:ref/analytics/endpoints/functions.combined-stats',
    async (request, reply) => {
      const project = await getProject(request.params.ref)
      if (!project) {
        return reply.code(404).send({ message: 'Project not found' })
      }
      const { function_id, interval } = request.query
      if (!function_id || !interval) {
        return reply
          .code(400)
          .send({ message: 'function_id and interval are required parameters' })
      }
      return reply.send(listFunctionCombinedStats(project.ref, function_id, interval))
    }
  )

  app.get<{
    Params: { ref: string }
    Querystring: { function_id?: string; interval?: string }
  }>(
    '/:ref/analytics/endpoints/functions.req-stats',
    async (request, reply) => {
      const project = await getProject(request.params.ref)
      if (!project) {
        return reply.code(404).send({ message: 'Project not found' })
      }
      const { function_id, interval } = request.query
      if (!function_id || !interval) {
        return reply
          .code(400)
          .send({ message: 'function_id and interval are required parameters' })
      }
      return reply.send(listFunctionRequestStats(project.ref, function_id, interval))
    }
  )

  app.get<{
    Params: { ref: string }
    Querystring: { function_id?: string; interval?: string }
  }>(
    '/:ref/analytics/endpoints/functions.resource-usage',
    async (request, reply) => {
      const project = await getProject(request.params.ref)
      if (!project) {
        return reply.code(404).send({ message: 'Project not found' })
      }
      const { function_id, interval } = request.query
      if (!function_id || !interval) {
        return reply
          .code(400)
          .send({ message: 'function_id and interval are required parameters' })
      }
      return reply.send(listFunctionResourceUsage(project.ref, function_id, interval))
    }
  )

  app.get<{ Params: { ref: string } }>(
    '/:ref/api/rest',
    async (request, reply) => {
      return reply.send(getProjectRestDefinition(request.params.ref))
    }
  )

  app.post<{ Params: { ref: string }; Reply: { api_key: string } }>(
    '/:ref/api-keys/temporary',
    async (_request, reply) => {
      return reply.send(createTemporaryApiKey())
    }
  )

  app.get<{ Params: { ref: string }; Reply: ProjectLintSummary[] }>(
    '/:ref/run-lints',
    async (request, reply) => {
      return reply.send(listProjectLints(request.params.ref))
    }
  )

  app.get<{ Params: { ref: string }; Reply: ProjectSettingsSummary | { message: string } }>(
    '/:ref/settings',
    async (request, reply) => {
      const project = await getProject(request.params.ref)
      if (!project) {
        return reply.code(404).send({ message: 'Project not found' })
      }
      const settings = await getProjectSettings(request.params.ref)
      return reply.send(settings)
    }
  )

  app.get<{ Params: { ref: string }; Reply: ProjectAddonsResponseSummary | { message: string } }>(
    '/:ref/billing/addons',
    async (request, reply) => {
      const project = await getProject(request.params.ref)
      if (!project) {
        return reply.code(404).send({ message: 'Project not found' })
      }
      return reply.send(listProjectAddons(request.params.ref))
    }
  )

  app.get<{ Params: { ref: string }; Reply: DatabaseDetailSummary[] | { message: string } }>(
    '/:ref/databases',
    async (request, reply) => {
      const project = await getProject(request.params.ref)
      if (!project) {
        return reply.code(404).send({ message: 'Project not found' })
      }
      return reply.send(listProjectDatabases(request.params.ref))
    }
  )

  app.get<{ Params: { ref: string }; Reply: JwtSecretUpdateStatusSummary | { message: string } }>(
    '/:ref/config/secrets/update-status',
    async (request, reply) => {
      const project = await getProject(request.params.ref)
      if (!project) {
        return reply.code(404).send({ message: 'Project not found' })
      }
      return reply.send(getJwtSecretUpdateStatus(request.params.ref))
    }
  )
}

export default projectsRoutes
