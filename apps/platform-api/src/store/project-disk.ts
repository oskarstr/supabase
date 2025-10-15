import type { DiskAutoscaleConfig, DiskAttributes, DiskUtilizationResponse } from './types.js'

const nowIso = () => new Date().toISOString()

// TODO(platform-api): Surface real disk attributes from the Postgres service.
export const getProjectDiskAttributes = (_ref: string): DiskAttributes => ({
  size_gb: 8,
  used_bytes: 0,
  last_modified_at: nowIso(),
  type: 'gp3',
})

export const getProjectDiskAutoscaleConfig = (_ref: string): DiskAutoscaleConfig => ({
  enabled: false,
  min_disk_size_gb: 8,
  max_disk_size_gb: 64,
})

export const getProjectDiskUtilization = (_ref: string): DiskUtilizationResponse => ({
  data: [
    {
      period_start: nowIso(),
      period_end: nowIso(),
      used_bytes: 0,
      provisioned_bytes: 8 * 1024 * 1024 * 1024,
    },
  ],
})
