/**
 * Extract all API endpoints from Studio's data layer
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface Endpoint {
  path: string
  method: string
  sourceFile: string
  responseType: string | null
  requestBody: string | null
}

function getAllFiles(dir: string, fileList: string[] = []): string[] {
  const files = readdirSync(dir)

  files.forEach((file) => {
    const filePath = join(dir, file)
    if (statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList)
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath)
    }
  })

  return fileList
}

function extractEndpoints(): Endpoint[] {
  const studioDataDir = join(process.cwd(), '../studio/data')
  const files = getAllFiles(studioDataDir)

  const endpoints: Endpoint[] = []
  const apiMethodRegex = /(get|post|patch|put|del)\(['"`]([^'"`]+)['"`]/g

  files.forEach((file) => {
    const content = readFileSync(file, 'utf-8')
    const relativeFile = file.replace(process.cwd() + '/../../', '')

    let match
    while ((match = apiMethodRegex.exec(content)) !== null) {
      const method = match[1] === 'del' ? 'DELETE' : match[1].toUpperCase()
      const path = match[2]

      // Skip if it's not an API path
      if (!path.startsWith('/') && !path.startsWith('${')) continue
      if (path.includes('${') && !path.startsWith('/')) continue

      endpoints.push({
        path,
        method,
        sourceFile: relativeFile,
        responseType: null,
        requestBody: null,
      })
    }
  })

  return endpoints
}

console.log('Extracting Studio API endpoints...')
const endpoints = extractEndpoints()

const output = {
  metadata: {
    totalEndpoints: endpoints.length,
    extractedAt: new Date().toISOString(),
    methodBreakdown: endpoints.reduce(
      (acc, e) => {
        acc[e.method] = (acc[e.method] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    ),
  },
  endpoints,
}

const outputPath = join(__dirname, 'studio-endpoints.json')
writeFileSync(outputPath, JSON.stringify(output, null, 2))

console.log(`✅ Extracted ${endpoints.length} endpoints`)
console.log(`📝 Saved to: ${outputPath}`)
