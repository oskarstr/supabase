import type {
  GetOrganizationIntegrationResponse,
  GetUserOrganizationIntegrationResponse,
  ListGitHubConnectionsResponse,
} from './types.js'

export const listUserIntegrations = (): GetUserOrganizationIntegrationResponse[] => []

export const listOrganizationIntegrations = (
  _slug: string
): GetOrganizationIntegrationResponse[] => []

export const listGitHubConnections = (
  _organizationId: number
): ListGitHubConnectionsResponse => ({
  connections: [],
})

export const getGitHubAuthorization = () => ({
  id: 1,
  sender_id: 1,
  user_id: 1,
})
