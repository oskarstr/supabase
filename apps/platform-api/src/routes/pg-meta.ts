import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'

import crypto from 'crypto-js'

import { getProjectCredentials } from '../store/project-connections.js'
import { executeProjectSql } from '../store/project-sql.js'

const rawPgMetaBaseUrl =
  process.env.PLATFORM_PG_META_URL?.trim() ||
  process.env.STUDIO_PG_META_URL?.trim() ||
  process.env.SUPABASE_INTERNAL_PG_META_URL?.trim() ||
  'http://kong:8000/pg'

const PG_META_BASE_URL = rawPgMetaBaseUrl.replace(/\/+$/, '')
const PG_META_CRYPTO_KEY = process.env.PG_META_CRYPTO_KEY?.trim() || 'SAMPLE_KEY'

const buildPgMetaUrl = (path: string) => `${PG_META_BASE_URL}/${path.replace(/^\//, '')}`

const parseBooleanParam = (value?: string) => (value === undefined ? undefined : value === 'true')

const parseNumberParam = (value?: string) => {
  if (value === undefined) return undefined
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

const parseCsvParam = (value?: string) =>
  value === undefined
    ? undefined
    : value
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)

const toSearchParams = (entries: Record<string, string | string[] | undefined>) => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(entries)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      for (const entry of value) {
        params.append(key, entry)
      }
    } else {
      params.set(key, value)
    }
  }
  return params
}

const toJson = async (response: Response) => {
  const text = await response.text()
  if (!text) return undefined
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return JSON.parse(text)
  }
  return text
}

const encryptConnectionString = (value: string) =>
  crypto.AES.encrypt(value, PG_META_CRYPTO_KEY).toString()

const createHttpError = (status: number, message: string) => {
  const error = new Error(message) as Error & { statusCode: number }
  error.statusCode = status
  return error
}

