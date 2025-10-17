#!/usr/bin/env tsx
// @ts-nocheck

/**
 * Quick smoke test for /api/platform/auth/{ref}/… endpoints.
 *
 * Usage (requires a service-role key in the environment, e.g. PLATFORM_SERVICE_KEY):
 *   pnpm exec tsx scripts/platform-api/smoke-auth.mts
 *
 * The script will:
 *   - Create a temporary auth user
 *   - Ban/unban (update) the user
 *   - Clear the user’s MFA factors
 *   - Fire invite / magic link / OTP / recover flows
 *   - Run spam validation
 *   - Delete the user (soft-delete = false)
 *
 * It exits with code 1 if any step returns a non-success status.
 */

import { randomUUID } from 'node:crypto'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

type SmokeContext = {
  baseUrl: string
  projectRef: string
  serviceKey: string
  sessionToken: string
}

type ApiResult = {
  ok: boolean
  status: number
  body: unknown
  raw: string
}

const authPath = (ctx: SmokeContext, suffix: string) =>
  `${ctx.baseUrl}/auth/${encodeURIComponent(ctx.projectRef)}/${suffix.replace(/^\/+/, '')}`

const parseBody = async (response: Response): Promise<{ body: unknown; raw: string }> => {
  const raw = await response.text()
  if (!raw) return { body: undefined, raw }
  try {
    return { body: JSON.parse(raw), raw }
  } catch {
    return { body: raw, raw }
  }
}

const request = async (
  ctx: SmokeContext,
  method: HttpMethod,
  url: string,
  body?: Record<string, unknown>
): Promise<ApiResult> => {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    apikey: ctx.serviceKey,
    Authorization: `Bearer ${ctx.sessionToken}`,
  }
  const options: RequestInit = {
    method,
    headers,
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    options.body = JSON.stringify(body)
  }

  const response = await fetch(url, options)
  const parsed = await parseBody(response)

  return {
    ok: response.ok,
    status: response.status,
    body: parsed.body,
    raw: parsed.raw,
  }
}

const expectStatus = (
  label: string,
  result: ApiResult,
  expected: number | number[]
) => {
  const allowList = Array.isArray(expected) ? expected : [expected]
  if (!allowList.includes(result.status)) {
    console.error(`✗ ${label} → ${result.status}`)
    if (result.raw) {
      console.error(`  Body: ${result.raw}`)
    }
    failures += 1
    return false
  }
  console.log(`✓ ${label} → ${result.status}`)
  return true
}

let failures = 0

const smoke = async (ctx: SmokeContext) => {
  const uniqueSuffix = randomUUID().slice(0, 8)
  const userEmail = `smoke-user-${uniqueSuffix}@example.com`
  const inviteEmail = `smoke-invite-${uniqueSuffix}@example.com`
  const otpEmail = `smoke-otp-${uniqueSuffix}@example.com`
  const recoverEmail = `smoke-recover-${uniqueSuffix}@example.com`
  const userPassword = `Smoke-${uniqueSuffix}!`

  // Create user
  const create = await request(ctx, 'POST', authPath(ctx, 'users'), {
    email: userEmail,
    password: userPassword,
    email_confirm: true,
  })
  if (!expectStatus('create user', create, [200, 201])) return

  const userId = (create.body as Record<string, any> | undefined)?.id
  if (typeof userId !== 'string' || userId.length === 0) {
    console.error('✗ create user → missing user id')
    failures += 1
    return
  }

  // Update (ban) user
  const update = await request(ctx, 'PATCH', authPath(ctx, `users/${encodeURIComponent(userId)}`), {
    ban_duration: '24h',
  })
  if (!expectStatus('update user (ban)', update, [200, 204])) return

  // Clear MFA factors
  const factors = await request(ctx, 'DELETE', authPath(ctx, `users/${encodeURIComponent(userId)}/factors`))
  expectStatus('delete user factors', factors, 204)

  // Invite
  const invite = await request(ctx, 'POST', authPath(ctx, 'invite'), { email: inviteEmail })
  expectStatus('send invite', invite, [200, 201])

  // Magic link
  const magicLink = await request(ctx, 'POST', authPath(ctx, 'magiclink'), { email: userEmail })
  expectStatus('send magic link', magicLink, [200, 201])

  // OTP (use a fresh address to avoid rate limiting collisions)
  const otp = await request(ctx, 'POST', authPath(ctx, 'otp'), { email: otpEmail })
  expectStatus('send otp', otp, [200, 201, 202])

  // Recovery (also use a fresh address)
  const recover = await request(ctx, 'POST', authPath(ctx, 'recover'), { email: recoverEmail })
  expectStatus('send recovery', recover, [200, 201, 202])

  // Spam validation
  const spam = await request(ctx, 'POST', authPath(ctx, 'validate/spam'), {
    subject: 'Smoke Test',
    content: 'This is a smoke-test email body.',
  })
  expectStatus('validate spam', spam, 200)

  // Delete user (hard delete)
  const remove = await request(ctx, 'DELETE', `${authPath(ctx, `users/${encodeURIComponent(userId)}`)}?soft_delete=false`)
  expectStatus('delete user', remove, 204)
}

