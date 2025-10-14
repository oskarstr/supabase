import { getPlatformDb } from '../db/client.js'
import {
  DEFAULT_AUTHORIZED_APPS,
  DEFAULT_PUBLISHED_APPS,
} from '../config/defaults.js'
import type { OAuthAppSummary, OAuthAppType } from './types.js'

const db = getPlatformDb()

export const listOAuthApps = async (
  slug: string,
  type: OAuthAppType
): Promise<OAuthAppSummary[] | undefined> => {
  const org = await db.selectFrom('organizations').select('id').where('slug', '=', slug).executeTakeFirst()
  if (!org) return undefined
  const source = type === 'authorized' ? DEFAULT_AUTHORIZED_APPS : DEFAULT_PUBLISHED_APPS
  return source.map((app) => ({ ...app }))
}
