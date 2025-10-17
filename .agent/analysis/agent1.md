## Platform Control Plane Auth Investigation

## Current Flow

### Studio session & claims
The Studio front end configures a GoTrue client against NEXT_PUBLIC_GOTRUE_URL, persists the session in local storage, and keeps the in-memory session current so it can fetch access tokens on demand.

Every time data fetchers run, they request the latest access token and attach it as a Bearer header, ensuring Studio requests always carry the authenticated user’s JWT.

### Request dispatch from the browser
When NEXT_PUBLIC_IS_PLATFORM is true the client points API_URL at the platform gateway URL (e.g., http://host.docker.internal:8000/api/platform). The Next.js middleware blocks almost all server-side API routes in hosted mode, so browser traffic goes directly to the configured API URL instead of hitting local Next.js handlers.

Requests use the generated OpenAPI client, which rewrites API_URL to the gateway base before appending REST paths such as /platform/profile/permissions. Each request carries the access token and a generated request ID; pg-meta calls also add connection hints.

### Gateway (Kong)
The Kong declarative overlay adds a platform-api service that proxies /api/platform/* (and /api/v1/*) directly to the Fastify service on port 4210. Only a CORS plugin is enabled—no key-auth, JWT, or ACL plugins guard the route—so Kong forwards every request it receives.

### Platform API entry point
The Fastify server seeds defaults, enables CORS, registers /api/v1 and /api/platform, and exposes everything without any authentication middleware beyond request logging. All handlers execute even if the Authorization header is missing or invalid.

seedDefaults inserts a single platform.profiles row built from baseProfile, grants it owner membership, provisions default organizations/projects, reapplies schema grants, and calls GoTrue’s admin API to upsert the bootstrap user. The profile’s gotrue_id is generated with randomUUID() the first time seed runs and never reconciled with the GoTrue account that is created or updated immediately afterwards.

Runtime profile lookups simply return the first row in platform.profiles, falling back to the static baseProfile object if no row exists.

Organization queries join platform.organizations to platform.organization_members using that static profile ID. Membership is optional; if a row is missing, code synthesizes a membership structure on the fly. There is no comparison to the JWT’s subject because the API never inspects the token.

Permissions are derived by listing every organization in the database and fabricating wildcard rules with no project scoping or per-user filtering. If the organizations table is empty, the same wildcard permissions are returned using the default seed values.

Organization membership reads join organization_members to profiles, but when no rows exist they return a single synthesized member populated from the static baseProfile. There are currently no routes that mutate membership or roles via the API.

### Downstream services
Direct database access is performed through a pooled connection that targets the configured PLATFORM_DB_URL; all reads and writes run with full privileges because the platform schema defines no RLS policies and the server connects as a privileged role.

For project-level SQL and metadata, Fastify fetches connection strings and service keys from platform.projects (falling back to default env-derived keys) and forwards requests to pg-meta, again authenticating with the service key. These operations occur regardless of caller identity because the platform API never binds the request to a specific project membership.

GoTrue administration is only touched during seeding, where ensureAdminAuthUser creates or updates the bootstrap account using the current PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD. There is no follow-up that writes the resulting GoTrue UUID back into the platform schema.

### Studio permission enforcement
The Studio React app calls /platform/profile/permissions to populate permission state. It blocks many views (e.g., the table editor) when useAsyncCheckPermissions reports no matching rule for the project/resource combination.

## Issues
* Bootstrap admin never matches GoTrue user
baseProfile assigns a new random gotrue_id on every seed run, but the subsequent GoTrue admin call never propagates the created user’s real UUID back into platform.profiles or platform.organization_members. As a result, the database believes the owner has a stale UUID that no authenticated session will ever present.

* Environment overrides are not idempotent
Changing PLATFORM_ADMIN_EMAIL or other defaults updates the GoTrue account (409 path updates the password) but leaves the platform profile and membership untouched, so the control-plane continues to reference the old email/UUID even when the admin account is rotated via environment variables.

* No request-time authentication or subject binding
Fastify registers all routes without any pre-handler that validates the Authorization header or derives the caller’s GoTrue subject. All membership and permissions logic relies on the singleton seed profile instead of the JWT claim, so the API neither enforces nor even identifies per-user access.

* Permissions API returns global wildcards
listPermissions fabricates wildcard permissions for every organization (or the seed defaults) regardless of membership. Because project-level checks expect explicit project_refs, Studio often interprets the response as “no access,” leading to spurious “You need additional permissions” banners even for the bootstrap admin.

* Gateway offers no additional guardrails
The Kong overlay exposes the platform routes with only a CORS plugin, so any client that can reach Kong may call the platform API. Without a Fastify auth layer this effectively makes every control-plane operation public in local stacks.

* Studio membership management targets non-existent routes
Studio mutations issue PATCH and DELETE requests to /platform/organizations/{slug}/members/{gotrue_id} and related endpoints, but the Fastify router only exposes read-only membership listings. Promotion and demotion flows therefore have no effect.

* Synthetic fallback hides data drift
When organization_members is empty, the API fabricates a default member using the static baseProfile, masking missing membership rows instead of surfacing the inconsistency. This makes it harder to notice that the bootstrap admin’s membership is out of sync.

* Service keys and connections are reused without per-user checks
Project credentials fall back to default service keys and are reused for pg-meta proxying without validating that the caller belongs to the project, so any authenticated (or even unauthenticated, given issue #3) request can extract secrets and run SQL via pg-meta.

## Proposed Changes
* Introduce explicit auth middleware
Add a Fastify pre-handler that verifies the incoming JWT with the GoTrue JWK/service key, extracts the sub, and caches the decoded claims for handlers. Reject requests that lack a valid token or apikey to restore parity with the rest of the Supabase stack.

* Reconcile bootstrap admin deterministically
Replace the random baseProfile.gotrue_id with a stable seed (e.g., fetch the GoTrue user by email during bootstrap). If the GoTrue account already exists, update platform.profiles, organization_members, and any other references to the new UUID/email so the control-plane stays aligned with GoTrue.

* Make env overrides idempotent
Extend the bootstrap routine to detect when PLATFORM_ADMIN_EMAIL or PLATFORM_ADMIN_PASSWORD change. On startup, look up the GoTrue user by email, update the platform profile row (including primary_email, gotrue_id, and username), and ensure the owner membership references the correct profile ID.

* Return real permissions scoped to membership
Redesign listPermissions to join platform.profiles on gotrue_id = JWT sub, then gather organization_members and projects to emit explicit org- and project-level rules. Remove the wildcard fallback so missing data surfaces immediately.

* Wire up membership management endpoints
Implement POST/PATCH/DELETE routes that let Studio assign roles by GoTrue UUID, ensuring the API looks up or creates profile rows as needed. Drop the synthetic member fallback once real reconciliation exists.

* Harden Kong or platform API ingress
Either enable key-auth/JWT validation at Kong or enforce the same checks inside Fastify so control-plane routes cannot be invoked anonymously in local deployments.

* Clamp pg-meta access to authorized projects
Require the auth middleware to attach the caller’s allowed project refs to the request context and verify them inside the pg-meta proxy before forwarding credentials. Deny access when the caller lacks membership instead of falling back to defaults.

## Migration Plan
Add a schema migration (or scripted job) that:

* Looks up the GoTrue user for PLATFORM_ADMIN_EMAIL, captures its UUID, and updates platform.profiles.gotrue_id, primary_email, and username if they differ.
* Rewrites platform.organization_members.profile_id to the correct profile where necessary.
* Backfill a platform.bootstrap_state table (or similar) to record the last reconciled admin email/UUID so future startups can detect changes without scanning.

Deploy the authentication middleware and updated permissions resolver, ensuring legacy clients still receive valid data.

Remove the synthetic membership fallback and rerun bootstrap to surface any remaining drift.

## Testing Strategy
* Bootstrap validation
Start the stack with a clean database and custom PLATFORM_ADMIN_EMAIL, confirm the GoTrue account is created, platform.profiles.gotrue_id matches the GoTrue UUID, and the owner membership references the correct profile.

* Rotation scenarios
Change PLATFORM_ADMIN_EMAIL/PLATFORM_ADMIN_PASSWORD, restart, and verify both GoTrue and platform tables reflect the new credentials without duplicating profiles.

* Permission coverage
Log in as the bootstrap admin and confirm Studio no longer shows the missing-permission banner; create a secondary GoTrue user, assign membership through the new routes, and verify scoped permissions appear and restrict access appropriately.

* Ingress hardening
Attempt to call /api/platform without a token and ensure the request is rejected at Kong or Fastify; confirm valid tokens succeed.

* pg-meta guarding
Verify that unauthorized users receive a 403 from /api/platform/pg-meta/* while authorized members can still run SQL and inspect metadata.