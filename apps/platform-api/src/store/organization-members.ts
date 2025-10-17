import { getPlatformDb } from '../db/client.js'
import { DEFAULT_PRIMARY_EMAIL, DEFAULT_USERNAME } from '../config/defaults.js'
import type {
  OrganizationInvitationsResponse,
  OrganizationMember,
  OrganizationRolesResponse,
  OrgDailyUsageResponse,
} from './types.js'

const db = getPlatformDb()

const nowIso = () => new Date().toISOString()

export const listOrganizationMembers = async (slug: string): Promise<OrganizationMember[]> => {
  const organization = await db
    .selectFrom('organizations')
    .select(['id'])
    .where('slug', '=', slug)
    .executeTakeFirst()
  if (!organization) return []

  const rows = await db
    .selectFrom('organization_members')
    .innerJoin('profiles', 'profiles.id', 'organization_members.profile_id')
    .select([
      'organization_members.role_ids',
      'organization_members.metadata',
      'organization_members.mfa_enabled',
      'profiles.gotrue_id',
      'profiles.primary_email',
      'profiles.username',
      'profiles.is_sso_user',
    ])
    .where('organization_members.organization_id', '=', organization.id)
    .execute()

  return rows.map((row) => ({
    gotrue_id: row.gotrue_id,
    is_sso_user: row.is_sso_user,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    mfa_enabled: row.mfa_enabled,
    primary_email: row.primary_email ?? DEFAULT_PRIMARY_EMAIL,
    role_ids: row.role_ids ?? [],
    username: row.username ?? DEFAULT_USERNAME,
  }))
}

export const listOrganizationRoles = async (slug: string): Promise<OrganizationRolesResponse> => {
  const organization = await db
    .selectFrom('organizations')
    .select(['id'])
    .where('slug', '=', slug)
    .executeTakeFirst()
  if (!organization) {
    return { org_scoped_roles: [], project_scoped_roles: [] }
  }

  const roles = await db
    .selectFrom('organization_roles')
    .select(['id', 'base_role_id', 'name', 'description', 'project_ids'])
    .where('organization_id', '=', organization.id)
    .execute()

  return {
    org_scoped_roles: roles.map((role) => ({
      base_role_id: role.base_role_id,
      description: role.description ?? '',
      id: role.id,
      name: role.name,
      project_ids: role.project_ids ?? null,
    })),
    project_scoped_roles: [],
  }
}

export const listOrganizationInvitations = async (
  slug: string
): Promise<OrganizationInvitationsResponse> => {
  const organization = await db
    .selectFrom('organizations')
    .select(['id'])
    .where('slug', '=', slug)
    .executeTakeFirst()
  if (!organization) {
    return { invitations: [] }
  }

  const invitations = await db
    .selectFrom('organization_invitations')
    .select(['id', 'invited_email', 'role_id', 'invited_at'])
    .where('organization_id', '=', organization.id)
    .execute()

  const filtered = invitations.filter((invitation) => invitation.role_id !== null)

  return {
    invitations: filtered.map((invitation) => ({
      id: invitation.id,
      invited_at: invitation.invited_at.toISOString(),
      invited_email: invitation.invited_email,
      role_id: invitation.role_id as number,
    })),
  }
}

export const listOrganizationDailyUsage = async (
  slug: string,
  _start?: string,
  _end?: string
): Promise<OrgDailyUsageResponse | undefined> => {
  const organization = await db
    .selectFrom('organizations')
    .select(['id'])
    .where('slug', '=', slug)
    .executeTakeFirst()

  if (!organization) {
    return undefined
  }

  return {
    usages: [
      {
        metric: 'EGRESS',
        date: nowIso(),
        usage: 0,
        usage_original: 0,
        available_in_plan: true,
        capped: false,
        cost: 0,
        breakdown: {
          egress_function: 0,
          egress_graphql: 0,
          egress_logdrain: 0,
          egress_realtime: 0,
          egress_rest: 0,
          egress_storage: 0,
          egress_supavisor: 0,
        },
      },
    ],
  }
}
