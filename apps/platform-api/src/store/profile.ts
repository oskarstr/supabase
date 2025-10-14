import { getPlatformDb } from '../db/client.js'
import { toProfile } from '../db/mappers.js'
import { appendAuditLog } from './audit-logs.js'
import { baseProfile } from '../config/defaults.js'

const db = getPlatformDb()

export const getProfile = async () => {
  const row = await db.selectFrom('profiles').selectAll().orderBy('id').limit(1).executeTakeFirst()
  return row ? toProfile(row) : { ...baseProfile }
}

export const auditAccountLogin = async () => {
  await appendAuditLog({
    created_at: new Date().toISOString(),
    event_message: 'Logged into account',
    ip_address: '127.0.0.1',
    payload: {},
  })
}
