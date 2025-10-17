#!/usr/bin/env node
import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, extname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = fileURLToPath(new URL('../..', import.meta.url))
const studioDir = join(repoRoot, 'apps', 'studio')
const artifactsDir = join(repoRoot, '.agent', 'artifacts')
const outputPath = join(artifactsDir, 'platform_endpoints.json')

const methodMap = new Map([
  ['get', 'GET'],
  ['post', 'POST'],
  ['post_', 'POST'],
  ['patch', 'PATCH'],
  ['put', 'PUT'],
  ['del', 'DELETE'],
])

const shouldVisit = (path) =>
  !/node_modules/.test(path) &&
  !/\.next/.test(path) &&
  !/\.git/.test(path) &&
  !/dist/.test(path) &&
  !/generated/.test(path)

const relevantExtensions = new Set(['.ts', '.tsx'])

const files = []

const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (!shouldVisit(full)) continue
    const stats = statSync(full)
    if (stats.isDirectory()) {
      walk(full)
    } else if (relevantExtensions.has(extname(full))) {
      files.push(full)
    }
  }
}

walk(studioDir)

const endpointMap = new Map()
const pattern = /\b(get|post_|post|patch|put|del)\s*\(\s*(['"`])(\/platform\/.+?)\2\s*(?:,|\))/g

for (const file of files) {
  const content = readFileSync(file, 'utf-8')
  let match
  while ((match = pattern.exec(content))) {
    const rawMethod = match[1]
    const path = match[3]
    const method = methodMap.get(rawMethod)
    if (!method) continue
    if (!endpointMap.has(method)) {
      endpointMap.set(method, new Set())
    }
    endpointMap.get(method).add(path)
  }
}

const result = Array.from(endpointMap.entries())
  .map(([method, paths]) => ({
    method,
    paths: Array.from(paths).sort(),
  }))
  .sort((a, b) => a.method.localeCompare(b.method))

mkdirSync(artifactsDir, { recursive: true })
writeFileSync(outputPath, JSON.stringify(result, null, 2))

const total = result.reduce((sum, group) => sum + group.paths.length, 0)
console.log(`Discovered ${total} routes`)
console.log(`Written to ${relative(repoRoot, outputPath)}`)
