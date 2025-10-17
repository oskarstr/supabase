import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const migrationPath = resolve(
  process.cwd(),
  '..',
  '..',
  'docker/volumes/db/migrations/20250421084702_platform_grants.sql'
)

describe('platform grants migration', () => {
  const sql = readFileSync(migrationPath, 'utf-8')

  it('only references postgres and supabase_admin roles', () => {
    expect(sql).toMatch(/FOREACH grantee IN ARRAY ARRAY\['postgres', 'supabase_admin']/)
    expect(sql).toMatch(/GRANT USAGE ON SCHEMA platform TO %I/)
    expect(sql).not.toMatch(/service_role/i)
    expect(sql).not.toMatch(/authenticated/i)
  })

  it('remains idempotent with explicit schema check', () => {
    expect(sql).toMatch(/IF NOT EXISTS \(SELECT 1 FROM pg_namespace WHERE nspname = 'platform'\)/)
    expect(sql).toMatch(/RAISE NOTICE 'platform schema missing; skipping grant restoration'/)
  })
})
