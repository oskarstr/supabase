import { randomUUID } from 'node:crypto'

import type { components } from 'api-types'

const nowIso = () => new Date().toISOString()

type BranchResponse = components['schemas']['BranchResponse']

const branchStore = new Map<string, BranchResponse[]>()

// TODO(platform-api): Replace with real branch metadata once branching workflows are implemented.
const createDefaultBranch = (ref: string): BranchResponse => ({
  created_at: nowIso(),
  git_branch: 'main',
  id: randomUUID(),
  is_default: true,
  name: 'main',
  parent_project_ref: ref,
  persistent: true,
  project_ref: ref,
  status: 'MIGRATIONS_PASSED',
  updated_at: nowIso(),
  with_data: false,
})

export const listProjectBranches = (ref: string): BranchResponse[] => {
  if (!branchStore.has(ref)) {
    branchStore.set(ref, [createDefaultBranch(ref)])
  }
  const branches = branchStore.get(ref)!
  return branches.map((branch) => ({ ...branch }))
}
