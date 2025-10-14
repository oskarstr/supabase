import type { ReplicationSourceSummary } from './types.js'

const DEFAULT_SOURCES: ReplicationSourceSummary[] = [
  {
    id: 'source-1',
    name: 'Primary Database',
    type: 'postgres',
    status: 'idle',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

// TODO(platform-api): Replace replication stubs once pipeline management is implemented.
export const listReplicationSources = (_ref: string): ReplicationSourceSummary[] =>
  DEFAULT_SOURCES.map((item) => ({ ...item }))
