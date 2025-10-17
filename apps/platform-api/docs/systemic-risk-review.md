# Platform API & Runtime Agent Risk Review

This document captures the highest-impact systemic risks currently present in the forked
`apps/platform-api` and `apps/runtime-agent` services, alongside proposed remediation
strategies and validation plans.

## Top 5 Risks

1. **Unprotected platform control plane endpoints (Critical)**  
   *Impact*: Any actor who can reach the Platform API can enumerate organizations,
   fetch service-role keys, create/delete projects, and mint personal access tokens
   without authentication. *Likelihood*: With Compose exposing the API internally,
   a single compromised workstation/browser is enough to replay these calls.  
   *Evidence*: `apps/platform-api/src/routes/projects.ts` and `.../profile.ts`
   register data/secret-bearing routes without authentication middleware, and
   `src/main.ts` does not install an auth guard.  
   *Fix*: Introduce a Fastify pre-handler that validates GoTrue sessions or a shared
   bearer token before hitting `/api/platform/**`, backed by per-route RBAC checks.  
   *Tests*: Add integration coverage that ensures anonymous requests fail with 401.

2. **CORS allows credentialed cross-site requests (High)**  
   *Impact*: Because Studio uses cookies/bearer headers, the current
   `origin: true` + `credentials: true` configuration enables full CSRF by any
   attacker-controlled website, leading to silent project deletion or token leaks.  
   *Likelihood*: Browsers enforce this automatically when a logged-in operator visits
   a malicious site.  
   *Evidence*: `apps/platform-api/src/main.ts` lines 36-39.  
   *Fix*: Replace the wildcard CORS policy with an explicit allow-list sourced from
   configuration and require same-site CSRF tokens for cookie auth flows.  
   *Tests*: HTTP tests confirming foreign origins receive 403 and that valid origins
   pass.

3. **Runtime agent auth is optional (High)**  
   *Impact*: If `RUNTIME_AGENT_AUTH_TOKEN` is unset (default), any container on the
   Docker network can trigger start/stop/destroy with arbitrary payloads, resulting in
   denial of service or privilege escalation via crafted `project_root`.  
   *Likelihood*: High in local/dev where secrets are often omitted.  
   *Evidence*: `apps/runtime-agent/internal/server/server.go` lines 204-235 return the
   handler unchanged when no token is configured.  
   *Fix*: Require a token by default (fail fast on startup) and support mutual TLS for
   hardened environments.  
   *Tests*: Unit tests asserting the server refuses to start without a token and that
   authenticated/unauthenticated requests behave correctly.

4. **Runtime agent accepts unvalidated project roots (High)**  
   *Impact*: The agent `chdir`s into whatever path the caller supplies. When combined
   with risk #1/#3, an attacker can coerce the orchestrator to operate on arbitrary
   host directories, potentially corrupting unrelated deployments or exfiltrating
   files via Docker compose scripts.  
   *Likelihood*: High once an attacker can hit the agent.  
   *Evidence*: `apps/runtime-agent/internal/server/executor_local.go` lines 142-176.  
   *Fix*: Enforce a configured root prefix (e.g., `PROJECTS_ROOT`) inside the agent and
   reject requests targeting paths outside that subtree.  
   *Tests*: Unit tests covering accepted/rejected roots and integration tests proving
   traversal attempts fail.

5. **Shell template commands are vulnerable to injection (High)**  
   *Impact*: Deployments that rely on `PLATFORM_API_PROVISION_CMD`/`DESTROY_CMD`
   execute shell commands built from user-controlled project metadata with `shell: true`.
   A crafted project name like `"alpha && rm -rf /"` executes arbitrary commands.  
   *Likelihood*: Medium—fallback hooks are common when embedding into bespoke
   environments, and Studio allows arbitrary project names.  
   *Evidence*: `apps/platform-api/src/provisioner.ts` lines 46-73.  
   *Fix*: Switch to spawn with argument arrays, escape templated segments, or restrict
   the command templates to a vetted placeholder set while validating inputs.  
   *Tests*: Add regression cases that attempt injection strings and verify they are
   rejected or safely escaped.

## Pull Request Concepts

- **PR A – Require platform authentication & RBAC**: Introduce an auth plugin for
  `/api/platform/**`, bind to GoTrue JWT verification, and gate routes by org/project
  membership. Provide feature flag to fail closed.
- **PR B – Harden CORS & CSRF defenses**: Configure explicit origin allow-list,
  propagate CSRF tokens, and document rollout steps.
- **PR C – Enforce runtime-agent auth**: Refuse startup without `RUNTIME_AGENT_AUTH_TOKEN`,
  tighten logging, and add readiness probes reflecting auth state.
- **PR D – Sandbox runtime project roots**: Add prefix validation within the agent
  plus a config knob for the allowed root directory; update API to supply it explicitly.
- **PR E – Escape provisioning command templates**: Replace `shell: true` invocations
  with parameterized `spawn` calls and sanitize user-provided substitutions.

These concepts align with the structured diffs and rollout plans described in the
main review response.
