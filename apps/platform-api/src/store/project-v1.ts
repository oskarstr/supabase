import { nowIso } from './state.js'

import type { components } from 'api-types'

// TODO(platform-api): Replace these legacy v1 stubs with real Management API handlers
// once the dedicated services land and Kong proxies /api/v1 to those modules.

type ApiKeyResponse = components['schemas']['ApiKeyResponse']
type FunctionResponse = components['schemas']['FunctionResponse']
type DatabaseUpgradeStatusResponse = components['schemas']['DatabaseUpgradeStatusResponse']
type V1ServiceHealthResponse = components['schemas']['V1ServiceHealthResponse']

const buildTimestamp = () => Math.floor(Date.now() / 1000)

export const listProjectApiKeys = (ref: string, reveal: boolean): ApiKeyResponse[] => {
  const baseInserted = nowIso()

  const makeKey = (
    name: string,
    type: ApiKeyResponse['type'],
    apiKey: string
  ): ApiKeyResponse => ({
    id: `${ref}-${name}`,
    name,
    type,
    api_key: reveal ? apiKey : `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`,
    hash: `hash_${name}`,
    inserted_at: baseInserted,
    updated_at: baseInserted,
    prefix: name.slice(0, 2),
    description: `${name} key for ${ref}`,
    secret_jwt_template: type === 'secret' ? { role: name } : null,
  })

  return [
    makeKey('anon', 'publishable', 'pk_live_anon_key_example_12345'),
    makeKey('service_role', 'secret', 'sk_live_service_key_example_67890'),
    makeKey('analytics', 'secret', 'sk_live_analytics_key_example_24680'),
  ]
}

export const listProjectFunctions = (ref: string): FunctionResponse[] => {
  const timestamp = buildTimestamp()
  return [
    {
      id: `${ref}-hello-world`,
      name: 'Hello World',
      slug: 'hello-world',
      created_at: timestamp - 3600,
      updated_at: timestamp,
      status: 'ACTIVE',
      version: 1,
      entrypoint_path: 'functions/hello-world/index.ts',
      verify_jwt: true,
    },
  ]
}

export const getProjectUpgradeStatus = (_ref: string): DatabaseUpgradeStatusResponse => ({
  databaseUpgradeStatus: {
    initiated_at: nowIso(),
    latest_status_at: nowIso(),
    status: 9,
    target_version: 15,
    progress: '9_completed_upgrade',
  },
})

export const listProjectServiceHealth = (
  _ref: string,
  services: string[]
): V1ServiceHealthResponse[] => {
  const now = nowIso()
  return services.map((name) => ({
    name: name as V1ServiceHealthResponse['name'],
    healthy: true,
    status: 'ACTIVE_HEALTHY',
    info:
      name === 'auth'
        ? {
            name: 'GoTrue',
            description: 'Local GoTrue stub',
            version: '2.0.0-local',
          }
        : {
            connected_cluster: 1,
            db_connected: true,
            healthy: true,
          },
    error: undefined,
  }))
}
