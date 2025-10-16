# Platform API Plan

> Keep entries timestamped and include commit IDs when available. Update **Active Workstreams** first so the next agent knows what to tackle immediately; append noteworthy events under **Change Log**.

## Active Workstreams

### Current Review Checklist *(2025-10-15 · codex)*
- Reconstruct the orchestration dataflow end-to-end (Studio → platform-api → runtime-agent → Supabase CLI → Docker) and confirm each hop’s contracts and assumptions.
- Inventory runtime-related persistence (Postgres `project_runtimes`, on-disk `platform-projects/`, generated `.env` files) and verify how provisioning writes/reads across layers.
- Audit authentication/authorization touchpoints for the superuser (env-defined admin) versus scoped users to understand required guards in the orchestrator.
- Catalogue failure/retry surfaces (CLI exit codes, network timeouts, health polling) and how they propagate back to Studio.
- Compare our implementation with upstream Supabase CLI/runtime behaviour to note deliberate divergences we must justify or eventually upstream.

### Phase 4 – Provisioning Integration *(in progress)*
- Async lifecycle hooks mark `COMING_UP → ACTIVE_HEALTHY` (or failure states) and read generated `.env` files when available.
- Supabase CLI now runs inside the platform-api container with deterministic port allocation and host-visible runtime dirs (`b5ca522836`, `12c266ec81`).
- **Open tasks**
- Document the full provisioning contract (status transitions, response payload fields, failure semantics) so Studio/tests share a single spec. *(Draft captured in `.agent/docs/provisioning-contract.md`; end-to-end tests still pending.)*
  - Inject provisioner/destroyer dependencies to enable mocked success/failure paths; expose a deterministic “fail next provision/destroy” toggle for testing.
  - Persist generated artefacts (anon/service keys, REST URL, connection string, port ranges, runtime root) back into Postgres.
  - Capture structured CLI output/error metadata for operators and tests.
- Ensure deletions are idempotent and INIT_FAILED/RESTORE_FAILED states are observable with retry timestamps.
- Align `.env`/compose defaults with platform mode and automate missing variable generation where possible.
- Reset pg sequences between test runs and seed deterministic fixtures to keep pg-mem/Postgres behaviour synchronized.
- Replace the temporary Supabase CLI shell-out with a host-native agent so runtime provisioning does not rely on localhost port forwarding hacks inside the platform container. New agent must support start/stop/status APIs and converge on CLI parity before we swap it in.
  - Runtime agent (`apps/runtime-agent`) now drives the mirrored Supabase CLI packages in-process, captures stdout/stderr/duration, and returns that metadata via the orchestrator API. Next step is to mount it in compose with docker socket + host network and stream results into persistence.

### Phase 6 – Feature Coverage & Hardening *(in progress alongside Phase 4)*
- Replace stubbed Studio endpoints with real data sources; immediate priorities:
  - Storage routes (`store/storage.ts`) still return synthetic buckets/objects/credentials. Wire these to the provisioned project's storage service using the stored service key + REST URL once provisioning persists them, and surface real pagination/error semantics.
  - Auth configuration endpoints (`store/auth-config.ts`) hold config in memory. Persist/read updates via GoTrue (or Postgres once the config tables exist) so Studio reads actual project settings and hook secrets instead of the hardcoded defaults.
  - Project analytics/logging routes (`store/project-analytics.ts`) emit placeholder metrics. Proxy the observability pipeline (Logflare/Vector replacement) or clearly gate the routes until telemetry is available so Studio charts don't render misleading zeroes.
  - Telemetry routes (`store/telemetry.ts`) are currently no-ops. Either forward these calls to the segment-compatible sink Studio expects or disable the endpoints behind `NEXT_PUBLIC_IS_PLATFORM` until instrumentation exists.
- Expand telemetry/logging, RBAC, and access token features as they come online, using `packages/api-types` as the contract reference instead of bespoke DTOs.
- Fix the auto-generated contract tests so Studio endpoint extraction matches implemented Fastify routes (`tests/auto-generated/scripts/generate-tests.ts`); once path normalization works, start converting the smoke tests from `it.skip` to real assertions backed by deterministic fixtures.
- Prepare integration/contract tests once provisioning seams are injectable.
- **Studio alignment**
  - Serve deployment targets (`remote`, `local`) through custom content/API rather than hardcoding; keep `NEXT_PUBLIC_PLATFORM_ENABLE_LOCAL_TARGET` as a platform toggle only.
  - When `local` is selected, clamp provider/region to LOCAL defaults, hide remote-only pricing/instance UI, and surface CLI/Docker prerequisites.
  - Use the same data-driven pattern for future platform-only UX (e.g., runtime telemetry, local health panels) so upstream Studio remains unchanged.

## Completed Milestones

### Phase 1 – Scaffolding ✅
- Created `apps/platform-api` workspace with Fastify + TypeScript, baseline tsconfig, scripts, and Dockerfile scaffolding.
- Added `/health` endpoint and registered workspace in the monorepo tooling.

### Phase 2 – API Contract Skeleton ✅
- Implemented initial `/api/platform/**` routes for profile/org/project listing, creation, deletion, and billing placeholders.
- Enabled CORS/host access so Studio containers can reach the host-published API without source modifications.

