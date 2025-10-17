import { createClient } from '@supabase/supabase-js'

import { getPlatformDb } from '../db/client.js'
import {
  performGoTrueRequest,
  GoTrueRequestError,
  resolveAuthClientContext,
} from './auth-config.js'
import { listPermissionsForProfile } from './permissions.js'
import type {
  AccessControlPermission,
  AuthCreateUserBody,
  AuthCreateUserResponse,
  AuthUpdateUserBody,
  AuthUpdateUserResponse,
  AuthUserBody,
  AuthValidateSpamBody,
  AuthValidateSpamResponse,
} from './types.js'

const db = getPlatformDb()

type ProjectRecord = {
  projectId: number
  projectRef: string
  organizationId: number
  organizationSlug: string
}

type PermissionRequirement = {
  action: string
  resource: string
}

export type ProjectPermissionCheckResult =
  | { ok: true }
  | { ok: false; status: number; message: string }

const fetchProjectRecord = async (ref: string): Promise<ProjectRecord | null> => {
  const row = await db
    .selectFrom('projects as p')
    .innerJoin('organizations as o', 'o.id', 'p.organization_id')
    .select([
      'p.id as project_id',
      'p.ref as project_ref',
      'o.id as organization_id',
      'o.slug as organization_slug',
    ])
    .where('p.ref', '=', ref)
    .executeTakeFirst()

  if (!row) {
    return null
  }

  return {
    projectId: Number(row.project_id),
    projectRef: row.project_ref,
    organizationId: Number(row.organization_id),
    organizationSlug: row.organization_slug,
  }
}

const includesValue = (values: string[] | null | undefined, candidate: string): boolean => {
  if (!Array.isArray(values) || values.length === 0) return false
  if (values.includes('%')) return true
  return values.includes(candidate)
}

const includesNumber = (values: number[] | null | undefined, candidate: number): boolean => {
  if (!Array.isArray(values) || values.length === 0) return false
  return values.includes(candidate)
}

const matchesPermission = (
  permission: AccessControlPermission,
  requirement: PermissionRequirement,
  context: ProjectRecord
): boolean => {
  if (permission.organization_slug !== context.organizationSlug) {
    return false
  }

  const actions = Array.isArray(permission.actions) ? permission.actions : []
  const resources = Array.isArray(permission.resources) ? permission.resources : []

  if (actions.length === 0 || resources.length === 0) {
    return false
  }

  const matchesAction = includesValue(actions, requirement.action)
  const matchesResource = includesValue(resources, requirement.resource)

  if (!matchesAction || !matchesResource) {
    return false
  }

  const projectRefs = permission.project_refs
  const projectIds = permission.project_ids

  if (!projectRefs && !projectIds) {
    return true
  }

  if (includesValue(projectRefs ?? undefined, context.projectRef)) {
    return true
  }

  if (includesNumber(projectIds ?? undefined, context.projectId)) {
    return true
  }

  return false
}

export const checkProjectAuthPermission = async (
  profileId: number,
  projectRef: string,
  requirement: PermissionRequirement
): Promise<ProjectPermissionCheckResult> => {
  const project = await fetchProjectRecord(projectRef)
  if (!project) {
    return { ok: false, status: 404, message: 'Project not found' }
  }

  const permissions = await listPermissionsForProfile(profileId)
  const allowed = permissions.some((permission) => matchesPermission(permission, requirement, project))

  if (!allowed) {
    return { ok: false, status: 403, message: 'Forbidden' }
  }

  return { ok: true }
}

const extractErrorMessage = (raw?: string): string | undefined => {
  if (!raw) return undefined
  const trimmed = raw.trim()
  if (trimmed.length === 0) return undefined

  try {
    const parsed = JSON.parse(trimmed)
    if (typeof parsed === 'string') {
      return parsed
    }
    if (parsed && typeof parsed === 'object') {
      const candidates = [
        (parsed as Record<string, unknown>).error_description,
        (parsed as Record<string, unknown>).msg,
        (parsed as Record<string, unknown>).message,
        (parsed as Record<string, unknown>).error,
      ]

      for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
          return candidate
        }
        if (
          candidate &&
          typeof candidate === 'object' &&
          typeof (candidate as Record<string, unknown>).message === 'string'
        ) {
          const nested = (candidate as Record<string, unknown>).message as string
          if (nested.trim().length > 0) {
            return nested
          }
        }
      }
    }
  } catch {
    return trimmed
  }

  return trimmed
}

const normalizeGoTrueError = (error: unknown): GoTrueRequestError => {
  if (error instanceof GoTrueRequestError) {
    const message = extractErrorMessage(error.responseBody)
    if (message && message.length > 0) {
      error.message = message
    }
    return error
  }
  throw error
}

export const createAuthUser = async (
  projectRef: string,
  body: AuthCreateUserBody
): Promise<AuthCreateUserResponse | undefined> => {
  try {
    return await performGoTrueRequest<AuthCreateUserResponse | undefined>(projectRef, {
      method: 'POST',
      path: 'admin/users',
      body,
    })
  } catch (error) {
    throw normalizeGoTrueError(error)
  }
}

