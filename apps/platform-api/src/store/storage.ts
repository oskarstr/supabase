import { URL } from 'node:url'

import { getPlatformDb } from '../db/client.js'
import type {
  StorageBucketSummary,
  StorageCredentialsResponse,
  StoragePublicUrlResponse,
} from './types.js'

const db = getPlatformDb()

type StorageClientContext = {
  storageUrl: string
  serviceKey: string
}

const REST_PATH_SUFFIX = /\/rest\/v1\/?$/

const resolveStorageClientContext = async (ref: string): Promise<StorageClientContext> => {
  const project = await db
    .selectFrom('projects')
    .select(['ref', 'rest_url', 'service_key', 'status'])
    .where('ref', '=', ref)
    .executeTakeFirst()

  if (!project) {
    throw new Error(`Project ${ref} not found when resolving storage endpoint`)
  }

  if (project.status !== 'ACTIVE_HEALTHY') {
    // Mirror the auth guard: avoid piling requests onto a storage backend that may
    // still be booting. If provisioning flows change, revisit this shortcut.
    const error = new Error(`Project ${ref} is still provisioning; storage API unavailable`)
    ;(error as Error & { statusCode?: number }).statusCode = 503
    throw error
  }

  const baseRestUrl = project.rest_url ?? `https://${project.ref}.supabase.local/rest/v1/`
  const normalizedBase = baseRestUrl.replace(REST_PATH_SUFFIX, '')
  const trimmedBase = normalizedBase.replace(/\/+$/, '')
  const storageUrl = `${trimmedBase}/storage/v1`

  if (!project.service_key) {
    const error = new Error(`Project ${ref} is missing a service role key`)
    ;(error as Error & { statusCode?: number }).statusCode = 503
    throw error
  }

  return { storageUrl, serviceKey: project.service_key }
}

type StorageRequestOptions = {
  method: 'GET' | 'POST'
  path: string
  body?: unknown
}

const performStorageRequest = async <T>(
  ref: string,
  { method, path, body }: StorageRequestOptions
): Promise<T> => {
  const { serviceKey, storageUrl } = await resolveStorageClientContext(ref)

  const url = new URL(path, `${storageUrl}/`)
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${serviceKey}`,
    apikey: serviceKey,
  }

  const requestInit: RequestInit = {
    method,
    headers,
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    requestInit.body = JSON.stringify(body)
  }

  const response = await fetch(url, requestInit)

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText)
    throw new Error(
      `Storage request ${method} ${url.pathname} failed with ${response.status}: ${message}`
    )
  }

  if (response.status === 204) {
    return undefined as T
  }

  const payload = (await response.json()) as T
  return payload
}

const mapBucketSummary = (input: any): StorageBucketSummary => {
  if (!input || typeof input !== 'object') {
    throw new Error('Received invalid storage bucket payload')
  }

  const id = 'id' in input && typeof input.id === 'string' ? input.id : undefined
  const name = 'name' in input && typeof input.name === 'string' ? input.name : undefined

  if (!id || !name) {
    throw new Error('Storage bucket payload is missing an id or name')
  }

  return {
    id,
    name,
    owner: typeof input.owner === 'string' ? input.owner : '',
    public: Boolean((input as { public?: unknown }).public),
    created_at:
      typeof input.created_at === 'string' ? input.created_at : new Date().toISOString(),
    updated_at:
      typeof input.updated_at === 'string' ? input.updated_at : new Date().toISOString(),
    allowed_mime_types: Array.isArray(input.allowed_mime_types)
      ? (input.allowed_mime_types.filter((value: unknown): value is string => typeof value === 'string'))
      : undefined,
    file_size_limit:
      typeof input.file_size_limit === 'number' ? input.file_size_limit : undefined,
    type:
      typeof input.type === 'string' &&
      (input.type === 'STANDARD' || input.type === 'ANALYTICS')
        ? input.type
        : undefined,
  }
}

export const listStorageBuckets = async (ref: string): Promise<StorageBucketSummary[]> => {
  const buckets = await performStorageRequest<unknown[]>(ref, {
    method: 'GET',
    path: 'bucket',
  })

  if (!Array.isArray(buckets)) {
    throw new Error('Storage bucket response was not an array')
  }

  return buckets.map((bucket) => mapBucketSummary(bucket))
}

type RawStorageCredential = {
  id?: unknown
  description?: unknown
  created_at?: unknown
  name?: unknown
}

const normalizeCredentialsPayload = (payload: unknown): RawStorageCredential[] => {
  if (!payload) {
    return []
  }

  if (Array.isArray(payload)) {
    return payload
  }

  if (
    typeof payload === 'object' &&
    payload !== null &&
    'data' in payload &&
    Array.isArray((payload as { data: unknown }).data)
  ) {
    return (payload as { data: RawStorageCredential[] }).data
  }

  throw new Error('Storage credentials response had unexpected shape')
}

export const getStorageCredentials = async (
  ref: string
): Promise<StorageCredentialsResponse> => {
  const payload = await performStorageRequest<unknown>(ref, {
    method: 'GET',
    path: 's3',
  })

  const credentials = normalizeCredentialsPayload(payload)

  return {
    data: credentials.map((entry) => {
      const id =
        typeof entry.id === 'string'
          ? entry.id
          : typeof entry.name === 'string'
            ? entry.name
            : undefined

      if (!id) {
        throw new Error('Storage credential entry is missing an id')
      }

      return {
        id,
        description:
          typeof entry.description === 'string'
            ? entry.description
            : typeof entry.name === 'string'
              ? entry.name
              : 'Storage access key',
        created_at:
          typeof entry.created_at === 'string'
            ? entry.created_at
            : new Date().toISOString(),
      }
    }),
  }
}

type ListObjectsOptions = {
  path?: string
  options?: Record<string, unknown>
}

const buildListObjectsPayload = ({ path, options }: ListObjectsOptions) => {
  const sanitizedPath = (path ?? '').replace(/^\/+/, '')

  const body: Record<string, unknown> = {
    prefix: sanitizedPath,
  }

  if (options) {
    if (typeof options.limit === 'number') {
      body.limit = options.limit
    }

    if (typeof options.offset === 'number') {
      body.offset = options.offset
    }

    if (typeof options.search === 'string' && options.search.length > 0) {
      body.search = options.search
    }

    if (typeof options.sortBy === 'object' && options.sortBy !== null) {
      body.sortBy = options.sortBy
    }
  }

  return body
}

export const listStorageObjects = async (
  ref: string,
  bucketId: string,
  path?: string,
  options?: Record<string, unknown>
) => {
  const body = buildListObjectsPayload({ path, options })

  const objects = await performStorageRequest<unknown[]>(ref, {
    method: 'POST',
    path: `object/list/${encodeURIComponent(bucketId)}`,
    body,
  })

  if (!Array.isArray(objects)) {
    throw new Error('Storage object list response was not an array')
  }

  return objects
}

export const createStoragePublicUrl = async (
  ref: string,
  bucketId: string,
  path: string
): Promise<StoragePublicUrlResponse> => {
  const { storageUrl } = await resolveStorageClientContext(ref)
  const url = new URL(storageUrl)
  const encodedBucketId = encodeURIComponent(bucketId)
  const encodedPath = path
    .split('/')
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join('/')

  const suffix = encodedPath.length > 0 ? `/${encodedPath}` : ''
  url.pathname = `/storage/v1/object/public/${encodedBucketId}${suffix}`.replace(/\/+$/, '')

  return {
    publicUrl: url.toString(),
  }
}
