import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'

import { constants } from '@supabase/shared-types'

import {
  GoTrueRequestError,
  checkProjectAuthPermission,
  createAuthUser,
  deleteAuthUser,
  deleteAuthUserFactors,
  ensureProfile,
  getAuthConfig,
  sendAuthInvite,
  sendAuthMagicLink,
  sendAuthOtp,
  sendAuthRecovery,
  updateAuthConfig,
  updateAuthHooks,
  updateAuthUser,
  validateAuthSpam,
} from '../store/index.js'
import type {
  AuthCreateUserBody,
  AuthUpdateUserBody,
  AuthUserBody,
  AuthValidateSpamBody,
  AuthValidateSpamResponse,
  Profile,
} from '../store/types.js'

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, '')

const readEnv = (key: string) => {
  const raw = process.env[key]
  if (!raw) return undefined
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const SUPABASE_INTERNAL_URL =
  readEnv('SUPABASE_URL') ?? readEnv('SUPABASE_PUBLIC_URL') ?? 'http://kong:8000'

const PLATFORM_AUTH_BASE =
  readEnv('PLATFORM_AUTH_URL') ??
  readEnv('SUPABASE_GOTRUE_URL') ??
  `${stripTrailingSlash(SUPABASE_INTERNAL_URL)}/auth/v1`

const SUPABASE_SERVICE_KEY =
  readEnv('SERVICE_ROLE_KEY') ?? readEnv('SUPABASE_SERVICE_KEY') ?? readEnv('SERVICE_KEY')

type SignUpBody = {
  email: string
  password: string
  redirectTo?: string
  hcaptchaToken?: string | null
}

const { PermissionAction } = constants

const unauthorizedResponse = { message: 'Unauthorized' }
const forbiddenResponse = { message: 'Forbidden' }
const projectNotFoundResponse = { message: 'Project not found' }

const requireProfile = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<Profile | null> => {
  const cached = (request as any).profile as Profile | undefined
  if (cached) {
    return cached
  }

  const auth = request.auth
  if (!auth) {
    await reply.code(401).send(unauthorizedResponse)
    return null
  }

  const profile = await ensureProfile(auth.userId, auth.email)
  ;(request as any).profile = profile
  return profile
}

const ensureProjectPermission = async (
  profile: Profile,
  projectRef: string,
  reply: FastifyReply,
  requirement: { action: string; resource: string }
): Promise<boolean> => {
  const result = await checkProjectAuthPermission(profile.id, projectRef, requirement)
  if (!result.ok) {
    const response =
      result.status === 404 ? projectNotFoundResponse : result.status === 403 ? forbiddenResponse : { message: 'Unauthorized' }
    await reply.code(result.status).send(response)
    return false
  }
  return true
}

const parseSoftDeleteFlag = (
  value: string | undefined
): { error?: string; value?: boolean } => {
  if (value === undefined) return { value: undefined }
  const normalized = value.trim().toLowerCase()
  if (['true', '1', 'yes'].includes(normalized)) {
    return { value: true }
  }
  if (['false', '0', 'no'].includes(normalized)) {
    return { value: false }
  }
  return { error: 'soft_delete must be a boolean flag (true/false)' }
}

const handleGoTrueFailure = (
  request: FastifyRequest,
  reply: FastifyReply,
  error: unknown,
  context: { log: string; client: string }
) => {
  if (error instanceof GoTrueRequestError) {
    request.log.error(
      { err: error, status: error.status, path: error.path, gotrue: error.responseBody },
      context.log
    )
    return reply.code(error.status).send({ message: error.message })
  }

  request.log.error({ err: error }, context.log)
  return reply.code(500).send({ message: context.client })
}

const authRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { ref: string } }>('/:ref/config', async (request, reply) => {
    const config = await getAuthConfig(request.params.ref)
    return reply.send(config)
  })

  app.patch<{ Params: { ref: string }; Body: unknown }>('/:ref/config', async (request, reply) => {
    const config = await updateAuthConfig(request.params.ref, request.body)
    return reply.send(config)
  })

  app.patch<{ Params: { ref: string }; Body: unknown }>(
    '/:ref/config/hooks',
    async (request, reply) => {
      const config = await updateAuthHooks(request.params.ref, request.body)
      return reply.send(config)
    }
  )

  app.post<{ Body: SignUpBody }>('/signup', async (request, reply) => {
    const { email, password, redirectTo, hcaptchaToken } = request.body

    if (!email || !password) {
      return reply.code(400).send({ message: 'Email and password are required' })
    }

    try {
      const signupUrl = new URL('signup', `${stripTrailingSlash(PLATFORM_AUTH_BASE)}/`).toString()

      const payload: Record<string, unknown> = {
        email,
        password,
      }

      if (redirectTo) {
        payload.redirect_to = redirectTo
      }

      if (hcaptchaToken) {
        payload.gotrue_meta_security = { captcha_token: hcaptchaToken }
      }

      const headers: Record<string, string> = {
        accept: 'application/json',
        'content-type': 'application/json',
      }

      if (SUPABASE_SERVICE_KEY) {
        headers.apikey = SUPABASE_SERVICE_KEY
        headers.authorization = `Bearer ${SUPABASE_SERVICE_KEY}`
      }

      request.log.info(
        {
          signupUrl,
          hasServiceKey: Boolean(SUPABASE_SERVICE_KEY),
        },
        'Forwarding sign-up request to GoTrue'
      )

      const response = await fetch(signupUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })

      const rawText = await response.text()
      let parsed: any
      if (rawText.length > 0) {
        try {
          parsed = JSON.parse(rawText)
        } catch {
          parsed = undefined
        }
      }

      if (!response.ok) {
        const message =
          parsed?.error_description ??
          parsed?.msg ??
          parsed?.message ??
          'Failed to sign up. Please try again.'

        request.log.error(
          { status: response.status, body: parsed ?? rawText },
          'Sign-up request to GoTrue failed'
        )

        return reply.code(response.status).send({ message })
      }

      return reply.code(201).send(parsed ?? {})
    } catch (error) {
      request.log.error({ err: error }, 'Unexpected error during sign-up')
      return reply.code(500).send({ message: 'Unexpected error while signing up' })
    }
  })

  app.post<{
    Params: { ref: string }
    Body: AuthCreateUserBody
  }>('/:ref/users', async (request, reply) => {
    const profile = await requireProfile(request, reply)
    if (!profile) return

    const allowed = await ensureProjectPermission(profile, request.params.ref, reply, {
      action: PermissionAction.AUTH_EXECUTE,
      resource: 'create_user',
    })
    if (!allowed) return

    try {
      const payload = await createAuthUser(request.params.ref, request.body)
      return reply.code(201).send(payload ?? {})
    } catch (error) {
      return handleGoTrueFailure(request, reply, error, {
        log: 'Failed to create auth user via GoTrue',
        client: 'Failed to create user',
      })
    }
  })

  app.patch<{
    Params: { ref: string; id: string }
    Body: AuthUpdateUserBody
  }>('/:ref/users/:id', async (request, reply) => {
    const profile = await requireProfile(request, reply)
    if (!profile) return

    const allowed = await ensureProjectPermission(profile, request.params.ref, reply, {
      action: PermissionAction.TENANT_SQL_DELETE,
      resource: 'auth.users',
    })
    if (!allowed) return

    try {
      const payload = await updateAuthUser(request.params.ref, request.params.id, request.body)
      return reply.send(payload ?? {})
    } catch (error) {
      return handleGoTrueFailure(request, reply, error, {
        log: 'Failed to update auth user via GoTrue',
        client: 'Failed to update user',
      })
    }
  })

  app.delete<{
    Params: { ref: string; id: string }
    Querystring: { soft_delete?: string }
  }>('/:ref/users/:id', async (request, reply) => {
    const flag = parseSoftDeleteFlag(request.query.soft_delete)
    if (flag.error) {
      return reply.code(400).send({ message: flag.error })
    }

    const profile = await requireProfile(request, reply)
    if (!profile) return

    const allowed = await ensureProjectPermission(profile, request.params.ref, reply, {
      action: PermissionAction.TENANT_SQL_DELETE,
      resource: 'auth.users',
    })
    if (!allowed) return

    try {
      await deleteAuthUser(request.params.ref, request.params.id, {
        softDelete: flag.value,
      })
      return reply.code(204).send()
    } catch (error) {
      return handleGoTrueFailure(request, reply, error, {
        log: 'Failed to delete auth user via GoTrue',
        client: 'Failed to delete user',
      })
    }
  })

  app.delete<{ Params: { ref: string; id: string } }>(
    '/:ref/users/:id/factors',
    async (request, reply) => {
      const profile = await requireProfile(request, reply)
      if (!profile) return

      const allowed = await ensureProjectPermission(profile, request.params.ref, reply, {
        action: PermissionAction.TENANT_SQL_DELETE,
        resource: 'auth.mfa_factors',
      })
      if (!allowed) return

      try {
        await deleteAuthUserFactors(request.params.ref, request.params.id)
        return reply.code(204).send()
      } catch (error) {
        return handleGoTrueFailure(request, reply, error, {
          log: 'Failed to delete auth user factors via GoTrue',
          client: 'Failed to delete factors',
        })
      }
    }
  )

  const requireExecutionPermission = async (
    request: FastifyRequest,
    reply: FastifyReply,
    projectRef: string,
    resource: string
  ) => {
    const profile = await requireProfile(request, reply)
    if (!profile) return null

    const allowed = await ensureProjectPermission(profile, projectRef, reply, {
      action: PermissionAction.AUTH_EXECUTE,
      resource,
    })
    if (!allowed) return null
    return profile
  }

  app.post<{
    Params: { ref: string }
    Body: AuthUserBody
  }>('/:ref/invite', async (request, reply) => {
    const profile = await requireExecutionPermission(
      request,
      reply,
      request.params.ref,
      'invite_user'
    )
    if (!profile) return

    try {
      await sendAuthInvite(request.params.ref, request.body)
      return reply.code(201).send({})
    } catch (error) {
      return handleGoTrueFailure(request, reply, error, {
        log: 'Failed to send auth invite via GoTrue',
        client: 'Failed to send invite',
      })
    }
  })

  app.post<{
    Params: { ref: string }
    Body: AuthUserBody
  }>('/:ref/magiclink', async (request, reply) => {
    const profile = await requireExecutionPermission(
      request,
      reply,
      request.params.ref,
      'send_magic_link'
    )
    if (!profile) return

    try {
      await sendAuthMagicLink(request.params.ref, request.body)
      return reply.code(201).send({})
    } catch (error) {
      return handleGoTrueFailure(request, reply, error, {
        log: 'Failed to send magic link via GoTrue',
        client: 'Failed to send magic link',
      })
    }
  })

  app.post<{
    Params: { ref: string }
    Body: AuthUserBody
  }>('/:ref/otp', async (request, reply) => {
    const profile = await requireExecutionPermission(
      request,
      reply,
      request.params.ref,
      'send_otp'
    )
    if (!profile) return

    try {
      await sendAuthOtp(request.params.ref, request.body)
      return reply.code(201).send({})
    } catch (error) {
      return handleGoTrueFailure(request, reply, error, {
        log: 'Failed to send OTP via GoTrue',
        client: 'Failed to send OTP',
      })
    }
  })

  app.post<{
    Params: { ref: string }
    Body: AuthUserBody
  }>('/:ref/recover', async (request, reply) => {
    const profile = await requireExecutionPermission(
      request,
      reply,
      request.params.ref,
      'send_recovery'
    )
    if (!profile) return

    try {
      await sendAuthRecovery(request.params.ref, request.body)
      return reply.code(201).send({})
    } catch (error) {
      return handleGoTrueFailure(request, reply, error, {
        log: 'Failed to send recovery via GoTrue',
        client: 'Failed to send recovery',
      })
    }
  })

  app.post<{
    Params: { ref: string }
    Body: AuthValidateSpamBody
    Reply: AuthValidateSpamResponse
  }>('/:ref/validate/spam', async (request, reply) => {
    const profile = await requireExecutionPermission(
      request,
      reply,
      request.params.ref,
      'send_magic_link'
    )
    if (!profile) return

    try {
      const payload = await validateAuthSpam(request.params.ref, request.body)
      return reply.send(payload)
    } catch (error) {
      return handleGoTrueFailure(request, reply, error, {
        log: 'Failed to validate spam via GoTrue',
        client: 'Failed to validate spam content',
      })
    }
  })
}

export default authRoutes
