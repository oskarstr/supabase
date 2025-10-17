import { constants } from '@supabase/shared-types'
import {
  PERMISSION_MATRIX_DEFINITION,
  type PermissionActionKey,
  type PermissionRoleKey as SharedPermissionRoleKey,
  type PermissionScope as SharedPermissionScope,
} from 'shared-data'

const { PermissionAction } = constants

type PermissionActionLookupKey = Extract<keyof typeof PermissionAction, string>
type PermissionActionValue = (typeof PermissionAction)[PermissionActionLookupKey]
export type PermissionRoleKey = SharedPermissionRoleKey
export type PermissionScope = SharedPermissionScope

export interface PermissionMatrixEntry {
  scope: PermissionScope
  resource: string
  action: PermissionActionValue
  roles: PermissionRoleKey[]
}

const toPermissionAction = (key: PermissionActionKey): PermissionActionValue => {
  const value = PermissionAction[key as PermissionActionLookupKey] as PermissionActionValue | undefined
  if (!value) {
    throw new Error(`Unknown permission action key: ${key}`)
  }
  return value as PermissionActionValue
}

export const PERMISSION_MATRIX: PermissionMatrixEntry[] = PERMISSION_MATRIX_DEFINITION.map(
  (entry) => ({
    scope: entry.scope,
    resource: entry.resource,
    roles: entry.roles,
    action: toPermissionAction(entry.action),
  })
)
