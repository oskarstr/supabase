import { randomUUID } from 'node:crypto'

import { state, saveState } from './state.js'
import type { AccessToken, AccessTokenWithSecret } from './types.js'

const ACCESS_TOKEN_PREFIX = 'platform'

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

const generateAlias = () => randomInt(100000, 999999).toString()

const withPrefix = (alias: string) => `${ACCESS_TOKEN_PREFIX}_${alias}`

export const listAccessTokens = (): AccessToken[] => {
  if (!state.accessTokens) {
    state.accessTokens = []
  }
  return state.accessTokens.map(({ access_token: _value, token_digest, token_alias, ...token }) => ({
    ...token,
    token_alias,
  }))
}

export const createAccessToken = (name: string): AccessTokenWithSecret => {
  if (!state.accessTokens) {
    state.accessTokens = []
  }

  const alias = generateAlias()
  const createdAt = new Date().toISOString()

  const token: AccessTokenWithSecret = {
    id: randomInt(1, 10_000),
    name,
    created_at: createdAt,
    expires_at: null,
    last_used_at: null,
    scope: 'V0',
    token_alias: withPrefix(alias),
    access_token: randomUUID().replace(/-/g, ''),
    token_digest: randomUUID().replace(/-/g, ''),
  }

  state.accessTokens.push(token)
  saveState(state)

  return token
}

export const getAccessToken = (id: number): AccessToken | undefined => {
  if (!state.accessTokens) {
    state.accessTokens = []
  }

  const found = state.accessTokens.find((token) => token.id === id)
  if (!found) return undefined

  const { access_token: _value, token_digest: _digest, ...rest } = found
  return rest
}

export const deleteAccessToken = (id: number) => {
  if (!state.accessTokens) {
    state.accessTokens = []
  }

  const index = state.accessTokens.findIndex((token) => token.id === id)
  if (index === -1) return false

  state.accessTokens.splice(index, 1)
  saveState(state)
  return true
}
