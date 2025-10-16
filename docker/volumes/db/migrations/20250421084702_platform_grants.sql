-- Platform-specific grants executed immediately after the upstream revoke migration.
-- Ensures postgres and supabase_admin retain access to the control-plane schema.
-- Safe to re-run (GRANT statements are idempotent).

GRANT USAGE ON SCHEMA platform TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA platform TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA platform TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA platform GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA platform GRANT ALL ON SEQUENCES TO postgres;

GRANT USAGE ON SCHEMA platform TO supabase_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA platform TO supabase_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA platform TO supabase_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA platform GRANT ALL ON TABLES TO supabase_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA platform GRANT ALL ON SEQUENCES TO supabase_admin;