### Phase 3 – Metadata Persistence ✅
- Started with JSON persistence under `apps/platform-api/data` (legacy).
- **Current state**: Persistence moved to Postgres via Kysely with boot-time migrations/seeds; runtime directories tracked for provisioning artefacts.

### Phase 5 – Docker & Compose Integration ✅
- Production overlay (`docker-compose.platform.yml`) adds the platform service and routes traffic through Kong.
- Dev overlay runs the API in watch mode; platform API Dockerfile builds a CLI-capable image.
- Added `docker/.env.platform.example` capturing required platform variables.

## Backlog & Future Phases

### Phase 7 – Documentation & Automation
- Expand README/setup docs, document port allocation & cleanup scripts, and add CI workflows (lint/test) for platform API.

### Phase 8 – Studio Extensibility & Dynamic Configuration
- Serve deployment-mode metadata (local vs remote providers) via API/custom content to keep Studio data-driven.
- Use feature flags to hide upstream-only features (billing) while surfacing platform-specific UX safely.

### Phase 9 – Persistent Control Plane *(Postgres milestone accomplished; remaining items)*
- Inventory remaining `/api/platform/**` + `/api/v1/**` stubs and decide which become first-class tables.
- Extend Kysely schema to cover analytics, org billing, and provisioning artefacts.
- Replace JSON seeds with migration-driven fixtures for local dev/Vitest.
- Plan how provisioning writes generated secrets/endpoints back into the platform schema for Studio visibility.

### Phase 10 – Pg-meta Integration & Contract Tests
- Maintain `/pg-meta/**` proxy with encryption fallback.
- Integrate contract test harness under `apps/platform-api/tests/auto-generated`, ensuring behaviour matches Studio expectations once provisioning is stable.

## Change Log
- **2025-10-15 21:05 UTC · codex** – Updated Studio/Kong host URLs to `host.docker.internal` so the Studio container hits the gateway instead of `127.0.0.1`; stack comes up with Studio healthy again.
- **2025-10-16 05:15 UTC · codex** – Removed the auto-generated route smoke suite; will reintroduce via a dedicated workflow once schema/migration replay is wired up for pg-mem.
- **2025-10-16 04:20 UTC · codex** – Removed Supabase CLI dependencies from platform-api images/compose, enforced runtime-agent bearer auth, and made orchestration flows require the agent or explicit override hooks.
- **2025-10-15 22:02 UTC · codex** – Restarted `supabase-kong` to clear a stale Docker port-forward so `localhost:8000` stopped returning `ERR_CONNECTION_RESET`.
- **2025-10-15 22:20 UTC · codex** – Surfaced the local deployment target + runtime toggles via custom content, aligned the wizard defaults with runtime exclusions, and fixed `normalizeExcludedServices` so opting back into Logflare/Vector works.
- **2025-10-15 22:40 UTC · codex** – (reverted) Dedicated platform DB role experiment removed; the db service now wraps the Supabase image with a password-sync entrypoint so restarting it realigns credentials with `.env`.
- **2025-10-15 15:10 UTC · codex** – Runtime agent now invokes the Supabase CLI synchronously for provision/stop/destroy, platform API sends network metadata, docs note the CLI path env, and the CLI’s internal packages are mirrored under the agent for future in-process orchestration. Agent responses now surface stdout/stderr/duration metadata and the platform logs those results when debug logging is enabled.
- **2025-10-15 15:55 UTC · codex** – Added runtime-agent service to platform compose overlays, introduced container build (`apps/runtime-agent/Dockerfile`), and wired default `PLATFORM_ORCHESTRATOR_URL` env so platform-api talks to the agent by default.
- **2025-10-15 20:20 UTC · codex** – Platform API now logs orchestrator stdout/stderr/duration, local runtimes exclude analytics/vector by default, and runtime-agent hostname is driven by `RUNTIME_AGENT_SUPABASE_HOST`; note ongoing Postgres password drift when composing with the base stack.
- **2025-10-15 12:45 UTC** – Added provisioning/test readiness checklist and Studio local/remote alignment guidance (Codex).
- **2025-10-15 06:55 UTC · 12c266ec81** – Provisioner now uses Supabase CLI on shared compose network; runtime dirs moved under `platform-projects/`; added `LOCAL` provider enum.
- **2025-10-15 07:28 UTC · d4e4dcfc16** – Added local runtime health polling, pause/resume endpoints, and persisted service exclusions for CLI-based project stacks.
- **2025-10-15 05:33 UTC · b5ca522836** – Bundled Supabase CLI + Docker client into platform-api image, added port allocation + config scaffolding, and exposed Studio deployment-target toggle.
- **2025-10-14 17:31 MDT** – Migrated persistence to Postgres with auto-migrations, seeds, and pg-mem-based tests; JSON store deprecated.
- **c7a83d305c** – `/pg-meta/**` re-encrypts connection strings via `PG_META_CRYPTO_KEY`; seeds reuse anon/service keys for Studio debug visibility.
- **2025-10-16 03:20 UTC · codex** – Audited Phase 6 scope; flagged stubbed storage/auth/logs/telemetry routes and auto-generated test coverage gaps so next work focuses on real integrations.
