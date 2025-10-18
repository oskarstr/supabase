const parseEnvNumber = (key: string, fallback: number) => {
  const raw = process.env[key]
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const BASE_PORT = parseEnvNumber('PLATFORM_PROJECT_PORT_BASE', 23_000)
export const PORT_STEP = parseEnvNumber('PLATFORM_PROJECT_PORT_STEP', 20)
const HIGHEST_PORT_OFFSET = 60
const MAX_PORT = 65_535

export const MAX_PORT_SLOT = Math.floor((MAX_PORT - HIGHEST_PORT_OFFSET - BASE_PORT) / PORT_STEP)

if (MAX_PORT_SLOT < 0) {
  throw new Error(
    'Invalid platform port configuration: PLATFORM_PROJECT_PORT_BASE/PLATFORM_PROJECT_PORT_STEP leave no usable slots'
  )
}

export const assertValidPortSlot = (slot: number) => {
  if (!Number.isInteger(slot) || slot < 0 || slot > MAX_PORT_SLOT) {
    throw new Error(
      `Project runtime port slot ${slot} is out of range (expected 0-${MAX_PORT_SLOT}). Adjust PLATFORM_PROJECT_PORT_BASE/PLATFORM_PROJECT_PORT_STEP.`
    )
  }
}

export interface ProjectPortAllocation {
  api: number
  db: number
  studio: number
  inbucket: number
}

export const allocateProjectPorts = (portSlot: number): ProjectPortAllocation => {
  assertValidPortSlot(portSlot)
  const base = BASE_PORT + portSlot * PORT_STEP
  return {
    api: base,
    db: base + 1,
    studio: base + 2,
    inbucket: base + 3,
  }
}
