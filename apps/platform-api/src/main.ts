import Fastify from 'fastify'

import platformRoutes from './routes/platform.js'
import cors from '@fastify/cors'

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
  },
})

server.get('/health', async () => ({ status: 'ok' }))

const port = Number.parseInt(process.env.PORT ?? '4000', 10)
const host = process.env.HOST ?? '0.0.0.0'

async function start() {
  try {
    await server.register(cors, {
      origin: true,
      credentials: true,
    })
    await server.register(platformRoutes)
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
