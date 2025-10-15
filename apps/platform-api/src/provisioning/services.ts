export const ALL_RUNTIME_SERVICES = [
  'gotrue',
  'realtime',
  'storage-api',
  'imgproxy',
  'kong',
  'mailpit',
  'postgrest',
  'postgres-meta',
  'studio',
  'edge-runtime',
  'logflare',
  'vector',
  'supavisor',
] as const

export type RuntimeService = (typeof ALL_RUNTIME_SERVICES)[number]

export const normalizeExcludedServices = (services: string[] | undefined): string[] => {
  if (!services) return []
  const allowed = new Set<string>(ALL_RUNTIME_SERVICES)
  const normalized: string[] = []
  for (const service of services) {
    const trimmed = service.trim().toLowerCase()
    if (allowed.has(trimmed) && !normalized.includes(trimmed)) {
      normalized.push(trimmed)
    }
  }
  return normalized
}

export const runtimeServicesToCliArgs = (excluded: readonly string[]): string | undefined => {
  if (!excluded.length) return undefined
  return excluded.join(',')
}
