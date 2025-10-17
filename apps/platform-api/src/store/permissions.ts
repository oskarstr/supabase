import { getPlatformDb } from '../db/client.js'
import type { AccessControlPermission } from './types.js'

const db = getPlatformDb()

const basePermission = (
  organization_slug: string,
  organization_id: number
): AccessControlPermission => ({
  actions: ['%'],
  condition: null,
  organization_id,
  organization_slug,
  project_ids: null,
  project_refs: null,
  resources: ['%'],
  restrictive: false,
})

export const listPermissionsForProfile = async (
  profileId: number
): Promise<AccessControlPermission[]> => {
  if (!profileId) {
    return []
  }

  const memberships = await db
    .selectFrom('organization_members')
    .innerJoin('organizations', 'organizations.id', 'organization_members.organization_id')
    .select(['organizations.id as org_id', 'organizations.slug as org_slug'])
    .where('organization_members.profile_id', '=', profileId)
    .execute()

  if (memberships.length === 0) {
    return []
  }

  return memberships.map((membership) =>
    basePermission(membership.org_slug, Number(membership.org_id))
  )
}
