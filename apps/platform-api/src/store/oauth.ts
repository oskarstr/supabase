import {
  DEFAULT_AUTHORIZED_APPS,
  DEFAULT_PUBLISHED_APPS,
  state,
} from './state.js'
import type { OAuthAppSummary, OAuthAppType } from './types.js'

export const listOAuthApps = (
  slug: string,
  type: OAuthAppType
): OAuthAppSummary[] | undefined => {
  const org = state.organizations.find((organization) => organization.slug === slug)
  if (!org) return undefined
  const source = type === 'authorized' ? DEFAULT_AUTHORIZED_APPS : DEFAULT_PUBLISHED_APPS
  return source.map((app) => ({ ...app }))
}
