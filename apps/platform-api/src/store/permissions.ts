import { getPlatformDb } from '../db/client.js'
import type { AccessControlPermission } from './types.js'

const db = getPlatformDb()

const PERMISSION_ACTION = {
  ANALYTICS_ADMIN_WRITE: 'analytics:Admin:Write',
  ANALYTICS_READ: 'analytics:Read',
  AUTH_EXECUTE: 'auth:Execute',
  BILLING_READ: 'billing:Read',
  BILLING_WRITE: 'billing:Write',
  CREATE: 'write:Create',
  DELETE: 'write:Delete',
  FUNCTIONS_READ: 'functions:Read',
  FUNCTIONS_WRITE: 'functions:Write',
  INFRA_EXECUTE: 'infra:Execute',
  READ: 'read:Read',
  REALTIME_ADMIN_READ: 'realtime:Admin:Read',
  SECRETS_READ: 'secrets:Read',
  SECRETS_WRITE: 'secrets:Write',
  STORAGE_ADMIN_READ: 'storage:Admin:Read',
  STORAGE_ADMIN_WRITE: 'storage:Admin:Write',
  STORAGE_WRITE: 'storage:Write',
  TENANT_SQL_ADMIN_READ: 'tenant:Sql:Admin:Read',
  TENANT_SQL_ADMIN_WRITE: 'tenant:Sql:Admin:Write',
  TENANT_SQL_DELETE: 'tenant:Sql:Write:Delete',
  TENANT_SQL_QUERY: 'tenant:Sql:Query',
  UPDATE: 'write:Update',
} as const

type PermissionActionValue = (typeof PERMISSION_ACTION)[keyof typeof PERMISSION_ACTION]

type RoleKey = 'owner' | 'admin' | 'developer' | 'read_only'
type Scope = 'organization' | 'project'

type MembershipRow = {
  organization_id: number
  organization_slug: string
  is_owner: boolean
  role_ids: number[] | null
  metadata: Record<string, unknown> | null
}

type RoleRow = {
  id: number
  organization_id: number
  base_role_id: number
  project_ids: number[] | null
}

type ProjectRow = {
  id: number
  organization_id: number
  ref: string
}

type RoleScopes = {
  refs: Set<string>
  ids: Set<number>
}

interface PermissionTemplate {
  action: PermissionActionValue
  resource: string
  scope: Scope
  allowed: Record<RoleKey, boolean>
}

const WILDCARD = ['%'] as const

const BASE_ROLE_TO_KEY: Record<number, RoleKey> = {
  1: 'owner',
  2: 'admin',
  3: 'developer',
  4: 'read_only',
  5: 'owner',
  6: 'admin',
  7: 'developer',
  8: 'read_only',
}

const allowRoles = (...roles: RoleKey[]): Record<RoleKey, boolean> => ({
  owner: roles.includes('owner'),
  admin: roles.includes('admin'),
  developer: roles.includes('developer'),
  read_only: roles.includes('read_only'),
})

