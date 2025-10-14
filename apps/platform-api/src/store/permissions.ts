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
  const organizations = await db.selectFrom('organizations').select(['id', 'slug']).execute()
  return organizations.map((organization) => basePermission(organization.slug, organization.id))
}
