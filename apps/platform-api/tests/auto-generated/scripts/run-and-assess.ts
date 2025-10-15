#!/usr/bin/env tsx
/**
 * Run auto-generated tests and assess the output
 *
 * This script:
 * 1. Runs the generated tests
 * 2. Parses the output
 * 3. Generates a report showing:
 *    - Total tests run
 *    - Passed vs failed vs skipped
 *    - Coverage by category
 *    - What needs to be implemented next
 */

import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('🧪 Running auto-generated tests...\n')

try {
  // Run tests and capture output
  const output = execSync('pnpm test generated-tests', {
    cwd: join(__dirname, '../../..'),
    encoding: 'utf-8',
    stdio: 'pipe',
  })

  console.log(output)

  // Parse the output
  const lines = output.split('\n')

  const stats = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    categories: {} as Record<string, { passed: number; failed: number; skipped: number }>,
  }

  // Parse vitest output
  let currentCategory = ''
  for (const line of lines) {
    // Match test suite names
    const suiteMatch = line.match(/(\w+) endpoints \(auto-generated\)/)
    if (suiteMatch) {
      currentCategory = suiteMatch[1]
      stats.categories[currentCategory] = { passed: 0, failed: 0, skipped: 0 }
    }

    // Match test results
    if (line.includes('✓') || line.includes('PASS')) {
      stats.passed++
      stats.total++
      if (currentCategory) stats.categories[currentCategory].passed++
    } else if (line.includes('✗') || line.includes('FAIL')) {
      stats.failed++
      stats.total++
      if (currentCategory) stats.categories[currentCategory].failed++
    } else if (line.includes('↓') || line.includes('SKIP')) {
      stats.skipped++
      stats.total++
      if (currentCategory) stats.categories[currentCategory].skipped++
    }
  }

  // Generate report
  console.log('\n' + '='.repeat(60))
  console.log('📊 TEST ASSESSMENT REPORT')
  console.log('='.repeat(60) + '\n')

  console.log('Summary:')
  console.log(`  Total Tests: ${stats.total}`)
  console.log(`  ✅ Passed: ${stats.passed}`)
  console.log(`  ❌ Failed: ${stats.failed}`)
  console.log(`  ⏭️  Skipped: ${stats.skipped}`)

  if (stats.total > 0) {
    const passRate = ((stats.passed / stats.total) * 100).toFixed(1)
    console.log(`  Pass Rate: ${passRate}%`)
  }

  console.log('\nBreakdown by Category:')
  for (const [category, catStats] of Object.entries(stats.categories)) {
    const total = catStats.passed + catStats.failed + catStats.skipped
    const passRate = total > 0 ? ((catStats.passed / total) * 100).toFixed(0) : '0'
    console.log(`  ${category}: ${catStats.passed}/${total} passed (${passRate}%)`)
  }

  console.log('\n' + '='.repeat(60))

  if (stats.failed > 0) {
    console.log('\n⚠️  Some tests failed. Review the output above for details.')
    process.exit(1)
  } else if (stats.skipped > 0) {
    console.log(`\n💡 ${stats.skipped} tests are skipped (not yet implemented).`)
    console.log('   Implement endpoints and change it.skip → it to enable tests.')
  } else if (stats.passed > 0) {
    console.log('\n🎉 All tests passed!')
  }
} catch (error: any) {
  console.log('\n' + '='.repeat(60))
  console.log('📊 TEST ASSESSMENT REPORT')
  console.log('='.repeat(60) + '\n')

  if (error.stdout) {
    console.log(error.stdout)
  }

  // Even if tests fail, try to parse and show stats
  const output = error.stdout || ''
  const errorLines = output.split('\n')

  // Count skipped tests from output
  const skippedCount = (output.match(/it\.skip/g) || []).length
  const totalMatch = output.match(/(\d+) tests?/)
  const failedMatch = output.match(/(\d+) failed/)

  if (totalMatch) {
    console.log(`\nTotal Tests: ${totalMatch[1]}`)
    if (failedMatch) {
      console.log(`❌ Failed: ${failedMatch[1]}`)
    }
    if (skippedCount > 0) {
      console.log(`⏭️  Skipped: ~${skippedCount} (estimated from it.skip usage)`)
    }
  }

  console.log('\n⚠️  Test run encountered errors. Review the output above.')
  console.log('\nCommon issues:')
  console.log('  - Missing dependencies (run: pnpm install)')
  console.log('  - Test setup issues (check beforeAll hooks)')
  console.log('  - Endpoint implementation errors')

  process.exit(1)
}
