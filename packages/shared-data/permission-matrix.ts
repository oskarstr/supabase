export type PermissionScope = 'organization' | 'project'
export type PermissionRoleKey = 'owner' | 'admin' | 'developer' | 'read_only'

type RawPermissionMatrixEntry = {
  scope: PermissionScope
  resource: string
  action: string
  roles: readonly PermissionRoleKey[]
}

const RAW_PERMISSION_MATRIX = [
  { scope: 'organization', resource: 'approved_oauth_apps', action: 'CREATE', roles: ['owner', 'admin'] },
  { scope: 'organization', resource: 'approved_oauth_apps', action: 'DELETE', roles: ['owner', 'admin'] },
  { scope: 'organization', resource: 'approved_oauth_apps', action: 'READ', roles: ['owner', 'admin'] },
  { scope: 'organization', resource: 'approved_oauth_apps', action: 'UPDATE', roles: ['owner', 'admin'] },
  { scope: 'organization', resource: 'integrations.github_connections', action: 'CREATE', roles: ['owner', 'admin'] },
  { scope: 'organization', resource: 'integrations.github_connections', action: 'DELETE', roles: ['owner', 'admin'] },
  { scope: 'organization', resource: 'integrations.github_connections', action: 'READ', roles: ['owner', 'admin'] },
  { scope: 'organization', resource: 'integrations.github_connections', action: 'UPDATE', roles: ['owner', 'admin'] },
  { scope: 'organization', resource: 'integrations.vercel_connections', action: 'CREATE', roles: ['owner', 'admin'] },
  { scope: 'organization', resource: 'integrations.vercel_connections', action: 'DELETE', roles: ['owner', 'admin'] },
  { scope: 'organization', resource: 'integrations.vercel_connections', action: 'READ', roles: ['owner', 'admin'] },
  { scope: 'organization', resource: 'integrations.vercel_connections', action: 'UPDATE', roles: ['owner', 'admin'] },
  { scope: 'organization', resource: 'notifications', action: 'READ', roles: ['owner', 'admin', 'developer', 'read_only'] },
  { scope: 'organization', resource: 'oauth_apps', action: 'UPDATE', roles: ['owner', 'admin'] },
  { scope: 'organization', resource: 'organization_members', action: 'CREATE', roles: ['owner', 'admin', 'developer'] },
  { scope: 'organization', resource: 'organization_members', action: 'DELETE', roles: ['owner', 'admin', 'developer'] },
  { scope: 'organization', resource: 'organization_members', action: 'READ', roles: ['owner', 'admin', 'developer', 'read_only'] },
  { scope: 'organization', resource: 'organization_members.owner', action: 'CREATE', roles: ['owner'] },
  { scope: 'organization', resource: 'organization_members.owner', action: 'DELETE', roles: ['owner'] },
  { scope: 'organization', resource: 'organization_members.admin', action: 'CREATE', roles: ['owner', 'admin'] },
  { scope: 'organization', resource: 'organization_members.admin', action: 'DELETE', roles: ['owner', 'admin'] },
  { scope: 'organization', resource: 'organization_members.developer', action: 'CREATE', roles: ['owner', 'admin', 'developer'] },
  { scope: 'organization', resource: 'organization_members.developer', action: 'DELETE', roles: ['owner', 'admin', 'developer'] },
  { scope: 'organization', resource: 'organizations', action: 'READ', roles: ['owner', 'admin', 'developer', 'read_only'] },
  { scope: 'organization', resource: 'organizations', action: 'UPDATE', roles: ['owner'] },
  { scope: 'organization', resource: 'organizations', action: 'DELETE', roles: ['owner'] },
  { scope: 'organization', resource: 'openai_telemetry', action: 'READ', roles: ['owner', 'admin'] },
  { scope: 'organization', resource: 'openai_telemetry', action: 'UPDATE', roles: ['owner', 'admin'] },
  { scope: 'organization', resource: 'audit_logs', action: 'READ', roles: ['owner', 'admin', 'developer', 'read_only'] },
  { scope: 'organization', resource: 'legal_documents', action: 'READ', roles: ['owner', 'admin', 'developer', 'read_only'] },
  { scope: 'organization', resource: 'projects', action: 'CREATE', roles: ['owner', 'admin'] },
  { scope: 'organization', resource: 'stripe.customer', action: 'BILLING_READ', roles: ['owner', 'admin', 'developer', 'read_only'] },
  { scope: 'organization', resource: 'stripe.customer', action: 'BILLING_WRITE', roles: ['owner', 'admin', 'developer'] },
  { scope: 'organization', resource: 'stripe.payment_methods', action: 'BILLING_READ', roles: ['owner', 'admin', 'developer', 'read_only'] },
  { scope: 'organization', resource: 'stripe.payment_methods', action: 'BILLING_WRITE', roles: ['owner', 'admin', 'developer'] },
  { scope: 'organization', resource: 'stripe.subscriptions', action: 'BILLING_READ', roles: ['owner', 'admin', 'developer', 'read_only'] },
  { scope: 'organization', resource: 'stripe.subscriptions', action: 'BILLING_WRITE', roles: ['owner', 'admin', 'developer'] },
  { scope: 'organization', resource: 'stripe.tax_ids', action: 'BILLING_READ', roles: ['owner', 'admin', 'developer', 'read_only'] },
  { scope: 'organization', resource: 'stripe.tax_ids', action: 'BILLING_WRITE', roles: ['owner', 'admin', 'developer'] },
  { scope: 'organization', resource: 'user_invites', action: 'CREATE', roles: ['owner', 'admin', 'developer'] },
  { scope: 'organization', resource: 'user_invites', action: 'DELETE', roles: ['owner', 'admin', 'developer'] },
  { scope: 'project', resource: '%', action: 'AUTH_EXECUTE', roles: ['owner', 'admin', 'developer'] },
  { scope: 'project', resource: '%', action: 'FUNCTIONS_READ', roles: ['owner', 'admin', 'developer', 'read_only'] },
  { scope: 'project', resource: '%', action: 'FUNCTIONS_WRITE', roles: ['owner', 'admin', 'developer'] },
  { scope: 'project', resource: '%', action: 'REALTIME_ADMIN_READ', roles: ['owner', 'admin', 'developer'] },
  { scope: 'project', resource: '%', action: 'SECRETS_READ', roles: ['owner', 'admin', 'developer', 'read_only'] },
  { scope: 'project', resource: '%', action: 'SECRETS_WRITE', roles: ['owner', 'admin', 'developer'] },
  { scope: 'project', resource: '%', action: 'STORAGE_ADMIN_READ', roles: ['owner', 'admin', 'developer'] },
  { scope: 'project', resource: '%', action: 'STORAGE_ADMIN_WRITE', roles: ['owner', 'admin', 'developer'] },
  { scope: 'project', resource: '%', action: 'STORAGE_WRITE', roles: ['owner', 'admin', 'developer'] },
  { scope: 'project', resource: '%', action: 'TENANT_SQL_ADMIN_WRITE', roles: ['owner', 'admin', 'developer'] },
  { scope: 'project', resource: '%', action: 'TENANT_SQL_QUERY', roles: ['owner', 'admin', 'developer', 'read_only'] },
  { scope: 'project', resource: 'api_keys', action: 'READ', roles: ['owner', 'admin', 'developer'] },
  { scope: 'project', resource: 'auth.mfa_factors', action: 'TENANT_SQL_DELETE', roles: ['owner', 'admin', 'developer'] },
  { scope: 'project', resource: 'auth.users', action: 'TENANT_SQL_DELETE', roles: ['owner', 'admin', 'developer'] },
  { scope: 'project', resource: 'auth_signing_keys', action: 'READ', roles: ['owner', 'admin', 'developer'] },
  { scope: 'project', resource: 'back_ups', action: 'READ', roles: ['owner', 'admin', 'developer', 'read_only'] },
  { scope: 'project', resource: 'create_user', action: 'AUTH_EXECUTE', roles: ['owner', 'admin', 'developer'] },
  { scope: 'project', resource: 'custom_config_gotrue', action: 'READ', roles: ['owner', 'admin', 'developer'] },
  { scope: 'project', resource: 'custom_config_gotrue', action: 'UPDATE', roles: ['owner', 'admin', 'developer'] },
  { scope: 'project', resource: 'custom_config_postgrest', action: 'READ', roles: ['owner', 'admin', 'developer'] },
  { scope: 'project', resource: 'custom_config_postgrest', action: 'UPDATE', roles: ['owner', 'admin', 'developer'] },
  { scope: 'project', resource: 'extensions', action: 'TENANT_SQL_ADMIN_READ', roles: ['owner', 'admin', 'developer', 'read_only'] },
  { scope: 'project', resource: 'field.jwt_secret', action: 'READ', roles: ['owner', 'admin', 'developer'] },
  { scope: 'project', resource: 'functions', action: 'TENANT_SQL_ADMIN_READ', roles: ['owner', 'admin', 'developer', 'read_only'] },
  { scope: 'project', resource: 'invite_user', action: 'AUTH_EXECUTE', roles: ['owner', 'admin', 'developer'] },
  { scope: 'project', resource: 'logflare', action: 'ANALYTICS_ADMIN_WRITE', roles: ['owner', 'admin', 'developer'] },
  { scope: 'project', resource: 'logflare', action: 'ANALYTICS_READ', roles: ['owner', 'admin', 'developer', 'read_only'] },
  { scope: 'project', resource: 'physical_backups', action: 'READ', roles: ['owner', 'admin', 'developer', 'read_only'] },
  { scope: 'project', resource: 'policies', action: 'TENANT_SQL_ADMIN_READ', roles: ['owner', 'admin', 'developer', 'read_only'] },
  { scope: 'project', resource: 'preview_branches', action: 'CREATE', roles: ['owner', 'admin'] },
  { scope: 'project', resource: 'preview_branches', action: 'DELETE', roles: ['owner', 'admin'] },
  { scope: 'project', resource: 'preview_branches', action: 'READ', roles: ['owner', 'admin'] },
  { scope: 'project', resource: 'preview_branches', action: 'UPDATE', roles: ['owner', 'admin'] },
  { scope: 'project', resource: 'projects', action: 'DELETE', roles: ['owner', 'admin'] },
  { scope: 'project', resource: 'projects', action: 'READ', roles: ['owner', 'admin', 'developer', 'read_only'] },
  { scope: 'project', resource: 'projects', action: 'UPDATE', roles: ['owner', 'admin'] },
  { scope: 'project', resource: 'publications', action: 'TENANT_SQL_ADMIN_READ', roles: ['owner', 'admin', 'developer', 'read_only'] },
  { scope: 'project', resource: 'queue_job.projects.update_jwt', action: 'INFRA_EXECUTE', roles: ['owner', 'admin', 'developer'] },
  { scope: 'project', resource: 'queue_job.restore.prepare', action: 'INFRA_EXECUTE', roles: ['owner', 'admin'] },
  { scope: 'project', resource: 'queue_job.walg.prepare_restore', action: 'INFRA_EXECUTE', roles: ['owner', 'admin'] },
  { scope: 'project', resource: 'queue_jobs.projects.initialize_or_resume', action: 'INFRA_EXECUTE', roles: ['owner', 'admin'] },
  { scope: 'project', resource: 'queue_jobs.projects.pause', action: 'INFRA_EXECUTE', roles: ['owner', 'admin'] },
  { scope: 'project', resource: 'reboot', action: 'INFRA_EXECUTE', roles: ['owner', 'admin'] },
  { scope: 'project', resource: 'send_magic_link', action: 'AUTH_EXECUTE', roles: ['owner', 'admin', 'developer'] },
  { scope: 'project', resource: 'send_otp', action: 'AUTH_EXECUTE', roles: ['owner', 'admin', 'developer'] },
  { scope: 'project', resource: 'send_recovery', action: 'AUTH_EXECUTE', roles: ['owner', 'admin', 'developer'] },
  { scope: 'project', resource: 'service_api_keys', action: 'READ', roles: ['owner', 'admin', 'developer'] },
  { scope: 'project', resource: 'tables', action: 'TENANT_SQL_ADMIN_READ', roles: ['owner', 'admin', 'developer', 'read_only'] },
  { scope: 'project', resource: 'triggers', action: 'TENANT_SQL_ADMIN_READ', roles: ['owner', 'admin', 'developer', 'read_only'] },
  { scope: 'project', resource: 'user_content', action: 'CREATE', roles: ['owner', 'admin', 'developer'] },
  { scope: 'project', resource: 'user_content', action: 'READ', roles: ['owner', 'admin', 'developer'] },
  { scope: 'project', resource: 'user_content', action: 'UPDATE', roles: ['owner', 'admin', 'developer'] },
] as const satisfies readonly RawPermissionMatrixEntry[]

export type PermissionActionKey = (typeof RAW_PERMISSION_MATRIX)[number]['action']

export interface PermissionMatrixDefinitionEntry {
  scope: PermissionScope
  resource: string
  action: PermissionActionKey
  roles: PermissionRoleKey[]
}

export const PERMISSION_MATRIX_DEFINITION: PermissionMatrixDefinitionEntry[] =
  RAW_PERMISSION_MATRIX.map((entry) => ({
    scope: entry.scope,
    resource: entry.resource,
    action: entry.action,
    roles: [...entry.roles],
  }))
