# Auto-Generated Test System for Platform API

This directory contains an automated test generation system that ensures your platform-api implementation stays in sync with what Studio expects.

## 🎯 Purpose

You're building a local clone of Supabase's SaaS platform. Studio makes API calls expecting certain endpoints and responses. This system:

1. **Extracts** all API endpoints that Studio uses (from `apps/studio/data/`)
2. **Analyzes** your current platform-api implementation
3. **Generates** comprehensive test files with smart assertions
4. **Tracks** coverage so you know what's implemented, stubbed, or missing

## 📁 Directory Structure

```
tests/auto-generated/
├── README.md                       # This file
├── COVERAGE_REPORT.md              # Coverage statistics (auto-generated)
│
├── scripts/
│   ├── extract-studio-endpoints.ts # Extracts endpoints from Studio
│   ├── extract-implemented-routes.ts # Analyzes platform-api routes
│   ├── generate-tests.ts           # Generates test files
│   ├── studio-endpoints.json       # Extracted Studio endpoints (302 endpoints)
│   └── implemented-routes.json     # Your implemented routes (27 routes)
│
└── generated-tests/                # Auto-generated test files
    ├── organizations.generated.test.ts
    ├── projects.generated.test.ts
    ├── database.generated.test.ts
    └── ... (23 total categories)
```

## 🚀 Quick Start

### Re-generate Tests

When you've implemented new endpoints or Studio has changed:

```bash
cd apps/platform-api

# 1. Extract latest Studio endpoints
npx tsx tests/auto-generated/scripts/extract-studio-endpoints.ts

# 2. Analyze current platform-api implementation
npx tsx tests/auto-generated/scripts/extract-implemented-routes.ts

# 3. Generate test files
npx tsx tests/auto-generated/scripts/generate-tests.ts

# 4. Check coverage report
cat tests/auto-generated/COVERAGE_REPORT.md

# 5. Run the tests
pnpm test
```

### Daily Workflow

1. **Check what's missing**: Review `COVERAGE_REPORT.md`
2. **Pick an endpoint to implement**: Look at `generated-tests/*.test.ts` for `it.skip` tests
3. **Implement the endpoint**: Add route handler in `src/routes/`
4. **Re-generate tests**: Run step 2-3 above to update detection
5. **Un-skip the test**: Change `it.skip` → `it` in the generated test file
6. **Run tests**: `pnpm test` to verify it works

## 📊 Current Statistics

- **Studio Endpoints Tracked**: 302
- **Categories**: 23 (organizations, projects, database, auth, storage, etc.)
- **Generated Test Files**: 23

See [COVERAGE_REPORT.md](./COVERAGE_REPORT.md) for detailed breakdown.

## 🧠 Smart Test Generation

The system doesn't just create dummy tests - it understands endpoint semantics:

### Example: List Organizations

```typescript
it('lists organizations', async () => {
  const response = await app.inject({
    method: 'GET',
    url: `/api/platform/organizations`,
  })

  expect(response.statusCode).toBe(200)
  const payload = response.json()
  expect(Array.isArray(payload)).toBe(true)
  if (payload.length > 0) {
    expect(payload[0]).toMatchObject({
      id: expect.any(Number),
      name: expect.any(String),
      slug: expect.any(String),
    })
  }
})
```

### Example: Create Project

```typescript
it('creates projects', async () => {
  const response = await app.inject({
    method: 'POST',
    url: `/api/platform/projects`,
    payload: {
      // TODO: Add appropriate request body
    },
  })

  expect(response.statusCode).toBe(201) // Smart! Knows POST = 201
  const payload = response.json()
  expect(payload).toMatchObject({
    id: expect.any(Number),
    ref: expect.any(String),
    name: expect.any(String),
  })
})
```

### Test Statuses

- `it()` - Endpoint detected as implemented, test should pass
- `it.skip()` - Endpoint not implemented yet, includes TODO comment

## 🔧 How It Works

### 1. Studio Endpoint Extraction

Scans `apps/studio/data/` for all query and mutation files, extracting:

- API path (e.g., `/platform/organizations`)
- HTTP method (GET, POST, PATCH, DELETE, PUT)
- Source file location

**Pattern matching:**

```typescript
// Finds patterns like:
get('/platform/organizations')
post('/v1/projects')
del('/platform/projects/{ref}')
```

### 2. Implementation Analysis

