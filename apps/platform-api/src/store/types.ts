export type CloudProvider = 'AWS' | 'FLY' | 'AWS_K8S' | 'AWS_NIMBUS'

export const CLOUD_PROVIDERS: CloudProvider[] = ['AWS', 'FLY', 'AWS_K8S', 'AWS_NIMBUS']

export type ComputeSize =
  | 'pico'
  | 'nano'
  | 'micro'
  | 'small'
  | 'medium'
  | 'large'
  | 'xlarge'
  | '2xlarge'
  | '4xlarge'
  | '8xlarge'
  | '12xlarge'
  | '16xlarge'
  | '24xlarge'
  | '24xlarge_optimized_memory'
  | '24xlarge_optimized_cpu'
  | '24xlarge_high_memory'
  | '48xlarge'
  | '48xlarge_optimized_memory'
  | '48xlarge_optimized_cpu'
  | '48xlarge_high_memory'

export type ProjectStatus =
  | 'INACTIVE'
  | 'ACTIVE_HEALTHY'
  | 'ACTIVE_UNHEALTHY'
  | 'COMING_UP'
  | 'UNKNOWN'
  | 'GOING_DOWN'
  | 'INIT_FAILED'
  | 'REMOVED'
  | 'RESTORING'
  | 'UPGRADING'
  | 'PAUSING'
  | 'RESTORE_FAILED'
  | 'RESTARTING'
  | 'PAUSE_FAILED'
  | 'RESIZING'

export type RegionSelection =
  | { code: string; type: 'specific' }
  | { code: 'americas' | 'emea' | 'apac'; type: 'smartGroup' }

export type RegionSmartGroup = {
  code: 'americas' | 'emea' | 'apac'
  name: string
  type: 'smartGroup'
}

export type RegionSpecific = {
  code: string
  name: string
  provider: CloudProvider
  status?: 'capacity' | 'other'
  type: 'specific'
}

export interface RegionsInfo {
  all: {
    smartGroup: RegionSmartGroup[]
    specific: RegionSpecific[]
  }
  recommendations: {
    smartGroup: RegionSmartGroup
    specific: RegionSpecific[]
  }
}

export type PostgresEngine = '15' | '17' | '17-oriole'
export type ReleaseChannel = 'ga' | 'beta' | 'preview'

export interface AvailableVersionsResponse {
  available_versions: {
    postgres_engine: PostgresEngine
    release_channel: ReleaseChannel
    version: string
  }[]
}

export interface Profile {
  auth0_id: string
  disabled_features: string[]
  first_name: string
  free_project_limit: number
  gotrue_id: string
  id: number
  is_alpha_user: boolean
  is_sso_user: boolean
  last_name: string
  mobile: string
  primary_email: string
  username: string
}

export interface Organization {
  billing_email: string | null
  billing_partner: string | null
  id: number
  is_owner: boolean
  name: string
  opt_in_tags: string[]
  organization_requires_mfa: boolean
  plan: {
    id: 'free' | 'pro' | 'team' | 'enterprise'
    name: string
  }
  restriction_data: Record<string, string> | null
  restriction_status: string | null
  slug: string
  stripe_customer_id: string | null
  subscription_id: string | null
  usage_billing_enabled: boolean
}

export interface ProjectDetail {
  cloud_provider: CloudProvider
  connectionString: string | null
  db_host: string
  dbVersion?: string
  id: number
  infra_compute_size?: ComputeSize
  inserted_at: string
  is_branch_enabled: boolean
  is_physical_backups_enabled: boolean
  name: string
  organization_id: number
  ref: string
  region: string
  restUrl: string
  status: ProjectStatus
  subscription_id: string
}

export interface OrganizationProjectsResponse {
  pagination: {
    count: number
    limit: number
    offset: number
  }
  projects: {
    cloud_provider: CloudProvider
    databases: {
      cloud_provider: CloudProvider
      identifier: string
      region: string
      status: 'ACTIVE_HEALTHY'
      type: 'PRIMARY'
    }[]
    inserted_at: string
    is_branch: boolean
    name: string
    ref: string
    region: string
    status: ProjectStatus
  }[]
}

export interface CreateProjectBody {
  auth_site_url?: string
  cloud_provider: CloudProvider
  db_pass: string
  db_region?: string
  desired_instance_size?: ComputeSize
  name: string
  organization_slug: string
  postgres_engine?: string
  region_selection?: RegionSelection
}

