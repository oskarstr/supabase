import type { FastifyPluginAsync } from 'fastify'

import {
  getFeatureFlags,
  recordFeatureFlag,
  recordTelemetryEvent,
  recordTelemetryGroupIdentify,
  recordTelemetryGroupReset,
  recordTelemetryIdentify,
  recordTelemetryPage,
  recordTelemetryPageLeave,
  resetTelemetry,
} from '../store/index.js'

const telemetryRoutes: FastifyPluginAsync = async (app) => {
  app.get('/feature-flags', async (_request, reply) => {
    return reply.send(getFeatureFlags())
  })

  app.post('/feature-flags/track', async (_request, reply) => {
    recordFeatureFlag()
    return reply.code(201).send()
  })

  app.post('/identify', async (_request, reply) => {
    recordTelemetryIdentify()
    return reply.code(201).send()
  })

  app.post('/event', async (_request, reply) => {
    recordTelemetryEvent()
    return reply.code(201).send()
  })

  app.post('/groups/identify', async (_request, reply) => {
    recordTelemetryGroupIdentify()
    return reply.code(201).send()
  })

  app.post('/groups/reset', async (_request, reply) => {
    recordTelemetryGroupReset()
    return reply.code(201).send()
  })

  app.post('/page', async (_request, reply) => {
    recordTelemetryPage()
    return reply.code(201).send()
  })

  app.post('/page-leave', async (_request, reply) => {
    recordTelemetryPageLeave()
    return reply.send()
  })

  app.post('/reset', async (_request, reply) => {
    resetTelemetry()
    return reply.code(201).send()
  })
}

export default telemetryRoutes
