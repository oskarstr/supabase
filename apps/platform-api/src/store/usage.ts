import { getPlatformDb } from '../db/client.js'
import type { MemberWithFreeProjectLimit, OrgUsageResponse } from './types.js'

const db = getPlatformDb()

export const getOrganizationUsage = async (slug: string): Promise<OrgUsageResponse | undefined> => {
  const organization = await db
    .selectFrom('organizations')
    .select(['usage_billing_enabled'])
    .where('slug', '=', slug)
    .executeTakeFirst()

  if (!organization) return undefined

  return {
    usage_billing_enabled: organization.usage_billing_enabled,
    usages: [],
  }
}

export const listMembersReachedFreeProjectLimit = async (
  slug: string
): Promise<MemberWithFreeProjectLimit[] | undefined> => {
  const organization = await db
    .selectFrom('organizations')
    .select(['id'])
    .where('slug', '=', slug)
    .executeTakeFirst()
  if (!organization) return undefined

  return []
}
