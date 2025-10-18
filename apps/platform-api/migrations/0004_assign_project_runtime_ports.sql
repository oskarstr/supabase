ALTER TABLE platform.project_runtimes
  ADD COLUMN port_slot integer,
  ADD CONSTRAINT project_runtimes_port_slot_unique UNIQUE (port_slot);

WITH ordered AS (
  SELECT project_id,
         row_number() OVER (ORDER BY project_id) - 1 AS slot
  FROM platform.project_runtimes
)
UPDATE platform.project_runtimes AS pr
SET port_slot = ordered.slot
FROM ordered
WHERE pr.project_id = ordered.project_id;

ALTER TABLE platform.project_runtimes
  ALTER COLUMN port_slot SET NOT NULL;
