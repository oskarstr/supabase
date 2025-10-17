import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ORIGINAL_ENV = { ...process.env }

const poolQueryMock = vi.fn(async (_sql: string) => ({ rows: [] }))

const resetEnv = () => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key]
    }
  }
  Object.assign(process.env, ORIGINAL_ENV)
}

const setupModule = async ({
  dbUrl = 'postgres://memory',
  supabaseUrl,
  grantsPath,
}: {
  dbUrl?: string
  supabaseUrl?: string | null
  grantsPath?: string
} = {}) => {
  vi.doMock('../src/db/client.js', () => ({
    getPool: () => ({ query: poolQueryMock }),
  }))

  process.env.PLATFORM_DB_URL = dbUrl

  if (supabaseUrl === undefined) {
    delete process.env.SUPABASE_DB_URL
  } else if (supabaseUrl === null) {
    delete process.env.SUPABASE_DB_URL
  } else {
    process.env.SUPABASE_DB_URL = supabaseUrl
  }

  if (grantsPath) {
    process.env.PLATFORM_GRANTS_SQL_PATH = grantsPath
  } else {
    delete process.env.PLATFORM_GRANTS_SQL_PATH
  }

  return import('../src/db/grants.js')
}

const parseStatements = (sql: string) =>
  sql
    .split('\n')
    .map((line) => line.trimStart())
    .filter((line) => line.length === 0 || !line.startsWith('--'))
    .join('\n')
    .trim();

const normalizeStatements = (sql: string) => {
  if (/^DO\s+\$\$/i.test(sql)) {
    return [sql.endsWith(';') ? sql : `${sql};`]
  }
  return sql
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0)
    .map((statement) => `${statement};`)
}

describe('applyPlatformSchemaGrants', () => {
  beforeEach(() => {
    vi.resetModules()
    poolQueryMock.mockClear()
  })

  afterEach(() => {
    resetEnv()
    vi.doUnmock('../src/db/client.js')
  })

  it('executes the platform grants SQL when connected to a real database', async () => {
    const { applyPlatformSchemaGrants, platformGrantsSqlPath } = await setupModule()

    await applyPlatformSchemaGrants()

    const grantsFile = platformGrantsSqlPath()
    expect(grantsFile).toBe(
      resolve(
        process.cwd(),
        '..',
        '..',
        'docker/volumes/db/migrations/20250421084702_platform_grants.sql'
      )
    )

    const expectedSql = parseStatements(readFileSync(grantsFile!, 'utf-8'))
    const expectedStatements = normalizeStatements(expectedSql)
    const executedStatements = poolQueryMock.mock.calls.map(([sql]) => String(sql).trim())

    expect(executedStatements).toEqual(expectedStatements)
  })

  it('skips execution when using the pg-mem database', async () => {
    const { applyPlatformSchemaGrants } = await setupModule({ dbUrl: 'pg-mem' })

    await applyPlatformSchemaGrants()

    expect(poolQueryMock).not.toHaveBeenCalled()
  })
})
