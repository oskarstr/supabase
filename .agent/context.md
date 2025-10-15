# Project Context

> First-time agents: start with **Current Focus**, then skim the sections below. Whenever you uncover behaviour that wasn’t obvious going in—especially tricky provisioning behaviours or upstream contracts—add a concise note (with timestamp/commit) under **Gotchas & Quick Tips** so the next agent can skip that discovery loop.

## Current Focus
- Define and document the local provisioning contract (state transitions, returned metadata, failure semantics) so Studio and tests have a shared target.
- Introduce test seams: dependency-injected provisioner/destroyer and deterministic failure toggles to enable mocked provisioning in contract tests.
- Align Studio’s project wizard with the control plane by serving deployment targets via API/custom content, clamping LOCAL defaults, and surfacing user guidance.

## Key Facts
- **Goal**: restore multi-project management to the open-source distribution without forking upstream Studio; the control plane lives in `apps/platform-api`.
- **Architecture**: Fastify + TypeScript service backed by Postgres (Kysely). Boot runs migrations (`apps/platform-api/migrations`) and seeds core data (`db/seed.ts`).
- **Provisioning**: Supabase CLI is bundled in the platform-api image (`b5ca522836`) and runs against a host-visible `platform-projects/` directory with shared Docker networking (`12c266ec81`).
- **Studio integration**: Docker compose overlays route `/api/platform/**` via Kong. The project wizard can expose local/remote deployment targets, currently gated by `NEXT_PUBLIC_PLATFORM_ENABLE_LOCAL_TARGET`.
- **Auth/Kong**: Kong entrypoint injects the anonymous consumer, preserving Studio’s stock AuthClient flow (`/auth/v1/**` mirrors Supabase Cloud).

## Working Conventions & Tooling
- Always fetch upstream Supabase docs/CLI references via **Context7** before recreating functionality—several documented CLI helpers (e.g., provisioning commands) and other resources exist and should be reused instead of rebuilt.
- Prefer `rg` for repo searches; avoid custom scripts unless they provide clear wins.
- Keep test data deterministic (seed helpers, sequence resets) so pg-mem and Postgres behave consistently.
- Keep commit messages clear and descriptive—skip `(chore)/(feat)` prefixes unless explicitly requested.
- Minimize upstream Studio/infra edits: prefer data-driven overrides (custom content, env flags) and only touch upstream components when absolutely unavoidable—document any divergence.
- Custom Studio UI tweaks should be driven by custom content keys (e.g. `project_creation:deployment_targets`, `project_creation:local_runtime_services`) plus platform guards (`NEXT_PUBLIC_IS_PLATFORM`). Keep JSX additions minimal and gated so upstream builds remain unchanged when the content keys are absent.
- Provisioning still shells out to the Supabase CLI inside the platform container. Because the CLI’s health probes are hardcoded to `127.0.0.1`, we currently rely on a `socat` port forward hack. Long-term fix is to move provisioning into a host-side agent (or native orchestrator) that drives Docker directly; note this in Phase 4 roadmap.

## Gotchas & Quick Tips
- Project creation requires `organization_slug` and assumes async provisioning; the API intentionally ignores raw `organization_id`. Tests must inject slugs or create orgs first.
- Provisioner runs inside the container—ensure Docker socket and Supabase CLI paths are available when running locally. Use the new fail-toggles instead of ad-hoc env hacking for error scenarios.
- Studio wizard toggles `LOCAL` via feature flag, but the long-term source of truth should be platform API custom content; don’t hardcode local-only logic in React components.
- Kong patch auto-injects the anonymous consumer; avoid editing upstream Kong templates directly.

## Recent Milestones
- **2025-10-15 06:55 UTC · 12c266ec81** – Provisioner shells out to `supabase start --network-id <compose>`, runtime dirs live under `platform-projects/`, and the `LOCAL` cloud provider enum was added.
- **2025-10-15 07:28 UTC · d4e4dcfc16** – Added pause/resume endpoints, runtime health polling, and persisted service exclusions so local stacks report accurate status and optional containers can be skipped.
- **2025-10-15 05:33 UTC · b5ca522836** – Supabase CLI + Docker client baked into the image; provisioning helpers handle port allocation and config scaffolding. Studio wizard toggle for local vs remote added (feature-flagged).
- **2025-10-14 17:31 MDT** – Migrated from JSON store to Postgres-backed schema. Auto-migrations, seeds, and pg-mem test harness landed; sequences reset after seeding to avoid ID collisions.
- **Pg-meta proxy · c7a83d305c** – `/pg-meta/**` now re-encrypts connection strings with `PG_META_CRYPTO_KEY` before proxying via Kong; seeds reuse anon/service keys for debug visibility.

## Historical Notes
- Early iterations persisted state to JSON under `apps/platform-api/data`; retained here for context but superseded by the Postgres schema.
- Added request-transformer-free Kong patch to merge `kong.platform.yml` at boot.
- Restored `/api/platform/signup` proxy to GoTrue to match hosted platform behaviour.
- Built dedicated Studio platform image (`scripts/build-platform-studio.sh`, `docker/Dockerfile.studio-platform`) and compose overlays for platform/dev.
- Dashboard basic-auth toggle exposed via `PLATFORM_DASHBOARD_BASIC_AUTH_ENABLED`.