export interface CreateOrganizationBody {
  name: string
  tier: 'tier_payg' | 'tier_pro' | 'tier_free' | 'tier_team' | 'tier_enterprise'
  kind?: string
  size?: string
  payment_method?: string
  billing_name?: string | null
  address?: Record<string, unknown> | null
  tax_id?: Record<string, unknown> | null
}

export interface CreateProjectResponse {
  anon_key: string
  cloud_provider: CloudProvider
  endpoint: string
  id: number
  infra_compute_size?: ComputeSize
  inserted_at: string | null
  is_branch_enabled: boolean
  is_physical_backups_enabled: boolean
  name: string
  organization_id: number
  organization_slug: string
  preview_branch_refs: string[]
  ref: string
  region: string
  service_key: string
  status: ProjectStatus
  subscription_id: string | null
}

export interface RemoveProjectResponse {
  id: number
  name: string
  ref: string
}

export interface GetSubscriptionResponse {
  addons: {
    name: string
    price: number
    supabase_prod_id: string
  }[]
  billing_cycle_anchor: number
  billing_partner?: 'fly' | 'aws_marketplace' | 'vercel_marketplace'
  billing_via_partner: boolean
  cached_egress_enabled: boolean
  current_period_end: number
  current_period_start: number
  customer_balance: number
  next_invoice_at: number
  payment_method_type: string
  plan: {
    id: 'free' | 'pro' | 'team' | 'enterprise'
    name: string
  }
  project_addons: unknown[]
  scheduled_plan_change: null
  usage_billing_enabled: boolean
}

export type OAuthAppType = 'authorized' | 'published'

export interface OAuthAppSummary {
  id: string
  name: string
  website: string
  registration_type: 'manual' | 'dynamic'
  scopes: string[]
  authorized_at?: string
  client_id?: string
  created_at?: string
  created_by?: string
  redirect_uris?: string[]
  icon?: string
}

export interface OrganizationDetailResponse {
  billing_email: string | null
  billing_partner: Organization['billing_partner']
  has_oriole_project: boolean
  id: number
  name: string
  opt_in_tags: string[]
  plan: Organization['plan']
  projects: {
    cloud_provider: CloudProvider
    disk_volume_size_gb?: number
    engine?: string
    id: number
    infra_compute_size?: ComputeSize
    inserted_at: string | null
    is_branch_enabled: boolean
    is_physical_backups_enabled: boolean | null
    name: string
    organization_id: number
    organization_slug: string
    preview_branch_refs: string[]
    ref: string
    region: string
    status: ProjectStatus
    subscription_id: string | null
  }[]
  restriction_data: Organization['restriction_data']
  restriction_status: Organization['restriction_status']
  slug: string
  stripe_customer_id: string | null
  subscription_id: string | null
  usage_billing_enabled: boolean
}

export interface AccessControlPermission {
  actions: string[] | null
  condition: string | number | boolean | unknown[] | Record<string, unknown> | null
  organization_id: number | null
  organization_slug: string
  project_ids: number[] | null
  project_refs: string[] | null
  resources: string[] | null
  restrictive: boolean | null
}

export interface ProjectResourceWarningsResponse {
  auth_email_offender: 'critical' | 'warning' | null
  auth_rate_limit_exhaustion: 'critical' | 'warning' | null
  auth_restricted_email_sending: 'critical' | 'warning' | null
  cpu_exhaustion: 'critical' | 'warning' | null
  disk_io_exhaustion: 'critical' | 'warning' | null
  disk_space_exhaustion: 'critical' | 'warning' | null
  is_readonly_mode_enabled: boolean
  memory_and_swap_exhaustion: 'critical' | 'warning' | null
  need_pitr: 'critical' | 'warning' | null
  project: string
}

export interface NotificationsSummary {
  has_critical: boolean
  has_warning: boolean
  unread_count: number
}

export interface OrgUsageMetric {
  available_in_plan: boolean
  capped: boolean
  cost: number
  metric: string
  usage: number
  usage_original: number
}

export interface OrgUsageResponse {
  usage_billing_enabled: boolean
  usages: OrgUsageMetric[]
}

export interface MemberWithFreeProjectLimit {
  free_project_limit: number
  primary_email: string
  username: string
}

export interface OverdueInvoiceCount {
  organization_id: number
  overdue_invoice_count: number
}

export interface AccessToken {
  created_at: string
  expires_at: string | null
  id: number
  last_used_at: string | null
  name: string
  scope?: 'V0'
  token_alias: string
}

export interface AccessTokenWithSecret extends AccessToken {
  access_token: string
  token_digest: string
}

