-- platform control-plane bootstrap schema
CREATE SCHEMA IF NOT EXISTS platform;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE platform.cloud_provider AS ENUM (
  'AWS',
  'FLY',
  'AWS_K8S',
  'AWS_NIMBUS'
);

CREATE TYPE platform.project_status AS ENUM (
  'INACTIVE',
  'ACTIVE_HEALTHY',
  'ACTIVE_UNHEALTHY',
  'COMING_UP',
  'UNKNOWN',
  'GOING_DOWN',
  'INIT_FAILED',
  'REMOVED',
  'RESTORING',
  'UPGRADING',
  'PAUSING',
  'RESTORE_FAILED',
  'RESTARTING',
  'PAUSE_FAILED',
  'RESIZING'
);

CREATE TYPE platform.compute_size AS ENUM (
  'pico',
  'nano',
  'micro',
  'small',
  'medium',
  'large',
  'xlarge',
  '2xlarge',
  '4xlarge',
  '8xlarge',
  '12xlarge',
  '16xlarge',
  '24xlarge',
  '24xlarge_optimized_memory',
  '24xlarge_optimized_cpu',
  '24xlarge_high_memory',
  '48xlarge',
  '48xlarge_optimized_memory',
  '48xlarge_optimized_cpu',
  '48xlarge_high_memory'
);

CREATE TYPE platform.billing_partner AS ENUM (
  'fly',
  'aws_marketplace',
  'vercel_marketplace'
);

CREATE TABLE IF NOT EXISTS platform.profiles (
  id              BIGSERIAL PRIMARY KEY,
  gotrue_id       UUID        NOT NULL DEFAULT gen_random_uuid(),
  auth0_id        TEXT,
  username        TEXT        NOT NULL,
  first_name      TEXT        NOT NULL,
  last_name       TEXT        NOT NULL,
  primary_email   TEXT        NOT NULL,
  mobile          TEXT        DEFAULT '',
  free_project_limit INTEGER  NOT NULL DEFAULT 0,
  is_alpha_user   BOOLEAN     NOT NULL DEFAULT FALSE,
  is_sso_user     BOOLEAN     NOT NULL DEFAULT FALSE,
  disabled_features TEXT[]    NOT NULL DEFAULT '{}',
  inserted_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_gotrue_id_idx ON platform.profiles (gotrue_id);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_idx ON platform.profiles (username);

CREATE TYPE platform.organization_plan AS ENUM ('free', 'pro', 'team', 'enterprise');

CREATE TABLE IF NOT EXISTS platform.organizations (
  id                      BIGSERIAL PRIMARY KEY,
  slug                    TEXT                     NOT NULL UNIQUE,
  name                    TEXT                     NOT NULL,
  billing_email           TEXT,
  billing_partner         platform.billing_partner,
  organization_requires_mfa BOOLEAN                NOT NULL DEFAULT FALSE,
  usage_billing_enabled   BOOLEAN                  NOT NULL DEFAULT FALSE,
  stripe_customer_id      TEXT,
  subscription_id         TEXT,
  plan_id                 platform.organization_plan NOT NULL DEFAULT 'free',
  plan_name               TEXT                     NOT NULL,
  opt_in_tags             TEXT[]                   NOT NULL DEFAULT '{}',
  restriction_status      TEXT,
  restriction_data        JSONB,
  inserted_at             TIMESTAMPTZ              NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ              NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.organization_members (
  id             BIGSERIAL PRIMARY KEY,
  organization_id BIGINT NOT NULL REFERENCES platform.organizations (id) ON DELETE CASCADE,
  profile_id     BIGINT NOT NULL REFERENCES platform.profiles (id) ON DELETE CASCADE,
  role_ids       INTEGER[]          NOT NULL DEFAULT '{}',
  metadata       JSONB              NOT NULL DEFAULT '{}',
  mfa_enabled    BOOLEAN            NOT NULL DEFAULT FALSE,
  is_owner       BOOLEAN            NOT NULL DEFAULT FALSE,
  inserted_at    TIMESTAMPTZ        NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ        NOT NULL DEFAULT now(),
  UNIQUE (organization_id, profile_id)
);

CREATE TABLE IF NOT EXISTS platform.organization_roles (
  id              BIGSERIAL PRIMARY KEY,
  organization_id BIGINT   NOT NULL REFERENCES platform.organizations (id) ON DELETE CASCADE,
  base_role_id    INTEGER  NOT NULL,
  name            TEXT     NOT NULL,
  description     TEXT,
  project_ids     INTEGER[] DEFAULT NULL,
  inserted_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS platform.organization_invitations (
  id              BIGSERIAL PRIMARY KEY,
  organization_id BIGINT   NOT NULL REFERENCES platform.organizations (id) ON DELETE CASCADE,
  invited_email   TEXT     NOT NULL,
  role_id         BIGINT   REFERENCES platform.organization_roles (id) ON DELETE SET NULL,
  invited_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.projects (
  id                        BIGSERIAL PRIMARY KEY,
  organization_id           BIGINT                NOT NULL REFERENCES platform.organizations (id) ON DELETE CASCADE,
  ref                       TEXT                  NOT NULL UNIQUE,
  name                      TEXT                  NOT NULL,
  region                    TEXT                  NOT NULL,
  cloud_provider            platform.cloud_provider NOT NULL DEFAULT 'AWS',
  status                    platform.project_status NOT NULL DEFAULT 'COMING_UP',
  infra_compute_size        platform.compute_size   NOT NULL DEFAULT 'micro',
  db_host                   TEXT                  NOT NULL,
  db_version                TEXT,
  connection_string         TEXT,
  rest_url                  TEXT,
  is_branch_enabled         BOOLEAN               NOT NULL DEFAULT FALSE,
  is_physical_backups_enabled BOOLEAN             NOT NULL DEFAULT FALSE,
  subscription_id           TEXT,
  preview_branch_refs       TEXT[]                NOT NULL DEFAULT '{}',
  anon_key                  TEXT                  NOT NULL,
  service_key               TEXT                  NOT NULL,
  inserted_at               TIMESTAMPTZ           NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ           NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS projects_org_idx ON platform.projects (organization_id);
CREATE INDEX IF NOT EXISTS projects_status_idx ON platform.projects (status);

CREATE TABLE IF NOT EXISTS platform.project_runtimes (
  project_id BIGINT PRIMARY KEY REFERENCES platform.projects (id) ON DELETE CASCADE,
  root_dir   TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.access_tokens (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT        NOT NULL,
  token_alias   TEXT        NOT NULL UNIQUE,
  access_token  TEXT        NOT NULL,
  token_digest  TEXT        NOT NULL,
  scope         TEXT        NOT NULL DEFAULT 'V0',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ,
  last_used_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS platform.audit_logs (
  id             BIGSERIAL PRIMARY KEY,
  organization_id BIGINT REFERENCES platform.organizations (id) ON DELETE SET NULL,
  project_id     BIGINT REFERENCES platform.projects (id) ON DELETE SET NULL,
  event_message  TEXT        NOT NULL,
  payload        JSONB,
  ip_address     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON platform.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_org_idx ON platform.audit_logs (organization_id);
CREATE INDEX IF NOT EXISTS audit_logs_project_idx ON platform.audit_logs (project_id);

COMMENT ON SCHEMA platform IS 'Supabase platform control-plane schema.';
