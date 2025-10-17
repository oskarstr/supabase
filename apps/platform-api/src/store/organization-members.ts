import isEmail from 'validator/lib/isEmail.js'
import normalizeEmail from 'validator/lib/normalizeEmail.js'

import { getPlatformDb } from '../db/client.js'
import { DEFAULT_PRIMARY_EMAIL, DEFAULT_USERNAME } from '../config/defaults.js'
import type {
  OrganizationInvitationsResponse,
  OrganizationMember,
  OrganizationRolesResponse,
  OrgDailyUsageResponse,
  Profile,
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

const isPgMem = () => process.env.PLATFORM_DB_URL === 'pg-mem'

const nextMemberId = async () => {
  const maxRow = await db
    .selectFrom('organization_members')
    .select(({ fn }) => fn.max('id').as('max_id'))
    .executeTakeFirst()
  return Number(maxRow?.max_id ?? 0) + 1
}

const loadOrganizationId = async (slug: string) => {
  const organization = await db
    .selectFrom('organizations')
    .select(['id'])
    .where('slug', '=', slug)
    .executeTakeFirst()
  return organization?.id ?? null
}

const loadMemberRow = async (organizationId: number, profileId: number) =>
  db
    .selectFrom('organization_members')
    .selectAll()
    .where('organization_id', '=', organizationId)
    .where('profile_id', '=', profileId)
    .executeTakeFirst()

const loadMemberByGotrueId = async (organizationId: number, gotrueId: string) =>
  db
    .selectFrom('organization_members')
    .innerJoin('profiles', 'profiles.id', 'organization_members.profile_id')
    .select([
      'organization_members.id as member_id',
      'organization_members.role_ids as member_role_ids',
      'organization_members.metadata as member_metadata',
      'organization_members.mfa_enabled as member_mfa_enabled',
      'organization_members.is_owner as member_is_owner',
      'organization_members.inserted_at as member_inserted_at',
      'organization_members.updated_at as member_updated_at',
      'profiles.id as profile_id',
      'profiles.gotrue_id as gotrue_id',
      'profiles.username as username',
      'profiles.primary_email as primary_email',
      'profiles.is_sso_user as is_sso_user',
    ])
    .where('organization_members.organization_id', '=', organizationId)
    .where('profiles.gotrue_id', '=', gotrueId)
    .executeTakeFirst()

const loadOrgRole = async (organizationId: number, roleId: number) =>
  db
    .selectFrom('organization_roles')
    .select(['id'])
    .where('organization_id', '=', organizationId)
    .where('id', '=', roleId)
    .executeTakeFirst()

const updateRoleScopedMetadata = (
  metadata: Record<string, unknown>,
  roleId: number,
  scopedProjects?: string[]
) => {
  if (scopedProjects === undefined) return metadata

  const cloned = { ...metadata }
  const key = 'role_scoped_projects'
  const existing = (cloned[key] as Record<string, string[]>) ?? {}
  if (Array.isArray(scopedProjects)) {
    cloned[key] = { ...existing, [String(roleId)]: scopedProjects }
  } else {
    cloned[key] = existing
  }
  return cloned
}

const mapMemberRowToOrganizationMember = (
  row:
    | Awaited<ReturnType<typeof loadMemberByGotrueId>>
    | undefined
): OrganizationMember | null => {
  if (!row) return null

  return {
    gotrue_id: row.gotrue_id,
    primary_email: row.primary_email ?? DEFAULT_PRIMARY_EMAIL,
    username: row.username ?? DEFAULT_USERNAME,
    is_sso_user: row.is_sso_user ?? false,
    metadata: (row.member_metadata as Record<string, unknown>) ?? {},
    mfa_enabled: row.member_mfa_enabled ?? false,
    role_ids: row.member_role_ids ?? [],
  }
}

const normalizeEmailAddress = (raw: string) => {
  const trimmed = raw.trim()
  const normalized = normalizeEmail(trimmed, {
    gmail_remove_dots: false,
    gmail_remove_subaddress: false,
    outlookdotcom_remove_subaddress: false,
    yahoo_remove_subaddress: false,
    icloud_remove_subaddress: false,
    all_lowercase: true,
  })
  return (normalized ?? trimmed).toLowerCase()
}

const nextInvitationId = async () => {
  const maxRow = await db
    .selectFrom('organization_invitations')
    .select(({ fn }) => fn.max('id').as('max_id'))
    .executeTakeFirst()
  return Number(maxRow?.max_id ?? 0) + 1
}

const mapInvitationRow = (row: {
  id: number
  invited_email: string
  role_id: number | null
  invited_at: Date
  metadata?: unknown
}): InvitationOutput => ({
  id: row.id,
  invited_at: row.invited_at.toISOString(),
  invited_email: row.invited_email,
  role_id: Number(row.role_id ?? 0),
  metadata: (row.metadata as Record<string, unknown>) ?? {},
})

type InvitationOutput = OrganizationInvitationsResponse['invitations'][number] & {
  metadata: Record<string, unknown>
}

export class InvitationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvitationError'
  }
}

