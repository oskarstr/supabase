import { randomUUID } from 'node:crypto'

import { envString } from './env.js'
import { getProject } from './projects.js'
import type {
  PgbouncerConfigResponse,
  PgbouncerStatusResponse,
  PostgrestConfigResponse,
  RealtimeConfigResponse,
  StorageConfigResponse,
  SupavisorConfigResponse,
} from './types.js'

const DEFAULT_DB_USER = envString('SUPABASE_DB_USER', 'postgres') ?? 'postgres'
const DEFAULT_DB_NAME = envString('SUPABASE_DB_NAME', 'postgres') ?? 'postgres'
const DEFAULT_DB_PORT = Number.parseInt(envString('SUPABASE_DB_PORT', '5432') ?? '5432', 10)
const DEFAULT_DB_HOST = envString('SUPABASE_DB_HOST', 'localhost') ?? 'localhost'
const DEFAULT_PGBOUNCER_PORT = Number.parseInt(envString('SUPABASE_POOLER_PORT', '6543') ?? '6543', 10)
const JWT_SECRET_FALLBACK =
  envString('JWT_SECRET') ??
  envString('SERVICE_KEY') ??
  'super-secret-jwt-token-with-at-least-32-characters-long'

const nowIso = () => new Date().toISOString()

// TODO(platform-api): Replace these stubbed configuration responses once real provisioning data
// is available from the Supabase CLI integration.
export const getProjectPostgrestConfig = (_ref: string): PostgrestConfigResponse => ({
  db_anon_role: 'anon',
  db_extra_search_path: 'public',
  db_schema: 'public, storage',
  jwt_secret: JWT_SECRET_FALLBACK,
  max_rows: 1000,
  role_claim_key: '.role',
})

export const getProjectRealtimeConfig = (_ref: string): RealtimeConfigResponse => ({
  private_only: false,
  connection_pool: 2,
  max_concurrent_users: 200,
  max_events_per_second: 100,
  max_bytes_per_second: 100_000,
  max_channels_per_client: 100,
  max_joins_per_second: 100,
})

export const getProjectPgbouncerConfig = (ref: string): PgbouncerConfigResponse => ({
  connection_string: `postgresql://${DEFAULT_DB_USER}@${DEFAULT_DB_HOST}:${DEFAULT_PGBOUNCER_PORT}/${DEFAULT_DB_NAME}`,
  db_dns_name: `${ref}.pooler.supabase.local`,
  db_host: DEFAULT_DB_HOST,
  db_name: DEFAULT_DB_NAME,
  db_port: DEFAULT_PGBOUNCER_PORT,
  db_user: DEFAULT_DB_USER,
  default_pool_size: 20,
  ignore_startup_parameters: 'extra_float_digits',
  inserted_at: nowIso(),
  max_client_conn: 400,
  pgbouncer_enabled: true,
  pool_mode: 'transaction',
  query_wait_timeout: 60,
  reserve_pool_size: 5,
  server_idle_timeout: 1800,
  server_lifetime: 3600,
  ssl_enforced: true,
})

export const getProjectPgbouncerStatus = (_ref: string): PgbouncerStatusResponse => ({
  active: true,
})

export const getProjectStorageConfig = (_ref: string): StorageConfigResponse => ({
  capabilities: {
    iceberg_catalog: false,
    list_v2: true,
  },
  external: {
    upstreamTarget: 'main',
  },
  features: {
    icebergCatalog: {
      enabled: false,
    },
    imageTransformation: {
      enabled: true,
    },
    s3Protocol: {
      enabled: true,
    },
  },
  fileSizeLimit: 50 * 1024 * 1024, // 50 MiB
})

export const listProjectSupavisorPools = (ref: string): SupavisorConfigResponse[] => [
  {
    connection_string: `postgresql://${DEFAULT_DB_USER}@${DEFAULT_DB_HOST}:${DEFAULT_DB_PORT}/${DEFAULT_DB_NAME}`,
    connectionString: `postgresql://${DEFAULT_DB_USER}@${DEFAULT_DB_HOST}:${DEFAULT_DB_PORT}/${DEFAULT_DB_NAME}`,
    database_type: 'PRIMARY',
    db_host: DEFAULT_DB_HOST,
    db_name: DEFAULT_DB_NAME,
    db_port: DEFAULT_DB_PORT,
    db_user: DEFAULT_DB_USER,
    default_pool_size: 20,
    identifier: `${ref}-primary-${randomUUID().slice(0, 8)}`,
    is_using_scram_auth: false,
    max_client_conn: 400,
    pool_mode: 'transaction',
  },
  {
    connection_string: `postgresql://${DEFAULT_DB_USER}@${DEFAULT_DB_HOST}:${DEFAULT_DB_PORT}/${DEFAULT_DB_NAME}`,
    connectionString: `postgresql://${DEFAULT_DB_USER}@${DEFAULT_DB_HOST}:${DEFAULT_DB_PORT}/${DEFAULT_DB_NAME}`,
    database_type: 'READ_REPLICA',
    db_host: DEFAULT_DB_HOST,
    db_name: DEFAULT_DB_NAME,
    db_port: DEFAULT_DB_PORT,
    db_user: DEFAULT_DB_USER,
    default_pool_size: 20,
    identifier: `${ref}-replica`,
    is_using_scram_auth: false,
    max_client_conn: 400,
    pool_mode: 'session',
  },
]

export const getProjectConnectionString = async (ref: string) => {
  const project = await getProject(ref)
  if (!project) {
    return `postgresql://${DEFAULT_DB_USER}@${DEFAULT_DB_HOST}:${DEFAULT_DB_PORT}/${DEFAULT_DB_NAME}`
  }
  return (
    project.connectionString ??
    `postgresql://${DEFAULT_DB_USER}@${DEFAULT_DB_HOST}:${DEFAULT_DB_PORT}/${DEFAULT_DB_NAME}`
  )
}
