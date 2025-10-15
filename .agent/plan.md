# Platform API Plan

> Keep entries timestamped and include commit IDs when available. Update **Active Workstreams** first so the next agent knows what to tackle immediately; append noteworthy events under **Change Log**.

## Active Workstreams

### Phase 4 – Provisioning Integration *(in progress)*
- Async lifecycle hooks mark `COMING_UP → ACTIVE_HEALTHY` (or failure states) and read generated `.env` files when available.
- Supabase CLI now runs inside the platform-api container with deterministic port allocation and host-visible runtime dirs (`b5ca522836`, `12c266ec81`).
- **Open tasks**
  - Document the full provisioning contract (status transitions, response payload fields, failure semantics) so Studio/tests share a single spec.
  - Inject provisioner/destroyer dependencies to enable mocked success/failure paths; expose a deterministic “fail next provision/destroy” toggle for testing.
  - Persist generated artefacts (anon/service keys, REST URL, connection string, port ranges, runtime root) back into Postgres.
  - Capture structured CLI output/error metadata for operators and tests.
  - Ensure deletions are idempotent and INIT_FAILED/RESTORE_FAILED states are observable with retry timestamps.
  - Align `.env`/compose defaults with platform mode and automate missing variable generation where possible.
  - Reset pg sequences between test runs and seed deterministic fixtures to keep pg-mem/Postgres behaviour synchronized.

### Phase 6 – Feature Coverage & Hardening *(in progress alongside Phase 4)*
- Continue filling in Studio-dependent endpoints (storage, logs, auth config, analytics) and replace temporary stubs with real integrations.
- Expand telemetry/logging, RBAC, and access token features as they come online.
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
- **2025-10-15 12:45 UTC** – Added provisioning/test readiness checklist and Studio local/remote alignment guidance (Codex).
- **2025-10-15 06:55 UTC · 12c266ec81** – Provisioner now uses Supabase CLI on shared compose network; runtime dirs moved under `platform-projects/`; added `LOCAL` provider enum.
- **2025-10-15 07:28 UTC · d4e4dcfc16** – Added local runtime health polling, pause/resume endpoints, and persisted service exclusions for CLI-based project stacks.
- **2025-10-15 05:33 UTC · b5ca522836** – Bundled Supabase CLI + Docker client into platform-api image, added port allocation + config scaffolding, and exposed Studio deployment-target toggle.
- **2025-10-14 17:31 MDT** – Migrated persistence to Postgres with auto-migrations, seeds, and pg-mem-based tests; JSON store deprecated.
- **c7a83d305c** – `/pg-meta/**` re-encrypts connection strings via `PG_META_CRYPTO_KEY`; seeds reuse anon/service keys for Studio debug visibility.
