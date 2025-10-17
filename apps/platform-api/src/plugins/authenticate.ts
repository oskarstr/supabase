import { createHmac, timingSafeEqual } from 'node:crypto'
import type { FastifyReply, FastifyRequest } from 'fastify'

type JwtPayload = Record<string, unknown> & {
  sub?: string
  email?: string
  role?: string
  exp?: number
}

export type AuthContext = {
  token: string
  userId: string
  email?: string
  role: string
  claims: JwtPayload
}

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthContext
  }
}

const BASE64_URL = 'base64url'

const unauthorized = (reply: FastifyReply, message: string) =>
  reply.code(401).send({ error: 'unauthorized', message })

const decodeSegment = (segment: string) => {
  try {
    return JSON.parse(Buffer.from(segment, BASE64_URL).toString('utf-8'))
  } catch {
    return null
  }
}

const verifySignature = (header: string, payload: string, signature: string, secret: string) => {
  const expected = createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest(BASE64_URL)

  const expectedBuffer = Buffer.from(expected, BASE64_URL)
  const signatureBuffer = Buffer.from(signature, BASE64_URL)

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false
  }

  return timingSafeEqual(signatureBuffer, expectedBuffer)
}

export const authenticateRequest = async (request: FastifyRequest, reply: FastifyReply) => {
  const secret =
    process.env.JWT_SECRET?.trim() || process.env.SUPABASE_JWT_SECRET?.trim() || undefined

  if (!secret) {
    request.log.error('JWT secret is not configured')
    return reply.code(500).send({ error: 'misconfigured', message: 'JWT secret is not configured' })
  }

  const headerValue = request.headers.authorization
  if (!headerValue) {
    return unauthorized(reply, 'Missing Authorization header')
  }

  const token = headerValue.replace(/^Bearer\s+/i, '')
  const segments = token.split('.')
  if (segments.length !== 3) {
    return unauthorized(reply, 'Malformed JWT token')
  }

  const [headerSegment, payloadSegment, signatureSegment] = segments
  const header = decodeSegment(headerSegment)
  const payload = decodeSegment(payloadSegment) as JwtPayload | null

  if (!header || header.alg !== 'HS256' || !payload) {
    return unauthorized(reply, 'Invalid JWT token')
  }

  if (!verifySignature(headerSegment, payloadSegment, signatureSegment, secret)) {
    return unauthorized(reply, 'Invalid JWT signature')
  }

  if (typeof payload.exp === 'number') {
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp < now) {
      return unauthorized(reply, 'JWT token is expired')
    }
  }

  if (!payload.sub || typeof payload.sub !== 'string') {
    return unauthorized(reply, 'JWT token is missing subject claim')
  }

  request.auth = {
    token,
    userId: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : undefined,
    role: typeof payload.role === 'string' ? payload.role : 'authenticated',
    claims: payload,
  }
}
