ALTER TABLE platform.project_runtimes
  ADD COLUMN port_base INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS project_runtimes_port_base_idx
  ON platform.project_runtimes (port_base)
  WHERE port_base IS NOT NULL;
