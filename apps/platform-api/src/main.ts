import Fastify from 'fastify'

import cors from '@fastify/cors'
import platformRoutes from './routes/platform.js'
import apiV1Routes from './routes/api-v1.js'

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
  },
})

server.get('/health', async () => ({ status: 'ok' }))

const port = Number.parseInt(process.env.PORT ?? '4000', 10)
const host = process.env.HOST ?? '0.0.0.0'

server.addHook('onRequest', async (request) => {
  request.log.info({ method: request.method, url: request.url }, 'incoming request')
})

async function start() {
  try {
    await server.register(cors, {
      origin: true,
      credentials: true,
    })
    await server.register(apiV1Routes, { prefix: '/api/v1' })
    await server.register(platformRoutes, { prefix: '/api/platform' })
    await server.listen({ port, host })
    server.log.info(`Platform API listening on http://${host}:${port}`)
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

void start()

export type { FastifyInstance } from 'fastify'
export default server