const main = async () => {
  const defaultsModule = await import('../../apps/platform-api/src/config/defaults.ts')
  const {
    DEFAULT_PROJECT_REF: DEFAULT_PROJECT_REF_FALLBACK,
    PLATFORM_PROJECT_SERVICE_KEY,
  } = defaultsModule

  const baseUrl = (process.env.PLATFORM_API_URL ?? 'http://localhost:8000/api/platform').replace(/\/+$/, '')

  const projectRef =
    process.env.PLATFORM_PROJECT_REF ??
    process.env.PROJECT_REF ??
    DEFAULT_PROJECT_REF_FALLBACK

  const serviceKey =
    process.env.PLATFORM_SERVICE_KEY ??
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.SERVICE_ROLE_KEY ??
    PLATFORM_PROJECT_SERVICE_KEY ??
    null

  if (!projectRef) {
    console.error('Missing PLATFORM_PROJECT_REF (or PROJECT_REF) env variable')
    process.exit(1)
  }

  if (!serviceKey) {
    console.error(
      'Missing PLATFORM_SERVICE_KEY (or SUPABASE_SERVICE_KEY / SERVICE_ROLE_KEY). Export the project service-role key before running this smoke test.'
    )
    process.exit(1)
  }

  const baseOrigin = baseUrl.replace(/\/?api\/platform$/, '') || 'http://localhost:8000'
  const gotrueUrl = (process.env.SUPABASE_GOTRUE_URL ?? `${baseOrigin.replace(/\/+$/, '')}/auth/v1`).replace(/\/+$/, '')

  const adminEmail = process.env.PLATFORM_ADMIN_EMAIL ?? 'admin@example.com'
  const adminPassword = process.env.PLATFORM_ADMIN_PASSWORD ?? 'supabase'

  const loginResponse = await fetch(`${gotrueUrl}/token?grant_type=password`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      apikey: serviceKey,
    },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  })

  if (!loginResponse.ok) {
    const text = await loginResponse.text()
    console.error(`Failed to obtain session token from GoTrue (${loginResponse.status})`) 
    if (text) console.error(text)
    process.exit(1)
  }

  let sessionToken: string | undefined
  try {
    const payload = (await loginResponse.json()) as { access_token?: string }
    sessionToken = payload.access_token
  } catch {
    /* fallback below */
  }

  if (!sessionToken) {
    console.error('GoTrue login succeeded but access_token missing in response')
    process.exit(1)
  }

  await smoke({ baseUrl, projectRef, serviceKey, sessionToken })

  if (failures > 0) {
    console.error(`\nSmoke test completed with ${failures} failure${failures === 1 ? '' : 's'}.`)
    process.exit(1)
  }

  console.log('\nSmoke test completed successfully.')
}

void main().catch((error) => {
  console.error('Smoke test failed with an unexpected error:', error)
  process.exit(1)
})
