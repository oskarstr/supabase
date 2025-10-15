/**
 * Extract all implemented routes from platform-api
 *
 * Understands the routing structure:
 * - Routes registered via platform.ts with prefix: /api/platform
 * - Routes registered via api-v1.ts with prefix: /api/v1
 * - Each resource gets its own prefix (e.g., /organizations, /projects)
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface Route {
  path: string
  method: string
  handler: string
  status: 'implemented' | 'stubbed' | 'TODO'
}

interface RouteConfig {
  file: string
  prefix: string
  apiPrefix: '/api/platform' | '/api/v1'
}

function getAllFiles(dir: string, fileList: string[] = []): string[] {
  const files = readdirSync(dir)

  files.forEach((file) => {
    const filePath = join(dir, file)
    if (statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList)
    } else if (file.endsWith('.ts') || file.endsWith('.js')) {
      fileList.push(filePath)
    }
  })

  return fileList
}

// Parse platform.ts and api-v1.ts to understand prefixes
function getRoutePrefixes(): RouteConfig[] {
  const platformContent = readFileSync(join(process.cwd(), 'src/routes/platform.ts'), 'utf-8')
  const apiV1Content = readFileSync(join(process.cwd(), 'src/routes/api-v1.ts'), 'utf-8')

  const configs: RouteConfig[] = []

  // Parse platform.ts registrations
  // e.g., app.register(organizationsRoutes, { prefix: '/organizations' })
  const platformRegex = /app\.register\((\w+), \{ prefix: ['"`]([^'"`]+)['"`] \}\)/g
  const platformNoPrefix = /app\.register\((\w+)\)/g

  let match
  while ((match = platformRegex.exec(platformContent)) !== null) {
    const routeVar = match[1] // e.g., organizationsRoutes
    const prefix = match[2] // e.g., /organizations
    const fileName = routeVar.replace(/Routes?$/, '') // organizationsRoutes -> organizations
    configs.push({
      file: `${fileName}.ts`,
      prefix,
      apiPrefix: '/api/platform',
    })
  }

  // Handle routes without explicit prefix (they use paths directly from the file)
  const routesWithoutPrefix = ['replication', 'database', 'projectResourceWarnings', 'pgMeta']
  for (const route of routesWithoutPrefix) {
    configs.push({
      file: `${route.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')}.ts`,
      prefix: '',
      apiPrefix: '/api/platform',
    })
  }

  // Parse api-v1.ts (it doesn't use sub-routes, defines them directly)
  configs.push({
    file: 'api-v1.ts',
    prefix: '',
    apiPrefix: '/api/v1',
  })

  return configs
}

function extractRoutes(): Route[] {
  const routesDir = join(process.cwd(), 'src/routes')
  const files = getAllFiles(routesDir)
  const configs = getRoutePrefixes()

  const routes: Route[] = []
  const routeRegex = /app\.(get|post|patch|put|delete)<[^>]*>\(['"`]([^'"`]+)['"`]/g
  const simpleRouteRegex = /app\.(get|post|patch|put|delete)\(['"`]([^'"`]+)['"`]/g

  files.forEach((file) => {
    const content = readFileSync(file, 'utf-8')
    const fileName = file.split('/').pop()!
    const relativeFile = file.replace(process.cwd() + '/', '')

    // Skip platform.ts and main.ts (they just register sub-routes)
    if (fileName === 'platform.ts' || fileName === 'main.ts') {
      return
    }

    // Find the config for this file
    const config = configs.find(c => c.file === fileName)
    if (!config) {
      console.warn(`⚠️  No config found for ${fileName}, skipping...`)
      return
    }

    // Extract routes using both regex patterns
    const allMatches: Array<{ method: string; path: string }> = []

    let match
    while ((match = routeRegex.exec(content)) !== null) {
      allMatches.push({ method: match[1], path: match[2] })
    }

    // Reset regex
    routeRegex.lastIndex = 0

    while ((match = simpleRouteRegex.exec(content)) !== null) {
      const methodPath = { method: match[1], path: match[2] }
      if (!allMatches.some(m => m.method === methodPath.method && m.path === methodPath.path)) {
        allMatches.push(methodPath)
      }
    }

    allMatches.forEach(({ method, path }) => {
      // Build the full path
      let fullPath = config.apiPrefix

      // Add resource prefix if it exists
      if (config.prefix) {
        fullPath += config.prefix
      }

      // Add the route path
      fullPath += path

      // Determine if stubbed or implemented
      let status: 'implemented' | 'stubbed' | 'TODO' = 'implemented'
      if (content.includes('TODO(platform-api)') || content.includes('TODO: ')) {
        status = 'stubbed'
      } else if (content.match(/return\s+reply\.send\(\{[^}]*stub|mock|hardcoded/i)) {
        status = 'stubbed'
      }

      routes.push({
        path: fullPath,
        method: method.toUpperCase(),
        handler: relativeFile,
        status,
      })
    })
  })

  return routes
}

console.log('Extracting platform-api routes...')
const routes = extractRoutes()

// Group by prefix for better readability
const byPrefix: Record<string, Route[]> = {}
routes.forEach(route => {
  const prefix = route.path.split('/').slice(0, 3).join('/') // e.g., /api/platform
  if (!byPrefix[prefix]) byPrefix[prefix] = []
  byPrefix[prefix].push(route)
})

console.log('\nRoutes found by API prefix:')
for (const [prefix, prefixRoutes] of Object.entries(byPrefix)) {
  console.log(`  ${prefix}: ${prefixRoutes.length} routes`)
}

const output = {
  metadata: {
    totalRoutes: routes.length,
    extractedAt: new Date().toISOString(),
    statusBreakdown: {
      implemented: routes.filter(r => r.status === 'implemented').length,
      stubbed: routes.filter(r => r.status === 'stubbed').length,
    },
  },
  routes,
}

const outputPath = join(__dirname, 'implemented-routes.json')
writeFileSync(outputPath, JSON.stringify(output, null, 2))

console.log(`\n✅ Extracted ${routes.length} routes`)
console.log(`   - Implemented: ${output.metadata.statusBreakdown.implemented}`)
console.log(`   - Stubbed: ${output.metadata.statusBreakdown.stubbed}`)
console.log(`📝 Saved to: ${outputPath}`)
