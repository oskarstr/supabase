# Handoff Summary · 2025-10-17 · codex

## Current Focus
- Fix the systemic gaps discovered while chasing the admin-permission bug: make seed reconciliation resilient, clean up organization membership metadata, and formalise the permission matrix so API and Studio stay in sync without brittle regex matching.

## What’s Done
- Diagnosed the permissions regression to a type mismatch in `toOrganization` (id serialized as string) and fixed it. Added smoke tests/e2e verification via `tests/permissions.test.ts`.
- Adjusted permissions assertions so they track the real matrix output instead of rejecting wildcard resources.
- Documented follow-up hardening in `.agent/analysis/auth-hardening-plan.md`, flagging admin-seed retry work, membership metadata cleanup, and matrix governance.
- Collected other fragility points (regex matching, multi-role handling, upstream matrix divergence) so we can tackle them deliberately rather than by ad-hoc patches.

## What’s Next
1. Harden `seedDefaults` + admin reconciliation: add retry/backoff, refuse to leave the bootstrap until the env-defined admin profile (id 1) is updated, and auto-repair on login if drift is detected.
2. Rework membership upserts so `role_ids` remain additive, `role_scoped_projects` uses one canonical shape, and stale scoped entries are removed. Add regression tests for multi-role org members.
3. Define a single permission matrix source (shared package or generated artifact) and sync Studio once available. Until then, keep the backend list authoritative and audit against the public RBAC docs.
4. Replace the client-side regex permission matcher with a deterministic helper once the shared matrix exists; track coordination with the Studio team.

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
