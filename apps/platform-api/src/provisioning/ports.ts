const parseEnvNumber = (key: string, fallback: number) => {
  const raw = process.env[key]
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const BASE_PORT = parseEnvNumber('PLATFORM_PROJECT_PORT_BASE', 23_000)
export const PORT_STEP = parseEnvNumber('PLATFORM_PROJECT_PORT_STEP', 20)
const PORT_BLOCK_SIZE = 4
const MAX_PORT = parseEnvNumber('PLATFORM_PROJECT_PORT_MAX', 65_535)

export interface ProjectPortAllocation {
  api: number
  db: number
  studio: number
  inbucket: number
}

export const derivePortAllocation = (portBase: number): ProjectPortAllocation => {
  if (!Number.isFinite(portBase) || portBase < 0) {
    throw new Error(`Invalid port base: ${portBase}`)
  }

  const maxBase = MAX_PORT - (PORT_BLOCK_SIZE - 1)
  if (portBase > maxBase) {
    throw new Error(
      `Port base ${portBase} exceeds maximum allowed value ${maxBase}. Adjust PLATFORM_PROJECT_PORT_BASE/STEP.`
    )
  }

  return {
    api: portBase,
    db: portBase + 1,
    studio: portBase + 2,
    inbucket: portBase + 3,
  }
}

const computePortBase = (index: number) => BASE_PORT + index * PORT_STEP

export const findNextAvailablePortBase = (usedBases: Iterable<number>): number => {
  const used = new Set<number>()
  for (const base of usedBases) {
    if (base != null && Number.isFinite(base)) {
      used.add(base)
    }
  }

  const maxBase = MAX_PORT - (PORT_BLOCK_SIZE - 1)
  for (let index = 0; ; index += 1) {
    const candidate = computePortBase(index)
    if (candidate > maxBase) {
      throw new Error(
        'Exhausted available project runtime ports. Adjust PLATFORM_PROJECT_PORT_BASE/STEP or reclaim old projects.'
      )
    }
    if (!used.has(candidate)) {
      return candidate
    }
  }
}
