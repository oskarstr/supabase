#!/usr/bin/env node

/**
 * Extracts the literal entries from `PERMISSION_MATRIX` so we can compare them
 * against the parsed access control documentation.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const MATRIX_PATH = path.resolve(
  process.cwd(),
  'apps/platform-api/src/config/permission-matrix.ts'
)

const source = fs.readFileSync(MATRIX_PATH, 'utf8')

const ENTRY_REGEX =
  /\{\s*scope:\s*'([^']+)',\s*resource:\s*'([^']+)',\s*action:\s*PermissionAction\.([A-Z_]+),\s*roles:\s*\[([^\]]*)\]/g

const normalizeRoles = (raw) =>
  raw
    .split(',')
    .map((value) => value.trim().replace(/['"]/g, ''))
    .filter(Boolean)

export const permissionMatrixEntries = []

let match
while ((match = ENTRY_REGEX.exec(source)) !== null) {
  const [, scope, resource, action, rawRoles] = match
  permissionMatrixEntries.push({
    scope,
    resource,
    action: `PermissionAction.${action}`,
    roles: normalizeRoles(rawRoles),
  })
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(JSON.stringify(permissionMatrixEntries, null, 2))
}
