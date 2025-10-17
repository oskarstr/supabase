import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { repoRoot } from '../store/env.js'
import { getPool } from './client.js'

const DEFAULT_GRANTS_RELATIVE_PATH =
  'docker/volumes/db/migrations/20250421084702_platform_grants.sql'

const EMBEDDED_GRANTS_SQL = `-- Platform-specific grants executed immediately after the upstream revoke migration.
-- Ensures postgres and supabase_admin retain access to the control-plane schema.
-- Safe to re-run (GRANT statements are idempotent). Skips gracefully if the schema is not present yet.

DO $$
DECLARE
  grantee text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'platform') THEN
    RAISE NOTICE 'platform schema missing; skipping grant restoration';
    RETURN;
  END IF;

  EXECUTE 'GRANT USAGE ON SCHEMA platform TO postgres';
  EXECUTE 'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA platform TO postgres';
  EXECUTE 'GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA platform TO postgres';
  EXECUTE '' ||
    'ALTER DEFAULT PRIVILEGES IN SCHEMA platform GRANT ALL ON TABLES TO postgres';
  EXECUTE '' ||
    'ALTER DEFAULT PRIVILEGES IN SCHEMA platform GRANT ALL ON SEQUENCES TO postgres';

  FOREACH grantee IN ARRAY ARRAY['supabase_admin', 'service_role'] LOOP
    EXECUTE format('GRANT USAGE ON SCHEMA platform TO %I', grantee);
    EXECUTE format('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA platform TO %I', grantee);
    EXECUTE format('GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA platform TO %I', grantee);
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA platform GRANT ALL ON TABLES TO %I',
      grantee
    );
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA platform GRANT ALL ON SEQUENCES TO %I',
      grantee
    );
  END LOOP;
END
$$;`

let cachedSql: string | null = null
let cachedPath: string | null = null

const normalizeWhitespace = (value: string) =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(' ')

const loadGrantsSql = () => {
  if (cachedSql) {
    return cachedSql
  }

  const override = process.env.PLATFORM_GRANTS_SQL_PATH?.trim()
  const candidatePaths = [
    ...(override ? [resolve(repoRoot, override)] : []),
    resolve(repoRoot, DEFAULT_GRANTS_RELATIVE_PATH),
  ]

  for (const candidate of candidatePaths) {
    try {
      const contents = readFileSync(candidate, 'utf-8')
      cachedSql = contents
      cachedPath = candidate

      const normalizedFile = normalizeWhitespace(contents)
      const normalizedEmbedded = normalizeWhitespace(EMBEDDED_GRANTS_SQL)
      if (normalizedFile !== normalizedEmbedded) {
        console.warn(
          `[platform-db] platform grants SQL at ${candidate} differs from embedded fallback; please keep them in sync.`
        )
      }

      return cachedSql
    } catch {
      /* try next candidate */
    }
  }

  cachedSql = EMBEDDED_GRANTS_SQL
  cachedPath = null
  console.warn(
    '[platform-db] unable to locate platform grants SQL on disk; using embedded fallback statements'
  )
  return cachedSql
}

const shouldSkipGrants = () => {
  const targets = [process.env.PLATFORM_DB_URL, process.env.SUPABASE_DB_URL]
  return targets.some((value) => value && value.trim().toLowerCase() === 'pg-mem')
}

const extractStatements = (sql: string) => {
  const withoutComments = sql
    .split('\n')
    .map((line) => line.trimStart())
    .filter((line) => line.length === 0 || !line.startsWith('--'))
    .join('\n')

  const trimmed = withoutComments.trim()
  if (/^DO\s+\$\$/i.test(trimmed)) {
    return [trimmed.endsWith(';') ? trimmed : `${trimmed};`]
  }

  return withoutComments
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0)
}

export const applyPlatformSchemaGrants = async () => {
  if (shouldSkipGrants()) {
    return
  }

  const sql = loadGrantsSql()
  const pool = getPool()
  const statements = extractStatements(sql)

  for (const statement of statements) {
    await pool.query(statement.endsWith(';') ? statement : `${statement};`)
  }
}

export const platformGrantsSqlPath = () => cachedPath
