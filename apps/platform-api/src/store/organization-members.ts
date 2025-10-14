import {
  DEFAULT_PRIMARY_EMAIL,
  DEFAULT_USERNAME,
  state,
} from './state.js'
import type {
  OrganizationInvitationsResponse,
  OrganizationMember,
  OrganizationRolesResponse,
  OrgDailyUsageResponse,
} from './types.js'

const nowIso = () => new Date().toISOString()

const DEFAULT_MEMBERS: OrganizationMember[] = [
  {
    gotrue_id: 'local-user-1',
    is_sso_user: false,
    metadata: {},
    mfa_enabled: false,
    primary_email: DEFAULT_PRIMARY_EMAIL,
    role_ids: [1],
    username: DEFAULT_USERNAME,
  },
]

const DEFAULT_ROLES: OrganizationRolesResponse = {
  org_scoped_roles: [
    {
      base_role_id: 1,
      description: 'Full access to organization management features.',
      id: 1,
      name: 'Owner',
      project_ids: null,
    },
    {
      base_role_id: 2,
      description: 'Manage projects and members.',
      id: 2,
      name: 'Administrator',
      project_ids: null,
    },
    {
      base_role_id: 3,
      description: 'Developer access to project resources.',
      id: 3,
      name: 'Developer',
      project_ids: null,
    },
    {
      base_role_id: 4,
      description: 'Read-only access to project resources.',
      id: 4,
      name: 'Read-only',
      project_ids: null,
    },
  ],
  project_scoped_roles: [],
}

const DEFAULT_INVITATIONS: OrganizationInvitationsResponse = {
  invitations: [
    {
      id: 1,
      invited_at: nowIso(),
      invited_email: 'new-contributor@example.com',
      role_id: 3,
    },
  ],
}

const DEFAULT_DAILY_USAGE: OrgDailyUsageResponse = {
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

const matchesKnownOrg = (slug: string) => state.organizations.some((org) => org.slug === slug)

// TODO(platform-api): Back these organization helpers with real persistence.
export const listOrganizationMembers = (slug: string): OrganizationMember[] =>
  matchesKnownOrg(slug) ? DEFAULT_MEMBERS.map((member) => ({ ...member })) : []

export const listOrganizationRoles = (slug: string): OrganizationRolesResponse =>
  matchesKnownOrg(slug)
    ? {
        org_scoped_roles: DEFAULT_ROLES.org_scoped_roles.map((role) => ({ ...role })),
        project_scoped_roles: [],
      }
    : { org_scoped_roles: [], project_scoped_roles: [] }

export const listOrganizationInvitations = (slug: string): OrganizationInvitationsResponse =>
  matchesKnownOrg(slug)
    ? {
        invitations: DEFAULT_INVITATIONS.invitations.map((invitation) => ({ ...invitation })),
      }
    : { invitations: [] }

export const listOrganizationDailyUsage = (
  slug: string,
  _start?: string,
  _end?: string
): OrgDailyUsageResponse =>
  matchesKnownOrg(slug)
    ? {
        usages: DEFAULT_DAILY_USAGE.usages.map((entry) => ({
          ...entry,
        })),
      }
    : { usages: [] }
