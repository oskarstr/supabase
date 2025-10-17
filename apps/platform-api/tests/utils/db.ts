import { newDb, DataType } from 'pg-mem'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const MIGRATIONS_DIR = resolve(process.cwd(), 'migrations')

export const sanitizeMigrationSql = (sql: string) =>
  sql
    .replace(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\s*/g, '')
    .replace(/CREATE EXTENSION IF NOT EXISTS "pgcrypto";\s*/g, '')
    .replace(/ADD VALUE IF NOT EXISTS/g, 'ADD VALUE')
    .replace(/COMMENT ON SCHEMA platform IS 'Supabase platform control-plane schema.';\s*/g, '')

/**
 * Initializes an in-memory Postgres instance seeded with every SQL migration and registers
 * the resulting pool on the global test namespace so the application client can reuse it.
 */
export const initTestDatabase = async () => {
  const memDb = newDb()
  memDb.public.registerFunction({
    name: 'gen_random_uuid',
    returns: DataType.uuid,
    implementation: () => randomUUID(),
  })

  const migrationFiles = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort()

  for (const file of migrationFiles) {
    const sql = await readFile(resolve(MIGRATIONS_DIR, file), 'utf-8')
    memDb.public.none(sanitizeMigrationSql(sql))
  }

  const { Pool: MemPool } = memDb.adapters.createPg()
  ;(globalThis as any).__PLATFORM_TEST_POOL__ = new MemPool()

  return memDb
}
