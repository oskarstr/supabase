import { PLATFORM_PROJECT_REF, PLATFORM_PROJECT_SCHEMA } from '../config/defaults.js'
import { getPlatformDb } from '../db/client.js'
import type {
  DatabaseDetailSummary,
  JwtSecretUpdateStatusSummary,
  ProjectAddonsResponseSummary,
  ProjectLintSummary,
  ProjectSettingsSummary,
} from './types.js'

const nowIso = () => new Date().toISOString()

export const listProjectLints = (_ref: string): ProjectLintSummary[] => [
  {
    cache_key: 'lint-no-backup-admin',
    categories: ['SECURITY'],
    description: 'Ensure backup admin exists for emergencies.',
    detail: 'No backup admin detected for the project.',
    facing: 'EXTERNAL',
    level: 'WARN',
    metadata: { entity: 'auth', type: 'auth' },
    name: 'no_backup_admin',
    remediation: 'Create a backup admin user to restore access if needed.',
    title: 'No backup admin configured',
  },
]

const db = getPlatformDb()

export const getProjectSettings = async (ref: string): Promise<ProjectSettingsSummary> => {
  const row = await db.selectFrom('projects').selectAll().where('ref', '=', ref).executeTakeFirst()
  const isPlatformProject = row?.ref === PLATFORM_PROJECT_REF

  const now = nowIso()
  if (!row) {
    return {
      app_config: {
        db_schema: ref === PLATFORM_PROJECT_REF ? PLATFORM_PROJECT_SCHEMA : 'public',
        endpoint: `https://${ref}.supabase.local`,
        storage_endpoint: `https://${ref}.supabase.local/storage/v1`,
      },
      cloud_provider: 'AWS',
      db_dns_name: `${ref}.db.supabase.local`,
      db_host: 'localhost',
      db_ip_addr_config: 'ipv4',
      db_name: `${ref}_db`,
      db_port: 5432,
      db_user: 'postgres',
      inserted_at: now,
      is_sensitive: false,
      name: `${ref} project`,
      ref,
      region: 'local',
      service_api_keys: [
        { api_key: 'service_key', name: 'Service Key', tags: 'service_role' },
        { api_key: 'anon_key', name: 'Anon Key', tags: 'anon' },
      ],
      ssl_enforced: true,
      status: 'ACTIVE_HEALTHY',
    }
  }

  const defaultBase = `https://${ref}.supabase.local`
  const baseUrl = (row.rest_url ?? `${defaultBase}/rest/v1/`).replace(/\/rest\/v1\/?$/, '')

  return {
    app_config: {
      db_schema: isPlatformProject ? PLATFORM_PROJECT_SCHEMA : 'public',
      endpoint: `${baseUrl}/rest/v1/`,
      storage_endpoint: `${baseUrl}/storage/v1`,
    },
    cloud_provider: row.cloud_provider,
    db_dns_name: `${ref}.db.supabase.local`,
    db_host: row.db_host,
    db_ip_addr_config: 'ipv4',
    db_name: `${ref}_db`,
    db_port: 5432,
    db_user: 'postgres',
    inserted_at: row.inserted_at.toISOString(),
    is_sensitive: false,
    name: row.name,
    ref: row.ref,
    region: row.region,
    service_api_keys: [
      { api_key: row.service_key, name: 'Service Key', tags: 'service_role' },
      { api_key: row.anon_key, name: 'Anon Key', tags: 'anon' },
    ],
    ssl_enforced: true,
    status: row.status,
  }
}

export const listProjectAddons = (ref: string): ProjectAddonsResponseSummary => ({
  available_addons: [
    {
      name: 'Point in Time Recovery',
      type: 'pitr',
      variants: [
        {
          identifier: 'pitr_7',
          meta: {},
          name: 'PITR 7 Days',
          price: 0,
          price_description: 'Included',
          price_interval: 'monthly',
          price_type: 'fixed',
        },
      ],
    },
  ],
  ref,
  selected_addons: [],
})

export const listProjectDatabases = (ref: string): DatabaseDetailSummary[] => [
  {
    cloud_provider: 'AWS',
    connection_string_read_only: null,
    connectionString: null,
    db_host: 'localhost',
    db_name: `${ref}_main`,
    db_port: 5432,
    db_user: 'postgres',
    identifier: `${ref}-primary`,
    inserted_at: nowIso(),
    region: 'local',
    restUrl: `https://localhost/${ref}/rest/v1`,
    size: '0 bytes',
    status: 'ACTIVE_HEALTHY',
  },
]

export const getJwtSecretUpdateStatus = (_ref: string): JwtSecretUpdateStatusSummary => ({
  update_status: {
    change_tracking_id: 'local-change',
    error: 0,
    progress: 4,
    status: 2,
  },
})
