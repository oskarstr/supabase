const parseEnvNumber = (key: string, fallback: number) => {
  const raw = process.env[key]
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

const BASE_PORT = parseEnvNumber('PLATFORM_PROJECT_PORT_BASE', 23000)
const PORT_STEP = parseEnvNumber('PLATFORM_PROJECT_PORT_STEP', 20)

export interface ProjectPortAllocation {
  api: number
  db: number
  studio: number
  inbucket: number
}

export const allocateProjectPorts = (projectId: number): ProjectPortAllocation => {
  const base = BASE_PORT + projectId * PORT_STEP
  return {
    api: base,
    db: base + 1,
    studio: base + 2,
    inbucket: base + 3,
  }
}