const pgMetaRoutes: FastifyPluginAsync = async (app) => {
  const forwardPgMeta = async (
    ref: string,
    path: string,
    options: {
      method?: 'GET' | 'POST'
      query?: Record<string, string | string[] | undefined>
      body?: unknown
      connectionString?: string
      applicationName?: string
    } = {}
  ) => {
    const credentials = await getProjectCredentials(ref)
    const connectionString = options.connectionString ?? credentials.connectionString
    if (!connectionString) {
      throw createHttpError(400, 'Connection string is not configured for this project')
    }

    const serviceKey = credentials.serviceKey
    if (!serviceKey) {
      throw createHttpError(400, 'Service role key is not configured for this project')
    }

    const url = new URL(buildPgMetaUrl(path))
    if (options.query) {
      const params = toSearchParams(options.query)
      params.forEach((value, key) => {
        url.searchParams.append(key, value)
      })
    }

    const headers: Record<string, string> = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'x-connection-encrypted': encryptConnectionString(connectionString),
    }

    if (options.applicationName) {
      headers['x-pg-application-name'] = options.applicationName
    }

    let response: Response
    try {
      response = await fetch(url, {
        method: options.method ?? 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      })
    } catch (error) {
      if (
        options.method === 'POST' &&
        typeof (options.body as { query?: string })?.query === 'string'
      ) {
        const rows = await executeProjectSql(ref, (options.body as { query: string }).query, {
          connectionString,
          applicationName: options.applicationName,
          disableStatementTimeout:
            (options.body as { disable_statement_timeout?: boolean }).disable_statement_timeout ===
            true,
        })

        return { status: 201, payload: rows }
      }

      throw error
    }

    const payload = await toJson(response)
    return { status: response.status, payload }
  }

  app.post<{
    Params: { ref: string }
    Querystring: { key?: string }
    Body: { query?: string; disable_statement_timeout?: boolean }
  }>('/pg-meta/:ref/query', async (request, reply) => {
    const { ref } = request.params
    const connectionHeader = request.headers['x-connection-encrypted']
    const applicationNameHeader = request.headers['x-pg-application-name']

    const connectionString =
      typeof connectionHeader === 'string' && connectionHeader.trim().length > 0
        ? connectionHeader.trim()
        : undefined

    const applicationName =
      typeof applicationNameHeader === 'string' && applicationNameHeader.trim().length > 0
        ? applicationNameHeader.trim()
        : undefined

    const sql = request.body?.query ?? ''
    if (!sql) {
      return reply.code(201).send([])
    }

    const { status, payload } = await forwardPgMeta(ref, 'query', {
      method: 'POST',
      connectionString,
      applicationName,
      query: request.query.key ? { key: request.query.key } : undefined,
      body: {
        query: sql,
        disable_statement_timeout: request.body?.disable_statement_timeout === true,
      },
    })

    return reply.code(status).send(payload ?? [])
  })

  app.get<{
    Params: { ref: string }
    Querystring: {
      include_columns?: string
      included_schemas?: string
      excluded_schemas?: string
      include_system_schemas?: string
      limit?: string
      offset?: string
    }
  }>('/pg-meta/:ref/tables', async (request, reply) => {
    const connectionHeader = request.headers['x-connection-encrypted']
    const applicationNameHeader = request.headers['x-pg-application-name']

    const { status, payload } = await forwardPgMeta(request.params.ref, 'tables', {
      connectionString:
        typeof connectionHeader === 'string' && connectionHeader.trim().length > 0
          ? connectionHeader.trim()
          : undefined,
      applicationName:
        typeof applicationNameHeader === 'string' && applicationNameHeader.trim().length > 0
          ? applicationNameHeader.trim()
          : undefined,
      query: {
        include_columns:
          parseBooleanParam(request.query.include_columns) !== undefined
            ? String(parseBooleanParam(request.query.include_columns))
            : undefined,
        include_system_schemas:
          parseBooleanParam(request.query.include_system_schemas) !== undefined
            ? String(parseBooleanParam(request.query.include_system_schemas))
            : undefined,
        included_schemas: parseCsvParam(request.query.included_schemas),
        excluded_schemas: parseCsvParam(request.query.excluded_schemas),
        limit:
          parseNumberParam(request.query.limit) !== undefined
            ? String(parseNumberParam(request.query.limit))
            : undefined,
        offset:
          parseNumberParam(request.query.offset) !== undefined
            ? String(parseNumberParam(request.query.offset))
            : undefined,
      },
    })

    return reply.code(status).send(payload ?? [])
  })

  const simpleProxy = (path: string) => async (request: FastifyRequest, reply: FastifyReply) => {
    const connectionHeader = request.headers['x-connection-encrypted']
    const applicationNameHeader = request.headers['x-pg-application-name']
    const params = request.params as { ref: string }
    const query = request.query as Record<string, string | undefined>

    const { status, payload } = await forwardPgMeta(params.ref, path, {
      connectionString:
        typeof connectionHeader === 'string' && connectionHeader.trim().length > 0
          ? connectionHeader.trim()
          : undefined,
      applicationName:
        typeof applicationNameHeader === 'string' && applicationNameHeader.trim().length > 0
          ? applicationNameHeader.trim()
          : undefined,
      query: {
        include_columns:
          parseBooleanParam(query.include_columns) !== undefined
            ? String(parseBooleanParam(query.include_columns))
            : undefined,
        include_system_schemas:
          parseBooleanParam(query.include_system_schemas) !== undefined
            ? String(parseBooleanParam(query.include_system_schemas))
            : undefined,
        included_schemas: parseCsvParam(query.included_schemas),
        excluded_schemas: parseCsvParam(query.excluded_schemas),
        column_ids: parseCsvParam(query.column_ids),
        limit:
          parseNumberParam(query.limit) !== undefined
            ? String(parseNumberParam(query.limit))
            : undefined,
        offset:
          parseNumberParam(query.offset) !== undefined
            ? String(parseNumberParam(query.offset))
            : undefined,
      },
    })

    return reply.code(status).send(payload ?? [])
  }

  app.get('/pg-meta/:ref/views', simpleProxy('views'))
  app.get('/pg-meta/:ref/policies', simpleProxy('policies'))
  app.get('/pg-meta/:ref/column-privileges', simpleProxy('column-privileges'))
  app.get('/pg-meta/:ref/foreign-tables', simpleProxy('foreign-tables'))
  app.get('/pg-meta/:ref/materialized-views', simpleProxy('materialized-views'))
  app.get('/pg-meta/:ref/publications', simpleProxy('publications'))
  app.get('/pg-meta/:ref/triggers', simpleProxy('triggers'))
  app.get('/pg-meta/:ref/extensions', simpleProxy('extensions'))
  app.get('/pg-meta/:ref/types', simpleProxy('types'))
}

export default pgMetaRoutes
