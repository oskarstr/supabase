import {
  DEFAULT_AVAILABLE_VERSIONS,
  REGION_SMART_GROUPS,
  REGION_SPECIFICS,
} from './state.js'
import type { AvailableVersionsResponse, CloudProvider, RegionsInfo } from './types.js'

export const getAvailableRegions = (
  cloudProvider: CloudProvider,
  _organizationSlug: string
): RegionsInfo => {
  const specificRegions = REGION_SPECIFICS[cloudProvider] ?? []
  const recommendedSpecific = specificRegions.length > 0 ? [specificRegions[0]] : []
  const recommendedSmartGroup =
    REGION_SMART_GROUPS.find((group) => group.code === 'americas') ?? REGION_SMART_GROUPS[0]

  return {
    all: {
      smartGroup: REGION_SMART_GROUPS.map((group) => ({ ...group })),
      specific: specificRegions.map((region) => ({ ...region })),
    },
    recommendations: {
      smartGroup: { ...recommendedSmartGroup },
      specific: recommendedSpecific.map((region) => ({ ...region })),
    },
  }
}

export const listAvailableVersionsForOrganization = (
  _organizationSlug: string,
  _provider: CloudProvider,
  _region: string
): AvailableVersionsResponse => ({
  available_versions: DEFAULT_AVAILABLE_VERSIONS.map((entry) => ({ ...entry })),
})
