import { getPlatformDb } from '../db/client.js'
import { toAuditLogEntry } from '../db/mappers.js'
import type { AuditLogEntry } from './types.js'

const db = getPlatformDb()

const toDate = (value?: string) => {
  if (!value) return undefined
  const timestamp = new Date(value)
  return Number.isNaN(timestamp.getTime()) ? undefined : timestamp
}

export const listAuditLogs = async (start?: string, end?: string): Promise<AuditLogEntry[]> => {
  let query = db.selectFrom('audit_logs').selectAll()

  const startDate = toDate(start)
  const endDate = toDate(end)

  if (startDate) {
    query = query.where('created_at', '>=', startDate)
  }
  if (endDate) {
    query = query.where('created_at', '<=', endDate)
  }

  const rows = await query.orderBy('created_at', 'desc').execute()
  return rows.map(toAuditLogEntry)
}

export const appendAuditLog = async (entry: AuditLogEntry) => {
  await db
    .insertInto('audit_logs')
    .values({
      organization_id: null,
      project_id: null,
      event_message: entry.event_message,
      ip_address: entry.ip_address ?? null,
      payload: entry.payload ?? null,
      created_at: toDate(entry.created_at) ?? new Date(),
    })
    .execute()
}
