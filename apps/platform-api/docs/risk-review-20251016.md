# Platform API / Runtime Agent Risk Review

This document captures the top structural and systemic risks identified on 2025-10-16 while reviewing the local platform control plane implementation. See the accompanying report for mitigation proposals.

1. **No authentication/authorization guard on Platform API routes.** All `/api/platform/**` and `/api/v1/**` handlers execute without verifying the caller, exposing project management controls and secrets to any network peer that can reach the service.
2. **Provisioning fallback command injection.** When `PLATFORM_API_PROVISION_CMD`/`DESTROY_CMD` overrides are enabled, user-controlled fields (project name, org slug, etc.) are templated directly into a shell command executed with `shell: true`, enabling command injection.
3. **In-memory orchestration with no resumable jobs.** Lifecycle operations (provision, destroy, resume) run in detached async promises. A process crash/restart mid-flight leaves projects stuck (`COMING_UP`/`GOING_DOWN`) with no recovery loop to reconcile state.
4. **Missing client-side timeouts for orchestrator/service calls.** Calls to the runtime agent, GoTrue, and Storage use bare `fetch` without deadlines. A hung upstream stalls provisioning or API responses indefinitely.
5. **Access tokens stored in plaintext.** Newly created personal access tokens are persisted with the full `access_token` and `token_digest` strings, providing no protection if the platform database is leaked.

Each issue is documented with evidence and remediation suggestions in the main review response.
