# Permission Matrix Artifact · 2025-10-17

The canonical permissions dataset now lives in `packages/shared-data/permission-matrix.ts`. This file exports an immutable `RAW_PERMISSION_MATRIX` list and a consumer-friendly `PERMISSION_MATRIX_DEFINITION` array so both backend and Studio clients can derive permissions from the same source.

## What it exports

- `PERMISSION_MATRIX_DEFINITION`: array of `{ scope, resource, action, roles }`
- Types: `PermissionScope`, `PermissionRoleKey`, `PermissionActionKey`, `PermissionMatrixDefinitionEntry`

Each `action` entry is a string key that maps to the enumerated value in `@supabase/shared-types` (`PermissionAction[actionKey]`). Backend code performs that mapping to keep the existing Fastify/DB logic unchanged.

## How Studio (or other clients) should consume it

1. Add `shared-data` to the workspace package.json if it is not already present.
2. Import the dataset and map `action` to the string constant when you need the full enum value:

   ```ts
   import { PERMISSION_MATRIX_DEFINITION, type PermissionActionKey } from 'shared-data'
   import { PermissionAction } from '@supabase/shared-types/out/constants'

   const toPermissionValue = (key: PermissionActionKey) => PermissionAction[key]
   ```

3. Continue supporting the legacy regex matcher until Studio migrates fully; backend still tolerates both paths. Please flag the control plane owners before removing the regex logic.

## Making changes

- Update `packages/shared-data/permission-matrix.ts` (prefer maintaining alphabetical grouping by resource).
- Regenerate/build:
  - `pnpm --filter platform-api build`
  - `pnpm --filter platform-api exec vitest run tests/permissions.test.ts tests/permissions.docs.test.ts`
- Document notable changes here and in `.agent/analysis/auth-hardening-plan.md`.

## Future refinements

- Consider publishing `shared-data` as a versioned package when Studio adoption is complete.
- Audit other services (CLI, management API) for bespoke permission lists and point them to this artifact to avoid divergence.
