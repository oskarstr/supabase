# Platform Auth & Membership Hardening Plan

> Updated: 2025-10-17 · owner: codex

This plan replaces the ad-hoc grant scripts with a proper identity flow that matches Studio’s expectations. Each phase should land with focused commits, dedicated tests, and a short note in this file summarising what changed.

---

## Phase 0 – Housekeeping & Safety Nets

1. **Capture current behaviour**
   - Snapshot failing flows (Studio banner, REST curl attempts) so we can assert improvements later.
   - Add a high-level Vitest that reproduces the current “profile ≠ GoTrue user” mismatch to ensure we fix it deliberately.
      - ✅ `apps/platform-api/tests/auth.bootstrap.test.ts` now asserts the seeded profile’s `gotrue_id` matches the GoTrue admin user. Test currently fails (`expected 'auth-user-id'`), confirming the mismatch is exposed.

2. **Inventory Studio-facing endpoints**
   - Write a `scripts/platform-api/list-expected-routes.ts` script that inspects the generated Studio OpenAPI client and emits every `/platform/**` call (method + path + payload shape).
   - Store the output under `.agent/artifacts/platform_endpoints.json` for reference.
      - ✅ `scripts/platform-api/list-expected-routes.mjs` traverses `apps/studio` for `get/post/patch/del` helpers and generated `.agent/artifacts/platform_endpoints.json` (257 routes discovered).

Deliverable test file: `apps/platform-api/tests/auth.bootstrap.test.ts`

---

## Phase 1 – Remove Grant Hacks & Restore Baseline

1. Drop the new `apps/platform-api/src/db/grants.ts` helper and the matching call in `seedDefaults`.
2. Revert `scripts/platform-stack.sh` to its pre-hack behaviour—no post-start grant replay.
3. Keep the SQL migration (`docker/volumes/db/migrations/20250421084702_platform_grants.sql`) but ensure it is strictly idempotent and **only** touches postgres + supabase_admin.

Tests:
- `apps/platform-api/tests/grants.test.ts` → delete or rewrite to assert that the migration file contains only the expected statements.
- Add regression test ensuring we no longer try to grant to `service_role`/`authenticated` (string match is fine).

Notes to record here after completion: summary of removed scripts + confirmation of idempotent migration.

> Progress (2025-10-17):
> - ✅ Removed `applyPlatformSchemaGrants` helper and its invocation in `seedDefaults`.
> - ✅ Simplified `scripts/platform-stack.sh`—no more grant replay after compose.
> - ✅ `20250421084702_platform_grants.sql` now loops over `['postgres', 'supabase_admin']` only, retaining the schema-existence guard.
> - ✅ Replaced `tests/grants.test.ts` with `tests/migrations.platform-grants.test.ts` to assert no stray role names appear.

---

## Phase 2 – Bootstrap Admin Reconciliation

1. Refactor `seedDefaults`:
   - Call `ensureAdminAuthUser` first, capture returned GoTrue UUID and email.
   - Upsert `platform.profiles` (id 1) with that UUID + current env email/name.
   - Upsert `platform.organization_members` with the same profile id (keep owner role).
   - Update dependent tables (e.g., audit logs, project runtimes) if they reference the profile id.
2. Ensure changing `PLATFORM_ADMIN_EMAIL` rotates ownership cleanly on restart.
3. Persist these updates in a single transaction.

Tests:
- `apps/platform-api/tests/auth.bootstrap.test.ts` – add cases that simulate seeding against a mocked GoTrue response and assert the DB rows match the returned UUID/email.
- Integration test that resets the stack in SQLite/pg-mem and verifies env email changes update the profile.

Document here: decisions about upsert strategy and any edge cases.

