/**
 * Generate comprehensive test files from Studio endpoints and implemented routes
 *
 * This script:
 * 1. Reads studio-endpoints.json (what Studio needs)
 * 2. Reads implemented-routes.json (what platform-api has)
 * 3. Generates smart test files organized by category
 * 4. Creates tests with semantic assertions based on endpoint purpose
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
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

interface Route {
  path: string
  method: string
  handler: string
  status: 'implemented' | 'stubbed' | 'TODO'
}

interface StudioEndpointsData {
  metadata: {
    totalEndpoints: number
    extractedAt: string
    methodBreakdown: Record<string, number>
  }
  endpoints: Endpoint[]
}

interface ImplementedRoutesData {
  routes: Route[]
}

// Load the JSON data files
const studioData: StudioEndpointsData = JSON.parse(
  readFileSync(join(__dirname, 'studio-endpoints.json'), 'utf-8')
)
const implementedData: ImplementedRoutesData = JSON.parse(
  readFileSync(join(__dirname, 'implemented-routes.json'), 'utf-8')
)

console.log(`📊 Loaded ${studioData.endpoints.length} Studio endpoints`)
console.log(`📊 Loaded ${implementedData.routes.length} implemented routes`)

// Helper: Normalize paths for comparison (handle params like {id}, :id, and /api prefix)
function normalizePath(path: string): string {
  return path
    .replace(/^\/api/, '') // Remove /api prefix from implemented routes
    .replace(/\{[^}]+\}/g, ':param') // {id} -> :param
    .replace(/\/:\w+/g, '/:param') // :id -> :param
    .replace(/\/+$/, '') // Remove trailing slash
}

// Helper: Match Studio endpoint to implemented route
function findMatchingRoute(endpoint: Endpoint, routes: Route[]): Route | null {
  const normalizedEndpointPath = normalizePath(endpoint.path)

  return (
    routes.find((route) => {
      const normalizedRoutePath = normalizePath(route.path)
      return route.method === endpoint.method && normalizedRoutePath === normalizedEndpointPath
    }) || null
  )
}

// Helper: Extract category from endpoint path
function getCategory(path: string): string {
  const match = path.match(/^\/(platform|v1)\/([^\/]+)/)
  if (!match) return 'misc'
  return match[2] // e.g., "organizations", "projects", "profile"
}

// Helper: Generate test name from path and method
function generateTestName(endpoint: Endpoint): string {
  const pathParts = endpoint.path.split('/').filter(Boolean)
  const resource = pathParts[pathParts.length - 1]

  // Handle parameterized paths
  if (resource.includes('{') || resource.includes(':')) {
    const action =
      endpoint.method === 'GET'
        ? 'retrieves'
        : endpoint.method === 'POST'
          ? 'creates'
          : endpoint.method === 'PATCH' || endpoint.method === 'PUT'
            ? 'updates'
            : endpoint.method === 'DELETE'
              ? 'deletes'
              : 'handles'
    const parentResource = pathParts[pathParts.length - 2]
    return `${action} ${parentResource} by ID`
  }

  // Handle collection endpoints
  const action =
    endpoint.method === 'GET'
      ? 'lists'
      : endpoint.method === 'POST'
        ? 'creates'
        : endpoint.method === 'DELETE'
          ? 'deletes'
          : 'handles'
  return `${action} ${resource}`
}

// Helper: Generate smart assertions based on endpoint
function generateAssertions(endpoint: Endpoint, route: Route | null): string {
  const isImplemented = route && route.status === 'implemented'
  const method = endpoint.method
  const path = endpoint.path

  let assertions = []

  // Status code assertion
  if (method === 'POST' && path.includes('create')) {
    assertions.push('expect(response.statusCode).toBe(201)')
  } else if (method === 'DELETE') {
    assertions.push('expect(response.statusCode).toBe(204)')
  } else {
    assertions.push('expect(response.statusCode).toBe(200)')
  }

  // Response body assertions (only for non-DELETE)
  if (method !== 'DELETE') {
    assertions.push('const payload = response.json()')

    // Smart assertions based on path
    if (path.includes('/organizations') && method === 'GET' && !path.includes('{')) {
      assertions.push('expect(Array.isArray(payload)).toBe(true)')
      assertions.push('if (payload.length > 0) {')
      assertions.push('  expect(payload[0]).toMatchObject({')
      assertions.push('    id: expect.any(Number),')
      assertions.push('    name: expect.any(String),')
      assertions.push('    slug: expect.any(String)')
      assertions.push('  })')
      assertions.push('}')
    } else if (path.includes('/projects') && method === 'GET' && !path.includes('{')) {
      assertions.push('expect(Array.isArray(payload)).toBe(true)')
      assertions.push('if (payload.length > 0) {')
      assertions.push('  expect(payload[0]).toMatchObject({')
      assertions.push('    id: expect.any(Number),')
      assertions.push('    ref: expect.any(String),')
      assertions.push('    name: expect.any(String)')
      assertions.push('  })')
      assertions.push('}')
    } else if (path.includes('{') || path.includes(':')) {
      // Single resource
      assertions.push('expect(payload).toMatchObject({')
      assertions.push('  id: expect.any(Number)')
      assertions.push('})')
    } else {
      assertions.push('expect(payload).toBeDefined()')
    }
  }

  return assertions.map((a) => `    ${a}`).join('\n')
}

// Helper: Generate test code for an endpoint
function generateTestCode(endpoint: Endpoint, route: Route | null): string {
  const testName = generateTestName(endpoint)
  const isImplemented = route && route.status === 'implemented'
  const itMethod = isImplemented ? 'it' : 'it.skip'
  const todoComment = !isImplemented
    ? `\n    // TODO: Implement ${endpoint.method} ${endpoint.path}`
    : ''

  // Convert path params from {id} to actual values for test
  const testPath = endpoint.path
    .replace(/\{ref\}/g, 'test-project-ref')
    .replace(/\{id\}/g, '1')
    .replace(/\{slug\}/g, 'test-org')

  let requestOptions = `
    method: '${endpoint.method}',
    url: \`/api${testPath}\`,
    headers: {
      Authorization: 'Bearer test-token',
    },`

  // Add payload for POST/PATCH/PUT
  if (['POST', 'PATCH', 'PUT'].includes(endpoint.method)) {
    requestOptions += `
    payload: {
      // TODO: Add appropriate request body
    },`
  }

  const assertions = generateAssertions(endpoint, route)

  return `  ${itMethod}('${testName}', async () => {${todoComment}
    const response = await app.inject({${requestOptions}
    })

${assertions}
  })
`
}

// Group endpoints by category
const endpointsByCategory = studioData.endpoints.reduce(
  (acc, endpoint) => {
    const category = getCategory(endpoint.path)
    if (!acc[category]) acc[category] = []
    acc[category].push(endpoint)
    return acc
  },
  {} as Record<string, Endpoint[]>
)

console.log(`📁 Organized into ${Object.keys(endpointsByCategory).length} categories`)

// Generate test files for each category
const outputDir = join(__dirname, '../generated-tests')
mkdirSync(outputDir, { recursive: true })

let totalGenerated = 0
const stats = {
  implemented: 0,
  stubbed: 0,
  missing: 0,
}

for (const [category, endpoints] of Object.entries(endpointsByCategory)) {
  const testFileName = `${category}.generated.test.ts`
  const testFilePath = join(outputDir, testFileName)

  // Generate test file content
  const imports = `import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { build } from '../../../src/app'
import type { FastifyInstance } from 'fastify'

describe('${category} endpoints (auto-generated)', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await build()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

`

  const tests = endpoints
    .map((endpoint) => {
      const route = findMatchingRoute(endpoint, implementedData.routes)

      // Update stats
      if (route) {
        if (route.status === 'implemented') stats.implemented++
        else if (route.status === 'stubbed') stats.stubbed++
      } else {
        stats.missing++
      }

      return generateTestCode(endpoint, route)
    })
    .join('\n')

  const content = imports + tests + '})\n'

  writeFileSync(testFilePath, content)
  totalGenerated++

  console.log(`✅ Generated ${testFilePath} (${endpoints.length} tests)`)
}

// Generate coverage report
const coverageReportPath = join(__dirname, '../COVERAGE_REPORT.md')
const totalEndpoints = studioData.endpoints.length
const implementedPercent = ((stats.implemented / totalEndpoints) * 100).toFixed(1)
const stubbedPercent = ((stats.stubbed / totalEndpoints) * 100).toFixed(1)
const missingPercent = ((stats.missing / totalEndpoints) * 100).toFixed(1)

const coverageReport = `# Platform API Test Coverage Report

**Generated:** ${new Date().toISOString()}

## Summary

- **Total Studio Endpoints:** ${totalEndpoints}
- **Implemented:** ${stats.implemented} (${implementedPercent}%)
- **Stubbed:** ${stats.stubbed} (${stubbedPercent}%)
- **Missing:** ${stats.missing} (${missingPercent}%)

## Coverage by Category

${Object.entries(endpointsByCategory)
  .map(([category, endpoints]) => {
    const categoryImplemented = endpoints.filter((e) => {
      const route = findMatchingRoute(e, implementedData.routes)
      return route && route.status === 'implemented'
    }).length
    const categoryStubbed = endpoints.filter((e) => {
      const route = findMatchingRoute(e, implementedData.routes)
      return route && route.status === 'stubbed'
    }).length
    const categoryMissing = endpoints.length - categoryImplemented - categoryStubbed
    const categoryPercent = ((categoryImplemented / endpoints.length) * 100).toFixed(1)

    return `### ${category} (${categoryPercent}% implemented)
- Total: ${endpoints.length}
- Implemented: ${categoryImplemented}
- Stubbed: ${categoryStubbed}
- Missing: ${categoryMissing}
`
  })
  .join('\n')}

## Next Steps

1. Review the generated test files in \`tests/auto-generated/generated-tests/\`
2. For \`it.skip\` tests, implement the corresponding endpoint in platform-api
3. Change \`it.skip\` to \`it\` once the endpoint is implemented
4. Run tests with \`pnpm test\` to verify

## Test Files Generated

${Object.keys(endpointsByCategory)
  .map((cat) => `- \`${cat}.generated.test.ts\``)
  .join('\n')}
`

writeFileSync(coverageReportPath, coverageReport)

console.log('\n📊 Test Generation Complete!')
console.log(`✅ Generated ${totalGenerated} test files`)
console.log(`✅ Created coverage report: ${coverageReportPath}`)
console.log(
  `\n📈 Coverage: ${implementedPercent}% implemented, ${stubbedPercent}% stubbed, ${missingPercent}% missing`
)
