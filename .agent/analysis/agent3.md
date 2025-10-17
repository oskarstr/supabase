# Platform Admin Auth Investigation

## Current Flow
### Studio request construction
- Studio’s data layer builds a shared OpenAPI client whose base URL comes from `NEXT_PUBLIC_API_URL`; when the value includes `/platform` it is trimmed so client-side calls target `/api/platform` on the same origin.【F:apps/studio/data/fetchers.ts†L27-L40】【F:apps/studio/lib/constants/index.ts†L5-L18】
- For every request the client adds an `Authorization` header by loading the active GoTrue access token, and stamps each call with an `X-Request-Id`.【F:apps/studio/data/fetchers.ts†L49-L91】
- Server-side API routes (used mostly in self-hosted mode) validate bearer tokens by introspecting them through GoTrue’s `/claims` endpoint, which exposes the JWT payload that includes the `sub` identifier tying the session to a GoTrue user.【F:apps/studio/lib/api/apiAuthenticate.ts†L16-L50】【F:apps/studio/lib/gotrue.ts†L27-L38】

### Kong gateway
- In platform mode Kong exposes `/api/platform` directly to the Platform API container without any additional authentication plugins, so whatever headers Studio sends are passed through unchanged.【F:docker/volumes/api/kong.platform.yml†L1-L17】
- Other Supabase services such as PostgREST remain guarded by Kong’s `key-auth` plugin, which is why requests to `/rest/v1` still require both the JWT and an `apikey` (service or anon key).【F:docker/volumes/api/kong.yml†L87-L106】

### Platform API handling
- The Platform API boots Fastify, applies migrations/seeds, and registers both `/api/platform` and `/api/v1` routes with only CORS middleware; there is currently no request-scoped authentication hook in front of those route modules.【F:apps/platform-api/src/main.ts†L29-L42】
- Route handlers fetch profile and membership information straight from the control-plane schema. For example `getProfile()` always returns the first row in `platform.profiles` (or the static `baseProfile` fallback) and ignores request context or JWT claims.【F:apps/platform-api/src/store/profile.ts†L8-L11】
- Organization queries reuse that global profile by assuming the current user’s `profile_id` equals `baseProfile.id`, then left-joining membership data by that identifier.【F:apps/platform-api/src/store/organizations.ts†L25-L105】
- Member listings join `platform.organization_members` with `platform.profiles` on `profile_id`, exposing the stored `gotrue_id` back to Studio; if no members exist, the code fabricates a fallback entry from the seeded profile.【F:apps/platform-api/src/store/organization-members.ts†L14-L59】

### GoTrue and PostgREST
- Seed logic provisions the bootstrap admin by calling GoTrue’s admin API with the configured email/password, creating the account if it does not exist or updating the password if it does.【F:apps/platform-api/src/db/seed.ts†L398-L494】
- The control-plane schema defines `platform.profiles.gotrue_id` as a unique UUID meant to match GoTrue’s `auth.users.id`, and all membership rows reference `profiles.id` via foreign key constraints.【F:apps/platform-api/migrations/0001_initial.sql†L61-L113】
- There are no row-level-security policies on the `platform` schema; authorization is intended to happen in the Platform API before queries reach Postgres.【F:apps/platform-api/migrations/0001_initial.sql†L61-L199】

## Source of Truth for Profiles and Membership
- The configuration defaults seed a single `baseProfile` with `id = 1` and a randomly generated `gotrue_id`, along with default organizations and owner memberships tied to that profile.【F:apps/platform-api/src/config/defaults.ts†L196-L209】【F:apps/platform-api/src/db/seed.ts†L80-L164】
- During seeding the code inserts the profile only when `id = 1` is absent; subsequent runs skip updates, so any changes to the bootstrap email or username in `.env` do not reconcile existing rows.【F:apps/platform-api/src/db/seed.ts†L80-L105】
- Membership lookups rely on `profiles.gotrue_id` to feed Studio’s UI; when the stored UUID diverges from the active GoTrue user, Studio displays “missing permissions” even though Kong/PostgREST will still accept the JWT+apikey combination.【F:apps/platform-api/src/store/organization-members.ts†L22-L58】

## Environment-Driven Bootstrap Admin Overrides
- `PLATFORM_ADMIN_EMAIL` and `PLATFORM_ADMIN_PASSWORD` override `DEFAULT_ADMIN_EMAIL` and the admin password used for the GoTrue account, but `baseProfile.primary_email` continues to come from `STUDIO_DEFAULT_PRIMARY_EMAIL`, leaving email updates out of sync with the seeded profile.【F:apps/platform-api/src/config/defaults.ts†L56-L73】【F:apps/platform-api/src/config/defaults.ts†L196-L209】
- Because `seedDefaults()` only inserts when the profile row is missing, changing the admin email or username in the environment will not update `platform.profiles`, `platform.organization_members`, or related data on restart. Password rotations succeed for GoTrue via the admin API but the platform tables remain stale.【F:apps/platform-api/src/db/seed.ts†L80-L164】【F:apps/platform-api/src/db/seed.ts†L398-L494】

