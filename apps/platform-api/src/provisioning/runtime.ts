import { mkdir, writeFile, cp, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { repoRoot } from '../store/env.js'
import { renderSupabaseConfig } from './config.js'
import { allocateProjectPorts, type ProjectPortAllocation } from './ports.js'
import { parse as parseEnv } from 'dotenv'

export interface PrepareRuntimeOptions {
  projectId: number
  projectRef: string
  projectName: string
  projectRoot: string
  databasePassword: string
  dbVersion: string
}

export interface PreparedRuntime {
  supabaseDir: string
  configPath: string
  ports: ProjectPortAllocation
  siteUrl: string
}

const SUPABASE_TEMPLATE_DIR = resolve(repoRoot, 'supabase', 'supabase')

const parseMajorVersion = (value: string) => {
  const match = value.match(/\d+/)
  if (!match) return 15
  const parsed = Number.parseInt(match[0] ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 15
}

const ensureParentDir = async (path: string) => {
  const parent = dirname(path)
  if (!existsSync(parent)) {
    await mkdir(parent, { recursive: true })
  }
}

const copySupabaseTemplate = async (destination: string) => {
  if (existsSync(destination)) return
  await ensureParentDir(destination)
  await cp(SUPABASE_TEMPLATE_DIR, destination, { recursive: true })
}

const writeEnvFile = async (supabaseDir: string, entries: Record<string, string>) => {
  const envPath = resolve(supabaseDir, '.env')
  const existing: Record<string, string> = {}

  if (existsSync(envPath)) {
    try {
      const raw = await readFile(envPath, 'utf-8')
      Object.assign(existing, parseEnv(raw))
    } catch (error) {
      console.warn('[platform-api] failed to parse existing supabase env, regenerating', {
        envPath,
        error,
      })
    }
  }

  const merged = {
    ...existing,
    ...entries,
  }

  const formatValue = (value: string) => {
    if (/^[A-Za-z0-9_@./:-]+$/.test(value)) {
      return value
    }
    return JSON.stringify(value)
  }

  const lines = Object.entries(merged)
    .map(([key, value]) => `${key}=${formatValue(value)}`)
    .join('\n')

  await writeFile(envPath, `${lines}\n`)
}

export const prepareSupabaseRuntime = async (
  options: PrepareRuntimeOptions
): Promise<PreparedRuntime> => {
  const supabaseDir = resolve(options.projectRoot, 'supabase')
  await copySupabaseTemplate(supabaseDir)

  const ports = allocateProjectPorts(options.projectId)
  const siteUrl = `http://127.0.0.1:${ports.api}`

  const configPath = resolve(supabaseDir, 'config.toml')
  await writeFile(
    configPath,
    renderSupabaseConfig({
      projectId: options.projectRef,
      projectName: options.projectName,
      ports,
      siteUrl,
      dbMajorVersion: parseMajorVersion(options.dbVersion),
    })
  )

  await writeEnvFile(supabaseDir, {
    SUPABASE_DB_PASSWORD: options.databasePassword,
    POSTGRES_PASSWORD: options.databasePassword,
  })

  return {
    supabaseDir,
    configPath,
    ports,
    siteUrl,
  }
}
