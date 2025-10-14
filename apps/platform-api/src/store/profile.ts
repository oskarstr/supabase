import { appendAuditLog } from './audit-logs.js'
import { state } from './state.js'

export const getProfile = () => state.profile

export const auditAccountLogin = () => {
  appendAuditLog({
    created_at: new Date().toISOString(),
    event_message: 'Logged into account',
    ip_address: '127.0.0.1',
    payload: {},
  })
}