## UI Admin Promotion & Membership Persistence
- Studio’s React mutations call endpoints such as `PATCH /platform/organizations/{slug}/members/{gotrue_id}` and `DELETE /platform/organizations/{slug}/members/{gotrue_id}/roles/{role_id}` to promote, demote, or remove members using the GoTrue UUID as the path parameter.【F:apps/studio/data/organization-members/organization-member-role-assign-mutation.ts†L18-L68】【F:packages/api-types/types/platform.d.ts†L1305-L1332】
- The Platform API currently exposes only read-oriented organization routes; there are no handlers for the role-assignment endpoints defined in the OpenAPI schema, so UI promotion flows rely on unimplemented APIs and cannot persist changes.【F:apps/platform-api/src/routes/organizations.ts†L14-L108】【F:packages/api-types/types/platform.d.ts†L1305-L1332】
- Membership role logic in the UI expects `role_ids` to correspond to actual organization role records and relies on accurate `gotrue_id` values to map actions to users, so stale bootstrap data breaks these flows even when the admin uses Studio successfully.【F:apps/platform-api/src/store/organization-members.ts†L22-L58】【F:apps/studio/data/organization-members/organization-roles-query.ts†L1-L39】

## Issues and Over-Engineering
1. **Bootstrap profile/goTrue mismatch** – `baseProfile.gotrue_id` is randomly generated at build time, and the profile row is never updated after GoTrue creates the actual admin user, leaving `profiles.gotrue_id` and `organization_members.profile_id` pointing at the wrong identity.【F:apps/platform-api/src/config/defaults.ts†L196-L209】【F:apps/platform-api/src/db/seed.ts†L80-L164】【F:apps/platform-api/src/db/seed.ts†L398-L494】
2. **Session-agnostic data access** – `getProfile()` and organization queries always return the seeded profile regardless of the bearer token, so multiple users cannot be distinguished and authorization collapses to “whichever row has id 1”.【F:apps/platform-api/src/store/profile.ts†L8-L11】【F:apps/platform-api/src/store/organizations.ts†L25-L105】
3. **Lack of API-side auth enforcement** – The Fastify instance registers routes without a pre-handler that validates JWTs or scopes, so the control plane depends entirely on client cooperation; any caller can hit `/api/platform/*` anonymously today.【F:apps/platform-api/src/main.ts†L29-L42】【F:apps/platform-api/src/routes/organizations.ts†L14-L108】
4. **Environment overrides not idempotent** – Changing `PLATFORM_ADMIN_EMAIL`, `STUDIO_DEFAULT_PRIMARY_EMAIL`, or usernames after the first boot leaves `platform.profiles` stale because the seed script only performs inserts; even password rotations do not adjust the stored email or `gotrue_id`.【F:apps/platform-api/src/config/defaults.ts†L56-L73】【F:apps/platform-api/src/db/seed.ts†L80-L164】
5. **Missing membership mutation endpoints** – Studio ships mutations for managing members by GoTrue UUID, but the Platform API lacks the corresponding handlers, so promotion/demotion flows are effectively dead code.【F:apps/studio/data/organization-members/organization-member-role-assign-mutation.ts†L18-L68】【F:apps/platform-api/src/routes/organizations.ts†L14-L108】
6. **Fallback members hide data drift** – `listOrganizationMembers()` fabricates a default member when no rows are returned, masking the fact that the control-plane tables are empty or inconsistent after resets.【F:apps/platform-api/src/store/organization-members.ts†L37-L59】
7. **Schema lacks RLS** – The platform schema is created without RLS policies; once API-side authentication is fixed the database should still enforce access by `gotrue_id` to guard against misconfigured services.【F:apps/platform-api/migrations/0001_initial.sql†L61-L199】

## Proposed Comprehensive Fix
### 1. Enforce authenticated requests
- Add a Fastify `preHandler` (or plugin) that verifies the bearer token using the Supabase JWT secret or GoTrue’s `/verify` endpoint, caching the decoded claims (`sub`, `email`, `app_metadata`). Store those claims on `request` for downstream handlers.【F:apps/platform-api/src/main.ts†L29-L42】【F:apps/studio/lib/api/apiAuthenticate.ts†L16-L50】
- Deny unauthenticated requests with 401s, and add structured logging for mismatched scopes. *Pros*: closes the anonymous access gap and aligns with Kong expectations. *Risks*: token verification adds latency; must guard against clock skew and missing secrets.

### 2. Reconcile bootstrap admin deterministically
- During seeding, after `ensureAdminAuthUser()` succeeds, fetch the GoTrue user record and upsert `platform.profiles` with that `id`, email, and username (updating existing rows when values diverge).【F:apps/platform-api/src/db/seed.ts†L80-L164】【F:apps/platform-api/src/db/seed.ts†L398-L494】
- Source `baseProfile.primary_email` from `DEFAULT_ADMIN_EMAIL` so environment changes stay consistent, and move away from `randomUUID()` defaults for the bootstrap `gotrue_id`.【F:apps/platform-api/src/config/defaults.ts†L56-L73】【F:apps/platform-api/src/config/defaults.ts†L196-L209】
- Ensure the organization owner membership references the reconciled profile id; if the profile changed, update `organization_members.profile_id` accordingly. *Pros*: admin identity stays in sync across GoTrue and the platform DB. *Risks*: requires careful migration to avoid breaking foreign keys.

