export type RoleScopedProjectsEntry = {
  roleId: number | string
  projects: string[]
}

export const roleScopedProjectsMetadata = (
  entries: RoleScopedProjectsEntry[]
): Record<string, unknown> => {
  const scoped: Record<string, string[]> = {}
  for (const entry of entries) {
    const key = String(entry.roleId)
    const sanitized = [...new Set(entry.projects.map((project) => project.trim()).filter(Boolean))]
    if (sanitized.length > 0) {
      scoped[key] = sanitized.sort()
    }
  }
  return Object.keys(scoped).length > 0 ? { role_scoped_projects: scoped } : {}
}