export const updateAuthUser = async (
  projectRef: string,
  userId: string,
  body: AuthUpdateUserBody
): Promise<AuthUpdateUserResponse | undefined> => {
  try {
    return await performGoTrueRequest<AuthUpdateUserResponse | undefined>(projectRef, {
      method: 'PATCH',
      path: `admin/users/${encodeURIComponent(userId)}`,
      body,
    })
  } catch (error) {
    if (error instanceof GoTrueRequestError && error.status === 405) {
      try {
        return await performGoTrueRequest<AuthUpdateUserResponse | undefined>(projectRef, {
          method: 'PUT',
          path: `admin/users/${encodeURIComponent(userId)}`,
          body,
        })
      } catch (fallbackError) {
        throw normalizeGoTrueError(fallbackError)
      }
    }
    throw normalizeGoTrueError(error)
  }
}

export const deleteAuthUser = async (
  projectRef: string,
  userId: string,
  options: { softDelete?: boolean } = {}
): Promise<void> => {
  try {
    await performGoTrueRequest<undefined>(projectRef, {
      method: 'DELETE',
      path: `admin/users/${encodeURIComponent(userId)}`,
      query:
        options.softDelete === undefined
          ? undefined
          : { soft_delete: options.softDelete ? 'true' : 'false' },
    })
  } catch (error) {
    throw normalizeGoTrueError(error)
  }
}

export const deleteAuthUserFactors = async (
  projectRef: string,
  userId: string
): Promise<void> => {
  try {
    await performGoTrueRequest<undefined>(projectRef, {
      method: 'DELETE',
      path: `admin/users/${encodeURIComponent(userId)}/factors`,
    })
    return
  } catch (error) {
    if (!(error instanceof GoTrueRequestError && error.status === 405)) {
      throw normalizeGoTrueError(error)
    }
  }

  const { authBaseUrl, serviceKey } = await resolveAuthClientContext(projectRef)
  const supabaseUrl = authBaseUrl.replace(/\/auth\/v1\/?$/, '')
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
    global: {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    },
  })

  const factorsResponse = await supabase.auth.admin.mfa.listFactors({ userId })
  if (factorsResponse.error) {
    throw normalizeGoTrueError(
      new GoTrueRequestError(
        `Failed to list MFA factors for user ${userId}`,
        factorsResponse.error.status ?? 400,
        `admin/users/${encodeURIComponent(userId)}/factors`,
        factorsResponse.error.message
      )
    )
  }

  const factors = factorsResponse.data?.factors ?? []
  for (const factor of factors) {
    const deleteResponse = await supabase.auth.admin.mfa.deleteFactor({
      userId,
      id: factor.id,
    })
    if (deleteResponse.error) {
      throw normalizeGoTrueError(
        new GoTrueRequestError(
          `Failed to delete MFA factor ${factor.id} for user ${userId}`,
          deleteResponse.error.status ?? 400,
          `admin/users/${encodeURIComponent(userId)}/factors/${factor.id}`,
          deleteResponse.error.message
        )
      )
    }
  }
}

export const sendAuthInvite = async (
  projectRef: string,
  body: AuthUserBody
): Promise<void> => {
  try {
    await performGoTrueRequest<undefined>(projectRef, {
      method: 'POST',
      path: 'invite',
      body,
    })
  } catch (error) {
    throw normalizeGoTrueError(error)
  }
}

export const sendAuthMagicLink = async (
  projectRef: string,
  body: AuthUserBody
): Promise<void> => {
  try {
    await performGoTrueRequest<undefined>(projectRef, {
      method: 'POST',
      path: 'magiclink',
      body,
    })
  } catch (error) {
    throw normalizeGoTrueError(error)
  }
}

export const sendAuthOtp = async (projectRef: string, body: AuthUserBody): Promise<void> => {
  try {
    await performGoTrueRequest<undefined>(projectRef, {
      method: 'POST',
      path: 'otp',
      body,
    })
  } catch (error) {
    throw normalizeGoTrueError(error)
  }
}

export const sendAuthRecovery = async (
  projectRef: string,
  body: AuthUserBody
): Promise<void> => {
  try {
    await performGoTrueRequest<undefined>(projectRef, {
      method: 'POST',
      path: 'recover',
      body,
    })
  } catch (error) {
    throw normalizeGoTrueError(error)
  }
}

export const validateAuthSpam = async (
  projectRef: string,
  body: AuthValidateSpamBody
): Promise<AuthValidateSpamResponse> => {
  try {
    return await performGoTrueRequest<AuthValidateSpamResponse>(projectRef, {
      method: 'POST',
      path: 'validate/spam',
      body,
    })
  } catch (error) {
    if (error instanceof GoTrueRequestError && error.status === 404) {
      try {
        return await performGoTrueRequest<AuthValidateSpamResponse>(projectRef, {
          method: 'POST',
          path: 'validate',
          body,
        })
      } catch (fallbackError) {
        if (fallbackError instanceof GoTrueRequestError && fallbackError.status === 404) {
          try {
            return await performGoTrueRequest<AuthValidateSpamResponse>(projectRef, {
              method: 'POST',
              path: 'admin/validate',
              body,
            })
          } catch (legacyError) {
            throw normalizeGoTrueError(legacyError)
          }
        }
        throw normalizeGoTrueError(fallbackError)
      }
    }
    throw normalizeGoTrueError(error)
  }
}