const ORGANIZATION_PERMISSION_TEMPLATES: PermissionTemplate[] = [
  {
    action: PERMISSION_ACTION.READ,
    resource: 'organizations',
    scope: 'organization',
    allowed: allowRoles('owner', 'admin', 'developer', 'read_only'),
  },
  {
    action: PERMISSION_ACTION.UPDATE,
    resource: 'organizations',
    scope: 'organization',
    allowed: allowRoles('owner'),
  },
  {
    action: PERMISSION_ACTION.READ,
    resource: 'approved_oauth_apps',
    scope: 'organization',
    allowed: allowRoles('owner', 'admin', 'developer', 'read_only'),
  },
  {
    action: PERMISSION_ACTION.CREATE,
    resource: 'approved_oauth_apps',
    scope: 'organization',
    allowed: allowRoles('owner', 'admin'),
  },
  {
    action: PERMISSION_ACTION.UPDATE,
    resource: 'approved_oauth_apps',
    scope: 'organization',
    allowed: allowRoles('owner', 'admin'),
  },
  {
    action: PERMISSION_ACTION.DELETE,
    resource: 'approved_oauth_apps',
    scope: 'organization',
    allowed: allowRoles('owner', 'admin'),
  },
  {
    action: PERMISSION_ACTION.UPDATE,
    resource: 'oauth_apps',
    scope: 'organization',
    allowed: allowRoles('owner', 'admin'),
  },
  {
    action: PERMISSION_ACTION.CREATE,
    resource: 'projects',
    scope: 'organization',
    allowed: allowRoles('owner', 'admin'),
  },
  {
    action: PERMISSION_ACTION.READ,
    resource: 'integrations.github_connections',
    scope: 'organization',
    allowed: allowRoles('owner', 'admin', 'developer', 'read_only'),
  },
  {
    action: PERMISSION_ACTION.CREATE,
    resource: 'integrations.github_connections',
    scope: 'organization',
    allowed: allowRoles('owner', 'admin'),
  },
  {
    action: PERMISSION_ACTION.UPDATE,
    resource: 'integrations.github_connections',
    scope: 'organization',
    allowed: allowRoles('owner', 'admin'),
  },
  {
    action: PERMISSION_ACTION.DELETE,
    resource: 'integrations.github_connections',
    scope: 'organization',
    allowed: allowRoles('owner', 'admin'),
  },
  {
    action: PERMISSION_ACTION.READ,
    resource: 'integrations.vercel_connections',
    scope: 'organization',
    allowed: allowRoles('owner', 'admin', 'developer', 'read_only'),
  },
  {
    action: PERMISSION_ACTION.CREATE,
    resource: 'integrations.vercel_connections',
    scope: 'organization',
    allowed: allowRoles('owner', 'admin'),
  },
  {
    action: PERMISSION_ACTION.UPDATE,
    resource: 'integrations.vercel_connections',
    scope: 'organization',
    allowed: allowRoles('owner', 'admin'),
  },
  {
    action: PERMISSION_ACTION.DELETE,
    resource: 'integrations.vercel_connections',
    scope: 'organization',
    allowed: allowRoles('owner', 'admin'),
  },
  {
    action: PERMISSION_ACTION.READ,
    resource: 'notifications',
    scope: 'organization',
    allowed: allowRoles('owner', 'admin', 'developer', 'read_only'),
  },
  {
    action: PERMISSION_ACTION.DELETE,
    resource: 'user_invites',
    scope: 'organization',
    allowed: allowRoles('owner', 'admin'),
  },
  {
    action: PERMISSION_ACTION.CREATE,
    resource: 'user_invites',
    scope: 'organization',
    allowed: allowRoles('owner', 'admin', 'developer', 'read_only'),
  },
]

const BILLING_RESOURCES = [
  'stripe.customer',
  'stripe.payment_methods',
  'stripe.subscriptions',
  'stripe.tax_ids',
] as const

for (const resource of BILLING_RESOURCES) {
  ORGANIZATION_PERMISSION_TEMPLATES.push({
    action: PERMISSION_ACTION.BILLING_READ,
    resource,
    scope: 'organization',
    allowed: allowRoles('owner', 'admin', 'developer', 'read_only'),
  })
  ORGANIZATION_PERMISSION_TEMPLATES.push({
    action: PERMISSION_ACTION.BILLING_WRITE,
    resource,
    scope: 'organization',
    allowed: allowRoles('owner', 'admin'),
  })
}

