-- Platform-specific grants executed immediately after the upstream revoke migration.
-- Ensures postgres and supabase_admin retain access to the control-plane schema.
-- Safe to re-run (GRANT statements are idempotent). Skips gracefully if the schema is not present yet.

DO $$
DECLARE
  grantee text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'platform') THEN
    RAISE NOTICE 'platform schema missing; skipping grant restoration';
    RETURN;
  END IF;

  FOREACH grantee IN ARRAY ARRAY['postgres', 'supabase_admin'] LOOP
    EXECUTE format('GRANT USAGE ON SCHEMA platform TO %I', grantee);
    EXECUTE format('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA platform TO %I', grantee);
    EXECUTE format('GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA platform TO %I', grantee);
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA platform GRANT ALL ON TABLES TO %I',
      grantee
    );
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA platform GRANT ALL ON SEQUENCES TO %I',
      grantee
    );
  END LOOP;
END
$$;
