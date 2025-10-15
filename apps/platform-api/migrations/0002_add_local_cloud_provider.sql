-- Allow provisioning via the bundled Supabase CLI runtime
ALTER TYPE platform.cloud_provider ADD VALUE IF NOT EXISTS 'LOCAL';