const PROJECT_PERMISSION_TEMPLATES: PermissionTemplate[] = [
  {
    action: PERMISSION_ACTION.UPDATE,
    resource: 'projects',
    scope: 'project',
    allowed: allowRoles('owner', 'admin'),
  },
  {
    action: PERMISSION_ACTION.DELETE,
    resource: 'projects',
    scope: 'project',
    allowed: allowRoles('owner', 'admin'),
  },
  {
    action: PERMISSION_ACTION.READ,
    resource: 'projects',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer', 'read_only'),
  },
  {
    action: PERMISSION_ACTION.CREATE,
    resource: 'preview_branches',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer'),
  },
  {
    action: PERMISSION_ACTION.UPDATE,
    resource: 'preview_branches',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer'),
  },
  {
    action: PERMISSION_ACTION.DELETE,
    resource: 'preview_branches',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer'),
  },
  {
    action: PERMISSION_ACTION.READ,
    resource: 'preview_branches',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer', 'read_only'),
  },
  {
    action: PERMISSION_ACTION.ANALYTICS_ADMIN_WRITE,
    resource: 'logflare',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer', 'read_only'),
  },
  {
    action: PERMISSION_ACTION.ANALYTICS_READ,
    resource: 'logflare',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer', 'read_only'),
  },
  {
    action: PERMISSION_ACTION.AUTH_EXECUTE,
    resource: 'create_user',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer'),
  },
  {
    action: PERMISSION_ACTION.AUTH_EXECUTE,
    resource: 'invite_user',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer'),
  },
  {
    action: PERMISSION_ACTION.AUTH_EXECUTE,
    resource: 'send_magic_link',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer'),
  },
  {
    action: PERMISSION_ACTION.AUTH_EXECUTE,
    resource: 'send_otp',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer'),
  },
  {
    action: PERMISSION_ACTION.AUTH_EXECUTE,
    resource: 'send_recovery',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer'),
  },
  {
    action: PERMISSION_ACTION.AUTH_EXECUTE,
    resource: '*',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer'),
  },
  {
    action: PERMISSION_ACTION.FUNCTIONS_WRITE,
    resource: '*',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer'),
  },
  {
    action: PERMISSION_ACTION.FUNCTIONS_READ,
    resource: '*',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer', 'read_only'),
  },
  {
    action: PERMISSION_ACTION.REALTIME_ADMIN_READ,
    resource: '*',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer'),
  },
  {
    action: PERMISSION_ACTION.SECRETS_WRITE,
    resource: '*',
    scope: 'project',
    allowed: allowRoles('owner', 'admin'),
  },
  {
    action: PERMISSION_ACTION.SECRETS_READ,
    resource: '*',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer', 'read_only'),
  },
  {
    action: PERMISSION_ACTION.STORAGE_ADMIN_WRITE,
    resource: '*',
    scope: 'project',
    allowed: allowRoles('owner', 'admin'),
  },
  {
    action: PERMISSION_ACTION.STORAGE_ADMIN_READ,
    resource: '*',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer'),
  },
  {
    action: PERMISSION_ACTION.STORAGE_WRITE,
    resource: '*',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer'),
  },
  {
    action: PERMISSION_ACTION.READ,
    resource: 'api_keys',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer'),
  },
  {
    action: PERMISSION_ACTION.READ,
    resource: 'service_api_keys',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer'),
  },
  {
    action: PERMISSION_ACTION.READ,
    resource: 'auth_signing_keys',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer'),
  },
  {
    action: PERMISSION_ACTION.READ,
    resource: 'back_ups',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer', 'read_only'),
  },
  {
    action: PERMISSION_ACTION.READ,
    resource: 'physical_backups',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer', 'read_only'),
  },
  {
    action: PERMISSION_ACTION.UPDATE,
    resource: 'custom_config_gotrue',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer'),
  },
  {
    action: PERMISSION_ACTION.READ,
    resource: 'custom_config_gotrue',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer', 'read_only'),
  },
  {
    action: PERMISSION_ACTION.UPDATE,
    resource: 'custom_config_postgrest',
    scope: 'project',
    allowed: allowRoles('owner', 'admin'),
  },
  {
    action: PERMISSION_ACTION.READ,
    resource: 'custom_config_postgrest',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer', 'read_only'),
  },
  {
    action: PERMISSION_ACTION.READ,
    resource: 'field.jwt_secret',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer'),
  },
  {
    action: PERMISSION_ACTION.CREATE,
    resource: 'user_content',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer'),
  },
  {
    action: PERMISSION_ACTION.UPDATE,
    resource: 'user_content',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer'),
  },
  {
    action: PERMISSION_ACTION.READ,
    resource: 'user_content',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer', 'read_only'),
  },
  {
    action: PERMISSION_ACTION.TENANT_SQL_ADMIN_WRITE,
    resource: '*',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer'),
  },
  {
    action: PERMISSION_ACTION.TENANT_SQL_ADMIN_READ,
    resource: 'extensions',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer', 'read_only'),
  },
  {
    action: PERMISSION_ACTION.TENANT_SQL_ADMIN_READ,
    resource: 'functions',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer', 'read_only'),
  },
  {
    action: PERMISSION_ACTION.TENANT_SQL_ADMIN_READ,
    resource: 'policies',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer', 'read_only'),
  },
  {
    action: PERMISSION_ACTION.TENANT_SQL_ADMIN_READ,
    resource: 'publications',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer', 'read_only'),
  },
  {
    action: PERMISSION_ACTION.TENANT_SQL_ADMIN_READ,
    resource: 'tables',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer', 'read_only'),
  },
  {
    action: PERMISSION_ACTION.TENANT_SQL_ADMIN_READ,
    resource: 'triggers',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer', 'read_only'),
  },
  {
    action: PERMISSION_ACTION.TENANT_SQL_DELETE,
    resource: 'auth.mfa_factors',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer'),
  },
  {
    action: PERMISSION_ACTION.TENANT_SQL_DELETE,
    resource: 'auth.users',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer'),
  },
  {
    action: PERMISSION_ACTION.TENANT_SQL_QUERY,
    resource: '*',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer', 'read_only'),
  },
  {
    action: PERMISSION_ACTION.INFRA_EXECUTE,
    resource: 'queue_jobs.projects.pause',
    scope: 'project',
    allowed: allowRoles('owner', 'admin'),
  },
  {
    action: PERMISSION_ACTION.INFRA_EXECUTE,
    resource: 'queue_jobs.projects.initialize_or_resume',
    scope: 'project',
    allowed: allowRoles('owner', 'admin'),
  },
  {
    action: PERMISSION_ACTION.INFRA_EXECUTE,
    resource: 'queue_job.restore.prepare',
    scope: 'project',
    allowed: allowRoles('owner', 'admin'),
  },
  {
    action: PERMISSION_ACTION.INFRA_EXECUTE,
    resource: 'queue_job.walg.prepare_restore',
    scope: 'project',
    allowed: allowRoles('owner', 'admin'),
  },
  {
    action: PERMISSION_ACTION.INFRA_EXECUTE,
    resource: 'queue_job.projects.update_jwt',
    scope: 'project',
    allowed: allowRoles('owner', 'admin'),
  },
  {
    action: PERMISSION_ACTION.INFRA_EXECUTE,
    resource: 'reboot',
    scope: 'project',
    allowed: allowRoles('owner', 'admin', 'developer'),
  },
]

