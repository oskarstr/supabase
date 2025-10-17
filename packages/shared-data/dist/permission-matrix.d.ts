export type PermissionScope = 'organization' | 'project';
export type PermissionRoleKey = 'owner' | 'admin' | 'developer' | 'read_only';
declare const RAW_PERMISSION_MATRIX: readonly [{
    readonly scope: "organization";
    readonly resource: "approved_oauth_apps";
    readonly action: "CREATE";
    readonly roles: readonly ["owner", "admin"];
}, {
    readonly scope: "organization";
    readonly resource: "approved_oauth_apps";
    readonly action: "DELETE";
    readonly roles: readonly ["owner", "admin"];
}, {
    readonly scope: "organization";
    readonly resource: "approved_oauth_apps";
    readonly action: "READ";
    readonly roles: readonly ["owner", "admin"];
}, {
    readonly scope: "organization";
    readonly resource: "approved_oauth_apps";
    readonly action: "UPDATE";
    readonly roles: readonly ["owner", "admin"];
}, {
    readonly scope: "organization";
    readonly resource: "integrations.github_connections";
    readonly action: "CREATE";
    readonly roles: readonly ["owner", "admin"];
}, {
    readonly scope: "organization";
    readonly resource: "integrations.github_connections";
    readonly action: "DELETE";
    readonly roles: readonly ["owner", "admin"];
}, {
    readonly scope: "organization";
    readonly resource: "integrations.github_connections";
    readonly action: "READ";
    readonly roles: readonly ["owner", "admin"];
}, {
    readonly scope: "organization";
    readonly resource: "integrations.github_connections";
    readonly action: "UPDATE";
    readonly roles: readonly ["owner", "admin"];
}, {
    readonly scope: "organization";
    readonly resource: "integrations.vercel_connections";
    readonly action: "CREATE";
    readonly roles: readonly ["owner", "admin"];
}, {
    readonly scope: "organization";
    readonly resource: "integrations.vercel_connections";
    readonly action: "DELETE";
    readonly roles: readonly ["owner", "admin"];
}, {
    readonly scope: "organization";
    readonly resource: "integrations.vercel_connections";
    readonly action: "READ";
    readonly roles: readonly ["owner", "admin"];
}, {
    readonly scope: "organization";
    readonly resource: "integrations.vercel_connections";
    readonly action: "UPDATE";
    readonly roles: readonly ["owner", "admin"];
}, {
    readonly scope: "organization";
    readonly resource: "notifications";
    readonly action: "READ";
    readonly roles: readonly ["owner", "admin", "developer", "read_only"];
}, {
    readonly scope: "organization";
    readonly resource: "oauth_apps";
    readonly action: "UPDATE";
    readonly roles: readonly ["owner", "admin"];
}, {
    readonly scope: "organization";
    readonly resource: "organization_members";
    readonly action: "CREATE";
    readonly roles: readonly ["owner", "admin", "developer"];
}, {
    readonly scope: "organization";
    readonly resource: "organization_members";
    readonly action: "DELETE";
    readonly roles: readonly ["owner", "admin", "developer"];
}, {
    readonly scope: "organization";
    readonly resource: "organization_members";
    readonly action: "READ";
    readonly roles: readonly ["owner", "admin", "developer", "read_only"];
}, {
    readonly scope: "organization";
    readonly resource: "organization_members.owner";
    readonly action: "CREATE";
    readonly roles: readonly ["owner"];
}, {
    readonly scope: "organization";
    readonly resource: "organization_members.owner";
    readonly action: "DELETE";
    readonly roles: readonly ["owner"];
}, {
    readonly scope: "organization";
    readonly resource: "organization_members.admin";
    readonly action: "CREATE";
    readonly roles: readonly ["owner", "admin"];
}, {
    readonly scope: "organization";
    readonly resource: "organization_members.admin";
    readonly action: "DELETE";
    readonly roles: readonly ["owner", "admin"];
}, {
    readonly scope: "organization";
    readonly resource: "organization_members.developer";
    readonly action: "CREATE";
    readonly roles: readonly ["owner", "admin", "developer"];
}, {
    readonly scope: "organization";
    readonly resource: "organization_members.developer";
    readonly action: "DELETE";
    readonly roles: readonly ["owner", "admin", "developer"];
}, {
    readonly scope: "organization";
    readonly resource: "organizations";
    readonly action: "READ";
    readonly roles: readonly ["owner", "admin", "developer", "read_only"];
}, {
    readonly scope: "organization";
    readonly resource: "organizations";
    readonly action: "UPDATE";
    readonly roles: readonly ["owner"];
}, {
    readonly scope: "organization";
    readonly resource: "organizations";
    readonly action: "DELETE";
    readonly roles: readonly ["owner"];
}, {
    readonly scope: "organization";
    readonly resource: "openai_telemetry";
    readonly action: "READ";
    readonly roles: readonly ["owner", "admin"];
}, {
    readonly scope: "organization";
    readonly resource: "openai_telemetry";
    readonly action: "UPDATE";
    readonly roles: readonly ["owner", "admin"];
}, {
    readonly scope: "organization";
    readonly resource: "audit_logs";
    readonly action: "READ";
    readonly roles: readonly ["owner", "admin", "developer", "read_only"];
}, {
    readonly scope: "organization";
    readonly resource: "legal_documents";
    readonly action: "READ";
    readonly roles: readonly ["owner", "admin", "developer", "read_only"];
}, {
    readonly scope: "organization";
    readonly resource: "projects";
    readonly action: "CREATE";
    readonly roles: readonly ["owner", "admin"];
}, {
    readonly scope: "organization";
    readonly resource: "stripe.customer";
    readonly action: "BILLING_READ";
    readonly roles: readonly ["owner", "admin", "developer", "read_only"];
}, {
    readonly scope: "organization";
    readonly resource: "stripe.customer";
    readonly action: "BILLING_WRITE";
    readonly roles: readonly ["owner", "admin", "developer"];
}, {
    readonly scope: "organization";
    readonly resource: "stripe.payment_methods";
    readonly action: "BILLING_READ";
    readonly roles: readonly ["owner", "admin", "developer", "read_only"];
}, {
    readonly scope: "organization";
    readonly resource: "stripe.payment_methods";
    readonly action: "BILLING_WRITE";
    readonly roles: readonly ["owner", "admin", "developer"];
}, {
    readonly scope: "organization";
    readonly resource: "stripe.subscriptions";
    readonly action: "BILLING_READ";
    readonly roles: readonly ["owner", "admin", "developer", "read_only"];
}, {
    readonly scope: "organization";
    readonly resource: "stripe.subscriptions";
    readonly action: "BILLING_WRITE";
    readonly roles: readonly ["owner", "admin", "developer"];
}, {
    readonly scope: "organization";
    readonly resource: "stripe.tax_ids";
    readonly action: "BILLING_READ";
    readonly roles: readonly ["owner", "admin", "developer", "read_only"];
}, {
    readonly scope: "organization";
    readonly resource: "stripe.tax_ids";
    readonly action: "BILLING_WRITE";
    readonly roles: readonly ["owner", "admin", "developer"];
}, {
    readonly scope: "organization";
    readonly resource: "user_invites";
    readonly action: "CREATE";
    readonly roles: readonly ["owner", "admin", "developer"];
}, {
    readonly scope: "organization";
    readonly resource: "user_invites";
    readonly action: "DELETE";
    readonly roles: readonly ["owner", "admin", "developer"];
}, {
    readonly scope: "project";
    readonly resource: "%";
    readonly action: "AUTH_EXECUTE";
    readonly roles: readonly ["owner", "admin", "developer"];
}, {
    readonly scope: "project";
    readonly resource: "%";
    readonly action: "FUNCTIONS_READ";
    readonly roles: readonly ["owner", "admin", "developer", "read_only"];
}, {
    readonly scope: "project";
    readonly resource: "%";
    readonly action: "FUNCTIONS_WRITE";
    readonly roles: readonly ["owner", "admin", "developer"];
}, {
    readonly scope: "project";
    readonly resource: "%";
    readonly action: "REALTIME_ADMIN_READ";
    readonly roles: readonly ["owner", "admin", "developer"];
}, {
    readonly scope: "project";
    readonly resource: "%";
    readonly action: "SECRETS_READ";
    readonly roles: readonly ["owner", "admin", "developer", "read_only"];
}, {
    readonly scope: "project";
    readonly resource: "%";
    readonly action: "SECRETS_WRITE";
    readonly roles: readonly ["owner", "admin", "developer"];
}, {
    readonly scope: "project";
    readonly resource: "%";
    readonly action: "STORAGE_ADMIN_READ";
    readonly roles: readonly ["owner", "admin", "developer"];
}, {
    readonly scope: "project";
    readonly resource: "%";
    readonly action: "STORAGE_ADMIN_WRITE";
    readonly roles: readonly ["owner", "admin", "developer"];
}, {
    readonly scope: "project";
    readonly resource: "%";
    readonly action: "STORAGE_WRITE";
    readonly roles: readonly ["owner", "admin", "developer"];
}, {
    readonly scope: "project";
    readonly resource: "%";
    readonly action: "TENANT_SQL_ADMIN_WRITE";
    readonly roles: readonly ["owner", "admin", "developer"];
}, {
    readonly scope: "project";
    readonly resource: "%";
    readonly action: "TENANT_SQL_QUERY";
    readonly roles: readonly ["owner", "admin", "developer", "read_only"];
}, {
    readonly scope: "project";
    readonly resource: "api_keys";
    readonly action: "READ";
    readonly roles: readonly ["owner", "admin", "developer"];
}, {
    readonly scope: "project";
    readonly resource: "auth.mfa_factors";
    readonly action: "TENANT_SQL_DELETE";
    readonly roles: readonly ["owner", "admin", "developer"];
}, {
    readonly scope: "project";
    readonly resource: "auth.users";
    readonly action: "TENANT_SQL_DELETE";
    readonly roles: readonly ["owner", "admin", "developer"];
}, {
    readonly scope: "project";
    readonly resource: "auth_signing_keys";
    readonly action: "READ";
    readonly roles: readonly ["owner", "admin", "developer"];
}, {
    readonly scope: "project";
    readonly resource: "back_ups";
    readonly action: "READ";
    readonly roles: readonly ["owner", "admin", "developer", "read_only"];
}, {
    readonly scope: "project";
    readonly resource: "create_user";
    readonly action: "AUTH_EXECUTE";
    readonly roles: readonly ["owner", "admin", "developer"];
}, {
    readonly scope: "project";
    readonly resource: "custom_config_gotrue";
    readonly action: "READ";
    readonly roles: readonly ["owner", "admin", "developer"];
}, {
    readonly scope: "project";
    readonly resource: "custom_config_gotrue";
    readonly action: "UPDATE";
    readonly roles: readonly ["owner", "admin", "developer"];
}, {
    readonly scope: "project";
    readonly resource: "custom_config_postgrest";
    readonly action: "READ";
    readonly roles: readonly ["owner", "admin", "developer"];
}, {
    readonly scope: "project";
    readonly resource: "custom_config_postgrest";
    readonly action: "UPDATE";
    readonly roles: readonly ["owner", "admin", "developer"];
}, {
    readonly scope: "project";
    readonly resource: "extensions";
    readonly action: "TENANT_SQL_ADMIN_READ";
    readonly roles: readonly ["owner", "admin", "developer", "read_only"];
}, {
    readonly scope: "project";
    readonly resource: "field.jwt_secret";
    readonly action: "READ";
    readonly roles: readonly ["owner", "admin", "developer"];
}, {
    readonly scope: "project";
    readonly resource: "functions";
    readonly action: "TENANT_SQL_ADMIN_READ";
    readonly roles: readonly ["owner", "admin", "developer", "read_only"];
}, {
    readonly scope: "project";
    readonly resource: "invite_user";
    readonly action: "AUTH_EXECUTE";
    readonly roles: readonly ["owner", "admin", "developer"];
}, {
    readonly scope: "project";
    readonly resource: "logflare";
    readonly action: "ANALYTICS_ADMIN_WRITE";
    readonly roles: readonly ["owner", "admin", "developer"];
}, {
    readonly scope: "project";
    readonly resource: "logflare";
    readonly action: "ANALYTICS_READ";
    readonly roles: readonly ["owner", "admin", "developer", "read_only"];
}, {
    readonly scope: "project";
    readonly resource: "physical_backups";
    readonly action: "READ";
    readonly roles: readonly ["owner", "admin", "developer", "read_only"];
}, {
    readonly scope: "project";
    readonly resource: "policies";
    readonly action: "TENANT_SQL_ADMIN_READ";
    readonly roles: readonly ["owner", "admin", "developer", "read_only"];
}, {
    readonly scope: "project";
    readonly resource: "preview_branches";
    readonly action: "CREATE";
    readonly roles: readonly ["owner", "admin"];
}, {
    readonly scope: "project";
    readonly resource: "preview_branches";
    readonly action: "DELETE";
    readonly roles: readonly ["owner", "admin"];
}, {
    readonly scope: "project";
    readonly resource: "preview_branches";
    readonly action: "READ";
    readonly roles: readonly ["owner", "admin"];
}, {
    readonly scope: "project";
    readonly resource: "preview_branches";
    readonly action: "UPDATE";
    readonly roles: readonly ["owner", "admin"];
}, {
    readonly scope: "project";
    readonly resource: "projects";
    readonly action: "DELETE";
    readonly roles: readonly ["owner", "admin"];
}, {
    readonly scope: "project";
    readonly resource: "projects";
    readonly action: "READ";
    readonly roles: readonly ["owner", "admin", "developer", "read_only"];
}, {
    readonly scope: "project";
    readonly resource: "projects";
    readonly action: "UPDATE";
    readonly roles: readonly ["owner", "admin"];
}, {
    readonly scope: "project";
    readonly resource: "publications";
    readonly action: "TENANT_SQL_ADMIN_READ";
    readonly roles: readonly ["owner", "admin", "developer", "read_only"];
}, {
    readonly scope: "project";
    readonly resource: "queue_job.projects.update_jwt";
    readonly action: "INFRA_EXECUTE";
    readonly roles: readonly ["owner", "admin", "developer"];
}, {
    readonly scope: "project";
    readonly resource: "queue_job.restore.prepare";
    readonly action: "INFRA_EXECUTE";
    readonly roles: readonly ["owner", "admin"];
}, {
    readonly scope: "project";
    readonly resource: "queue_job.walg.prepare_restore";
    readonly action: "INFRA_EXECUTE";
    readonly roles: readonly ["owner", "admin"];
}, {
    readonly scope: "project";
    readonly resource: "queue_jobs.projects.initialize_or_resume";
    readonly action: "INFRA_EXECUTE";
    readonly roles: readonly ["owner", "admin"];
}, {
    readonly scope: "project";
    readonly resource: "queue_jobs.projects.pause";
    readonly action: "INFRA_EXECUTE";
    readonly roles: readonly ["owner", "admin"];
}, {
    readonly scope: "project";
    readonly resource: "reboot";
    readonly action: "INFRA_EXECUTE";
    readonly roles: readonly ["owner", "admin"];
}, {
    readonly scope: "project";
    readonly resource: "send_magic_link";
    readonly action: "AUTH_EXECUTE";
    readonly roles: readonly ["owner", "admin", "developer"];
}, {
    readonly scope: "project";
    readonly resource: "send_otp";
    readonly action: "AUTH_EXECUTE";
    readonly roles: readonly ["owner", "admin", "developer"];
}, {
    readonly scope: "project";
    readonly resource: "send_recovery";
    readonly action: "AUTH_EXECUTE";
    readonly roles: readonly ["owner", "admin", "developer"];
}, {
    readonly scope: "project";
    readonly resource: "service_api_keys";
    readonly action: "READ";
    readonly roles: readonly ["owner", "admin", "developer"];
}, {
    readonly scope: "project";
    readonly resource: "tables";
    readonly action: "TENANT_SQL_ADMIN_READ";
    readonly roles: readonly ["owner", "admin", "developer", "read_only"];
}, {
    readonly scope: "project";
    readonly resource: "triggers";
    readonly action: "TENANT_SQL_ADMIN_READ";
    readonly roles: readonly ["owner", "admin", "developer", "read_only"];
}, {
    readonly scope: "project";
    readonly resource: "user_content";
    readonly action: "CREATE";
    readonly roles: readonly ["owner", "admin", "developer"];
}, {
    readonly scope: "project";
    readonly resource: "user_content";
    readonly action: "READ";
    readonly roles: readonly ["owner", "admin", "developer"];
}, {
    readonly scope: "project";
    readonly resource: "user_content";
    readonly action: "UPDATE";
    readonly roles: readonly ["owner", "admin", "developer"];
}];
export type PermissionActionKey = (typeof RAW_PERMISSION_MATRIX)[number]['action'];
export interface PermissionMatrixDefinitionEntry {
    scope: PermissionScope;
    resource: string;
    action: PermissionActionKey;
    roles: PermissionRoleKey[];
}
export declare const PERMISSION_MATRIX_DEFINITION: PermissionMatrixDefinitionEntry[];
export {};
//# sourceMappingURL=permission-matrix.d.ts.map