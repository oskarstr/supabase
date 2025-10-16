import { URL } from 'node:url'

import { getPlatformDb } from '../db/client.js'
import type { AuthConfig, AuthConfigUpdate, AuthHooksUpdate } from './types.js'

type GoTrueConfig = AuthConfig

const db = getPlatformDb()

const DEFAULT_AUTH_CONFIG: GoTrueConfig = {
  API_MAX_REQUEST_DURATION: 10,
  AUDIT_LOG_DISABLE_POSTGRES: false,
  DB_MAX_POOL_SIZE: null,
  DISABLE_SIGNUP: false,
  EXTERNAL_ANONYMOUS_USERS_ENABLED: false,
  EXTERNAL_APPLE_ADDITIONAL_CLIENT_IDS: '',
  EXTERNAL_APPLE_CLIENT_ID: '',
  EXTERNAL_APPLE_EMAIL_OPTIONAL: false,
  EXTERNAL_APPLE_ENABLED: false,
  EXTERNAL_APPLE_SECRET: '',
  EXTERNAL_AZURE_CLIENT_ID: '',
  EXTERNAL_AZURE_EMAIL_OPTIONAL: false,
  EXTERNAL_AZURE_ENABLED: false,
  EXTERNAL_AZURE_SECRET: '',
  EXTERNAL_AZURE_URL: '',
  EXTERNAL_BITBUCKET_CLIENT_ID: '',
  EXTERNAL_BITBUCKET_EMAIL_OPTIONAL: false,
  EXTERNAL_BITBUCKET_ENABLED: false,
  EXTERNAL_BITBUCKET_SECRET: '',
  EXTERNAL_DISCORD_CLIENT_ID: '',
  EXTERNAL_DISCORD_EMAIL_OPTIONAL: false,
  EXTERNAL_DISCORD_ENABLED: false,
  EXTERNAL_DISCORD_SECRET: '',
  EXTERNAL_EMAIL_ENABLED: true,
  EXTERNAL_FACEBOOK_CLIENT_ID: '',
  EXTERNAL_FACEBOOK_EMAIL_OPTIONAL: false,
  EXTERNAL_FACEBOOK_ENABLED: false,
  EXTERNAL_FACEBOOK_SECRET: '',
  EXTERNAL_FIGMA_CLIENT_ID: '',
  EXTERNAL_FIGMA_EMAIL_OPTIONAL: false,
  EXTERNAL_FIGMA_ENABLED: false,
  EXTERNAL_FIGMA_SECRET: '',
  EXTERNAL_GITHUB_CLIENT_ID: '',
  EXTERNAL_GITHUB_EMAIL_OPTIONAL: false,
  EXTERNAL_GITHUB_ENABLED: false,
  EXTERNAL_GITHUB_SECRET: '',
  EXTERNAL_GITLAB_CLIENT_ID: '',
  EXTERNAL_GITLAB_EMAIL_OPTIONAL: false,
  EXTERNAL_GITLAB_ENABLED: false,
  EXTERNAL_GITLAB_SECRET: '',
  EXTERNAL_GITLAB_URL: '',
  EXTERNAL_GOOGLE_ADDITIONAL_CLIENT_IDS: '',
  EXTERNAL_GOOGLE_CLIENT_ID: '',
  EXTERNAL_GOOGLE_EMAIL_OPTIONAL: false,
  EXTERNAL_GOOGLE_ENABLED: false,
  EXTERNAL_GOOGLE_SECRET: '',
  EXTERNAL_GOOGLE_SKIP_NONCE_CHECK: false,
  EXTERNAL_KAKAO_CLIENT_ID: '',
  EXTERNAL_KAKAO_EMAIL_OPTIONAL: false,
  EXTERNAL_KAKAO_ENABLED: false,
  EXTERNAL_KAKAO_SECRET: '',
  EXTERNAL_KEYCLOAK_CLIENT_ID: '',
  EXTERNAL_KEYCLOAK_EMAIL_OPTIONAL: false,
  EXTERNAL_KEYCLOAK_ENABLED: false,
  EXTERNAL_KEYCLOAK_SECRET: '',
  EXTERNAL_KEYCLOAK_URL: '',
  EXTERNAL_LINKEDIN_OIDC_CLIENT_ID: '',
  EXTERNAL_LINKEDIN_OIDC_EMAIL_OPTIONAL: false,
  EXTERNAL_LINKEDIN_OIDC_ENABLED: false,
  EXTERNAL_LINKEDIN_OIDC_SECRET: '',
  EXTERNAL_NOTION_CLIENT_ID: '',
  EXTERNAL_NOTION_EMAIL_OPTIONAL: false,
  EXTERNAL_NOTION_ENABLED: false,
  EXTERNAL_NOTION_SECRET: '',
  EXTERNAL_PHONE_ENABLED: false,
  EXTERNAL_SLACK_CLIENT_ID: '',
  EXTERNAL_SLACK_EMAIL_OPTIONAL: false,
  EXTERNAL_SLACK_ENABLED: false,
  EXTERNAL_SLACK_OIDC_CLIENT_ID: '',
  EXTERNAL_SLACK_OIDC_EMAIL_OPTIONAL: false,
  EXTERNAL_SLACK_OIDC_ENABLED: false,
  EXTERNAL_SLACK_OIDC_SECRET: '',
  EXTERNAL_SLACK_SECRET: '',
  EXTERNAL_SPOTIFY_CLIENT_ID: '',
  EXTERNAL_SPOTIFY_EMAIL_OPTIONAL: false,
  EXTERNAL_SPOTIFY_ENABLED: false,
  EXTERNAL_SPOTIFY_SECRET: '',
  EXTERNAL_TWITCH_CLIENT_ID: '',
  EXTERNAL_TWITCH_EMAIL_OPTIONAL: false,
  EXTERNAL_TWITCH_ENABLED: false,
  EXTERNAL_TWITCH_SECRET: '',
  EXTERNAL_TWITTER_CLIENT_ID: '',
  EXTERNAL_TWITTER_EMAIL_OPTIONAL: false,
  EXTERNAL_TWITTER_ENABLED: false,
  EXTERNAL_TWITTER_SECRET: '',
  EXTERNAL_WEB3_ETHEREUM_ENABLED: false,
  EXTERNAL_WEB3_SOLANA_ENABLED: false,
  EXTERNAL_WORKOS_CLIENT_ID: '',
  EXTERNAL_WORKOS_SECRET: '',
  EXTERNAL_WORKOS_URL: '',
  EXTERNAL_ZOOM_CLIENT_ID: '',
  EXTERNAL_ZOOM_EMAIL_OPTIONAL: false,
  EXTERNAL_ZOOM_ENABLED: false,
  EXTERNAL_ZOOM_SECRET: '',
  HOOK_BEFORE_USER_CREATED_ENABLED: false,
  HOOK_BEFORE_USER_CREATED_SECRETS: '',
  HOOK_BEFORE_USER_CREATED_URI: '',
  HOOK_CUSTOM_ACCESS_TOKEN_ENABLED: false,
  HOOK_CUSTOM_ACCESS_TOKEN_SECRETS: '',
  HOOK_CUSTOM_ACCESS_TOKEN_URI: '',
  HOOK_MFA_VERIFICATION_ATTEMPT_ENABLED: false,
  HOOK_MFA_VERIFICATION_ATTEMPT_SECRETS: '',
  HOOK_MFA_VERIFICATION_ATTEMPT_URI: '',
  HOOK_PASSWORD_VERIFICATION_ATTEMPT_ENABLED: false,
  HOOK_PASSWORD_VERIFICATION_ATTEMPT_SECRETS: '',
  HOOK_PASSWORD_VERIFICATION_ATTEMPT_URI: '',
  HOOK_SEND_EMAIL_ENABLED: false,
  HOOK_SEND_EMAIL_SECRETS: '',
  HOOK_SEND_EMAIL_URI: '',
  HOOK_SEND_SMS_ENABLED: false,
  HOOK_SEND_SMS_SECRETS: '',
  HOOK_SEND_SMS_URI: '',
  JWT_EXP: 3600,
  MAILER_ALLOW_UNVERIFIED_EMAIL_SIGN_INS: false,
  MAILER_AUTOCONFIRM: true,
  MAILER_NOTIFICATIONS_EMAIL_CHANGED_ENABLED: false,
  MAILER_NOTIFICATIONS_IDENTITY_LINKED_ENABLED: false,
  MAILER_NOTIFICATIONS_IDENTITY_UNLINKED_ENABLED: false,
  MAILER_NOTIFICATIONS_MFA_FACTOR_ENROLLED_ENABLED: false,
  MAILER_NOTIFICATIONS_MFA_FACTOR_UNENROLLED_ENABLED: false,
  MAILER_NOTIFICATIONS_PASSWORD_CHANGED_ENABLED: false,
  MAILER_NOTIFICATIONS_PHONE_CHANGED_ENABLED: false,
  MAILER_OTP_EXP: 600,
  MAILER_OTP_LENGTH: 6,
  MAILER_SECURE_EMAIL_CHANGE_ENABLED: true,
  MAILER_SUBJECTS_CONFIRMATION: 'Confirm your email',
  MAILER_SUBJECTS_EMAIL_CHANGE: 'Email change request',
  MAILER_SUBJECTS_EMAIL_CHANGED_NOTIFICATION: 'Your email was updated',
  MAILER_SUBJECTS_IDENTITY_LINKED_NOTIFICATION: 'Identity linked',
  MAILER_SUBJECTS_IDENTITY_UNLINKED_NOTIFICATION: 'Identity unlinked',
  MAILER_SUBJECTS_INVITE: 'You are invited to a Supabase project',
  MAILER_SUBJECTS_MAGIC_LINK: 'Sign in with this magic link',
  MAILER_SUBJECTS_MFA_FACTOR_ENROLLED_NOTIFICATION: 'New MFA factor enrolled',
  MAILER_SUBJECTS_MFA_FACTOR_UNENROLLED_NOTIFICATION: 'MFA factor unenrolled',
  MAILER_SUBJECTS_PASSWORD_CHANGED_NOTIFICATION: 'Your password was changed',
  MAILER_SUBJECTS_PHONE_CHANGED_NOTIFICATION: 'Your phone number was changed',
  MAILER_SUBJECTS_REAUTHENTICATION: 'Reauthenticate your session',
  MAILER_SUBJECTS_RECOVERY: 'Reset your password',
  MAILER_TEMPLATES_CONFIRMATION_CONTENT: '',
  MAILER_TEMPLATES_EMAIL_CHANGE_CONTENT: '',
  MAILER_TEMPLATES_EMAIL_CHANGED_NOTIFICATION_CONTENT: '',
  MAILER_TEMPLATES_IDENTITY_LINKED_NOTIFICATION_CONTENT: '',
  MAILER_TEMPLATES_IDENTITY_UNLINKED_NOTIFICATION_CONTENT: '',
  MAILER_TEMPLATES_INVITE_CONTENT: '',
  MAILER_TEMPLATES_MAGIC_LINK_CONTENT: '',
  MAILER_TEMPLATES_MFA_FACTOR_ENROLLED_NOTIFICATION_CONTENT: '',
  MAILER_TEMPLATES_MFA_FACTOR_UNENROLLED_NOTIFICATION_CONTENT: '',
  MAILER_TEMPLATES_PASSWORD_CHANGED_NOTIFICATION_CONTENT: '',
  MAILER_TEMPLATES_PHONE_CHANGED_NOTIFICATION_CONTENT: '',
  MAILER_TEMPLATES_REAUTHENTICATION_CONTENT: '',
  MAILER_TEMPLATES_RECOVERY_CONTENT: '',
  MFA_ALLOW_LOW_AAL: false,
  MFA_MAX_ENROLLED_FACTORS: 2,
  MFA_PHONE_ENROLL_ENABLED: false,
  MFA_PHONE_MAX_FREQUENCY: 3,
  MFA_PHONE_OTP_LENGTH: 6,
  MFA_PHONE_TEMPLATE: 'Use code {{ .Code }} to verify your phone number',
  MFA_PHONE_VERIFY_ENABLED: false,
  MFA_TOTP_ENROLL_ENABLED: true,
  MFA_TOTP_VERIFY_ENABLED: true,
  MFA_WEB_AUTHN_ENROLL_ENABLED: false,
  MFA_WEB_AUTHN_VERIFY_ENABLED: false,
  NIMBUS_OAUTH_CLIENT_ID: null,
  NIMBUS_OAUTH_CLIENT_SECRET: null,
  PASSWORD_HIBP_ENABLED: true,
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_REQUIRED_CHARACTERS: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ:0123456789',
  RATE_LIMIT_ANONYMOUS_USERS: 15,
  RATE_LIMIT_EMAIL_SENT: 90,
  RATE_LIMIT_OTP: 90,
  RATE_LIMIT_SMS_SENT: 3,
  RATE_LIMIT_TOKEN_REFRESH: 1000,
  RATE_LIMIT_VERIFY: 10,
  RATE_LIMIT_WEB3: null,
  REFRESH_TOKEN_ROTATION_ENABLED: true,
  SAML_ALLOW_ENCRYPTED_ASSERTIONS: false,
  SAML_ENABLED: false,
  SAML_EXTERNAL_URL: '',
  SECURITY_CAPTCHA_ENABLED: false,
  SECURITY_CAPTCHA_PROVIDER: 'hcaptcha',
  SECURITY_CAPTCHA_SECRET: '',
  SECURITY_MANUAL_LINKING_ENABLED: false,
  SECURITY_REFRESH_TOKEN_REUSE_INTERVAL: 0,
  SECURITY_UPDATE_PASSWORD_REQUIRE_REAUTHENTICATION: true,
  SESSIONS_INACTIVITY_TIMEOUT: 604800,
  SESSIONS_SINGLE_PER_USER: false,
  SESSIONS_TAGS: '',
  SESSIONS_TIMEBOX: 43200,
  SITE_URL: 'https://supabase.local',
  SMS_AUTOCONFIRM: false,
  SMS_MAX_FREQUENCY: 3,
  SMS_MESSAGEBIRD_ACCESS_KEY: '',
  SMS_MESSAGEBIRD_ORIGINATOR: '',
  SMS_OTP_EXP: 600,
  SMS_OTP_LENGTH: 6,
  SMS_PROVIDER: 'twilio',
  SMS_TEMPLATE: 'Your Supabase code is {{ .Code }}',
  SMS_TEST_OTP: '000000',
  SMS_TEST_OTP_VALID_UNTIL: new Date(0).toISOString(),
  SMS_TEXTLOCAL_API_KEY: '',
  SMS_TEXTLOCAL_SENDER: '',
  SMS_TWILIO_ACCOUNT_SID: '',
  SMS_TWILIO_AUTH_TOKEN: '',
  SMS_TWILIO_CONTENT_SID: '',
  SMS_TWILIO_MESSAGE_SERVICE_SID: '',
  SMS_TWILIO_VERIFY_ACCOUNT_SID: '',
  SMS_TWILIO_VERIFY_AUTH_TOKEN: '',
  SMS_TWILIO_VERIFY_MESSAGE_SERVICE_SID: '',
  SMS_VONAGE_API_KEY: '',
  SMS_VONAGE_API_SECRET: '',
  SMS_VONAGE_FROM: '',
  SMTP_ADMIN_EMAIL: 'admin@example.com',
  SMTP_HOST: '',
  SMTP_MAX_FREQUENCY: 10,
  SMTP_PASS: '',
  SMTP_PORT: '587',
  SMTP_SENDER_NAME: 'Supabase Auth',
  SMTP_USER: '',
  URI_ALLOW_LIST: '',
}

