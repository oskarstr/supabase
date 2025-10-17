# Handoff Summary · 2025-10-17 · codex

## Current Focus
- Consolidate the permission matrix across API + Studio, retire the regex matcher on the client, and document the hardened bootstrap flow so future changes keep the admin + membership contracts intact.

## What’s Done
- Hardened admin bootstrap: `seedDefaults` now retries GoTrue provisioning, reconciles duplicate profiles/memberships back to id 1, and ships with regression coverage (`tests/auth.bootstrap.test.ts`).
- Normalised member role handling: `upsertOrganizationMemberRole` and invitation acceptance now merge roles/metadata instead of overwriting them; new tests cover multi-role assignments and canonical `role_scoped_projects`.
- Kept the plan/handoff docs current so Phase 2/4 are marked complete and remaining work is scoped to matrix governance + client matching.

## What’s Next
1. Define a single permission matrix source (shared package or generated artifact) and sync Studio once available. Until then, keep the backend list authoritative and audit against the public RBAC docs.
2. Replace the client-side regex permission matcher with a deterministic helper once the shared matrix exists; track coordination with the Studio team.
3. Finish the Phase 6 doc pass (bootstrap flow, membership metadata contract, test strategy).

## Repo Hygiene & Tests
- Quick checks: `pnpm --filter platform-api exec vitest run tests/permissions.test.ts` and `pnpm --filter platform-api exec vitest run tests/organization.members.test.ts`.
- Keep commit messages in the format `Profile & Memberships API: …` (no `feat/chore` prefixes).
- When adding dependencies, remember to update `pnpm-lock.yaml` with `pnpm install --filter platform-api --no-frozen-lockfile`.

## User Quirks & Expectations
- Commit messages: no conventional prefixes; prefer `Area: summary`.
- Code should be “artful”: clean, well-factored, no shortcuts even in tests. If a validation is “good enough,” it probably isn’t—pull in the proper helper/library.
- Tests should challenge the code. Don’t tweak assertions to make them pass; fix the implementation instead.
- Keep `.agent/analysis/auth-hardening-plan.md` updated as you land work.

## Useful References
- Plan & progress: `.agent/analysis/auth-hardening-plan.md`
- Historical notes: `.agent/analysis/agent1.md` … `agent4.md`
- Invitation flow tests: `apps/platform-api/tests/organization.members.test.ts`
- Matrix data: `apps/platform-api/src/config/permission-matrix.ts`
- Seed/bootstrap coverage: `apps/platform-api/tests/auth.bootstrap.test.ts`

Ping the user if you notice anything “hacky” or unfinished before moving on. They prefer blunt honesty over politeness.
