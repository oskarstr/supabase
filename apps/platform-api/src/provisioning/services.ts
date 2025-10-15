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

const DEFAULT_EXCLUDED_SERVICES: RuntimeService[] = ['logflare', 'vector']

export const normalizeExcludedServices = (services: string[] | undefined): string[] => {
  const normalized: string[] = []
  const allowed = new Set<string>(ALL_RUNTIME_SERVICES)
  const addIfValid = (value: string) => {
    const trimmed = value.trim().toLowerCase()
    if (allowed.has(trimmed) && !normalized.includes(trimmed)) {
      normalized.push(trimmed)
    }
  }

  if (!services || services.length === 0) {
    DEFAULT_EXCLUDED_SERVICES.forEach((service) => addIfValid(service))
    return normalized
  }

  for (const service of services) {
    addIfValid(service)
  }

  if (normalized.length === 0) {
    DEFAULT_EXCLUDED_SERVICES.forEach((service) => addIfValid(service))
  }

  return normalized
}

export const runtimeServicesToCliArgs = (excluded: readonly string[]): string | undefined => {
  if (!excluded.length) return undefined
  return excluded.join(',')
}
