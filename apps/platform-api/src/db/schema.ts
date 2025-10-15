import { ColumnType, Generated } from 'kysely'

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string | undefined>
type StringArray = ColumnType<string[], string[] | undefined, string[] | undefined>
type IntegerArray = ColumnType<number[], number[] | undefined, number[] | undefined>
type Json = ColumnType<
  Record<string, unknown> | null,
  Record<string, unknown> | null | undefined,
  Record<string, unknown> | null | undefined
>

export interface ProfilesTable {
  id: Generated<number>
  gotrue_id: string
  auth0_id: string | null
  username: string
  first_name: string
  last_name: string
  primary_email: string
  mobile: string | null
  free_project_limit: number
  is_alpha_user: boolean
  is_sso_user: boolean
  disabled_features: StringArray
  inserted_at: Timestamp
  updated_at: Timestamp
}

export interface OrganizationsTable {
  id: Generated<number>
  slug: string
  name: string
  billing_email: string | null
  billing_partner: 'fly' | 'aws_marketplace' | 'vercel_marketplace' | null
  organization_requires_mfa: boolean
  usage_billing_enabled: boolean
  stripe_customer_id: string | null
  subscription_id: string | null
  plan_id: 'free' | 'pro' | 'team' | 'enterprise'
  plan_name: string
  opt_in_tags: StringArray
  restriction_status: string | null
  restriction_data: Json
  inserted_at: Timestamp
  updated_at: Timestamp
}

export interface OrganizationMembersTable {
  id: Generated<number>
  organization_id: number
  profile_id: number
  role_ids: IntegerArray
  metadata: Json
  mfa_enabled: boolean
  is_owner: boolean
  inserted_at: Timestamp
  updated_at: Timestamp
}

export interface OrganizationRolesTable {
  id: Generated<number>
  organization_id: number
  base_role_id: number
  name: string
  description: string | null
  project_ids: IntegerArray | null
  inserted_at: Timestamp
}

export interface OrganizationInvitationsTable {
  id: Generated<number>
  organization_id: number
  invited_email: string
  role_id: number | null
  invited_at: Timestamp
}

export interface ProjectsTable {
  id: Generated<number>
  organization_id: number
  ref: string
  name: string
  region: string
  cloud_provider: 'AWS' | 'FLY' | 'AWS_K8S' | 'AWS_NIMBUS' | 'LOCAL'
  status:
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
  infra_compute_size:
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
  db_host: string
  db_version: string | null
  connection_string: string | null
  rest_url: string | null
  is_branch_enabled: boolean
  is_physical_backups_enabled: boolean
  subscription_id: string | null
  preview_branch_refs: StringArray
  anon_key: string
  service_key: string
  inserted_at: Timestamp
  updated_at: Timestamp
}

export interface ProjectRuntimesTable {
  project_id: number
  root_dir: string
  excluded_services: StringArray
  created_at: Timestamp
  updated_at: Timestamp
}

export interface AccessTokensTable {
  id: Generated<number>
  name: string
  token_alias: string
  access_token: string
  token_digest: string
  scope: string
  created_at: Timestamp
  expires_at: Timestamp | null
  last_used_at: Timestamp | null
}

export interface AuditLogsTable {
  id: Generated<number>
  organization_id: number | null
  project_id: number | null
  event_message: string
  payload: Json
  ip_address: string | null
  created_at: Timestamp
}

export interface PlatformDatabase {
  profiles: ProfilesTable
  organizations: OrganizationsTable
  organization_members: OrganizationMembersTable
  organization_roles: OrganizationRolesTable
  organization_invitations: OrganizationInvitationsTable
  projects: ProjectsTable
  project_runtimes: ProjectRuntimesTable
  access_tokens: AccessTokensTable
  audit_logs: AuditLogsTable
}
