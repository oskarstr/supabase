import { randomUUID } from 'node:crypto'

import { getPlatformDb } from '../db/client.js'
import { toAccessToken } from '../db/mappers.js'
import type { AccessToken, AccessTokenWithSecret } from './types.js'

const ACCESS_TOKEN_PREFIX = 'platform'

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

const generateAlias = () => randomInt(100000, 999999).toString()

const withPrefix = (alias: string) => `${ACCESS_TOKEN_PREFIX}_${alias}`

const db = getPlatformDb()

export const listAccessTokens = async (): Promise<AccessToken[]> => {
  const rows = await db.selectFrom('access_tokens').selectAll().orderBy('created_at', 'desc').execute()
  return rows.map((row) => toAccessToken(row) as AccessToken)
}

const generateUniqueAlias = async (): Promise<string> => {
  // TODO(platform-api): Hash and store token digests prior to production shipping.
  for (let attempts = 0; attempts < 5; attempts += 1) {
    const alias = withPrefix(generateAlias())
    const existing = await db
      .selectFrom('access_tokens')
      .select(['id'])
      .where('token_alias', '=', alias)
      .executeTakeFirst()
    if (!existing) return alias
  }
  throw new Error('Failed to generate unique token alias')
}

export const createAccessToken = async (name: string): Promise<AccessTokenWithSecret> => {
  const token_alias = await generateUniqueAlias()
  const access_token = randomUUID().replace(/-/g, '')
  const token_digest = randomUUID().replace(/-/g, '')

  const inserted = await db
    .insertInto('access_tokens')
    .values({
      name,
      token_alias,
      access_token,
      token_digest,
      scope: 'V0',
    })
    .returningAll()
    .executeTakeFirstOrThrow()

  return toAccessToken(inserted, true) as AccessTokenWithSecret
}

export const getAccessToken = async (id: number): Promise<AccessToken | undefined> => {
  const row = await db.selectFrom('access_tokens').selectAll().where('id', '=', id).executeTakeFirst()
  return row ? (toAccessToken(row) as AccessToken) : undefined
}

export const deleteAccessToken = async (id: number) => {
  const result = await db.deleteFrom('access_tokens').where('id', '=', id).returning('id').executeTakeFirst()
  return Boolean(result?.id)
}
