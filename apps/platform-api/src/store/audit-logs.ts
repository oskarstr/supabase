import { state, saveState } from './state.js'
import type { AuditLogEntry } from './types.js'

const ensureAuditLogs = () => {
  if (!state.auditLogs) {
    state.auditLogs = []
  }
  return state.auditLogs
}

export const listAuditLogs = (start?: string, end?: string): AuditLogEntry[] => {
  const logs = ensureAuditLogs()
  if (!start && !end) return [...logs]

  const startDate = start ? new Date(start).getTime() : undefined
  const endDate = end ? new Date(end).getTime() : undefined

  return logs.filter((log) => {
    const created = new Date(log.created_at).getTime()
    if (startDate !== undefined && created < startDate) return false
    if (endDate !== undefined && created > endDate) return false
    return true
  })
}

export const appendAuditLog = (entry: AuditLogEntry) => {
  const logs = ensureAuditLogs()
  logs.push(entry)
  if (logs.length > 1000) {
    logs.splice(0, logs.length - 1000)
  }
  saveState(state)
}
