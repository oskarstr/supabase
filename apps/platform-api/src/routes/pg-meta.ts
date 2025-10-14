import type { FastifyPluginAsync } from 'fastify'

import {
  listPgMetaColumnPrivileges,
  listPgMetaExtensions,
  listPgMetaForeignTables,
  listPgMetaMaterializedViews,
  listPgMetaPolicies,
  listPgMetaPublications,
  listPgMetaTriggers,
  listPgMetaTypes,
  listPgMetaViews,
  listProjectTables,
  runPgMetaQuery,
} from '../store/index.js'
import type { PostgresTableSummary } from '../store/index.js'

const pgMetaRoutes: FastifyPluginAsync = async (app) => {
  app.post<{
    Params: { ref: string }
    Querystring: { key?: string }
    Body: { query?: string; disable_statement_timeout?: boolean }
  }>('/pg-meta/:ref/query', async (request, reply) => {
    const response = runPgMetaQuery(request.query.key ?? '', request.body?.query)
    return reply.code(201).send(response)
  })

  app.get<{ Params: { ref: string }; Reply: PostgresTableSummary[] }>(
    '/pg-meta/:ref/tables',
    async (request, reply) => {
      return reply.send(listProjectTables(request.params.ref))
    }
  )

  app.get<{ Params: { ref: string } }>('/pg-meta/:ref/views', async (request, reply) => {
    return reply.send(listPgMetaViews(request.params.ref))
  })

  app.get<{ Params: { ref: string } }>('/pg-meta/:ref/policies', async (request, reply) => {
    return reply.send(listPgMetaPolicies(request.params.ref))
  })

  app.get<{ Params: { ref: string } }>('/pg-meta/:ref/column-privileges', async (request, reply) => {
    return reply.send(listPgMetaColumnPrivileges(request.params.ref))
  })

  app.get<{ Params: { ref: string } }>('/pg-meta/:ref/foreign-tables', async (request, reply) => {
    return reply.send(listPgMetaForeignTables(request.params.ref))
  })

  app.get<{ Params: { ref: string } }>('/pg-meta/:ref/materialized-views', async (request, reply) => {
    return reply.send(listPgMetaMaterializedViews(request.params.ref))
  })

  app.get<{ Params: { ref: string } }>('/pg-meta/:ref/publications', async (request, reply) => {
    return reply.send(listPgMetaPublications(request.params.ref))
  })

  app.get<{ Params: { ref: string } }>('/pg-meta/:ref/triggers', async (request, reply) => {
    return reply.send(listPgMetaTriggers(request.params.ref))
  })

  app.get<{ Params: { ref: string } }>('/pg-meta/:ref/extensions', async (request, reply) => {
    return reply.send(listPgMetaExtensions(request.params.ref))
  })

  app.get<{ Params: { ref: string } }>('/pg-meta/:ref/types', async (request, reply) => {
    return reply.send(listPgMetaTypes(request.params.ref))
  })
}

export default pgMetaRoutes
