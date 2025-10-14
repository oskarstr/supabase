import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { config as loadEnv } from 'dotenv'

const rawModuleDir = dirname(fileURLToPath(import.meta.url))
export const platformSrcDir = resolve(rawModuleDir, '..')

const providedRepoRootRaw = process.env.PLATFORM_API_REPO_ROOT?.trim()
export const repoRoot =
  providedRepoRootRaw && providedRepoRootRaw.length > 0
    ? resolve(providedRepoRootRaw)
    : resolve(platformSrcDir, '../../..')

const envFiles = ['.env', 'docker/.env']
for (const relativePath of envFiles) {
  const envPath = resolve(repoRoot, relativePath)
  if (existsSync(envPath)) {
    loadEnv({ path: envPath, override: false })
  }
}

export const envString = (key: string, fallback?: string) => {
  const value = process.env[key]
  if (value === undefined) return fallback
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : fallback
}

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')

export const buildRestUrl = (base: string) => `${trimTrailingSlash(base)}/rest/v1/`
