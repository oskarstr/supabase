# Platform Control Plane Risk Review (2025-10-16)

## Top 5 Structural Risks

1. **Unauthenticated control plane APIs (Critical)**  
   *Why it matters*: Every `/api/platform/**` route is mounted without any authentication or multi-tenant authorization guard, yet routes return privileged data (profile access tokens, project service keys) and mutate state. Anyone who can reach the service (including other containers or LAN clients) can mint access tokens, dump org metadata, or tear down projects.  
   *Evidence*: `main.ts` registers routes with permissive CORS (`origin: true`, `credentials: true`) and no auth middleware.【F:apps/platform-api/src/main.ts†L10-L43】 `profile.ts` exposes access-token CRUD directly; `createTemporaryApiKey` returns the service role key for any caller.【F:apps/platform-api/src/routes/profile.ts†L21-L89】【F:apps/platform-api/src/store/project-api.ts†L1-L18】  
   *Immediate fix*: introduce a mandatory auth hook (e.g., verify GoTrue JWT or a short-term shared bearer token) and enforce organization/project membership checks per request.  
   *Long-term*: align with upstream Studio’s session model (GoTrue JWT + Kong) and centralize RBAC policies per route.  
   *Tests*: add integration tests for unauthenticated requests (expect 401) and for cross-org access attempts (expect 403).

2. **No per-request authorization for organization/project operations (High)**  
   *Why it matters*: Even with boundary auth added later, store functions simply look up orgs/projects by slug/ref and perform actions without verifying that the caller is a member/owner. A valid user could point requests at any slug, hijacking other orgs’ projects.  
   *Evidence*: `createProject` accepts `organization_slug`, looks it up, and proceeds with provisioning with no membership checks; deletions and detail lookups use the same pattern.【F:apps/platform-api/src/store/projects.ts†L232-L360】  
   *Immediate fix*: plumb requester identity into handlers and assert membership/role before mutating org/project records.  
   *Long-term*: persist and cache membership/role mappings, mirroring Supabase Cloud’s RBAC enforcement layers.  
   *Tests*: unit tests for membership guard helpers plus API tests that simulate unauthorized users attempting cross-org access.

3. **Lifecycle orchestration HTTP calls lack timeouts/backoff (High)**  
   *Why it matters*: `provisionProjectStack`/`destroyProjectStack` await `fetch` calls to the runtime agent with Node’s infinite default timeout. If the agent stalls or the network flakes, the async job never resolves, leaving the project stuck in `COMING_UP` forever and consuming worker slots.  
   *Evidence*: `useOrchestrator` builds raw `fetch` invocations without `AbortController`, timeout, or retry/backoff logic.【F:apps/platform-api/src/provisioner.ts†L76-L125】  
   *Immediate fix*: wrap orchestrator calls with `AbortController`-driven timeouts and bounded retries with jitter. Surface partial failures to the DB so operators can retry.  
   *Long-term*: move orchestration onto a dedicated job runner with exponential backoff, metrics, and cancellation semantics.  
   *Tests*: contract tests that simulate slow/hung orchestrator responses and assert that the control plane aborts and marks the project failed.

4. **In-flight lifecycle jobs disappear on process restart (High)**  
   *Why it matters*: Provision, pause, and destroy operations run via `void scheduleProvisioning(...)` background tasks with no durable queue. If platform-api restarts mid-flight, the Promise vanishes—no retry, no status reconciliation—leaving records stuck in `COMING_UP`/`GOING_DOWN` while runtimes may still be running.  
   *Evidence*: `createProject`/`resumeProject` fire-and-forget `scheduleProvisioning`; there is no startup reconciler scanning for pending states.【F:apps/platform-api/src/store/projects.ts†L232-L321】【F:apps/platform-api/src/store/projects.ts†L432-L451】  
   *Immediate fix*: persist lifecycle jobs (e.g., Postgres table with a worker loop) or at least resume pending states on boot.  
   *Long-term*: adopt an idempotent job queue with visibility timeouts and explicit retry policies shared with the runtime agent.  
   *Tests*: crash-recovery integration test that kills the API mid-provision and expects the job to resume/mark failed deterministically.

