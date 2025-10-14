import { nowIso } from './state.js'
import type {
  ProjectLogDrainSummary,
  UsageApiCountSummary,
} from './types.js'

type ProjectLogsResponse = {
  result: Array<Record<string, unknown>>
}

// TODO(platform-api): Proxy real analytics data from the logging subsystem.
export const listProjectLogs = (_ref: string): ProjectLogsResponse => ({
  result: [
    {
      time_bucket: Date.now() * 1000,
      success: 0,
      warning: 0,
      error: 0,
      count: 0,
      ingress_mb: 0,
      egress_mb: 0,
    },
  ],
})

export const listProjectLogDrains = (_ref: string): ProjectLogDrainSummary[] => [
  {
    id: 'log-drain-1',
    name: 'Sample log drain',
    description: 'Forward logs to an external sink.',
    type: 'http',
  },
]

export const listUsageApiCounts = (_ref: string): UsageApiCountSummary => ({
  result: [
    {
      timestamp: nowIso(),
      total_auth_requests: 0,
      total_storage_requests: 0,
      total_rest_requests: 0,
      total_realtime_requests: 0,
    },
  ],
})

export const listUsageApiRequests = (_ref: string) => ({
  total: 0,
})
