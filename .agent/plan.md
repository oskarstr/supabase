# Platform API Plan

## Phase 1: Scaffolding
- Create `apps/platform-api` workspace with Fastify, TypeScript, tsconfig, eslint/prettier.
- Import `packages/api-types` definitions to type routes.
- Expose basic health endpoint.
- Wire pnpm scripts (`dev`, `build`, `start`).
- Update `pnpm-workspace.yaml` and root `package.json` if needed.

## Phase 2: API Contract Skeleton
- Implement stub handlers for core routes:
  - `GET /platform/profile`
  - `GET /platform/organizations`
  - `GET /platform/organizations/{slug}/projects`
  - `GET /platform/projects/{ref}`
  - `POST /platform/projects`
  - `DELETE /platform/projects/{ref}`
  - `GET /platform/organizations/{slug}/billing/subscription` (stub to disable billing features).
- Use in-memory store for initial data; respond with shapes matching openapi spec.
- Ensure CORS/session requirements match Studio usage.

## Phase 3: Metadata Persistence
- Add persistence layer (SQLite via Prisma/Drizzle or simple JSON for MVP).
- Define schemas: organizations, projects, project_status_history, credentials.
- Replace in-memory store with persistence.
- Add CLI/script to seed default org + admin user for Studio.

## Phase 4: Provisioning Integration
- Abstraction for project lifecycle actions (create/start/stop/delete).
- Initially wrap Supabase CLI commands with child_process to spin up new project stack (unique ports, env files).
- Track generated keys (anon/service) and REST URLs; store in metadata.
- Implement status polling (COMING_UP → ACTIVE_HEALTHY) via health checks.

## Phase 5: Docker & Compose Integration
- Add Dockerfile for platform API.
- Create compose overlay (e.g., `docker/docker-compose.platform.yml`) adding the new service and setting Studio env vars.
- Document usage (clone fork → pnpm install → docker compose up).

## Phase 6: Feature Coverage & Hardening
- Implement remaining endpoints Studio relies on (storage, logs, auth config) incrementally.
- Add auth (API tokens) and basic RBAC if needed.
- Add telemetry/logging.
- Provide integration tests (vitest) hitting key routes.

## Phase 7: Documentation & Automation
- Update README with local setup instructions.
- Provide scripts for port allocation, project cleanup.
- Optional: GitHub Actions workflow to lint/test platform API.

