import type { FastifyPluginAsync } from 'fastify'

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

const authRoutes: FastifyPluginAsync = async (app) => {
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
}

export default authRoutes
