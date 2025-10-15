#!/bin/bash
# Regenerate all tests from scratch

set -e

echo "🔄 Regenerating auto-generated tests..."
echo ""

echo "Step 1/3: Extracting Studio endpoints..."
npx tsx tests/auto-generated/scripts/extract-studio-endpoints.ts
echo ""

echo "Step 2/3: Analyzing platform-api routes..."
npx tsx tests/auto-generated/scripts/extract-implemented-routes.ts
echo ""

echo "Step 3/3: Generating test files..."
npx tsx tests/auto-generated/scripts/generate-tests.ts
echo ""

echo "✅ Done! Check the coverage report:"
echo "   cat tests/auto-generated/COVERAGE_REPORT.md"
echo ""
echo "To run the tests:"
echo "   pnpm test generated-tests"
