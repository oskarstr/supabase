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
      return reply.send(listStorageBuckets(request.params.ref))
    }
  )

  app.get<{ Params: { ref: string }; Reply: StorageCredentialsResponse }>(
    '/:ref/credentials',
    async (request, reply) => {
      return reply.send(getStorageCredentials(request.params.ref))
    }
  )

  app.post<{
    Params: { ref: string; id: string }
    Body: { path?: string; options?: Record<string, unknown> }
  }>('/:ref/buckets/:id/objects/list', async (request, reply) => {
    const objects = listStorageObjects(request.params.ref, request.params.id, request.body?.path)
    return reply.send(objects)
  })

  app.post<{
    Params: { ref: string; id: string }
    Body: { path: string }
    Reply: StoragePublicUrlResponse
  }>('/:ref/buckets/:id/objects/public-url', async (request, reply) => {
    return reply.send(
      createStoragePublicUrl(request.params.ref, request.params.id, request.body?.path ?? '')
    )
  })
}

export default storageRoutes
