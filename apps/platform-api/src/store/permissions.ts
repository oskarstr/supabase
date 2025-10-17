import { constants } from '@supabase/shared-types'
import { getPlatformDb } from '../db/client.js'
import {
  PERMISSION_MATRIX,
  type PermissionRoleKey,
} from '../config/permission-matrix.js'
import type { AccessControlPermission } from './types.js'

const db = getPlatformDb()
const { PermissionAction } = constants
type PermissionActionValue = (typeof PermissionAction)[keyof typeof PermissionAction]

const READ_ONLY_ALLOWED_ACTIONS = new Set<PermissionActionValue>([
  PermissionAction.READ,
  PermissionAction.ANALYTICS_READ,
  PermissionAction.ANALYTICS_ADMIN_READ,
  PermissionAction.BILLING_READ,
  PermissionAction.FUNCTIONS_READ,
  PermissionAction.REALTIME_ADMIN_READ,
  PermissionAction.REPLICATION_ADMIN_READ,
  PermissionAction.SECRETS_READ,
  PermissionAction.STORAGE_ADMIN_READ,
  PermissionAction.STORAGE_READ,
  PermissionAction.TENANT_SQL_ADMIN_READ,
  PermissionAction.TENANT_SQL_QUERY,
  PermissionAction.TENANT_SQL_SELECT,
  PermissionAction.SQL_SELECT,
])

const normalizeResource = (resource: string) => (resource === '*' ? '%' : resource)

const ORGANIZATION_ENTRIES = PERMISSION_MATRIX.filter((entry) => entry.scope === 'organization')
const PROJECT_ENTRIES = PERMISSION_MATRIX.filter((entry) => entry.scope === 'project')

for (const entry of PERMISSION_MATRIX) {
  if (entry.roles.includes('read_only') && !READ_ONLY_ALLOWED_ACTIONS.has(entry.action)) {
    throw new Error(
      `Permission matrix assigns disallowed action ${entry.action} to read_only role for ${entry.resource}`
    )
  }
}

type RoleKey = PermissionRoleKey
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

    for (const entry of ORGANIZATION_ENTRIES) {
      const hasAccess = entry.roles.some((roleKey) =>
        roleKey === 'owner' ? orgRoleFlags.owner : orgRoleFlags[roleKey]
      )
      if (!hasAccess) continue

      permissions.push(
        buildPermission({
          organizationId,
          organizationSlug,
          actions: [entry.action],
          resources: [normalizeResource(entry.resource)],
          projectRefs: null,
          projectIds: null,
        })
      )
    }

    for (const entry of PROJECT_ENTRIES) {
      let globalGranted = false

      for (const roleKey of entry.roles) {
        const hasOrgRole = roleKey === 'owner' ? orgRoleFlags.owner : orgRoleFlags[roleKey]
        const scope = extractScopeArrays(projectScopes[roleKey])

        if (hasOrgRole && !globalGranted) {
          permissions.push(
            buildPermission({
              organizationId,
              organizationSlug,
              actions: [entry.action],
              resources: [normalizeResource(entry.resource)],
              projectRefs: null,
              projectIds: null,
            })
          )
          globalGranted = true
        }

        if (scope.refs || scope.ids) {
          permissions.push(
            buildPermission({
              organizationId,
              organizationSlug,
              actions: [entry.action],
              resources: [normalizeResource(entry.resource)],
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
            actions: [PermissionAction.CREATE],
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
            actions: [PermissionAction.DELETE],
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
            actions: [PermissionAction.CREATE],
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
            actions: [PermissionAction.DELETE],
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
          actions: [PermissionAction.DELETE],
          resources: ['user_invites'],
          projectRefs: null,
          projectIds: null,
        })
      )
    }
  }

  return dedupePermissions(permissions)
}