const CONFIG_KEYS = Object.keys(DEFAULT_AUTH_CONFIG) as Array<keyof GoTrueConfig>

const cloneConfig = (config: GoTrueConfig): GoTrueConfig => ({ ...config })

const computeDefaultConfig = (ref: string): GoTrueConfig => ({
  ...DEFAULT_AUTH_CONFIG,
  SITE_URL: `https://${ref}.supabase.local`,
  URI_ALLOW_LIST: `https://${ref}.supabase.local`,
})

const REST_PATH_SUFFIX = /\/rest\/v1\/?$/i

type AuthClientContext = {
  authBaseUrl: string
  serviceKey: string
}

class GoTrueRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly path: string,
    readonly responseBody?: string
  ) {
    super(message)
    this.name = 'GoTrueRequestError'
  }
}

const resolveAuthClientContext = async (ref: string): Promise<AuthClientContext> => {
  const project = await db
    .selectFrom('projects')
    .select(['ref', 'rest_url', 'service_key'])
    .where('ref', '=', ref)
    .executeTakeFirst()

  if (!project) {
    throw new Error(`Project ${ref} not found when resolving auth config`)
  }

  const baseRestUrl = project.rest_url ?? `https://${project.ref}.supabase.local/rest/v1/`
  const normalizedBase = baseRestUrl.replace(REST_PATH_SUFFIX, '')
  const trimmedBase = normalizedBase.replace(/\/+$/, '')
  const authBaseUrl = `${trimmedBase}/auth/v1`

  if (!project.service_key) {
    throw new Error(`Project ${ref} is missing a service role key for auth config access`)
  }

  return { authBaseUrl, serviceKey: project.service_key }
}

