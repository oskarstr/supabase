import { Pool } from 'pg'

import { getProjectCredentials } from './project-connections.js'

const poolCache = new Map<string, Pool>()

const createPool = (connectionString: string) => {
  if (connectionString === 'pg-mem' && globalThis.__PLATFORM_TEST_POOL__) {
    return globalThis.__PLATFORM_TEST_POOL__
  }

  const pool = new Pool({
    connectionString,
    max: Number.parseInt(process.env.PLATFORM_PROJECT_DB_POOL_SIZE ?? '10', 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
  })

  pool.on('error', (error) => {
    console.error('[platform-project-db] pool error', error)
  })

  return pool
}

const getPool = (connectionString: string) => {
  let pool = poolCache.get(connectionString)
  if (!pool) {
    pool = createPool(connectionString)
    poolCache.set(connectionString, pool)
  }
  return pool
}

export interface ExecuteProjectSqlOptions {
  connectionString?: string
  applicationName?: string
  disableStatementTimeout?: boolean
}

export const executeProjectSql = async (
  ref: string,
  sql: string,
  options: ExecuteProjectSqlOptions = {}
): Promise<Record<string, unknown>[]> => {
  if (!sql || sql.trim().length === 0) {
    return []
  }

  const credentials = await getProjectCredentials(ref)
  const connectionString = options.connectionString ?? credentials.connectionString

  if (!connectionString) {
    throw new Error(`Connection string is not configured for project ${ref}`)
  }

  const pool = getPool(connectionString)
  const client = await pool.connect()

  try {
    if (options.applicationName) {
      await client.query('select set_config($1, $2, false)', [
        'application_name',
        options.applicationName,
      ])
    }

    if (options.disableStatementTimeout) {
      await client.query('set statement_timeout = 0')
    }

    const result = await client.query(sql)

    if (options.disableStatementTimeout) {
      await client.query('set statement_timeout = default')
    }

    return result.rows as Record<string, unknown>[]
  } finally {
    client.release()
  }
}
