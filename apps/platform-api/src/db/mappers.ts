import { Selectable } from 'kysely'

import type {
  AccessTokensTable,
  AuditLogsTable,
  OrganizationInvitationsTable,
  OrganizationMembersTable,
  OrganizationRolesTable,
  OrganizationsTable,
  ProfilesTable,
  ProjectRuntimesTable,
  ProjectsTable,
} from './schema.js'
import type {
  AccessToken,
  AccessTokenWithSecret,
  AuditLogEntry,
  Organization,
  Profile,
  ProjectDetail,
} from '../store/types.js'

const toIso = (value: Date | null | undefined) => (value ? value.toISOString() : undefined)

const toStringRecord = (value: Record<string, unknown> | null): Record<string, string> | null => {
  if (!value) return null
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, entry == null ? '' : String(entry)])
  )
}

export const toProfile = (row: Selectable<ProfilesTable>): Profile => ({
  auth0_id: row.auth0_id ?? '',
  disabled_features: row.disabled_features ?? [],
  first_name: row.first_name,
  free_project_limit: row.free_project_limit,
  gotrue_id: row.gotrue_id,
  id: row.id,
  is_alpha_user: row.is_alpha_user,
  is_sso_user: row.is_sso_user,
  last_name: row.last_name,
  mobile: row.mobile ?? '',
  primary_email: row.primary_email,
  username: row.username,
})

export interface OrganizationWithMembership {
  organization: Selectable<OrganizationsTable>
  membership?: Selectable<OrganizationMembersTable>
}

export const toOrganization = ({
  organization,
  membership,
}: OrganizationWithMembership): Organization => ({
  billing_email: organization.billing_email,
  billing_partner: organization.billing_partner,
  id: organization.id,
  is_owner: membership?.is_owner ?? false,
  name: organization.name,
  opt_in_tags: organization.opt_in_tags ?? [],
  organization_requires_mfa: organization.organization_requires_mfa,
  plan: {
    id: organization.plan_id,
    name: organization.plan_name,
  },
  restriction_data: toStringRecord(organization.restriction_data as Record<string, unknown> | null),
  restriction_status: organization.restriction_status,
  slug: organization.slug,
  stripe_customer_id: organization.stripe_customer_id,
  subscription_id: organization.subscription_id,
  usage_billing_enabled: organization.usage_billing_enabled,
})

export const toProjectDetail = (
  row: Selectable<ProjectsTable>,
  runtime?: { excluded_services?: string[] } | null
): ProjectDetail => ({
  cloud_provider: row.cloud_provider,
  connectionString: row.connection_string,
  db_host: row.db_host,
  dbVersion: row.db_version ?? undefined,
  id: row.id,
  infra_compute_size: row.infra_compute_size,
  inserted_at: toIso(row.inserted_at) ?? nowIsoString(),
  is_branch_enabled: row.is_branch_enabled,
  is_physical_backups_enabled: row.is_physical_backups_enabled,
  local_runtime: runtime
    ? {
        exclude_services: runtime.excluded_services ?? [],
      }
    : undefined,
  name: row.name,
  organization_id: row.organization_id,
  ref: row.ref,
  region: row.region,
  restUrl: row.rest_url ?? '',
  status: row.status,
  subscription_id: row.subscription_id ?? '',
})

const nowIsoString = () => new Date().toISOString()

export const toAccessToken = (
  row: Selectable<AccessTokensTable>,
  includeSecret = false
): AccessToken | AccessTokenWithSecret => {
  const base = {
    id: row.id,
    name: row.name,
    created_at: toIso(row.created_at) ?? nowIsoString(),
    expires_at: toIso(row.expires_at) ?? null,
    last_used_at: toIso(row.last_used_at) ?? null,
    scope: row.scope as AccessToken['scope'],
    token_alias: row.token_alias,
  }

  if (includeSecret) {
    return {
      ...base,
      access_token: row.access_token,
      token_digest: row.token_digest,
    }
  }

  return base
}

export const toAuditLogEntry = (row: Selectable<AuditLogsTable>): AuditLogEntry => ({
  created_at: toIso(row.created_at) ?? nowIsoString(),
  event_message: row.event_message,
  ip_address: row.ip_address,
  payload: row.payload ?? undefined,
})

export type OrganizationRoleRow = Selectable<OrganizationRolesTable>
export type OrganizationInvitationRow = Selectable<OrganizationInvitationsTable>
export type ProjectRuntimeRow = Selectable<ProjectRuntimesTable>
