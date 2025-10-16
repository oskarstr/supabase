import type { FastifyPluginAsync } from 'fastify'

import {
  createStoragePublicUrl,
  getStorageCredentials,
  listStorageBuckets,
  listStorageObjects,
} from '../store/index.js'
import type {
  StorageBucketSummary,
  StorageCredentialsResponse,
  StoragePublicUrlResponse,
} from '../store/index.js'

const storageRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { ref: string }; Reply: StorageBucketSummary[] }>(
    '/:ref/buckets',
    async (request, reply) => {
      const buckets = await listStorageBuckets(request.params.ref)
      return reply.send(buckets)
    }
  )

  app.get<{ Params: { ref: string }; Reply: StorageCredentialsResponse }>(
    '/:ref/credentials',
    async (request, reply) => {
      const credentials = await getStorageCredentials(request.params.ref)
      return reply.send(credentials)
    }
  )

  app.post<{
    Params: { ref: string; id: string }
    Body: { path?: string; options?: Record<string, unknown> }
  }>('/:ref/buckets/:id/objects/list', async (request, reply) => {
    const objects = await listStorageObjects(
      request.params.ref,
      request.params.id,
      request.body?.path,
      request.body?.options as Record<string, unknown> | undefined
    )
    return reply.send(objects)
  })

  app.post<{
    Params: { ref: string; id: string }
    Body: { path: string }
    Reply: StoragePublicUrlResponse
  }>('/:ref/buckets/:id/objects/public-url', async (request, reply) => {
    const payload = await createStoragePublicUrl(
      request.params.ref,
      request.params.id,
      request.body?.path ?? ''
    )
    return reply.send(payload)
  })
}

export default storageRoutes
