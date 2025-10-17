ALTER TABLE platform.organization_invitations
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE platform.organization_invitations
  ADD COLUMN IF NOT EXISTS token TEXT;

ALTER TABLE platform.organization_invitations
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

ALTER TABLE platform.organization_invitations
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

ALTER TABLE platform.organization_invitations
  ADD COLUMN IF NOT EXISTS invited_by_profile_id BIGINT REFERENCES platform.profiles (id);

UPDATE platform.organization_invitations
SET token = COALESCE(token, gen_random_uuid()::text);

ALTER TABLE platform.organization_invitations
  ALTER COLUMN token SET NOT NULL;

ALTER TABLE platform.organization_invitations
  ADD CONSTRAINT organization_invitations_token_key UNIQUE (token);
