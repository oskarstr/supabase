# Handoff Summary · 2025-10-17 · codex

## Current Focus
- `/platform/profile/permissions` now derives responses from a large role-based template instead of returning wildcards, but the mapping is still handwritten, noisy, and leaking write actions to read-only members. The immediate goal is to tighten that implementation, hook it up to shared constants, and get the new test suite green.

## What’s Done
- Added a comprehensive (manual) permission template in `apps/platform-api/src/store/permissions.ts` that inspects memberships, role metadata (`role_scoped_projects`), and project membership to emit permissions.
- Introduced `apps/platform-api/tests/permissions.test.ts` covering owner, non-member, developer (project scoped), multi-organization union, and read-only scenarios. Developer/multi-org tests pass; the read-only check currently fails.
- Parsed the public access-control matrix to seed the template and confirmed base role IDs (1–4 org, 5–8 project) align with Studio expectations.

## What’s Next
1. Import action constants from `@supabase/shared-types/out/constants` (or another canonical source) and replace the hard-coded strings throughout the template.
2. Fix the template so read-only roles never receive write-level actions (`analytics:Admin:Write`, `storage:Write`, etc.); adjust the mapping and rerun `tests/permissions.test.ts`.
3. Remove the temporary `console.log` diagnostics from both `permissions.ts` and the test once behaviour is correct.
4. Deduplicate/merge permissions more intelligently and consider small refactors (e.g., generate template data) to keep the file maintainable.
5. Update Phase 5 notes and documentation (Phase 6) once the contract is stable.

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
