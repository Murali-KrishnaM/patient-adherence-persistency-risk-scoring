-- Resets the simulated batch pipeline back to a clean slate, WITHOUT
-- touching the underlying patient master data (dim_patient_clinical,
-- dim_patient_pii) — those aren't batch-scoped and stay as-is.
--
-- After running this, current_batch_number = 0, so the very next call
-- to POST /api/simulate-next-batch loads batch_0001.csv as "batch 1".
--
-- Run with: psql -d adherence_warehouse -f reset_simulation.sql
-- (adjust -d to match your PG_DATABASE env var)

BEGIN;

TRUNCATE TABLE clinical.fact_prescription_events;
TRUNCATE TABLE clinical.risk_scores;
TRUNCATE TABLE ops.patient_status;
TRUNCATE TABLE ops.sim_batches RESTART IDENTITY CASCADE;

UPDATE ops.sim_state SET current_batch_number = 0, updated_at = now() WHERE id = 1;

COMMIT;