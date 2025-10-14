// TODO(platform-api): Implement pg-meta proxies; these empty responses keep Studio stable during scaffolding.
export const listPgMetaColumnPrivileges = (_ref: string) => []

export const listPgMetaExtensions = (_ref: string) => []

export const listPgMetaForeignTables = (_ref: string) => []

export const listPgMetaMaterializedViews = (_ref: string) => []

export const listPgMetaPolicies = (_ref: string) => []

export const listPgMetaPublications = (_ref: string) => []

export const listPgMetaTriggers = (_ref: string) => []

export const listPgMetaTypes = (_ref: string) => []

export const listPgMetaViews = (_ref: string) => []

const PG_META_QUERY_DATA: Record<string, unknown> = {
  schemas: [
    {
      id: 2200,
      schema: 'public',
      owner: 'postgres',
      comment: null,
      security_classification: null,
    },
    {
      id: 2201,
      schema: 'auth',
      owner: 'postgres',
      comment: null,
      security_classification: null,
    },
  ],
  keywords: [],
  'table-columns': [],
  'database-functions': [],
  'projects-default-users-infinite': [],
  'users-count': [{ count: '0' }],
  fdws: [],
  'entity-types-public-0': [],
}

// TODO(platform-api): Replace stubbed responses with real pg-meta query execution.
export const runPgMetaQuery = (key = '', _sql?: string) => {
  if (Object.prototype.hasOwnProperty.call(PG_META_QUERY_DATA, key)) {
    return PG_META_QUERY_DATA[key]
  }
  return []
}
