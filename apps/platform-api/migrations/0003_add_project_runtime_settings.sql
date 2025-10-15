ALTER TABLE platform.project_runtimes
  ADD COLUMN excluded_services text[] NOT NULL DEFAULT ARRAY[]::text[];
