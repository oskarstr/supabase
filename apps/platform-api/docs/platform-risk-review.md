# Platform API & Runtime Agent Risk Review

This document summarizes the highest-impact risks identified during the control plane audit (2025-10-16).

## Top Risks Snapshot

1. **Unauthenticated Platform API surface** – No authentication or authorization guards exist on `/api/platform/**` or `/api/v1/**`, leaving the entire control plane open to anonymous callers. Attackers can enumerate organizations, clone project secrets, and invoke lifecycle operations directly against tenant stacks.
2. **Missing per-project access control** – Even once authentication is added, the handlers do not scope requests to the caller’s organizations. Supplying any valid `project_ref` or `organization_slug` returns another tenant’s data, including storage service keys and connection strings.
3. **Orchestrator client without timeouts** – The provisioning client issues `fetch` calls without deadlines or retries. If the runtime-agent stalls, the Node.js event loop blocks indefinitely, marooning projects in `COMING_UP` and preventing new lifecycle work.
4. **Runtime template absent from production image** – The production `apps/platform-api` image only ships the compiled bundle. Provisioning expects `${repoRoot}/supabase` to exist, so stacks created from the container alone fail before orchestrator hand-off unless a host bind-mount is manually provided.
5. **Provisioning logs leak credentials** – Enabling `PLATFORM_API_LOG_PROVISIONING` prints the entire provisioning context, including raw database passwords, into stdout. Those secrets persist in container logs and centralized aggregators.

Each risk is elaborated in the accompanying review response, with concrete remediation pull requests proposed per item.
