# Handoff Summary · 2025-10-17 · codex

## Current Focus
- `/platform/profile/permissions` now leans on shared `PermissionAction` constants with a read-only safety net. Next up is collapsing the massive template into maintainable data structures and cross-checking the matrix against Studio’s RBAC expectations.

## What’s Done
- Replaced hand-written action strings with `PermissionAction` constants from `@supabase/shared-types` and added an explicit guard so read-only roles only receive read-level permissions.
- Updated `apps/platform-api/tests/permissions.test.ts` to assert on canonical action names; the entire permission suite now passes without debug logging.
- Captured the progress in `.agent/analysis/auth-hardening-plan.md` and refreshed dependencies (`@supabase/shared-types@0.1.80`) for the platform API package.

## What’s Next
1. Factor the permission templates into a data-driven structure (e.g., resource/action matrices or shared helpers) to remove duplication and make future edits sustainable.
2. Reconcile the generated permissions with Studio’s RBAC matrix: confirm storage, realtime, and SQL actions align per role, and add targeted tests for admin/project-level roles as gaps appear.
3. Once the matrix stabilises, document the contract (Phase 6) and consider exposing shared constants so the API and Studio stop drifting.

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

Ping the user if you notice anything “hacky” or unfinished before moving on. They prefer blunt honesty over politeness.