type GoTrueRequestOptions = {
  method: 'GET' | 'PATCH'
  path: string
  body?: unknown
}

const performGoTrueRequest = async <T>(
  ref: string,
  { method, path, body }: GoTrueRequestOptions
): Promise<T> => {
  const { authBaseUrl, serviceKey } = await resolveAuthClientContext(ref)

  const url = new URL(path.replace(/^\/+/, ''), `${authBaseUrl.replace(/\/+$/, '')}/`)
  const headers: Record<string, string> = {
    Accept: 'application/json',
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  }

  const requestInit: RequestInit = {
    method,
    headers,
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    requestInit.body = JSON.stringify(body)
  }

  const response = await fetch(url, requestInit)

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText)
    throw new GoTrueRequestError(
      `GoTrue request ${method} ${url.pathname} failed with ${response.status}`,
      response.status,
      url.pathname,
      message
    )
  }

  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()
  if (text.length === 0) {
    return undefined as T
  }

  try {
    return JSON.parse(text) as T
  } catch (error) {
    throw new GoTrueRequestError(
      `Failed to parse GoTrue response from ${url.pathname}`,
      response.status,
      url.pathname,
      text
    )
  }
}

const requestGoTrueWithFallback = async <T>(
  ref: string,
  method: 'GET' | 'PATCH',
  paths: string[],
  body?: unknown
): Promise<T> => {
  let lastError: GoTrueRequestError | undefined

  for (const path of paths) {
    try {
      return await performGoTrueRequest<T>(ref, { method, path, body })
    } catch (error) {
      if (error instanceof GoTrueRequestError && error.status === 404) {
        lastError = error
        continue
      }
      throw error
    }
  }

  if (lastError) {
    throw lastError
  }

  throw new Error(`GoTrue request ${method} for ${ref} failed for all candidate paths: ${paths.join(', ')}`)
}

