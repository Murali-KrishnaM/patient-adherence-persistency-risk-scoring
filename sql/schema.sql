-- =====================================================================
-- Patient Adherence & Persistency Risk Scoring — Data Warehouse Schema
-- =====================================================================
-- Design notes (for documentation):
--
-- 1. CLINICAL vs PII vs AUTH SEPARATION
--    dim_patient_clinical holds only what the ML model is allowed to see
--    (demographics codes, chronic conditions). dim_patient_pii holds
--    name/phone/email and lives in a separate schema. The model-scoring
--    code path (etl.py -> score_patients) NEVER queries the pii schema.
--    Only the Flask API's single-patient detail endpoint joins across
--    schemas, and only when an authenticated representative is viewing it.
--    The auth schema (in auth_schema.sql) manages RBAC and user identities.
--
-- 2. STAR-SCHEMA SHAPE
--    fact_prescription_events is the fact table (one row per fill).
--    dim_patient_clinical is the patient dimension.
--    risk_scores is a derived/computed table, refreshed incrementally
--    as new fact rows arrive (see etl.py: score_patients()).
--
-- 3. INCREMENTAL LOADING
--    sim_batches records each "Simulate Next Day" ingestion event.
--    Every fact row is tagged with the batch that introduced it, so
--    the system can track exactly what changed after each simulated batch.
-- =====================================================================

CREATE SCHEMA IF NOT EXISTS clinical;   -- model-safe data only
CREATE SCHEMA IF NOT EXISTS pii;        -- rep-facing contact info only
CREATE SCHEMA IF NOT EXISTS ops;        -- workflow / queue state

-- ---------------------------------------------------------------------
-- CLINICAL SCHEMA — safe for the ML model to read
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS clinical.dim_patient_clinical (
    patient_id          TEXT PRIMARY KEY,      -- DESYNPUF_ID
    age                 INTEGER NOT NULL,
    sex_code            SMALLINT NOT NULL,      -- BENE_SEX_IDENT_CD (1/2)
    race_code           SMALLINT NOT NULL,      -- BENE_RACE_CD
    sp_alzhdmta         BOOLEAN NOT NULL DEFAULT FALSE,
    sp_chf              BOOLEAN NOT NULL DEFAULT FALSE,
    sp_chrnkidn         BOOLEAN NOT NULL DEFAULT FALSE,
    sp_cncr             BOOLEAN NOT NULL DEFAULT FALSE,
    sp_copd             BOOLEAN NOT NULL DEFAULT FALSE,
    sp_depressn         BOOLEAN NOT NULL DEFAULT FALSE,
    sp_diabetes         BOOLEAN NOT NULL DEFAULT FALSE,
    sp_ischmcht         BOOLEAN NOT NULL DEFAULT FALSE,
    sp_osteoprs         BOOLEAN NOT NULL DEFAULT FALSE,
    sp_ra_oa            BOOLEAN NOT NULL DEFAULT FALSE,
    sp_strketia         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per simulated "batch" (a Simulate Next Day click)
CREATE TABLE IF NOT EXISTS ops.sim_batches (
    batch_id            SERIAL PRIMARY KEY,
    batch_number         INTEGER NOT NULL UNIQUE,
    patient_count        INTEGER NOT NULL,
    event_count           INTEGER NOT NULL,
    loaded_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fact table: one row per prescription fill event
CREATE TABLE IF NOT EXISTS clinical.fact_prescription_events (
    event_id             BIGSERIAL PRIMARY KEY,
    patient_id           TEXT NOT NULL REFERENCES clinical.dim_patient_clinical(patient_id),
    ndc_code              TEXT NOT NULL,
    service_date          DATE NOT NULL,
    days_supply            INTEGER NOT NULL,
    qty_dispensed          NUMERIC(10,2),
    patient_pay_amt        NUMERIC(10,2),
    total_rx_cost           NUMERIC(10,2),
    batch_id               INTEGER NOT NULL REFERENCES ops.sim_batches(batch_id),
    loaded_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fact_patient ON clinical.fact_prescription_events(patient_id);
CREATE INDEX IF NOT EXISTS idx_fact_batch ON clinical.fact_prescription_events(batch_id);

-- Derived/computed table: latest risk score per patient.
-- Upserted by etl.py after each batch. This is what the model produces --
-- note it references patient_id only, never touches pii schema.
CREATE TABLE IF NOT EXISTS clinical.risk_scores (
    patient_id            TEXT PRIMARY KEY REFERENCES clinical.dim_patient_clinical(patient_id),
    risk_probability        NUMERIC(6,5) NOT NULL,   -- model predict_proba, 0-1
    risk_tier               TEXT NOT NULL,             -- 'High' | 'Medium' | 'Low'
    model_version            TEXT NOT NULL DEFAULT 'xgboost_v1',
    top_factor_1              TEXT,                     -- SHAP-derived, human readable
    top_factor_2              TEXT,
    top_factor_3              TEXT,
    computed_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    batch_id                  INTEGER NOT NULL REFERENCES ops.sim_batches(batch_id)
);

CREATE INDEX IF NOT EXISTS idx_risk_tier_prob
    ON clinical.risk_scores(risk_tier, risk_probability DESC);

-- ---------------------------------------------------------------------
-- PII SCHEMA — rep-facing only. Model code must never SELECT from this.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pii.dim_patient_pii (
    patient_id           TEXT PRIMARY KEY REFERENCES clinical.dim_patient_clinical(patient_id),
    full_name             TEXT NOT NULL,
    phone_number           TEXT NOT NULL,
    email                   TEXT NOT NULL,
    alt_phone               TEXT,
    alt_email               TEXT,
    preferred_contact       TEXT NOT NULL DEFAULT 'phone',  -- 'phone' | 'email'
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- OPS SCHEMA — workflow / outreach queue state
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ops.patient_status (
    patient_id            TEXT PRIMARY KEY REFERENCES clinical.dim_patient_clinical(patient_id),
    status                  TEXT NOT NULL DEFAULT 'needs_contact',
        -- 'needs_contact' | 'contacted' | 'case_closed' | 'snoozed'
    assigned_rep             TEXT,
    notes                     TEXT,
    snoozed_until_batch       INTEGER,
    last_action_at             TIMESTAMPTZ,
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_status ON ops.patient_status(status);

CREATE TABLE IF NOT EXISTS ops.patient_status_history (
    id                      SERIAL PRIMARY KEY,
    patient_id              TEXT NOT NULL REFERENCES ops.patient_status(patient_id),
    batch_id                INTEGER,
    old_status              TEXT,
    new_status              TEXT NOT NULL,
    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Single-row table tracking simulation progress (which batch we're on)
CREATE TABLE IF NOT EXISTS ops.sim_state (
    id                    SMALLINT PRIMARY KEY DEFAULT 1,
    current_batch_number    INTEGER NOT NULL DEFAULT 0,
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO ops.sim_state (id, current_batch_number)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;
