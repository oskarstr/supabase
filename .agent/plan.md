# Platform API Plan

## Phase 1: Scaffolding ✅ *completed*
- Created `apps/platform-api` workspace with Fastify + TypeScript.
- Added tsconfig, scripts, Dockerfile scaffolding, and workspace registration.
- Health endpoint available at `/health`.

## Phase 2: API Contract Skeleton ✅ *completed*
- Implemented the core `/platform/**` routes Studio relies on (profile/org/project listing, create/delete, billing stub).
- Added CORS + host access so Studio in Docker can reach the host-published API.

## Phase 3: Metadata Persistence ✅ *completed*
- Persist state to JSON under `apps/platform-api/data`, seeded from environment variables.
- Track project runtimes (per-project directories) for future provisioning output.

## Phase 4: Provisioning Integration 🔄 *in progress*
- Added async hooks that mark lifecycle states and read generated `.env` files if present.
- TODO: invoke Supabase CLI / docker compose templates to actually start/stop per-project stacks and manage port allocation.
- TODO: align `.env` defaults for platform mode—current upstream template misses required variables (`POSTGRES_HOST`, `JWT_SECRET`, etc.). We added `.env.platform.example`, but the base compose still warns when users copy without filling the extra values. Clarify/automate this setup.

## Phase 5: Docker & Compose Integration ✅ *completed*
- Production overlay: `docker-compose.platform.yml` adds the platform service (port 4210) and points Studio at it.
- Dev overlay: `docker-compose.platform.dev.yml` runs the API in watch mode.
- Added platform API Dockerfile; container name defaults to `platform`.
- New env template `docker/.env.platform.example` captures required variables.

## Phase 6: Feature Coverage & Hardening
- Implement remaining endpoints Studio relies on (storage, logs, auth config) incrementally.
- Add auth (API tokens) and basic RBAC if needed.
- Add telemetry/logging.
- Provide integration tests (vitest) hitting key routes.

## Phase 7: Documentation & Automation
- Update README with local setup instructions.
- Provide scripts for port allocation, project cleanup.
- Optional: GitHub Actions workflow to lint/test platform API.

### Next Immediate Tasks
- Finish Phase 4 by wiring provisioning hooks to Supabase CLI (`supabase init/start/stop`) and persisting generated keys/ports.
- Capture the updated Kong overlay behaviour in docs (how the compose entrypoint patches `auth-v1` and how the overlay is appended) and bake it into automated tests.
- Document the Studio build flow (`pnpm build:studio:platform` → docker compose build) so new contributors know how to regenerate the `supabase-studio-platform` image after env tweaks.
- Investigate optional Studio UX tweaks (e.g. redirecting `/` to `/org`) once default project slug/env alignment is stable.
