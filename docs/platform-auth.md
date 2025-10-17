# Platform Auth & Membership Overview

This document captures the current request pipeline, core route guarantees, seeding invariants, and regression coverage for the platform API’s authentication and membership model.

## Request Flow

- **JWT verification** – `authenticateRequest` runs as a prefix-level Fastify `preHandler` (wired up in `src/main.ts` for both `/api/v1` and `/api/platform`). It expects an `Authorization: Bearer` header, verifies HS256 signatures using `JWT_SECRET` or `SUPABASE_JWT_SECRET`, rejects expired or malformed tokens, and populates `request.auth` with `{ token, userId, email, role, claims }`.
- **Profile reconciliation** – The shared `requireProfile` helper (used by profile/org routes) invokes `ensureProfile(auth.userId, auth.email)` to upsert `platform.profiles` before continuing. Calls short-circuit with `401` when `request.auth` is missing and `404` when the profile cannot be found.
- **Organization scope checks** – `organizationsRoutes` registers its own `preHandler` that looks up the `:slug` membership (unless the route is `/members/invitations`) and caches it on the request. Missing memberships return `404 { message: 'Organization not found' }`, while unauthorized actors receive `403` on mutating endpoints (e.g., member management).
- **Permissions lookup** – `GET /api/platform/profile/permissions` uses `listPermissionsForProfile` to materialize permissions from the shared matrix. Responses always succeed with an array (empty when no memberships are found).

## Route Contracts

- `GET /api/platform/profile` – Returns the caller’s profile or `401/404`.
- `POST /api/platform/profile` – Creates a profile for the authenticated subject, audits login, and returns `201`. Duplicate attempts yield `409`.
- `GET /api/platform/profile/permissions` – Returns `AccessControlPermission[]` derived from the shared matrix. Owners receive wildcard `actions/resources` while developer/read-only members are scoped by `role_scoped_projects`.
- `GET /api/platform/organizations/:slug/*` – Requires membership (owner/admin/developer) established in the `preHandler`. Invitations endpoints (`/members/invitations`) allow organization managers to invite or accept members with project scoping.
- `POST /api/platform/organizations/:slug/members/invitations` – Guards via `canManageMembers`, allowing only owners or admins to manage invitations.

All routes expect `request.auth` to be hydrated by the shared pre-handler. Any route called without authentication returns a `401 { message: 'Unauthorized' }`.

## Seed Behaviour & Environment Overrides

- `seedDefaults()` runs on startup/tests to create baseline organizations, projects, and memberships using values from `apps/platform-api/src/config/defaults.ts`.
- **Admin reconciliation** – The seed calls `ensureAdminAuthUser`, hitting GoTrue’s `/admin/users` endpoint with the configured credentials. It retries according to:
  - `PLATFORM_ADMIN_SEED_RETRY_ATTEMPTS` (default 5, coerced to 1 in pg-mem tests)
  - `PLATFORM_ADMIN_SEED_RETRY_DELAY_MS` / `PLATFORM_ADMIN_SEED_MAX_DELAY_MS`
- The returned GoTrue UUID and email are written to `platform.profiles` (id `1`) and `platform.organization_members`. Duplicate profiles/memberships are reassigned back to the seeded admin.
- **Env overrides** – `PLATFORM_ADMIN_EMAIL` / `PLATFORM_ADMIN_PASSWORD` rewrite the baseline admin account on each seed run. Defaults fall back to `DEFAULT_ADMIN_EMAIL`/`DEFAULT_ADMIN_PASSWORD`.
- `PLATFORM_PROJECT_*` constants drive the on-disk runtime bootstrap and project metadata. See `PROJECTS_ROOT` for the host directory used by provisioning.
- Seeds populate invitation templates, base roles, and example members; adjustments should update both the SQL fixtures and the pg-mem harness.

## Test Strategy

- `tests/auth.bootstrap.test.ts` – Exercises GoTrue reconciliation, env overrides, retry behaviour, and duplicate membership clean-up.
- `tests/permissions.test.ts` – Covers owner/admin wildcards, project-scoped developer permissions, read-only safeguards, multi-organization union behaviour, and billing access alignment. Uses the JWT pre-handler with fixtures from `tests/utils/auth.ts`.
- `tests/permissions.docs.test.ts` – Ensures the shared permission matrix matches the public documentation parsed from `.agent/docs/supabase/accesscontrol.md`.
- `tests/organization.members.test.ts` – Validates invitation acceptance, metadata merging (`role_scoped_projects`), and role upserts.
- Additional coverage: `tests/auth.bootstrap.test.ts` (seed behaviour) and `tests/utils/env.ts` (fixture management) keep pg-mem parity.

Every auth change should re-run:

```bash
pnpm --filter platform-api exec vitest run tests/auth.bootstrap.test.ts tests/organization.members.test.ts tests/permissions.test.ts tests/permissions.docs.test.ts
pnpm --filter platform-api build
```

Update the shared artifact guide at `.agent/docs/supabase/permission-matrix-artifact.md` and the auth hardening plan when routes, permissions, or seed flows change.
