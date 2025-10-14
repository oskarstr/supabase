import type { FastifyPluginAsync } from 'fastify'

import { listOverdueInvoices } from '../store/index.js'
import type { OverdueInvoiceCount } from '../store/index.js'

const stripeRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Reply: OverdueInvoiceCount[] }>('/invoices/overdue', async (_request, reply) => {
    const invoices = await listOverdueInvoices()
    return reply.send(invoices)
  })
}

export default stripeRoutes
