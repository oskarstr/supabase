import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { platformSrcDir } from '../store/env.js'
import { getPool } from './client.js'

const MIGRATIONS_SCHEMA = 'public'
const MIGRATIONS_TABLE = 'platform_migrations'

const ensureTrackingTable = async () => {
  const pool = getPool()
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE} (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)
}

export const applyMigrations = async () => {
  const migrationsDir = resolve(platformSrcDir, '../migrations')
  if (!existsSync(migrationsDir)) {
    return
  }

  const pool = getPool()
  await ensureTrackingTable()

  const files = readdirSync(migrationsDir)
    .filter((file) => file.toLowerCase().endsWith('.sql'))
    .sort()

  for (const filename of files) {
    const alreadyApplied = await pool.query(
      `SELECT 1 FROM ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE} WHERE filename = $1`,
      [filename]
    )

    if ((alreadyApplied.rowCount ?? 0) > 0) {
      continue
    }

    const filePath = resolve(migrationsDir, filename)
    const sql = readFileSync(filePath, 'utf-8')

    await pool.query(sql)
    await pool.query(
      `INSERT INTO ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE} (filename) VALUES ($1)`,
      [filename]
    )
  }
}
