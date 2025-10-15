import { DEFAULT_CONNECTION_STRING, DEFAULT_SERVICE_KEY } from '../config/defaults.js'
import { getPlatformDb } from '../db/client.js'

const db = getPlatformDb()

interface ProjectRow {
  connection_string: string | null
  service_key: string | null
}

export interface ProjectCredentials {
  connectionString: string | null
  serviceKey: string | null
}

const fetchProjectRow = async (ref: string): Promise<ProjectRow | undefined> => {
  return db
    .selectFrom('projects')
    .select(['connection_string', 'service_key'])
    .where('ref', '=', ref)
    .executeTakeFirst()
}

export const getProjectCredentials = async (ref: string): Promise<ProjectCredentials> => {
  const row = await fetchProjectRow(ref)
  return {
    connectionString: row?.connection_string ?? DEFAULT_CONNECTION_STRING ?? null,
    serviceKey: row?.service_key ?? DEFAULT_SERVICE_KEY ?? null,
  }
}
