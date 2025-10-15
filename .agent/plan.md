# Platform API Plan

# This file is meant to track progress across developers, although in past additions havent included commit id and timestamp,  whoever is updating this file should include commit id and current date and time for easier tracking. thank you.

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
- Routed Studio authentication through Kong (anon consumer patch + `/api/platform/signup` proxy) so UI signup/login now mirrors production.
- TODO: invoke Supabase CLI / docker compose templates to actually start/stop per-project stacks and manage port allocation.
- TODO: align `.env` defaults for platform mode—current upstream template misses required variables (`POSTGRES_HOST`, `JWT_SECRET`, etc.). We added `.env.platform.example`, but the base compose still warns when users copy without filling the extra values. Clarify/automate this setup.
- *Note from Codex (GPT-5, new agent):* Provisioner currently shells out via `PLATFORM_API_PROVISION_CMD`, but the platform-api container lacks the Supabase CLI and Docker socket. Recommend baking the CLI into the image (or mounting it) and wiring the socket so provisioning commands like `supabase init/start` can run in-container for both local and eventual cloud targets. This keeps the hook abstraction while avoiding brittle host-only scripts.
- *Update (b5ca522836, 2025-10-15 05:33 UTC):* Platform API image now bundles the Supabase CLI + Docker client and mounts the host socket by default. Provision hooks generate per-project configs, allocate deterministic ports, and call `supabase start/stop`. Failures still leave project status as TODO (validate service health, capture outputs).
- *Update (Codex):* Stubbed additional analytics, disk, storage, auth, and integration endpoints so Studio no longer 404s (e.g. `/analytics/log-drains`, `/disk/*`, `/auth/{ref}/config`). Replace these placeholders with real service integrations once available.
- *Update (12c266ec81, 2025-10-15 06:55 UTC):* Local project provisioning now uses the Supabase CLI on the shared compose network (`PLATFORM_DOCKER_NETWORK` fallback) and stores project runtimes under a host-visible `platform-projects/` root. Added migration allowing the `LOCAL` cloud provider enum.

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
- Maintain modular Fastify plugins so each resource surface (profile, projects, organizations, telemetry, etc.) can evolve independently without re-touching the monolithic router.
- *Update (Codex, Oct 2025 WIP):* The Vitest harness now asserts richer payload contracts (auth config, analytics, v1 stubs) but still runs against static fixtures. Longer term we should drive contract tests from `api-types` or snapshot Studio queries so unexpected schema drift is caught automatically.

## Phase 7: Documentation & Automation
- Update README with local setup instructions.
- Provide scripts for port allocation, project cleanup.
- Optional: GitHub Actions workflow to lint/test platform API.

## Phase 8: Studio Extensibility & Dynamic Configuration
- Expose deployment-mode metadata (local vs remote cloud providers) via API/custom-content so Studio can render new options without diverging hard-coded JSX.
- Rely on feature flags/custom content to hide upstream-only features (e.g., billing) and surface platform-specific UX safely.
- Keep Studio changes minimal and data-driven so upstream updates continue to merge cleanly.

## Phase 9: Persistent Control Plane (WIP)
- Inventory every `/api/platform/**` and `/api/v1/**` surface currently backed by stubs; classify which payloads become first-class tables (organizations, members, projects, auth config, API keys).
- Stand up a dedicated Postgres schema for the platform service (reuse the bundled database for now) and scaffold migrations via Supabase CLI so the control plane survives container restarts.
- Introduce a data-access layer in Fastify (Kysely/Drizzle/pg) that maps handlers to SQL models instead of `state.json`, keeping schemas aligned with `packages/api-types`.
- Replace JSON seed/state with migration-driven fixtures for local dev & Vitest; update tests to load known rows and assert responses match the Management API contract.
- Plan how project provisioning writes back generated secrets/endpoints to the platform schema, so Studio’s analytics/auth/storage views reflect real data once provisioning is wired up.
- *Update 2025-10-14 17:31 MDT:* Platform API now auto-applies migrations and seeds against Postgres on boot (no manual CLI step). Kysely-backed stores cover profiles, organizations, projects, access tokens, audit logs, billing, permissions, usage, etc., and the Vitest suite drives project/org creation against pg-mem to catch sequence regressions.
  - NEXT: wire Supabase CLI/Unix socket into the platform-api container so provisioning hooks can call `supabase init/start`; extend the data layer for remaining stubs (analytics detail, org billing) and persist provisioning artefacts.

## Phase 10: Pg-meta Integration & Contract Tests (2025-10-15 02:40 UTC | commit c7a83d305c)
- Proxy `/pg-meta/**` calls through Kong with `PG_META_CRYPTO_KEY` re-encryption and fall back to direct SQL in tests.
- Reuse seeded anon/service keys so the platform project appears in Studio when `PLATFORM_DEBUG=true`.
- Added `crypto-js` dependency; rebuilding the platform/studio containers is required after config changes.
- Preserve the generated contract test harness under `apps/platform-api/tests/auto-generated` when adding behavioral assertions.

### Next Immediate Tasks
- QA the new Supabase CLI provisioning flow (b5ca522836) on macOS/Linux; capture logs and surface generated env details back to API responses.
- Stabilize Studio deployment-target toggle (remote/local) and document rebuild steps so contributors know to enable `NEXT_PUBLIC_PLATFORM_ENABLE_LOCAL_TARGET` before building.
- Document the Kong overlay behaviour, including the new `PLATFORM_DASHBOARD_BASIC_AUTH_ENABLED` toggle, and ensure tests cover both modes.
- Document the Studio build flow (`pnpm build:studio:platform` → docker compose build) so new contributors know how to regenerate the `supabase-studio-platform` image after env tweaks.
- Design the data-driven “Local vs Remote” project creation flow: define the config schema the API will serve, then scope the minimal Studio patch required to render dynamic provider fields.
- Audit platform-api response shapes against `api-types` and decide how we want to reuse or fork schemas once multi-provider provisioning (local vs cloud) is ready.
- Investigate optional Studio UX tweaks (e.g. redirecting `/` to `/org`) once default project slug/env alignment is stable.
- Coordinate with the auto-generated test harness: capture target behaviors per endpoint, add assertions without breaking generation scripts, and note any required seed data or cleanup.
