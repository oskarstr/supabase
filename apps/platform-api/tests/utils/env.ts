type EnvSnapshot = Record<string, string | undefined>

export const captureEnv = (): EnvSnapshot => ({ ...process.env })

export const restoreEnv = (snapshot: EnvSnapshot) => {
  for (const key of Object.keys(process.env)) {
    if (!(key in snapshot)) {
      delete process.env[key]
    }
  }
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

export const patchEnv = (...records: Array<Record<string, string | undefined>>) => {
  for (const record of records) {
    for (const [key, value] of Object.entries(record)) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  }
}
