ALTER TABLE platform.project_runtimes
  ADD COLUMN port_base integer;

UPDATE platform.project_runtimes
SET port_base = 23000 + project_id * 20
WHERE port_base IS NULL;

ALTER TABLE platform.project_runtimes
  ALTER COLUMN port_base SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS project_runtimes_port_base_idx
  ON platform.project_runtimes(port_base);