export const upsertOrganizationMemberRole = async (
  slug: string,
  targetProfile: Profile,
  roleId: number,
  roleScopedProjects?: string[]
): Promise<OrganizationMember | null> => {
  const organizationId = await loadOrganizationId(slug)
  if (!organizationId) {
    return null
  }

  const role = await loadOrgRole(organizationId, roleId)
  if (!role) {
    throw new Error('Role does not exist for this organization')
  }

  const existing = await loadMemberRow(organizationId, targetProfile.id)
  const metadata = updateRoleScopedMetadata(
    ((existing?.metadata as Record<string, unknown>) ?? {}) as Record<string, unknown>,
    roleId,
    roleScopedProjects
  )

  if (existing) {
    await db
      .updateTable('organization_members')
      .set({
        role_ids: [roleId],
        metadata,
        updated_at: nowIso(),
      })
      .where('id', '=', existing.id)
      .execute()
  } else {
    const values: Record<string, unknown> = {
      organization_id: organizationId,
      profile_id: targetProfile.id,
      role_ids: [roleId],
      metadata,
      mfa_enabled: false,
      is_owner: false,
    }

    if (isPgMem()) {
      values.id = await nextMemberId()
    }

    await db.insertInto('organization_members').values(values).execute()
  }

  const row = await loadMemberByGotrueId(organizationId, targetProfile.gotrue_id)
  return mapMemberRowToOrganizationMember(row)
}

export const deleteOrganizationMember = async (
  slug: string,
  targetProfile: Profile
): Promise<boolean> => {
  const organizationId = await loadOrganizationId(slug)
  if (!organizationId) {
    return false
  }

  const existing = await loadMemberRow(organizationId, targetProfile.id)
  if (!existing) {
    return false
  }
  if (existing.is_owner) {
    throw new Error('Cannot remove organization owner')
  }

  await db
    .deleteFrom('organization_members')
    .where('id', '=', existing.id)
    .execute()
  return true
}

export const createOrganizationInvitation = async (
  slug: string,
  email: string,
  roleId: number,
  options: { invitedByProfileId?: number; roleScopedProjects?: string[] } = {}
): Promise<InvitationOutput> => {
  const organizationId = await loadOrganizationId(slug)
  if (!organizationId) {
    throw new InvitationError('Organization not found')
  }

  const normalizedEmail = normalizeEmailAddress(email)
  if (!isEmail(normalizedEmail)) {
    throw new InvitationError('A valid email address is required')
  }

  const role = await loadOrgRole(organizationId, roleId)
  if (!role) {
    throw new InvitationError('Role does not exist for this organization')
  }

  const existingMember = await db
    .selectFrom('organization_members')
    .innerJoin('profiles', 'profiles.id', 'organization_members.profile_id')
    .select(['profiles.primary_email'])
    .where('organization_members.organization_id', '=', organizationId)
    .where('profiles.primary_email', '=', normalizedEmail)
    .executeTakeFirst()

  if (existingMember) {
    throw new InvitationError('A member with this email already exists in the organization')
  }

  const existingInvitation = await db
    .selectFrom('organization_invitations')
    .selectAll()
    .where('organization_id', '=', organizationId)
    .where('invited_email', '=', normalizedEmail)
    .executeTakeFirst()

  const metadata = {
    ...(existingInvitation?.metadata as Record<string, unknown> | undefined),
    role_scoped_projects: options.roleScopedProjects ?? null,
    invited_by_profile_id: options.invitedByProfileId ?? null,
  }

  if (existingInvitation) {
    const updated = await db
      .updateTable('organization_invitations')
      .set({
        role_id: roleId,
        invited_at: new Date().toISOString(),
        metadata,
      })
      .where('id', '=', existingInvitation.id)
      .returning([
        'id',
        'invited_email',
        'role_id',
        'invited_at',
        'metadata',
      ])
      .executeTakeFirstOrThrow()

    return mapInvitationRow(updated)
  }

  const values: Record<string, unknown> = {
    organization_id: organizationId,
    invited_email: normalizedEmail,
    role_id: roleId,
    invited_at: new Date().toISOString(),
    metadata,
  }

  if (isPgMem()) {
    values.id = await nextInvitationId()
  }

  const inserted = await db
    .insertInto('organization_invitations')
    .values(values)
    .returning(['id', 'invited_email', 'role_id', 'invited_at', 'metadata'])
    .executeTakeFirstOrThrow()

  return mapInvitationRow(inserted)
}

export const deleteOrganizationInvitationById = async (
  slug: string,
  invitationId: number
): Promise<boolean> => {
  const organizationId = await loadOrganizationId(slug)
  if (!organizationId) {
    return false
  }

  const deleted = await db
    .deleteFrom('organization_invitations')
    .where('organization_id', '=', organizationId)
    .where('id', '=', invitationId)
    .executeTakeFirst()

  return Boolean(deleted?.numDeletedRows)
}
