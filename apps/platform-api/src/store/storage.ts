import { randomUUID } from 'node:crypto'

import type {
  StorageBucketSummary,
  StorageCredentialsResponse,
  StoragePublicUrlResponse,
} from './types.js'

const nowIso = () => new Date().toISOString()

// TODO(platform-api): Return real bucket metadata/credentials when the storage service is integrated.
export const listStorageBuckets = (_ref: string): StorageBucketSummary[] => [
  {
    id: 'bucket-default',
    name: 'public',
    owner: 'service_role',
    public: true,
    created_at: nowIso(),
    updated_at: nowIso(),
    allowed_mime_types: ['image/png', 'image/jpeg', 'application/pdf'],
    file_size_limit: 50 * 1024 * 1024,
    type: 'STANDARD',
  },
]

export const getStorageCredentials = (_ref: string): StorageCredentialsResponse => ({
  data: [
    {
      id: randomUUID(),
      description: 'Default Supabase Storage access key',
      created_at: nowIso(),
    },
  ],
})

// TODO(platform-api): Proxy storage object listings once the storage API is wired up.
export const listStorageObjects = (_ref: string, _bucketId: string, _path?: string) => [
  {
    id: randomUUID(),
    name: 'hello.sql',
    created_at: nowIso(),
    updated_at: nowIso(),
    last_accessed_at: nowIso(),
    metadata: { mimetype: 'text/plain' },
  },
]

export const createStoragePublicUrl = (
  _ref: string,
  bucketId: string,
  path: string
): StoragePublicUrlResponse => ({
  publicUrl: `https://storage.supabase.local/object/${bucketId}/${path}`,
})