> Progress (2025-10-17):
> - ✅ `ensureAdminAuthUser` now returns the created/found GoTrue UUID and email, covering both 201 and 409 flows.
> - ✅ `seedDefaults` runs the GoTrue reconciliation first, then updates `platform.profiles` with the returned UUID/email after the transaction. Runtime env overrides for email/password are respected on every seed run.
> - ✅ Added `tests/auth.bootstrap.test.ts` harness to prove the profile’s `gotrue_id` matches the GoTrue result (uses pg-mem + mocked fetch).
> - ✅ Added regression coverage ensuring a second seed with a different `PLATFORM_ADMIN_EMAIL` updates `profiles.primary_email` and `gotrue_id` accordingly.
> - ☐ Still need to confirm org membership/project runtimes update appropriately when env email changes (follow-up test).

---

## Phase 3 – Request-Time Authentication Hook

1. Implement a Fastify `preHandler` that:
   - Validates the bearer token (using GoTrue `/claims` or a local validator).
   - Extracts `sub`, `email`, and `role`.
   - Rejects requests without a valid token.
   - Attaches `request.auth = { sub, email, role }`.
2. Update all `/api/platform/**` routes to require the hook.

Tests:
- New file `apps/platform-api/tests/auth.middleware.test.ts` to assert:
  - Missing tokens yield 401.
  - Invalid tokens yield 401.
  - Valid tokens populate `request.auth`.

Record middleware behaviour and dependencies (service key, caching).

> Progress (2025-10-17):
> - ✅ Added `plugins/authenticate.ts` with HS256 verification using the configured JWT secret and request context augmentation.
> - ✅ Wrapped `/api/v1` and `/api/platform` registrations so every route uses the preHandler.
> - ✅ Updated route integration tests to inject signed JWTs via `tests/utils/auth.ts`.
> - ✅ Added `tests/auth.middleware.test.ts` covering happy path and error scenarios.

---

## Phase 4 – Profile & Membership APIs

1. Implement `/platform/profile` GET/POST/PATCH so callers can create or update their profile using the authenticated `sub`.
2. Update store helpers to query by `auth.sub` instead of `baseProfile`.
3. Implement `/platform/organizations/:slug/members` mutations (assign role, remove member, invite).
4. Ensure these routes enforce that only owners/admins can mutate.

Tests:
- `apps/platform-api/tests/profile.routes.test.ts`
- `apps/platform-api/tests/organization.members.test.ts`

> Progress (2025-10-17):
> - ✅ Added ownership-guarded `PATCH`/`DELETE` membership routes backed by new store helpers that upsert or remove organization member records.
> - ✅ Introduced `tests/organization.members.test.ts` to cover role assignment, permission denials, and owner deletion protections.
> - ✅ Wired up invitation create/delete flows with metadata storage, plus regression coverage ensuring only owners/admins can mutate invitations.
> - ✅ Added invitation token lookup/acceptance routes that enforce email matching, expiry, and scoped project metadata during membership creation.
> - ☐ Follow-up: align invitation acceptance audit payloads with upstream format (include requester IP and project context).

Each test should prepare fixtures via the seed helper, use the auth middleware with mocked JWTs, and assert DB state after the route executes.

---

## Phase 5 – Permissions & UI Contract

1. Rework `/platform/profile/permissions` to compute permissions based on the authenticated member’s roles.
2. Confirm the response shape matches Studio’s consumption (wildcards where appropriate, but scoped to the caller).
3. Add integration tests that verify:
   - Owner sees wildcard access.
   - Non-member gets no project/table access.
   - Multiple memberships return union of privileges.

Test file: `apps/platform-api/tests/permissions.test.ts`

---

## Phase 6 – Documentation & Cleanup

1. Produce a Markdown overview (`docs/platform-auth.md`) summarising:
   - Request flow
   - Route contracts
   - Seed behaviour and env overrides
   - Test strategy
2. Remove any dangling TODOs or commented-out hacks.
3. Validate the `scripts/platform-api/list-expected-routes.ts` output matches implemented handlers; if not, create issues or follow-ups.

---

### Execution Checklist

- [x] Phase 0
- [x] Phase 1
- [ ] Phase 2
- [x] Phase 3
- [ ] Phase 4
- [ ] Phase 5
- [ ] Phase 6

Update the checkboxes and add short notes under each phase as work completes.
