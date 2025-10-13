# Project Context

- Goal: extend self-hosted Supabase so multiple projects can be managed via Studio.
- Approach: add a new Fastify-based "platform API" service to satisfy `/platform/**` routes.
- Service responsibilities:
  - Serve API contract defined in `packages/api-types/types/platform.d.ts` (list organizations/projects, create/delete projects, project status, etc.).
  - Maintain metadata (projects, service URLs, keys, status).
  - Provision per-project Supabase stacks (Postgres, PostgREST, GoTrue, Realtime, Storage, Edge Functions, Supavisor) by invoking Supabase CLI or docker-compose templates.
  - Provide lifecycle commands (stop/delete) and health/status updates (COMING_UP, ACTIVE_HEALTHY, etc.).
- Project layout plan:
  - Add new workspace app `apps/platform-api` (Fastify + TypeScript).
  - Update `pnpm-workspace.yaml` to include the app.
  - Add Docker build artifacts for the API (Dockerfile, compose overlay) so `docker compose` brings up Studio + platform API + existing stack.
  - Configure Studio via env (`NEXT_PUBLIC_IS_PLATFORM=true`, `NEXT_PUBLIC_API_URL=http://platform-api:PORT/platform`).
- Development environment tasks:
  - Install pnpm dependencies.
  - Ensure Supabase CLI + Docker available for provisioning.
  - Create plan.md with phased implementation steps (API scaffolding, metadata store, provisioning integration, lifecycle endpoints, feature coverage).
- Notes:
  - Keep custom changes isolated (new folder, compose overlay) to ease syncing with upstream.
  - Use generated API types for route typings.
  - Use SQLite or lightweight Postgres for metadata; future iteration can integrate with orchestrator.

