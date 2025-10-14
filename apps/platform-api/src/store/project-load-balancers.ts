import type { LoadBalancerSummary } from './types.js'

// TODO(platform-api): Surface real load balancer information from Supavisor.
export const listProjectLoadBalancers = (ref: string): LoadBalancerSummary[] => [
  {
    endpoint: `lb-${ref}.supabase.local:6543`,
    databases: [
      { identifier: `${ref}-primary`, status: 'healthy', type: 'PRIMARY' },
      { identifier: `${ref}-read`, status: 'healthy', type: 'READ_REPLICA' },
    ],
  },
]
