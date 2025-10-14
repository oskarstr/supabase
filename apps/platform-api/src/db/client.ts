import { Pool } from 'pg'
import { Kysely, PostgresDialect, Transaction } from 'kysely'

import type { PlatformDatabase } from './schema.js'

declare global {
  // eslint-disable-next-line no-var
  var __PLATFORM_TEST_POOL__: Pool | undefined
}

let db: Kysely<PlatformDatabase> | null = null
let poolInstance: Pool | null = null

const SCHEMA = process.env.PLATFORM_DB_SCHEMA?.trim() || 'platform'

const createPool = () => {
  if (globalThis.__PLATFORM_TEST_POOL__) {
    return globalThis.__PLATFORM_TEST_POOL__
  }

  if (poolInstance) {
    return poolInstance
  }

  const connectionString =
    process.env.PLATFORM_DB_URL?.trim() || process.env.SUPABASE_DB_URL?.trim()

  if (!connectionString) {
    throw new Error('Platform database URL is not configured. Set PLATFORM_DB_URL or SUPABASE_DB_URL.')
  }

  const pool = new Pool({
    connectionString,
    max: Number.parseInt(process.env.PLATFORM_DB_POOL_SIZE ?? '10', 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
    application_name: 'platform-api',
  })

  pool.on('error', (err: Error) => {
    console.error('[platform-db] pool error', err)
  })

  poolInstance = pool
  return poolInstance
}

const createKysely = () => {
  const pool = createPool()
  const dialect = new PostgresDialect({ pool })

  return new Kysely<PlatformDatabase>({
    dialect,
  })
}

export const getDb = () => {
  if (!db) {
    db = createKysely()
  }
  return db
}

export const getPlatformDb = () => getDb().withSchema(SCHEMA)
export const getPool = () => createPool()

export type PlatformTransaction = Transaction<PlatformDatabase>

export const destroyDb = async () => {
  if (db) {
    await db.destroy()
    db = null
  }
  if (poolInstance && !globalThis.__PLATFORM_TEST_POOL__) {
    await poolInstance.end()
  }
  poolInstance = null
}
