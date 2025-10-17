import { randomUUID } from 'node:crypto'

import isEmail from 'validator/lib/isEmail.js'
import normalizeEmail from 'validator/lib/normalizeEmail.js'

import type { Insertable } from 'kysely'
import { getPlatformDb } from '../db/client.js'
import { DEFAULT_PRIMARY_EMAIL, DEFAULT_USERNAME } from '../config/defaults.js'
import type { PlatformDatabase } from '../db/schema.js'
import type {
  OrganizationInvitationsResponse,
  OrganizationMember,
  OrganizationRolesResponse,
  OrgDailyUsageResponse,
  Profile,
} from './types.js'

const db = getPlatformDb()

const nowIso = () => new Date().toISOString()

const mergeRoleIds = (...roleSets: Array<readonly unknown[] | null | undefined>): number[] => {
  const seen = new Set<number>()
  for (const roles of roleSets) {
    if (!Array.isArray(roles)) continue
    for (const role of roles) {
      const value = Number(role)
      if (Number.isFinite(value)) {
        seen.add(value)
      }
    }
  }
  return Array.from(seen).sort((a, b) => a - b)
}

const sanitizeProjectList = (projects: unknown): string[] => {
  if (!Array.isArray(projects)) return []
  const set = new Set<string>()
  for (const entry of projects) {
    if (typeof entry !== 'string') continue
    const trimmed = entry.trim()
    if (trimmed.length > 0) {
      set.add(trimmed)
    }
  }
  return Array.from(set)
}

const toRoleScopedRecord = (value: unknown): Record<string, string[]> => {
  if (!value) return {}
  if (Array.isArray(value)) {
    const sanitized = sanitizeProjectList(value)
    return sanitized.length > 0 ? { legacy: sanitized } : {}
  }

  if (typeof value === 'object') {
    const result: Record<string, string[]> = {}
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      const sanitized = sanitizeProjectList(entry)
      if (sanitized.length > 0) {
        result[key] = sanitized
      }
    }
    return result
  }

  return {}
}

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

const nextInvitationId = async () => {
  const maxRow = await db
    .selectFrom('organization_invitations')
    .select(({ fn }) => fn.max('id').as('max_id'))
    .executeTakeFirst()
  return Number(maxRow?.max_id ?? 0) + 1
}

const invitationSelectFields = [
  'id',
  'invited_email',
  'role_id',
  'invited_at',
  'metadata',
  'token',
  'expires_at',
  'accepted_at',
  'invited_by_profile_id',
] as const

type InvitationOutput = {
  id: number
  invited_at: string
  invited_email: string
  role_id: number
  metadata: Record<string, unknown>
  token: string
  expires_at: string | null
  accepted_at: string | null
  invited_by_profile_id: number | null
}

const mapInvitationRow = (row: {
  id: number
  invited_email: string
  role_id: number | null
  invited_at: Date
  metadata?: unknown
  token: string
  expires_at: Date | null
  accepted_at: Date | null
  invited_by_profile_id: number | null
}): InvitationOutput => ({
  id: row.id,
  invited_at: row.invited_at.toISOString(),
  invited_email: row.invited_email,
  role_id: Number(row.role_id ?? 0),
  metadata: (row.metadata as Record<string, unknown>) ?? {},
  token: row.token,
  expires_at: row.expires_at ? row.expires_at.toISOString() : null,
  accepted_at: row.accepted_at ? row.accepted_at.toISOString() : null,
  invited_by_profile_id: row.invited_by_profile_id,
})

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
  const normalized = toRoleScopedRecord(cloned[key])

  if (Array.isArray(scopedProjects)) {
    const sanitized = sanitizeProjectList(scopedProjects)
    if (sanitized.length > 0) {
      normalized[String(roleId)] = sanitized
    } else {
      delete normalized[String(roleId)]
    }
  } else {
    delete normalized[String(roleId)]
  }

  if (Object.keys(normalized).length > 0) {
    cloned[key] = normalized
  } else {
    delete cloned[key]
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
    role_ids: mergeRoleIds(row.member_role_ids ?? []),
  }
}

