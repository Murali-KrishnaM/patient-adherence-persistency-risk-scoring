-- schemas and tables
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema IN ('clinical', 'pii', 'ops')
ORDER BY table_schema, table_name;



-- row counts
SELECT 'patients (clinical)' AS entity, COUNT(*) FROM clinical.dim_patient_clinical
UNION ALL
SELECT 'patients (pii)', COUNT(*) FROM pii.dim_patient_pii
UNION ALL
SELECT 'prescription events', COUNT(*) FROM clinical.fact_prescription_events
UNION ALL
SELECT 'risk scores computed', COUNT(*) FROM clinical.risk_scores
UNION ALL
SELECT 'batches loaded so far', COUNT(*) FROM ops.sim_batches;



--separated PII
-- Model-facing table has NO name/phone/email columns at all
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'clinical' AND table_name = 'dim_patient_clinical';

-- Contact info only exists in a separate schema
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'pii' AND table_name = 'dim_patient_pii';

-- batches are real, incremental, timestamped events
SELECT batch_number, patient_count, event_count, loaded_at
FROM ops.sim_batches
ORDER BY batch_number;

-- patient's real prescription history
SELECT patient_id, ndc_code, service_date, days_supply, patient_pay_amt
FROM clinical.fact_prescription_events
ORDER BY patient_id, service_date
LIMIT 20;

-- risk scores tied back to real computed probabilities
SELECT patient_id, risk_probability, risk_tier, top_factor_1, computed_at
FROM clinical.risk_scores
ORDER BY risk_probability DESC
LIMIT 10;


-- live-demo
SELECT
    p.patient_id,
    p.age,
    rs.risk_tier,
    rs.risk_probability,
    ps.status,
    pii.full_name,
    pii.phone_number
FROM clinical.dim_patient_clinical p
JOIN clinical.risk_scores rs ON rs.patient_id = p.patient_id
JOIN ops.patient_status ps ON ps.patient_id = p.patient_id
JOIN pii.dim_patient_pii pii ON pii.patient_id = p.patient_id
ORDER BY rs.risk_probability DESC
LIMIT 15;


-- incremental
SELECT batch_number, COUNT(*) AS events_in_this_batch
FROM clinical.fact_prescription_events e
JOIN ops.sim_batches b ON b.batch_id = e.batch_id
GROUP BY batch_number
ORDER BY batch_number;