const mergeConfigWithDefaults = (
  ref: string,
  payload: Record<string, unknown> | undefined
): GoTrueConfig => {
  const defaults = computeDefaultConfig(ref)
  if (!payload || typeof payload !== 'object') {
    return cloneConfig(defaults)
  }

  const result: GoTrueConfig = { ...defaults }
  for (const key of CONFIG_KEYS) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      ;(result as Record<string, unknown>)[key as string] = (payload as Record<string, unknown>)[
        key as string
      ]
    }
  }

  return result
}

const sanitizePatchPayload = <T extends Record<string, unknown>>(payload: T | undefined) => {
  if (!payload) return {}
  const entries = Object.entries(payload).filter(([, value]) => value !== undefined)
  return Object.fromEntries(entries)
}

const AUTH_SETTINGS_PATHS = ['admin/settings', 'settings']
const AUTH_HOOKS_PATHS = ['admin/settings/hooks', 'admin/hooks']

export const getAuthConfig = async (ref: string): Promise<GoTrueConfig> => {
  try {
    const payload = await requestGoTrueWithFallback<Record<string, unknown> | undefined>(
      ref,
      'GET',
      AUTH_SETTINGS_PATHS
    )
    return mergeConfigWithDefaults(ref, payload)
  } catch (error) {
    console.error('[platform-api] failed to load auth config from GoTrue', { ref, error })
    return computeDefaultConfig(ref)
  }
}

export const updateAuthConfig = async (ref: string, body: unknown): Promise<GoTrueConfig> => {
  const patchBody =
    body && typeof body === 'object'
      ? sanitizePatchPayload(body as Partial<AuthConfigUpdate>)
      : {}

  const payload = await requestGoTrueWithFallback<Record<string, unknown> | undefined>(
    ref,
    'PATCH',
    AUTH_SETTINGS_PATHS,
    patchBody
  )

  return mergeConfigWithDefaults(ref, payload)
}

export const updateAuthHooks = async (ref: string, body: unknown): Promise<GoTrueConfig> => {
  const patchBody =
    body && typeof body === 'object'
      ? sanitizePatchPayload(body as Partial<AuthHooksUpdate>)
      : {}

  await requestGoTrueWithFallback<Record<string, unknown> | undefined>(
    ref,
    'PATCH',
    AUTH_HOOKS_PATHS,
    patchBody
  )

  return getAuthConfig(ref)
}