Scans `apps/platform-api/src/routes/` for all route definitions:

- Matches routes to Studio endpoints
- Detects implementation status (implemented/stubbed/missing)

**Status detection:**

- `implemented` - Route exists, no TODO comments, no obvious stubs
- `stubbed` - Route exists but contains TODO or returns mock data
- `missing` - No matching route found

### 3. Test Generation

For each Studio endpoint:

1. Look for matching platform-api route
2. Generate test with appropriate assertions
3. Use `it.skip` if not implemented, `it` if implemented
4. Add smart assertions based on endpoint type (list, create, update, delete)

### 4. Coverage Tracking

Generates `COVERAGE_REPORT.md` showing:

- Overall coverage percentage
- Breakdown by category
- List of missing endpoints

## 🎨 Customization

### Add Custom Assertions

Edit `scripts/generate-tests.ts` and modify the `generateAssertions()` function:

```typescript
function generateAssertions(endpoint: Endpoint, route: Route | null): string {
  // Add your custom logic here
  if (endpoint.path.includes('/my-custom-resource')) {
    return 'expect(payload).toMatchObject({ myField: expect.any(String) })'
  }
  // ...
}
```

### Change Test Format

The `generateTestCode()` function controls test structure. Modify to match your preferred style.

### Filter Endpoints

In `generate-tests.ts`, filter endpoints before processing:

```typescript
const filteredEndpoints = studioData.endpoints.filter(
  (e) => e.path.startsWith('/platform/') // Only generate tests for platform API
)
```

## 🔄 Updating When Studio Changes

When upstream Supabase changes and new Studio features are added:

```bash
# 1. Pull latest upstream changes
git fetch upstream
git merge upstream/master

# 2. Re-extract Studio endpoints
npx tsx tests/auto-generated/scripts/extract-studio-endpoints.ts

# 3. Re-generate tests
npx tsx tests/auto-generated/scripts/generate-tests.ts

# 4. Review new tests
git diff tests/auto-generated/generated-tests/
```

New endpoints will appear as `it.skip` tests with TODO comments.

## 📈 Benefits

### Without This System

- ❌ Manual test writing for 302 endpoints = weeks of work
- ❌ Hard to know what's missing or broken
- ❌ No way to track upstream Studio changes
- ❌ Tests drift from actual Studio usage

### With This System

- ✅ Auto-generate comprehensive tests in minutes
- ✅ Clear coverage report shows exactly what's missing
- ✅ Regenerate anytime Studio changes
- ✅ Tests reflect actual Studio API usage patterns

## 🐛 Troubleshooting

### Tests show 0% coverage but I have routes implemented

The path matching algorithm might need tuning. Check:

1. Path parameter formats (`:id` vs `{id}`)
2. API prefix differences (`/api/platform/` vs `/platform/`)
3. Edit `normalizePath()` in `generate-tests.ts` to improve matching

### Extraction scripts fail

Ensure you're running from `apps/platform-api`:

```bash
cd apps/platform-api
npx tsx tests/auto-generated/scripts/extract-studio-endpoints.ts
```

### Generated tests don't match your style

Edit `generate-tests.ts` functions:

- `generateTestCode()` - Overall test structure
- `generateAssertions()` - Assertion logic
- `generateTestName()` - Test naming

## 📝 Future Improvements

Potential enhancements:

1. **Request body inference** - Parse Studio code to extract actual request payloads
2. **Response type inference** - Use TypeScript types from `packages/api-types`
3. **Mock data generation** - Auto-generate realistic test data
4. **Contract testing** - Validate responses against OpenAPI schemas
5. **Regression detection** - Alert when Studio expects endpoints you've removed
6. **Performance tracking** - Add response time assertions

## 🤝 Contributing

This system was designed to be maintained and improved. Feel free to:

- Improve the path matching algorithm
- Add smarter assertions
- Enhance endpoint categorization
- Add response schema validation

All generation logic is in `scripts/generate-tests.ts` - well documented and modular.

## 📚 Related Files

- [platform.routes.test.ts](../platform.routes.test.ts) - Manual integration tests
- [src/routes/](../../src/routes/) - Platform API route handlers
- [apps/studio/data/](../../../studio/data/) - Studio API client layer

---

**Generated by**: Claude (Sonnet 4.5)
**Last Updated**: 2025-10-15
**Maintained by**: Platform API team
