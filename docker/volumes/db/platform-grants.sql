-- platform-grants.sql
-- Ensures platform administrators retain access to the control-plane schema.
-- Runs after upstream Supabase migrations (which revoke postgres privileges).
-- Safe to rerun; grants are idempotent.

DO $$
BEGIN
  -- Postgres superuser retains schema/table/sequence access
  EXECUTE '
    GRANT USAGE ON SCHEMA platform TO postgres;
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA platform TO postgres;
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA platform TO postgres;
    ALTER DEFAULT PRIVILEGES IN SCHEMA platform GRANT ALL ON TABLES TO postgres;
    ALTER DEFAULT PRIVILEGES IN SCHEMA platform GRANT ALL ON SEQUENCES TO postgres;
  ';

  -- Supabase admin role (used by services/migrations) keeps full access
  EXECUTE '
    GRANT USAGE ON SCHEMA platform TO supabase_admin;
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA platform TO supabase_admin;
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA platform TO supabase_admin;
    ALTER DEFAULT PRIVILEGES IN SCHEMA platform GRANT ALL ON TABLES TO supabase_admin;
    ALTER DEFAULT PRIVILEGES IN SCHEMA platform GRANT ALL ON SEQUENCES TO supabase_admin;
  ';
END
$$;
