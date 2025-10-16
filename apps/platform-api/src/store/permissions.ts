import { baseOrganizations } from '../config/defaults.js'
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

export const listPermissions = async (): Promise<AccessControlPermission[]> => {
  try {
    const organizations = await db.selectFrom('organizations').select(['id', 'slug']).execute()
    if (organizations.length > 0) {
      return organizations.map((organization) => basePermission(organization.slug, organization.id))
    }
    console.warn(
      '[platform-api] no organizations found when computing permissions, falling back to defaults'
    )
  } catch (error) {
    console.warn('[platform-api] failed to load permissions from database, using defaults', error)
  }

  return baseOrganizations.map((organization) => basePermission(organization.slug, organization.id))
}
