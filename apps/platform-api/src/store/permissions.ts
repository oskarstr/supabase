import { state } from './state.js'
import type { AccessControlPermission } from './types.js'

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

export const listPermissions = (): AccessControlPermission[] =>
  state.organizations.map((organization) => basePermission(organization.slug, organization.id))
