import type {
  ProjectContentCountSummary,
  ProjectContentFoldersResponse,
  ProjectContentItem,
  ProjectContentListResponse,
} from './types.js'

const nowIso = () => new Date().toISOString()

const SAMPLE_SNIPPET: ProjectContentItem = {
  id: 'content-1',
  owner_id: 1,
  name: 'Sample SQL snippet',
  description: 'Example query against the default schema.',
  type: 'sql',
  visibility: 'user',
  content: {
    content_id: 'content-1-version-1',
    sql: `select
  current_database() as database,
  current_user as role,
  version() as postgres_version;`,
    schema_version: '1',
    favorite: false,
  },
  inserted_at: nowIso(),
  updated_at: nowIso(),
  project_id: 1,
  favorite: false,
  owner: {
    id: 1,
    username: 'local-admin',
  },
  updated_by: {
    id: 1,
    username: 'local-admin',
  },
}

const CONTENT_RESPONSE: ProjectContentListResponse = {
  data: [SAMPLE_SNIPPET],
}

const FOLDER_RESPONSE: ProjectContentFoldersResponse = {
  data: {
    folders: [],
    contents: [SAMPLE_SNIPPET],
  },
}

const COUNT_RESPONSE: ProjectContentCountSummary = {
  shared: 0,
  favorites: 0,
  private: CONTENT_RESPONSE.data.length,
}

// TODO(platform-api): Replace stubbed content responses once file-backed storage is implemented.
export const listProjectContent = (
  visibility?: string,
  favorite?: string
): ProjectContentListResponse => {
  if (favorite === 'true' || visibility === 'project') {
    return { data: [] }
  }
  return { ...CONTENT_RESPONSE, data: [...CONTENT_RESPONSE.data] }
}

export const listProjectContentFolders = (): ProjectContentFoldersResponse => ({
  data: {
    folders: [],
    contents: [...FOLDER_RESPONSE.data.contents],
  },
})

export const getProjectContentCounts = (): ProjectContentCountSummary => ({ ...COUNT_RESPONSE })
