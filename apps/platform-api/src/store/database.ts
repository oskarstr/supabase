import type { DatabaseBackupSummary } from './types.js'

const nowIso = () => new Date().toISOString()

// TODO(platform-api): Return real backup metadata once hooked up to the backup service.
export const listDatabaseBackups = (_ref: string): DatabaseBackupSummary[] => [
  {
    id: 1,
    status: 'COMPLETED',
    created_at: nowIso(),
  },
]
