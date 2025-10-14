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

const buildCombinedStatsPoint = () => ({
  timestamp: nowIso(),
  requests_count: 8,
  log_count: 4,
  log_info_count: 2,
  log_warn_count: 1,
  log_error_count: 1,
  success_count: 6,
  redirect_count: 1,
  client_err_count: 1,
  server_err_count: 0,
  avg_cpu_time_used: 12.5,
  avg_memory_used: 24.5,
  avg_execution_time: 18.2,
  max_execution_time: 32.4,
  avg_heap_memory_used: 6.1,
  avg_external_memory_used: 4.7,
  max_cpu_time_used: 28.9,
})

// TODO(platform-api): Surface real edge function analytics once observability integration is wired.
export const listFunctionCombinedStats = (
  _ref: string,
  _functionId: string,
  _interval: string
) => ({
  result: [buildCombinedStatsPoint()],
})

export const listFunctionRequestStats = (
  _ref: string,
  _functionId: string,
  _interval: string
) => ({
  result: [
    {
      timestamp: nowIso(),
      requests_count: 8,
      success_count: 6,
      redirect_count: 1,
      client_err_count: 1,
      server_err_count: 0,
    },
  ],
})

export const listFunctionResourceUsage = (
  _ref: string,
  _functionId: string,
  _interval: string
) => ({
  result: [
    {
      timestamp: nowIso(),
      avg_cpu_time_used: 12.5,
      max_cpu_time_used: 28.9,
      avg_memory_used: 24.5,
      avg_heap_memory_used: 6.1,
      avg_external_memory_used: 4.7,
      avg_execution_time: 18.2,
      max_execution_time: 32.4,
    },
  ],
})
