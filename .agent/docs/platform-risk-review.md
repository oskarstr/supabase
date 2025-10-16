# Platform Runtime Risk Review

## 1. Orchestrator calls could stall project provisioning
- **What we saw**: `provisionProjectStack` delegated to the runtime agent using `fetch` without any client-side timeout, so a wedged agent would leave projects stuck in `COMING_UP` forever while the promise never resolved.【F:apps/platform-api/src/provisioner.ts†L73-L143】【F:apps/platform-api/src/store/projects.ts†L88-L152】
- **Why it matters**: the API would never transition projects out of limbo, block retries, and leak Docker resources because the cleanup logic only runs after the promise settles.
- **Mitigation**: we now enforce a configurable timeout (`PLATFORM_ORCHESTRATOR_TIMEOUT_MS`, default 15 minutes) and surface a clear timeout error when the agent does not respond in time. A dedicated Vitest covers the abort behaviour so regressions are caught early.【F:apps/platform-api/src/provisioner.ts†L64-L114】【F:apps/platform-api/tests/provisioner.timeout.test.ts†L1-L48】

## 2. Runtime agent accepted arbitrary filesystem roots
- **What we saw**: the runtime agent would `chdir` into whatever `project_root` the control plane provided without checking that it lived under the managed `platform-projects/` mount.【F:apps/runtime-agent/internal/server/executor_local.go†L113-L172】【F:apps/runtime-agent/internal/server/server.go†L1-L205】
- **Why it matters**: any request (or future bug) that smuggled a different path could make the agent operate on arbitrary host directories, escalating a leaked bearer token into RCE or destructive filesystem access.
- **Mitigation**: the agent now normalises requests against `RUNTIME_AGENT_PROJECTS_ROOT`, rejects paths outside that prefix, and we update Docker/env templates so both services agree on the allowed root. Unit tests assert the guard before executor logic runs.【F:apps/runtime-agent/internal/server/server.go†L16-L214】【F:apps/runtime-agent/internal/server/server_test.go†L1-L117】【F:docker/docker-compose.platform.yml†L30-L44】【F:docker/.env.platform.example†L57-L75】

## 3. Supabase runtime template drift will strand upgrades (still open)
- **What we saw**: `prepareSupabaseRuntime` copies the repo template only once—the first time a project is prepared—and then never re-syncs. Existing projects silently keep stale migrations/config even after we ship critical fixes upstream.【F:apps/platform-api/src/provisioning/runtime.ts†L25-L81】
- **Why it matters**: upcoming Supabase release changes (new containers, config keys, migrations) will fail or diverge because older project directories never receive the updates, leading to inconsistent fleets.
- **Next steps**: introduce template versioning for runtime roots (e.g., stamp the copied template with a version/commit hash and re-copy when the repo template advances), plus a migration command to safely update existing runtimes before provisioning resumes. This needs to land before we rely on platform-managed upgrades.