5. **Runtime template copied once, never upgraded (Medium)**  
   *Why it matters*: `prepareSupabaseRuntime` copies the `supabase/` template only if the directory does not already exist. Existing projects never receive template or config updates (new containers, env defaults, TLS changes), so upgrades silently leave runtimes on stale manifests—eventually leading to outages when Supabase upstream changes expectations.  
   *Evidence*: `copySupabaseTemplate` exits early if the destination directory already exists, with no versioning or migration hook.【F:apps/platform-api/src/provisioning/runtime.ts†L25-L105】  
   *Immediate fix*: store a template version marker per project and re-copy/migrate when the source template revs.  
   *Long-term*: manage runtime assets via explicit migrations (checksum + upgrade scripts) so upgrades are deliberate and testable.  
   *Tests*: unit test that simulates a template version bump and asserts that existing runtimes get updated or flagged for migration.

## Proposed PRs (One per Risk)

### PR A: "Lock down platform-api surface with auth + org scoping"
- Enforce a required `PLATFORM_API_ADMIN_TOKEN` (short-term) and wire GoTrue JWT verification hook for long-term path. Apply per-request membership checks before invoking store methods.
- Diff sketch:
```diff
+// apps/platform-api/src/plugins/auth.ts
+import type { FastifyPluginAsync } from 'fastify'
+
+const adminToken = process.env.PLATFORM_API_ADMIN_TOKEN?.trim()
+
+export const authPlugin: FastifyPluginAsync = async (app) => {
+  if (!adminToken) {
+    app.log.warn('PLATFORM_API_ADMIN_TOKEN not set; rejecting all requests')
+  }
+
+  app.addHook('onRequest', async (request, reply) => {
+    const header = request.headers.authorization ?? ''
+    if (!adminToken || header !== `Bearer ${adminToken}`) {
+      reply.code(401)
+      throw new Error('Unauthorized')
+    }
+  })
+}
+
+export default authPlugin
```
- Migration/Rollback: deploy token via env vars; rollback by removing the plugin and env.
- Test Plan: add integration tests for 401 responses without/with wrong token; ensure valid token grants access.
- Ops Notes: distribute token securely (e.g., secret manager) and rotate regularly.

### PR B: "Gate org/project mutations by membership"
- Introduce a `requestContext` helper that resolves the caller’s org roles from GoTrue JWT and assert membership before create/delete/list operations.
- Diff sketch:
```diff
-  const organization = await db
-    .selectFrom('organizations')
-    .selectAll()
-    .where('slug', '=', body.organization_slug)
-    .executeTakeFirst()
+  const organization = await requireOrganizationMembership(
+    body.organization_slug,
+    context.profileId,
+    { requireRole: 'owner' }
+  )
```
- Migration/Rollback: backfill membership cache table; rollback by reverting helper usage.
- Test Plan: unit tests for `requireOrganizationMembership`, plus API tests covering owner/member/non-member scenarios.
- Ops Notes: ensure Studio forwards session headers; add metrics on 403 rates per route.

### PR C: "Add orchestrator client timeouts and retries"
- Wrap `fetch` calls with `AbortController`, configurable timeout, and capped exponential backoff; persist failures as `INIT_FAILED`/`RESTORE_FAILED` with error metadata.
- Diff sketch:
```diff
-    const response = await fetch(`${baseUrl}${path}`, {
-      ...init,
-      headers,
-    } as any)
+    const controller = new AbortController()
+    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
+    try {
+      const response = await fetch(`${baseUrl}${path}`, {
+        ...init,
+        headers,
+        signal: controller.signal,
+      } as any)
+      return await parseResponse(response)
+    } finally {
+      clearTimeout(timeout)
+    }
```
- Migration/Rollback: deploy with sane default timeout (e.g., 2m) via env; rollback by toggling feature flag env to disable abort.
- Test Plan: add mock orchestrator test that delays response beyond timeout and assert failure handling.
- Ops Notes: surface timeout metrics and alerts (e.g., count of aborted orchestrator calls).

