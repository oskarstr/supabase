import type {
  DatabaseDetailSummary,
  JwtSecretUpdateStatusSummary,
  PostgresTableSummary,
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

export const getProjectSettings = (ref: string): ProjectSettingsSummary => ({
  app_config: {
    db_schema: 'public',
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
  inserted_at: nowIso(),
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
})

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

export const listProjectTables = (_ref: string): PostgresTableSummary[] => [
  {
    id: 1,
    name: 'users',
    schema: 'public',
    bytes: 0,
    size: '0 bytes',
    columns: [
      { name: 'id', data_type: 'uuid', is_nullable: false },
      { name: 'email', data_type: 'text', is_nullable: false },
      { name: 'created_at', data_type: 'timestamp with time zone', is_nullable: true },
    ],
    relationships: [],
    replica_identity: 'DEFAULT',
    rls_enabled: false,
    rls_forced: false,
    comment: null,
  },
]

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