const composeMemberMetadata = (
  current: Record<string, unknown>,
  roleId: number,
  scopedProjects?: string[] | null
) => {
  return updateRoleScopedMetadata(
    { ...current },
    roleId,
    scopedProjects === null ? undefined : scopedProjects
  )
}

const extractRoleScopedProjects = (
  metadata: Record<string, unknown>,
  roleId: number
) => {
  const value = metadata.role_scoped_projects
  if (Array.isArray(value)) {
    return value
  }
  if (value && typeof value === 'object') {
    const scoped = (value as Record<string, unknown>)[String(roleId)]
    if (Array.isArray(scoped)) {
      return scoped as string[]
    }
  }
  return undefined
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
  const nextRoleIds = mergeRoleIds(existing?.role_ids ?? [], [roleId])

  if (existing) {
    await db
      .updateTable('organization_members')
      .set({
        role_ids: nextRoleIds,
        metadata,
        updated_at: nowIso(),
      })
      .where('id', '=', existing.id)
      .execute()
  } else {
    let values: Insertable<PlatformDatabase['organization_members']> = {
      organization_id: organizationId,
      profile_id: targetProfile.id,
      role_ids: nextRoleIds,
      metadata,
      mfa_enabled: false,
      is_owner: false,
    }

    if (isPgMem()) {
      values = { ...values, id: await nextMemberId() }
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
    .select(invitationSelectFields)
    .where('organization_id', '=', organizationId)
    .where('invited_email', '=', normalizedEmail)
    .executeTakeFirst()

  const baseMetadata =
    (existingInvitation?.metadata as Record<string, unknown> | null | undefined) ?? {}

  let metadata = updateRoleScopedMetadata(
    { ...baseMetadata },
    roleId,
    options.roleScopedProjects
  )
  metadata.invited_by_profile_id = options.invitedByProfileId ?? null

  const token = randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  if (existingInvitation) {
    const updated = await db
      .updateTable('organization_invitations')
      .set({
        role_id: roleId,
        invited_at: new Date().toISOString(),
        metadata,
        token,
        expires_at: expiresAt.toISOString(),
        accepted_at: null,
        invited_by_profile_id: options.invitedByProfileId ?? null,
      })
      .where('id', '=', existingInvitation.id)
      .returning(invitationSelectFields)
      .executeTakeFirstOrThrow()

    return mapInvitationRow(updated)
  }

  let values: Insertable<PlatformDatabase['organization_invitations']> = {
    organization_id: organizationId,
    invited_email: normalizedEmail,
    role_id: roleId,
    invited_at: new Date().toISOString(),
    metadata,
    token,
    expires_at: expiresAt.toISOString(),
    accepted_at: null,
    invited_by_profile_id: options.invitedByProfileId ?? null,
  }

  if (isPgMem()) {
    values = { ...values, id: await nextInvitationId() }
  }

  const inserted = await db
    .insertInto('organization_invitations')
    .values(values)
    .returning(invitationSelectFields)
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

const loadInvitationByToken = async (organizationId: number, token: string) =>
  db
    .selectFrom('organization_invitations')
    .select(invitationSelectFields)
    .where('organization_id', '=', organizationId)
    .where('token', '=', token)
    .executeTakeFirst()

export type InvitationTokenLookup = {
  authorized_user: boolean
  email_match: boolean
  expired_token: boolean
  invite_id?: number
  organization_name: string
  sso_mismatch: boolean
  token_does_not_exist: boolean
}

const defaultInvitationLookup = (organizationName: string): InvitationTokenLookup => ({
  authorized_user: false,
  email_match: false,
  expired_token: false,
  invite_id: undefined,
  organization_name: organizationName,
  sso_mismatch: false,
  token_does_not_exist: true,
})

export const getInvitationByToken = async (
  slug: string,
  token: string,
  profile: Profile
): Promise<InvitationTokenLookup> => {
  const organization = await db
    .selectFrom('organizations')
    .select(['id', 'name'])
    .where('slug', '=', slug)
    .executeTakeFirst()

  if (!organization) {
    throw new InvitationError('Organization not found')
  }

  const invitation = await loadInvitationByToken(organization.id, token)
  if (!invitation || invitation.accepted_at) {
    return defaultInvitationLookup(organization.name)
  }

  const expired = Boolean(
    invitation.expires_at && invitation.expires_at.getTime() <= Date.now()
  )
  const emailMatch =
    profile.primary_email?.toLowerCase() === invitation.invited_email.toLowerCase()

  return {
    authorized_user: emailMatch && !expired,
    email_match: emailMatch,
    expired_token: expired,
    invite_id: invitation.id,
    organization_name: organization.name,
    sso_mismatch: false,
    token_does_not_exist: false,
  }
}

export const acceptInvitationByToken = async (
  slug: string,
  token: string,
  profile: Profile
): Promise<{
  organizationId: number
  invitationId: number
  roleId: number
  profileId: number
  roleScopedProjects: string[] | null
}> => {
  const organization = await db
    .selectFrom('organizations')
    .select(['id'])
    .where('slug', '=', slug)
    .executeTakeFirst()

  if (!organization) {
    throw new InvitationError('Organization not found')
  }

    const invitation = await loadInvitationByToken(organization.id, token)
  if (!invitation || invitation.accepted_at) {
    throw new InvitationError('Invitation is no longer valid')
  }

  if (invitation.expires_at && invitation.expires_at.getTime() <= Date.now()) {
    throw new InvitationError('Invitation has expired')
  }

  const normalizedProfileEmail = profile.primary_email?.toLowerCase() ?? ''
  if (normalizedProfileEmail !== invitation.invited_email.toLowerCase()) {
    throw new InvitationError('Invitation email does not match the authenticated user')
  }

  const invitationRoleId = Number(invitation.role_id ?? 0)
  if (!Number.isFinite(invitationRoleId) || invitationRoleId <= 0) {
    throw new InvitationError('Invitation role is no longer available')
  }

  const existingRole = await loadOrgRole(organization.id, invitationRoleId)
  if (!existingRole) {
    throw new InvitationError('Invitation role is no longer available')
  }

  return db.transaction().execute(async (trx) => {
    const existingMember = await trx
      .selectFrom('organization_members')
      .select(['id', 'metadata', 'role_ids'])
      .where('organization_id', '=', organization.id)
      .where('profile_id', '=', profile.id)
      .executeTakeFirst()

    const invitationMetadata = (invitation.metadata as Record<string, unknown>) ?? {}
    const scopedProjects =
      extractRoleScopedProjects(invitationMetadata, invitationRoleId) ?? null

    if (existingMember) {
      const existingMetadata = (existingMember.metadata as Record<string, unknown>) ?? {}
      const mergedMetadata = composeMemberMetadata(
        existingMetadata,
        invitationRoleId,
        scopedProjects
      )
      const mergedRoleIds = mergeRoleIds(existingMember.role_ids ?? [], [
        invitationRoleId,
      ])

      await trx
        .updateTable('organization_members')
        .set({
          role_ids: mergedRoleIds,
          metadata: mergedMetadata,
          updated_at: nowIso(),
        })
        .where('id', '=', existingMember.id)
        .execute()
    } else {
      const newMetadata = composeMemberMetadata(
        invitationMetadata,
        invitationRoleId,
        scopedProjects
      )
      const newRoleIds = mergeRoleIds([invitationRoleId])

      let values: Insertable<PlatformDatabase['organization_members']> = {
        organization_id: organization.id,
        profile_id: profile.id,
        role_ids: newRoleIds,
        metadata: newMetadata,
        mfa_enabled: false,
        is_owner: false,
      }

      if (isPgMem()) {
        const nextIdRow = await trx
          .selectFrom('organization_members')
          .select(({ fn }) => fn.max('id').as('max_id'))
          .executeTakeFirst()
        values = { ...values, id: Number(nextIdRow?.max_id ?? 0) + 1 }
      }

      await trx.insertInto('organization_members').values(values).execute()
    }

    await trx
      .updateTable('organization_invitations')
      .set({
        accepted_at: nowIso(),
      })
      .where('id', '=', invitation.id)
      .execute()

    return {
      organizationId: organization.id,
      invitationId: invitation.id,
      roleId: invitationRoleId,
      profileId: profile.id,
      roleScopedProjects: scopedProjects,
    }
  })
}
