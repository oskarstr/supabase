import { getPlatformDb } from '../db/client.js'
import { toProfile } from '../db/mappers.js'
import {
  baseProfile,
  DEFAULT_FIRST_NAME,
  DEFAULT_LAST_NAME,
  DEFAULT_PRIMARY_EMAIL,
  DEFAULT_USERNAME,
} from '../config/defaults.js'
import { appendAuditLog } from './audit-logs.js'
import type { Profile } from './types.js'

const db = getPlatformDb()

export class ProfileAlreadyExistsError extends Error {
  constructor(message = 'Profile already exists') {
    super(message)
    this.name = 'ProfileAlreadyExistsError'
  }
}

export class ProfileNotFoundError extends Error {
  constructor(message = "User's profile not found") {
    super(message)
    this.name = 'ProfileNotFoundError'
  }
}

const selectProfile = () =>
  db
    .selectFrom('profiles')
    .select([
      'id',
      'gotrue_id',
      'auth0_id',
      'username',
      'first_name',
      'last_name',
      'primary_email',
      'mobile',
      'free_project_limit',
      'is_alpha_user',
      'is_sso_user',
      'disabled_features',
    ])

const findProfileRow = async (gotrueId: string) =>
  selectProfile().where('gotrue_id', '=', gotrueId).executeTakeFirst()

const deriveUsername = (email?: string | null, fallback?: string) => {
  if (email && email.includes('@')) {
    const candidate = email.split('@')[0]?.trim()
    if (candidate) return candidate
  }
  if (fallback && fallback.length > 0) return fallback
  return `user-${Math.random().toString(36).slice(2, 10)}`
}

const buildProfileDefaults = (email?: string | null) => ({
  auth0_id: null,
  username: deriveUsername(email, DEFAULT_USERNAME),
  first_name: DEFAULT_FIRST_NAME ?? '',
  last_name: DEFAULT_LAST_NAME ?? '',
  primary_email: email ?? DEFAULT_PRIMARY_EMAIL,
  mobile: null,
  free_project_limit: baseProfile.free_project_limit,
  is_alpha_user: baseProfile.is_alpha_user,
  is_sso_user: baseProfile.is_sso_user,
  disabled_features: baseProfile.disabled_features ?? [],
})

export const getProfileByGotrueId = async (gotrueId: string): Promise<Profile | null> => {
  const row = await findProfileRow(gotrueId)
  return row ? toProfile(row) : null
}

export const ensureProfile = async (
  gotrueId: string,
  email?: string | null
): Promise<Profile> => {
  const existing = await findProfileRow(gotrueId)
  if (existing) {
    return toProfile(existing)
  }

  const inserted = await db
    .insertInto('profiles')
    .values({
      gotrue_id: gotrueId,
      ...buildProfileDefaults(email),
    })
    .returningAll()
    .executeTakeFirstOrThrow()

  return toProfile(inserted)
}

export const createProfile = async (
  gotrueId: string,
  email?: string | null
): Promise<Profile> => {
  const existing = await findProfileRow(gotrueId)
  if (existing) {
    throw new ProfileAlreadyExistsError()
  }
  const inserted = await db
    .insertInto('profiles')
    .values({
      gotrue_id: gotrueId,
      ...buildProfileDefaults(email),
    })
    .returningAll()
    .executeTakeFirstOrThrow()

  return toProfile(inserted)
}

export type UpdateProfilePayload = Partial<
  Pick<Profile, 'first_name' | 'last_name' | 'username' | 'primary_email'>
>

export const updateProfile = async (
  gotrueId: string,
  payload: UpdateProfilePayload
): Promise<Profile> => {
  const existing = await findProfileRow(gotrueId)
  if (!existing) {
    throw new ProfileNotFoundError()
  }

  const updates: Record<string, unknown> = {}
  if (payload.first_name !== undefined) updates.first_name = payload.first_name
  if (payload.last_name !== undefined) updates.last_name = payload.last_name
  if (payload.username !== undefined) updates.username = payload.username
  if (payload.primary_email !== undefined) updates.primary_email = payload.primary_email
  updates.updated_at = new Date().toISOString()

  const updated = await db
    .updateTable('profiles')
    .set(updates)
    .where('gotrue_id', '=', gotrueId)
    .returningAll()
    .executeTakeFirstOrThrow()

  return toProfile(updated)
}

export const auditAccountLogin = async (
  profile: Profile,
  ipAddress: string | undefined
) => {
  await appendAuditLog({
    created_at: new Date().toISOString(),
    event_message: 'Logged into account',
    ip_address: ipAddress ?? null,
    payload: {
      profile_id: profile.id,
      primary_email: profile.primary_email,
    },
  })
}

export const getProfile = async (): Promise<Profile> => {
  const row = await selectProfile().orderBy('id', 'asc').limit(1).executeTakeFirst()
  return row ? toProfile(row) : { ...baseProfile }
}