const toNumberArray = (value: unknown): number[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => {
      if (typeof entry === 'number') return entry
      if (typeof entry === 'string') {
        const parsed = Number.parseInt(entry, 10)
        return Number.isFinite(parsed) ? parsed : null
      }
      return null
    })
    .filter((entry): entry is number => entry != null)
}

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : null))
    .filter((entry): entry is string => !!entry && entry.length > 0)
}

const extractRoleScopedProjects = (
  metadata: Record<string, unknown> | null,
  roleId: number
): string[] => {
  if (!metadata) return []
  const scoped = metadata?.role_scoped_projects
  if (!scoped) return []
  if (Array.isArray(scoped)) {
    return toStringArray(scoped)
  }
  if (typeof scoped === 'object') {
    const entry = (scoped as Record<string, unknown>)[String(roleId)]
    return toStringArray(entry)
  }
  return []
}

const buildPermission = ({
  organizationId,
  organizationSlug,
  actions,
  resources,
  projectRefs,
  projectIds,
  condition = null,
}: {
  organizationId: number
  organizationSlug: string
  actions: readonly string[]
  resources: readonly string[]
  projectRefs: string[] | null
  projectIds: number[] | null
  condition?: AccessControlPermission['condition']
}): AccessControlPermission => ({
  actions: [...actions],
  condition,
  organization_id: organizationId,
  organization_slug: organizationSlug,
  project_ids: projectIds,
  project_refs: projectRefs,
  resources: [...resources],
  restrictive: false,
})

