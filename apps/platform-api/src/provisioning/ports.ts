const parseEnvNumber = (key: string, fallback: number) => {
  const raw = process.env[key]
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const PROJECT_PORT_BASE = parseEnvNumber('PLATFORM_PROJECT_PORT_BASE', 23_000)
export const PROJECT_PORT_STEP = parseEnvNumber('PLATFORM_PROJECT_PORT_STEP', 20)
export const PROJECT_PORT_MAX = 65_535

export interface ProjectPortAllocation {
  api: number
  db: number
  studio: number
  inbucket: number
}

export const allocateProjectPorts = (portBase: number): ProjectPortAllocation => {
  const base = Math.floor(portBase)
  if (!Number.isFinite(base) || base <= 0) {
    throw new Error('port_base must be a positive integer')
  }
  const lastPort = base + 3
  if (base < PROJECT_PORT_BASE) {
    throw new Error('port_base is below configured project port range')
  }
  if (lastPort > PROJECT_PORT_MAX) {
    throw new Error('port_base exceeds available TCP port range')
  }
  return {
    api: base,
    db: base + 1,
    studio: base + 2,
    inbucket: base + 3,
  }
}
