import type { AuthConfig } from './types.js'

const buildBaseConfig = (ref: string): AuthConfig => ({
  SITE_URL: `https://${ref}.supabase.local`,
  ADDITIONAL_REDIRECT_URLS: '',
  DISABLE_SIGNUP: false,
  JWT_EXP: 3600,
  MAILER_AUTOCONFIRM: true,
  MAILER_SUBJECTS_AUTHENTICATED: [],
  MAILER_SUBJECTS_INVITE: [],
  MAILER_SUBJECTS_MAGIC_LINK: [],
  MAILER_SUBJECTS_PASSWORD_RESET: [],
  MAILER_SUBJECTS_EMAIL_CHANGE: [],
  MAILER_SUBJECTS_SMS: [],
  EXTERNAL_EMAIL_ENABLED: true,
  AUDIT_LOG_DISABLE_POSTGRES: false,
  API_MAX_REQUEST_DURATION: null,
})

// TODO(platform-api): Replace with live GoTrue config once auth service integration is available.
export const getAuthConfig = (ref: string): AuthConfig => ({
  ...buildBaseConfig(ref),
})

export const updateAuthConfig = (ref: string, _body: unknown): AuthConfig => ({
  ...buildBaseConfig(ref),
})

export const updateAuthHooks = (_ref: string, _body: unknown) => ({
  webhook_secret: 'stub-webhook-secret',
  events: [],
})
