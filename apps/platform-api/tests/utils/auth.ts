import { createHmac } from 'node:crypto'

export const TEST_USER_ID = '00000000-0000-0000-0000-000000000001'
export const TEST_USER_EMAIL = 'test-user@example.com'

export const TEST_JWT_SECRET = 'test-secret'

const encode = (value: Record<string, unknown>) =>
  Buffer.from(JSON.stringify(value)).toString('base64url')

export const createTestJwt = (payload: Record<string, unknown> = {}) => {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const body = {
    sub: TEST_USER_ID,
    role: 'authenticated',
    exp: now + 60 * 60,
    ...payload,
  }

  const headerSegment = encode(header)
  const payloadSegment = encode(body)
  const signature = createHmac('sha256', TEST_JWT_SECRET)
    .update(`${headerSegment}.${payloadSegment}`)
    .digest('base64url')

  return `${headerSegment}.${payloadSegment}.${signature}`
}

export const authHeaders = (payload?: Record<string, unknown>) => ({
  authorization: `Bearer ${createTestJwt(payload)}`,
})
