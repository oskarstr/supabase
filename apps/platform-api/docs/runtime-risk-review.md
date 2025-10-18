# Platform Runtime Risk Review

## Scope
- Current platform-api provisioning pipeline (`apps/platform-api/src/provisioner.ts`, `apps/platform-api/src/provisioning/*`).
- Runtime agent orchestration contract (`apps/runtime-agent/internal/server`).
- Focused on the build-specific divergences from upstream that could cascade into systemic failures.

## Top Risks

### 1. Port allocation will exceed valid ranges after ~2k projects
- **Where it lives:** `allocateProjectPorts` derives port numbers as `BASE_PORT + projectId * PORT_STEP` with defaults of `23000` and `20`.【F:apps/platform-api/src/provisioning/ports.ts†L12-L23】
- **Failure mode:** `projectId` is an auto-incrementing primary key that never shrinks. After roughly 2,127 project creations, the API port becomes greater than 65,535, causing Docker to reject container start-up and rendering new local projects un-provisionable.
- **Why upstream doesn’t hit this:** Supabase CLI assigns ports per project folder; upstream Studio never drives the `projectId` growth path we have introduced.
- **Fix direction:** Persist per-project port allocations (e.g., in `project_runtimes`) and recycle freed ranges, or clamp the generator to a ring with collision detection before invoking the agent.

### 2. Orchestrator calls can hang indefinitely
- **Where it lives:** `useOrchestrator` calls `fetch` without an abort signal or timeout, then awaits forever on slow or wedged agents.【F:apps/platform-api/src/provisioner.ts†L68-L123】
- **Failure mode:** If runtime-agent stalls (Docker socket locked, container build pulling images, etc.), the platform request thread never returns. Project status remains `COMING_UP`/`GOING_DOWN`, Studio spins, and retries queue up behind the stuck promise. In the worst case the Fastify worker pool is exhausted.
- **Fix direction:** Inject an `AbortController` with a timeout that mirrors `RUNTIME_AGENT_COMMAND_TIMEOUT`, surface a 504/timeout status, and persist the failure so operators can retry from a clean state.

### 3. Runtime template never updates after first copy
- **Where it lives:** `copySupabaseTemplate` copies `apps/platform-api/supabase` only when the target directory is missing.【F:apps/platform-api/src/provisioning/runtime.ts†L32-L50】
- **Failure mode:** Once a project runtime exists, it never receives config/docker-compose changes. Security fixes, new services, or networking patches upstreamed into our template simply don’t land on existing projects, leading to drift and brittle upgrades.
- **Fix direction:** Version the template (e.g., embed a manifest file) and re-sync when the template revision changes, or maintain a migration routine that reapplies updated files while preserving user-generated assets.

### 4. Health checks default to an unreachable host in host-run mode
- **Where it lives:** `waitForRuntimeHealth` defaults `HEALTH_HOST` to `host.docker.internal` with no platform-aware override.【F:apps/platform-api/src/provisioning/health.ts†L5-L47】
- **Failure mode:** We now run platform-api directly on the host (`pnpm dev`). On Linux hosts `host.docker.internal` is undefined, so every health probe fails, projects are marked `INIT_FAILED`, and the cleanup path tears down otherwise healthy stacks.
- **Fix direction:** Detect whether we are inside Docker; fall back to `127.0.0.1` (or expose the actual API gateway host) when running on bare metal. Surface configuration errors before destroying the stack.

### 5. Generated config ignores requested Postgres version
- **Where it lives:** `renderSupabaseConfig` hardcodes `major_version = 15` regardless of the project request.【F:apps/platform-api/src/provisioning/config.ts†L9-L53】
- **Failure mode:** Studio already captures `postgres_engine`/`db_version`, but the runtime we start is always Postgres 15. Provisioning appears “green” while the database runs the wrong version, breaking future upgrades and any feature relying on PG17+ (e.g., OrioleDB previews).
- **Fix direction:** Thread the requested major version into `prepareSupabaseRuntime` and the rendered TOML, and validate against the runtime images we ship to fail fast when a version isn’t supported locally.

## Next Steps
1. Prioritise fixes for items 1 & 2—they block scale and can deadlock provisioning today.
2. Align health probing defaults with the dev setup before rolling out to the team.
3. Plan a template versioning strategy so we can safely ship upstream Docker changes.