### PR D: "Persist lifecycle jobs and resume on boot"
- Add `lifecycle_jobs` table to track pending operations; background worker polls and executes jobs, rescheduling on failure. On startup, scan for stranded projects and enqueue retries.
- Diff sketch:
```diff
+await db
+  .insertInto('lifecycle_jobs')
+  .values({
+    project_id: insertResult.id,
+    operation: 'provision',
+    payload: JSON.stringify({
+      organization_slug: organization.slug,
+      runtime_id: runtime.project_id,
+    }),
+  })
+  .execute()
-
-void scheduleProvisioning(detail, organizationSummary, {
-  runtime,
-  dbPassword: body.db_pass,
-})
+queueLifecycleJob({
+  type: 'provision',
+  project: detail,
+  organization: organizationSummary,
+  runtime,
+  dbPassword: body.db_pass,
+})
```
- Migration/Rollback: reversible migration creating `lifecycle_jobs` with status index; rollback by dropping table and worker.
- Test Plan: integration test that enqueues a job, restarts the worker, and asserts completion; failure path test ensuring retries.
- Ops Notes: monitor job backlog length and failure counts via metrics/dashboard.

### PR E: "Version runtime templates and auto-migrate"
- Store a `runtime_template_version` file under each project root; compare with source template hash and reapply template (or schedule migration) when versions diverge.
- Diff sketch:
```diff
-const copySupabaseTemplate = async (destination: string) => {
-  if (existsSync(destination)) return
+const copySupabaseTemplate = async (destination: string) => {
+  const currentVersion = await readTemplateVersion(destination)
+  if (currentVersion === TEMPLATE_VERSION) return
   await ensureParentDir(destination)
-  await cp(SUPABASE_TEMPLATE_DIR, destination, { recursive: true })
+  await fs.rm(destination, { recursive: true, force: true })
+  await cp(SUPABASE_TEMPLATE_DIR, destination, { recursive: true })
+  await writeTemplateVersion(destination, TEMPLATE_VERSION)
 }
```
- Migration/Rollback: define `TEMPLATE_VERSION`; rollback by reverting to copy-once logic.
- Test Plan: unit tests covering first-run copy, upgrade path, and failure handling when copy fails.
- Ops Notes: expose metric/log when migrations run; document manual rollback strategy if template upgrade fails.

## Compatibility Drift vs Upstream

- **Auth-less platform API** — *must align soon*: upstream Studio expects authenticated, tenant-scoped APIs; our open surface will break once Studio sends user-context headers and expects 401/403 handling.【F:apps-platform-api/src/main.ts†L10-L43】
- **Lifecycle orchestration semantics** — *needs watch*: upstream control plane retries orchestrator calls with timeouts; our fire-and-forget flow may diverge when Studio assumes retries/backoffs on 5xx.【F:apps/platform-api/src/provisioner.ts†L76-L173】
- **Runtime template upgrades** — *needs watch*: upstream CLI keeps templates in sync via versioned releases; our copy-once approach risks future incompatibility when Studio ships new services.【F:apps/platform-api/src/provisioning/runtime.ts†L25-L105】

## Assumptions & Follow-ups

- Assumed no hidden auth middleware is injected by compose/Kong before Fastify (none found in repo). Quick probe: issue curl against local stack without headers once the auth plugin lands.  
- Assumed runtime-agent is only reachable inside compose; verify network policy—consider restricting listener to internal network.  
- Need confirmation on desired orchestration timeout (15m agent default vs. control plane expectations); propose load test to tune values.

