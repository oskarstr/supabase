import { state } from './state.js'
import type { MemberWithFreeProjectLimit, OrgUsageResponse } from './types.js'

export const getOrganizationUsage = (slug: string): OrgUsageResponse | undefined => {
  const organization = state.organizations.find((org) => org.slug === slug)
  if (!organization) return undefined

  return {
    usage_billing_enabled: organization.usage_billing_enabled,
    usages: [],
  }
}

export const listMembersReachedFreeProjectLimit = (
  slug: string
): MemberWithFreeProjectLimit[] | undefined => {
  const organization = state.organizations.find((org) => org.slug === slug)
  if (!organization) return undefined

  return []
}
