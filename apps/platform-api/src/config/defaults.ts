import { randomUUID } from 'node:crypto'

import { buildRestUrl, envString, slugify } from '../store/env.js'
import type {
  AvailableVersionsResponse,
  CloudProvider,
  Organization,
  Profile,
  RegionSmartGroup,
  RegionSpecific,
} from '../store/types.js'
import type { ComputeSize } from '../store/types.js'
import type { OAuthAppSummary } from '../store/types.js'

export const nowIso = () => new Date().toISOString()

export const DEFAULT_ORG_ID = 1
export const DEFAULT_ORG_NAME =
  envString('STUDIO_DEFAULT_ORGANIZATION', 'Local Organization') ?? 'Local Organization'
export const DEFAULT_ORG_SLUG =
  envString('STUDIO_DEFAULT_ORGANIZATION_SLUG', slugify(DEFAULT_ORG_NAME) || 'local-org') ??
  'local-org'
export const DEFAULT_BILLING_EMAIL = envString('STUDIO_DEFAULT_BILLING_EMAIL') ?? null

const rawBillingPartner = envString('STUDIO_DEFAULT_BILLING_PARTNER')
export const DEFAULT_BILLING_PARTNER =
  rawBillingPartner === 'fly' || rawBillingPartner === 'aws_marketplace' || rawBillingPartner === 'vercel_marketplace'
    ? rawBillingPartner
    : null

export const PLAN_LABELS: Record<Organization['plan']['id'], string> = {
  free: 'Free',
  pro: 'Pro',
  team: 'Team',
  enterprise: 'Enterprise',
}

export const DEFAULT_PLAN_ID =
  (envString('STUDIO_DEFAULT_PLAN', 'enterprise') ?? 'enterprise') as Organization['plan']['id']
export const DEFAULT_PLAN_NAME = PLAN_LABELS[DEFAULT_PLAN_ID]

export const DEFAULT_USAGE_BILLING_ENABLED =
  envString('STUDIO_USAGE_BILLING_ENABLED', 'false') === 'true'
export const DEFAULT_ORG_REQUIRES_MFA =
  envString('STUDIO_ORGANIZATION_REQUIRES_MFA', 'false') === 'true'
export const DEFAULT_STRIPE_CUSTOMER_ID = envString('STUDIO_DEFAULT_STRIPE_CUSTOMER_ID') ?? null
export const DEFAULT_SUBSCRIPTION_ID = envString('STUDIO_DEFAULT_SUBSCRIPTION_ID') ?? null
export const DEFAULT_ORG_OPT_IN_TAGS =
  envString('STUDIO_DEFAULT_ORG_OPT_IN_TAGS')
    ?.split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0) ?? []

export const DEFAULT_FIRST_NAME = envString('STUDIO_DEFAULT_FIRST_NAME', 'Local') ?? 'Local'
export const DEFAULT_LAST_NAME = envString('STUDIO_DEFAULT_LAST_NAME', 'Admin') ?? 'Admin'
export const DEFAULT_PRIMARY_EMAIL =
  envString('STUDIO_DEFAULT_PRIMARY_EMAIL', 'admin@example.com') ?? 'admin@example.com'
export const DEFAULT_USERNAME = envString('STUDIO_DEFAULT_USERNAME', 'admin') ?? 'admin'
export const DEFAULT_AUTH0_ID = envString('STUDIO_DEFAULT_AUTH0_ID', 'local|user') ?? 'local|user'
export const DEFAULT_MOBILE = envString('STUDIO_DEFAULT_MOBILE', '') ?? ''
export const DEFAULT_FREE_PROJECT_LIMIT = (() => {
  const parsed = Number.parseInt(envString('STUDIO_FREE_PROJECT_LIMIT') ?? '', 10)
  return Number.isFinite(parsed) ? parsed : 10
})()
export const DEFAULT_IS_ALPHA_USER = envString('STUDIO_DEFAULT_ALPHA_USER', 'false') === 'true'
export const DEFAULT_IS_SSO_USER = envString('STUDIO_DEFAULT_SSO_USER', 'false') === 'true'

export const DEFAULT_PROJECT_NAME =
  envString('STUDIO_DEFAULT_PROJECT', 'Local Project') ?? 'Local Project'
const rawProjectRef = envString('STUDIO_DEFAULT_PROJECT_REF')
export const DEFAULT_PROJECT_REF =
  rawProjectRef && rawProjectRef.trim().length > 0
    ? rawProjectRef.trim()
    : slugify(DEFAULT_PROJECT_NAME) || 'default'
export const DEFAULT_REGION = envString('STUDIO_DEFAULT_REGION', 'local') ?? 'local'
export const DEFAULT_CLOUD_PROVIDER =
  (envString('STUDIO_DEFAULT_CLOUD_PROVIDER', 'AWS') ?? 'AWS') as CloudProvider
export const DEFAULT_DB_VERSION = envString('STUDIO_DEFAULT_DB_VERSION', '15') ?? '15'
export const DEFAULT_INFRA_SIZE =
  (envString('STUDIO_DEFAULT_COMPUTE_SIZE', 'micro') ?? 'micro') as ComputeSize

const defaultDbUrl = envString('SUPABASE_DB_URL', envString('DATABASE_URL')) ?? ''
export const DEFAULT_CONNECTION_STRING = defaultDbUrl.length > 0 ? defaultDbUrl : null
export const DEFAULT_DB_HOST = (() => {
  if (defaultDbUrl.length > 0) {
    try {
      return new URL(defaultDbUrl).hostname
    } catch {
      /* noop */
    }
  }
  return envString('POSTGRES_HOST', 'localhost') ?? 'localhost'
})()

