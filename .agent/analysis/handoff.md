# Handoff Summary · 2025-10-17 · codex

## Current Focus
We’re in **Phase 4 – Profile & Membership APIs** of the auth-hardening plan. Phase 0–3 and part of Phase 4 are complete (see `.agent/analysis/auth-hardening-plan.md` for the detailed checklist and progress notes). The main objective is to replace the old, global-profile shortcuts with per-user profile, permissions, and organization membership handling that matches Studio’s expectations and the upstream Supabase platform contracts (see the agent findings in `.agent/analysis/agent1.md` … `.agent/analysis/agent4.md`).

## Why We’re Doing This
Earlier hacks (global `baseProfile`, wildcard permissions, grant scripts) meant every request looked like the bootstrap admin. Studio’s “additional permissions required” banner and API security issues were symptoms of that mismatch. The cloud agents mapped the full auth flow and confirmed we need to mirror the upstream design: authenticate every request, resolve the caller’s GoTrue UUID, materialize their profile and memberships, and scope organization/project access accordingly.

## Work Completed This Session
- **Grant scripts removed** (Phase 1) – helper deleted, stack script simplified, migration locked down; `tests/migrations.platform-grants.test.ts` added.
- **Bootstrap reconciliation** (Phase 2) – `seedDefaults` now captures the real GoTrue UUID/email, updates `profiles` on each seed, and the pg-mem tests (`tests/auth.bootstrap.test.ts`) cover both the initial seed and env-driven admin rotations.
- **Request-time authentication** (Phase 3) – added `plugins/authenticate.ts` (HS256 via `JWT_SECRET`/`SUPABASE_JWT_SECRET`), wrapped `/api/v1` and `/api/platform`, updated route tests to supply signed JWTs (`tests/utils/auth.ts`), and added `tests/auth.middleware.test.ts`.
- **Phase 4 in progress** – profile routes/stores now operate on the authenticated user: new helpers in `store/profile.ts`, `/platform/profile` GET/POST/PATCH updated, permissions resolved via `listPermissionsForProfile`. A fresh suite (`tests/profile.routes.test.ts`) covers the new flow but is currently failing (see below).

## Current Blockers
Running
```
pnpm --filter platform-api test -- tests/profile.routes.test.ts
```
returns 500s because the request + database fixtures aren’t yet aligned with the new helpers:
- `ensureProfile()` expects valid UUIDs (`uuid` column), so the test should use a proper UUID instead of `test-user`.
- The Fastify test harness needs a seeded organization membership for the test user; otherwise the new guards short-circuit.
- Some organization store functions still hit old code paths that ignore the caller, and we’ve only partially refactored the main routes. Expect additional 500s until those are finished.

## Next Steps
1. Finish Phase 4:
   - Refactor the remaining organization store helpers (`listOrganizationProjects`, `getOrganizationDetail`, etc.) to accept the authenticated profile ID or membership and remove fallback stubs.
   - Update the organization routes to use the new helpers consistently.
   - Extend/update tests (profile + organization) to seed test profiles/memberships using the new helpers.
2. Once profile/org flows pass, continue with Phase 5 (permissions UX) and Phase 6 (docs/cleanup) per the plan.

## Reminder
Everything else you need—full plan, per-phase notes, and the cloud-agent analyses—is in the `.agent/analysis` directory:
- `.agent/analysis/auth-hardening-plan.md`
- `.agent/analysis/agent1.md` … `.agent/analysis/agent4.md`

I’m out of cycle (“ran out of juice”), so please pick it up from Phase 4 with the failing profile tests as your starting point.