const buildWildcardPermission = ({
  organizationId,
  organizationSlug,
  projectRefs,
  projectIds,
}: {
  organizationId: number
  organizationSlug: string
  projectRefs: string[] | null
  projectIds: number[] | null
}): AccessControlPermission =>
  buildPermission({
    organizationId,
    organizationSlug,
    actions: WILDCARD,
    resources: WILDCARD,
    projectRefs,
    projectIds,
  })

const dedupePermissions = (permissions: AccessControlPermission[]) => {
  const map = new Map<string, AccessControlPermission>()
  for (const permission of permissions) {
    const key = JSON.stringify({
      actions: permission.actions,
      resources: permission.resources,
      organization_id: permission.organization_id,
      project_refs: permission.project_refs ?? null,
      project_ids: permission.project_ids ?? null,
      condition: permission.condition ?? null,
      restrictive: permission.restrictive ?? false,
    })
    if (!map.has(key)) {
      map.set(key, permission)
    }
  }
  return [...map.values()]
}

const groupRoleIdsByBaseRole = (rolesById: Map<number, RoleRow>) => {
  const buckets: Record<RoleKey, number[]> = {
    owner: [],
    admin: [],
    developer: [],
    read_only: [],
  }
  for (const role of rolesById.values()) {
    const key = BASE_ROLE_TO_KEY[role.base_role_id]
    if (key) buckets[key].push(role.id)
  }
  return buckets
}

const resolveProjectScope = ({
  membership,
  role,
  scopedRefs,
  projectsById,
  projectsByRef,
}: {
  membership: MembershipRow
  role: RoleRow
  scopedRefs: string[]
  projectsById: Map<number, ProjectRow>
  projectsByRef: Map<string, ProjectRow>
}): { refs: string[] | null; ids: number[] | null } => {
  const organizationId = membership.organization_id

  if (scopedRefs.length > 0) {
    const refs = scopedRefs.filter((ref) => {
      const project = projectsByRef.get(ref)
      return project && project.organization_id === organizationId
    })
    if (refs.length > 0) {
      const ids = refs
        .map((ref) => projectsByRef.get(ref))
        .filter((project): project is ProjectRow => project !== undefined)
        .map((project) => project.id)
      return { refs, ids }
    }
  }

  const projectIds = toNumberArray(role.project_ids)
  if (projectIds.length > 0) {
    const resolved = projectIds
      .map((id) => projectsById.get(id))
      .filter((project): project is ProjectRow => !!project && project.organization_id === organizationId)
    if (resolved.length > 0) {
      return {
        refs: resolved.map((project) => project.ref),
        ids: resolved.map((project) => project.id),
      }
    }
  }

  return { refs: null, ids: null }
}

const extractScopeArrays = (scope?: RoleScopes) => {
  if (!scope) return { refs: null, ids: null }
  const refs = scope.refs.size ? [...scope.refs].sort() : null
  const ids = scope.ids.size ? [...scope.ids].sort((a, b) => a - b) : null
  return { refs, ids }
}

