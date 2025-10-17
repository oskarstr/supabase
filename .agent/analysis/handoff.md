# Handoff Summary · 2025-10-17 · codex

## Current Focus
Phase 4 of the auth-hardening plan is wrapped. Phase 5 – **Permissions & UI Contract** – is up next. The goal is to replace the wildcard permission response with per-member rules derived from organization roles and scoped projects so Studio’s gating logic stops showing the “additional permissions” banner.

## What’s Done
- Profiles now reconcile with GoTrue and are exercised by `tests/profile.routes.test.ts`.
- Membership mutations and invitation flows are live (including token lookup, acceptance, scoped project metadata, and audit logging).
- Phase notes in `.agent/analysis/auth-hardening-plan.md` are current; follow-ups from earlier phases are closed out.

## What’s Next
1. Redesign `/platform/profile/permissions` to compute permissions from the authenticated member’s role IDs and any scoped-project metadata.
2. Confirm the response shape matches Studio’s expectations (owner wildcard, non-member zero access, union across memberships).
3. Add integration tests (`tests/permissions.test.ts` stub needs to be created) that cover the scenarios above.
4. Once Phase 5 lands, start Phase 6 (documentation/cleanup).

## Repo Hygiene & Tests
- Use `pnpm --filter platform-api test -- tests/organization.members.test.ts` and `pnpm --filter platform-api test -- tests/profile.routes.test.ts` for targeted checks.
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

Ping the user if you notice anything “hacky” or unfinished before moving on. They prefer blunt honesty over politeness.  !*** End Patch