export interface AuditLogEntry {
  created_at: string
  event_message: string
  ip_address?: string | null
  payload?: Record<string, unknown>
}

export interface GetUserOrganizationIntegrationResponse {
  added_by: {
    primary_email: string
    username: string
  }
  id: string
  inserted_at: string
  integration: {
    name: string
  }
  metadata: unknown
  organization: {
    slug: string
  }
  updated_at: string
}

export interface OrganizationIntegrationConnection {
  added_by: {
    primary_email: string
    username: string
  }
  id: string
  inserted_at: string
  organization_integration_id: string
  supabase_project_ref: string
  updated_at: string
}

export interface GetOrganizationIntegrationResponse {
  added_by: {
    primary_email: string
    username: string
  }
  connections: OrganizationIntegrationConnection[]
  id: string
  inserted_at: string
  integration: {
    name: string
  }
  metadata: unknown
  organization: {
    slug: string
  }
  updated_at: string
}

export interface InvoiceSummary {
  id: string
  status: 'paid' | 'open' | 'draft'
  amount_due: number
  hosted_invoice_url?: string | null
  created_at: string
}

export interface UpcomingInvoiceSummary {
  amount_due: number
  period_start: string
  period_end: string
}

export interface PaymentMethodSummary {
  id: string
  type: string
  created: number
  has_address: boolean
  is_default: boolean
  card?: {
    brand: string
    exp_month: number
    exp_year: number
    last4: string
  }
}

export interface TaxIdSummary {
  tax_id: {
    country: string
    type: string
    value: string
  } | null
}

export interface CustomerProfileSummary {
  billing_email: string | null
  billing_address?: string | null
  card_brand?: string | null
}

export interface ProjectLintSummary {
  cache_key: string
  categories: ('PERFORMANCE' | 'SECURITY')[]
  description: string
  detail: string
  facing: 'EXTERNAL'
  level: 'ERROR' | 'WARN' | 'INFO'
  metadata?: Record<string, unknown>
  name: string
  remediation: string
  title: string
}

export interface ProjectSettingsSummary {
  app_config?: {
    db_schema: string
    endpoint: string
    storage_endpoint: string
  }
  cloud_provider: string
  db_dns_name: string
  db_host: string
  db_ip_addr_config: string
  db_name: string
  db_port: number
  db_user: string
  inserted_at: string
  is_sensitive?: boolean
  jwt_secret?: string
  name: string
  ref: string
  region: string
  service_api_keys?: {
    api_key: string
    name: string
    tags: string
  }[]
  ssl_enforced: boolean
  status: string
}

export interface ProjectAddonVariantSummary {
  identifier: string
  meta?: Record<string, unknown>
  name: string
  price: number
  price_description: string
  price_interval: 'monthly' | 'hourly'
  price_type: 'fixed' | 'usage'
}

export interface ProjectAddonSummary {
  name: string
  type: string
  variants: ProjectAddonVariantSummary[]
}

export interface ProjectAddonsResponseSummary {
  available_addons: ProjectAddonSummary[]
  ref: string
  selected_addons: ProjectAddonSummary[]
}

export interface PostgresTableSummary {
  id: number
  name: string
  schema: string
  columns?: Array<{
    name: string
    data_type: string
    default_value?: string | number | null
    is_nullable?: boolean
  }>
  relationships?: Array<{
    constraint_name: string
    source_column_name: string
    target_table_name: string
    target_table_schema: string
  }>
  replica_identity?: 'DEFAULT' | 'INDEX' | 'FULL' | 'NOTHING'
  rls_enabled?: boolean
  rls_forced?: boolean
  comment?: string | null
  bytes?: number
  size?: string
}

export interface DatabaseDetailSummary {
  cloud_provider: CloudProvider
  connection_string_read_only?: string | null
  connectionString?: string | null
  db_host: string
  db_name: string
  db_port: number
  db_user: string
  identifier: string
  inserted_at: string
  region: string
  restUrl: string
  size: string
  status: ProjectStatus
}

export interface JwtSecretUpdateStatusSummary {
  update_status: {
    change_tracking_id: string
    error?: number
    progress: number
    status: number
  } | null
}

export interface ListGitHubConnectionsResponse {
  connections: Array<{
    branch_limit: number
    id: number
    inserted_at: string
    installation_id: number
    new_branch_per_pr: boolean
    project: {
      id: number
      name: string
      ref: string
    }
    repository: {
      id: number
      name: string
    }
    supabase_changes_only: boolean
    updated_at: string
    user: {
      id: number
      primary_email: string | null
      username: string
    } | null
    workdir: string
  }>
}