export const listPermissionsForProfile = async (
  profileId: number
): Promise<AccessControlPermission[]> => {
  if (!profileId) return []

  const membershipsRaw = await db
    .selectFrom('organization_members as om')
    .innerJoin('organizations as org', 'org.id', 'om.organization_id')
    .select([
      'org.id as organization_id',
      'org.slug as organization_slug',
      'om.is_owner as is_owner',
      'om.role_ids as role_ids',
      'om.metadata as metadata',
    ])
    .where('om.profile_id', '=', profileId)
    .execute()

  if (membershipsRaw.length === 0) return []

  const memberships: MembershipRow[] = membershipsRaw.map((row) => ({
    organization_id: Number(row.organization_id),
    organization_slug: row.organization_slug,
    is_owner: Boolean(row.is_owner),
    role_ids: toNumberArray(row.role_ids ?? []),
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
  }))

  const roleIds = new Set<number>()
  const organizationIds = new Set<number>()
  memberships.forEach((membership) => {
    organizationIds.add(membership.organization_id)
    for (const roleId of membership.role_ids ?? []) {
      roleIds.add(roleId)
    }
  })

  const rolesRaw = roleIds.size
    ? await db
        .selectFrom('organization_roles')
        .select(['id', 'organization_id', 'base_role_id', 'project_ids'])
        .where('id', 'in', Array.from(roleIds))
        .execute()
    : []

  const rolesById = new Map<number, RoleRow>()
  rolesRaw.forEach((role) => {
    rolesById.set(Number(role.id), {
      id: Number(role.id),
      organization_id: Number(role.organization_id),
      base_role_id: Number(role.base_role_id),
      project_ids: role.project_ids ? toNumberArray(role.project_ids) : null,
    })
  })

  const projectsRaw = organizationIds.size
    ? await db
        .selectFrom('projects')
        .select(['id', 'organization_id', 'ref'])
        .where('organization_id', 'in', Array.from(organizationIds))
        .execute()
    : []

  const projectsById = new Map<number, ProjectRow>()
  const projectsByRef = new Map<string, ProjectRow>()
  projectsRaw.forEach((project) => {
    const normalized: ProjectRow = {
      id: Number(project.id),
      organization_id: Number(project.organization_id),
      ref: project.ref,
    }
    projectsById.set(normalized.id, normalized)
    projectsByRef.set(normalized.ref, normalized)
  })

  const permissions: AccessControlPermission[] = []
  const roleIdsByKey = groupRoleIdsByBaseRole(rolesById)

  for (const membership of memberships) {
    const organizationId = membership.organization_id
    const organizationSlug = membership.organization_slug

    const orgRoleFlags: Record<RoleKey, boolean> = {
      owner: membership.is_owner,
      admin: false,
      developer: false,
      read_only: false,
    }

    const projectScopes: Record<RoleKey, RoleScopes> = {
      owner: { refs: new Set(), ids: new Set() },
      admin: { refs: new Set(), ids: new Set() },
      developer: { refs: new Set(), ids: new Set() },
      read_only: { refs: new Set(), ids: new Set() },
    }

    for (const roleId of membership.role_ids ?? []) {
      const role = rolesById.get(roleId)
      if (!role) continue
      const key = BASE_ROLE_TO_KEY[role.base_role_id]
      if (!key) continue

      const scopedRefs = extractRoleScopedProjects(membership.metadata, role.id)
      const hasScopedRefs = scopedRefs.length > 0
      const hasScopedIds = Array.isArray(role.project_ids) && role.project_ids.length > 0

      if (!hasScopedRefs && !hasScopedIds) {
        orgRoleFlags[key] = true
        continue
      }

      const { refs, ids } = resolveProjectScope({
        membership,
        role,
        scopedRefs,
        projectsById,
        projectsByRef,
      })

      if (refs) refs.forEach((ref) => projectScopes[key].refs.add(ref))
      if (ids) ids.forEach((id) => projectScopes[key].ids.add(id))
    }

    if (orgRoleFlags.owner) {
      permissions.push(
        buildWildcardPermission({
          organizationId,
          organizationSlug,
          projectRefs: null,
          projectIds: null,
        })
      )
    }

    const ownerScope = extractScopeArrays(projectScopes.owner)
    if (ownerScope.refs || ownerScope.ids) {
      permissions.push(
        buildWildcardPermission({
          organizationId,
          organizationSlug,
          projectRefs: ownerScope.refs,
          projectIds: ownerScope.ids,
        })
      )
    }

    for (const template of ORGANIZATION_PERMISSION_TEMPLATES) {
      for (const roleKey of Object.keys(projectScopes) as RoleKey[]) {
        if (!template.allowed[roleKey]) continue
        if (roleKey === 'owner' && !orgRoleFlags.owner) continue
        if (roleKey !== 'owner' && !orgRoleFlags[roleKey]) continue
        permissions.push(
          buildPermission({
            organizationId,
            organizationSlug,
            actions: [template.action],
            resources: [template.resource],
            projectRefs: null,
            projectIds: null,
          })
        )
        break
      }
    }

    for (const template of PROJECT_PERMISSION_TEMPLATES) {
      for (const roleKey of Object.keys(projectScopes) as RoleKey[]) {
        if (!template.allowed[roleKey]) continue
        const scope = extractScopeArrays(projectScopes[roleKey])
        const hasOrgRole = orgRoleFlags[roleKey]

        if (hasOrgRole) {
          permissions.push(
            buildPermission({
              organizationId,
              organizationSlug,
              actions: [template.action],
              resources: [template.resource],
              projectRefs: null,
              projectIds: null,
            })
          )
        }

        if (scope.refs || scope.ids) {
          permissions.push(
            buildPermission({
              organizationId,
              organizationSlug,
              actions: [template.action],
              resources: [template.resource],
              projectRefs: scope.refs,
              projectIds: scope.ids,
            })
          )
        }
      }
    }

    const addRoleCondition = (ids: number[]) =>
      ids.length > 0
        ? {
            in: [{ var: 'resource.role_id' }, ids],
          }
        : null

    if (orgRoleFlags.owner) {
      const allowIds = [
        ...roleIdsByKey.owner,
        ...roleIdsByKey.admin,
        ...roleIdsByKey.developer,
        ...roleIdsByKey.read_only,
      ]
      if (allowIds.length > 0) {
        permissions.push(
          buildPermission({
            organizationId,
            organizationSlug,
            actions: [PERMISSION_ACTION.CREATE],
            resources: ['auth.subject_roles'],
            projectRefs: null,
            projectIds: null,
            condition: addRoleCondition(allowIds),
          })
        )
        permissions.push(
          buildPermission({
            organizationId,
            organizationSlug,
            actions: [PERMISSION_ACTION.DELETE],
            resources: ['auth.subject_roles'],
            projectRefs: null,
            projectIds: null,
            condition: addRoleCondition(allowIds),
          })
        )
      }
    }

    if (orgRoleFlags.admin) {
      const allowIds = [
        ...roleIdsByKey.admin,
        ...roleIdsByKey.developer,
        ...roleIdsByKey.read_only,
      ]
      if (allowIds.length > 0) {
        permissions.push(
          buildPermission({
            organizationId,
            organizationSlug,
            actions: [PERMISSION_ACTION.CREATE],
            resources: ['auth.subject_roles'],
            projectRefs: null,
            projectIds: null,
            condition: addRoleCondition(allowIds),
          })
        )
        permissions.push(
          buildPermission({
            organizationId,
            organizationSlug,
            actions: [PERMISSION_ACTION.DELETE],
            resources: ['auth.subject_roles'],
            projectRefs: null,
            projectIds: null,
            condition: addRoleCondition(allowIds),
          })
        )
      }
    }

    if (orgRoleFlags.owner || orgRoleFlags.admin) {
      permissions.push(
        buildPermission({
          organizationId,
          organizationSlug,
          actions: [PERMISSION_ACTION.DELETE],
          resources: ['user_invites'],
          projectRefs: null,
          projectIds: null,
        })
      )
    }
  }

  return dedupePermissions(permissions)
}