### 3. Make profile resolution session-aware
- Replace the global `getProfile()` with a function that accepts the decoded claims, looks up `platform.profiles` by `gotrue_id`, and auto-creates a profile row (with membership) when a new GoTrue user signs in. Remove the `CURRENT_PROFILE_ID` constant and fallbacks to `baseProfile` in query code.【F:apps/platform-api/src/store/profile.ts†L8-L11】【F:apps/platform-api/src/store/organizations.ts†L25-L105】
- Update downstream store functions to accept the resolved `profile_id` (or inject it via request context) instead of pulling from globals. *Pros*: supports multiple users and future non-admin roles. *Risks*: significant refactor touching many store modules.

### 4. Implement membership management endpoints
- Backfill the `PATCH /members/{gotrue_id}`, `DELETE /members/{gotrue_id}`, and related role routes so Studio’s mutations can persist promotions. Resolve `gotrue_id` to `profile_id` via the session-aware helper and enforce ownership permissions before changing roles.【F:packages/api-types/types/platform.d.ts†L1305-L1332】【F:apps/studio/data/organization-members/organization-member-role-assign-mutation.ts†L18-L68】
- Audit the `role_ids` column to ensure it stores role table ids (not base ids) or adjust the UI to consume `base_role_id` consistently.

### 5. Remove silent fallbacks and add safeguards
- Drop the fabricated member fallback so empty datasets surface immediately, and return explicit 403s when a profile lacks membership instead of generic “missing permissions”.【F:apps/platform-api/src/store/organization-members.ts†L37-L59】
- Once session-aware logic exists, consider enabling RLS policies in Postgres keyed on `auth.jwt()` claims as a defense-in-depth layer.【F:apps/platform-api/migrations/0001_initial.sql†L61-L199】

### Pros / Cons / Risks Summary
- **Pros:** Aligns bootstrap admin across services, enforces authentication, unlocks existing UI management flows, and sets groundwork for multi-user control-plane support.
- **Cons:** Requires invasive refactors (request context plumbing, new migrations) and coordination with deployment environments to supply JWT secrets/service keys.
- **Risks:** Data migrations must avoid orphaning memberships; token verification errors could lock out operators if secrets are misconfigured.

## Migration Plan
1. **Back up control-plane data.** Snapshot `platform.profiles` and `platform.organization_members` before changes.
2. **Introspect GoTrue users.** Run a one-time script (or SQL via `auth.users`) that maps each `profiles.primary_email` to a GoTrue `id`, updating `profiles.gotrue_id` where it differs. Flag ambiguous matches for manual review.【F:apps/platform-api/migrations/0001_initial.sql†L61-L113】
3. **Normalize owner membership.** Ensure the bootstrap organization’s `organization_members.profile_id` points at the reconciled profile row; adjust or merge duplicate profile records as needed.【F:apps/platform-api/src/db/seed.ts†L145-L164】
4. **Deploy session-aware API changes.** Ship the authentication middleware and refactored store helpers, then run automated tests against seeded data.
5. **Enable (optional) RLS.** Once API-side auth is stable, add RLS policies that enforce `auth.jwt().sub = profiles.gotrue_id` so Postgres rejects mismatched tokens even if the API misbehaves.【F:apps/platform-api/migrations/0001_initial.sql†L61-L199】
6. **Verify idempotence.** Restart the stack with altered `.env` values (email/password) to confirm seeds now update existing rows instead of creating divergent records.【F:apps/platform-api/src/db/seed.ts†L80-L164】

## Testing Strategy
- **Unit tests:** Cover the new authentication middleware (valid, expired, and malformed tokens) and profile reconciliation helpers.
- **Integration tests:** Seed the database, simulate admin login with a real GoTrue JWT, and assert that `/api/platform/profile`, `/organizations`, and `/projects` respond with the authenticated user’s data instead of the fallback profile.【F:apps/platform-api/src/store/profile.ts†L8-L11】【F:apps/platform-api/src/store/organizations.ts†L25-L105】
- **Regression tests:** Exercise the Studio mutations for assigning/removing roles to confirm the new endpoints persist changes and reflect in follow-up member queries.【F:apps/studio/data/organization-members/organization-member-role-assign-mutation.ts†L18-L68】
- **Idempotence tests:** Re-run `seedDefaults()` after modifying admin env vars to confirm it updates existing rows and preserves memberships without duplicating data.【F:apps/platform-api/src/db/seed.ts†L80-L164】
- **Security tests:** Attempt anonymous calls to `/api/platform/*` to verify the middleware returns 401s, and run database queries with inc