const defaultRestBase =
  envString('SUPABASE_PUBLIC_URL', 'http://localhost:54321') ?? 'http://localhost:54321'
export const DEFAULT_REST_URL = buildRestUrl(defaultRestBase)
export const DEFAULT_ANON_KEY = envString('ANON_KEY', randomUUID()) ?? randomUUID()
export const DEFAULT_SERVICE_KEY =
  envString('SERVICE_ROLE_KEY', randomUUID()) ?? randomUUID()
export const DEFAULT_PROJECT_SUBSCRIPTION_ID =
  envString('STUDIO_DEFAULT_PROJECT_SUBSCRIPTION_ID') ?? randomUUID()
export const DEFAULT_BRANCH_ENABLED =
  envString('STUDIO_DEFAULT_BRANCH_ENABLED', 'false') === 'true'
export const DEFAULT_PHYSICAL_BACKUPS =
  envString('STUDIO_DEFAULT_PHYSICAL_BACKUPS', 'false') === 'true'

export const REGION_SMART_GROUPS: RegionSmartGroup[] = [
  { code: 'americas', name: 'Americas', type: 'smartGroup' },
  { code: 'emea', name: 'Europe, Middle East, and Africa', type: 'smartGroup' },
  { code: 'apac', name: 'Asia Pacific', type: 'smartGroup' },
]

export const REGION_SPECIFICS: Record<CloudProvider, RegionSpecific[]> = {
  AWS: [
    { code: 'aws-us-east-1', name: 'US East 1 (N. Virginia)', provider: 'AWS', type: 'specific' },
    { code: 'aws-eu-west-1', name: 'EU West 1 (Ireland)', provider: 'AWS', type: 'specific' },
  ],
  FLY: [
    { code: 'fly-ams', name: 'Amsterdam, NL', provider: 'FLY', type: 'specific' },
    { code: 'fly-iad', name: 'Ashburn, VA', provider: 'FLY', type: 'specific' },
  ],
  AWS_K8S: [
    { code: 'aws-k8s-us-east-1', name: 'US East 1 (K8S)', provider: 'AWS_K8S', type: 'specific' },
  ],
  AWS_NIMBUS: [
    { code: 'aws-nimbus-us-east-1', name: 'US East 1 (Nimbus)', provider: 'AWS_NIMBUS', type: 'specific' },
  ],
}

export const DEFAULT_AVAILABLE_VERSIONS: AvailableVersionsResponse['available_versions'] = [
  { postgres_engine: '15', release_channel: 'ga', version: '15.5.0' },
  { postgres_engine: '17', release_channel: 'beta', version: '17.0.0' },
  { postgres_engine: '17-oriole', release_channel: 'preview', version: '0.1.0' },
]

export const DEFAULT_AUTHORIZED_APPS: OAuthAppSummary[] = [
  {
    id: 'authorized-app-1',
    name: 'Local Studio CLI',
    website: 'https://supabase.local',
    registration_type: 'manual',
    scopes: ['projects:read', 'rest:read'],
    authorized_at: '2024-01-01T00:00:00.000Z',
    client_id: 'local-cli-client',
    icon: 'https://supabase.com/_next/image?url=%2Fimages%2Fsupabase-logo-icon.png&w=256&q=75',
  },
]

export const DEFAULT_PUBLISHED_APPS: OAuthAppSummary[] = [
  {
    id: 'published-app-1',
    name: 'Supabase Studio',
    website: 'https://supabase.com',
    registration_type: 'manual',
    scopes: ['projects:read', 'projects:write'],
    created_at: '2024-01-01T00:00:00.000Z',
    created_by: 'local-admin',
    redirect_uris: ['https://supabase.local/'],
    icon: 'https://supabase.com/_next/image?url=%2Fimages%2Fsupabase-logo-icon.png&w=256&q=75',
  },
]

export const baseProfile: Profile = {
  auth0_id: DEFAULT_AUTH0_ID,
  disabled_features: [],
  first_name: DEFAULT_FIRST_NAME,
  free_project_limit: DEFAULT_FREE_PROJECT_LIMIT,
  gotrue_id: randomUUID(),
  id: 1,
  is_alpha_user: DEFAULT_IS_ALPHA_USER,
  is_sso_user: DEFAULT_IS_SSO_USER,
  last_name: DEFAULT_LAST_NAME,
  mobile: DEFAULT_MOBILE,
  primary_email: DEFAULT_PRIMARY_EMAIL,
  username: DEFAULT_USERNAME,
}

export const baseOrganizations: Organization[] = [
  {
    billing_email: DEFAULT_BILLING_EMAIL,
    billing_partner: DEFAULT_BILLING_PARTNER,
    id: DEFAULT_ORG_ID,
    is_owner: true,
    name: DEFAULT_ORG_NAME,
    opt_in_tags: [...DEFAULT_ORG_OPT_IN_TAGS],
    organization_requires_mfa: DEFAULT_ORG_REQUIRES_MFA,
    plan: { id: DEFAULT_PLAN_ID, name: DEFAULT_PLAN_NAME },
    restriction_data: null,
    restriction_status: null,
    slug: DEFAULT_ORG_SLUG,
    stripe_customer_id: DEFAULT_STRIPE_CUSTOMER_ID,
    subscription_id: DEFAULT_SUBSCRIPTION_ID,
    usage_billing_enabled: DEFAULT_USAGE_BILLING_ENABLED,
  },
]
