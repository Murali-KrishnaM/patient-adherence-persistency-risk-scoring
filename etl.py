"""
ETL logic used both by the one-off init scripts and by the live Flask
endpoint that powers the "Simulate Next Day" button.

Flow for load_batch(n):
    1. Read batches/batch_000n.csv (prescription events, real data,
       just revealed to the warehouse incrementally for the demo).
    2. Insert those rows into clinical.fact_prescription_events.
    3. Recompute cumulative behavioral features for ONLY the patients
       in this batch (not the whole warehouse -- this is what makes it
       genuinely incremental rather than a full nightly rebuild).
    4. Score those patients with the model.
    5. Upsert clinical.risk_scores and ops.patient_status.
"""
from pathlib import Path

import pandas as pd

from db import get_connection
from model_utils import get_model

HERE = Path(__file__).resolve().parent
BATCHES_DIR = HERE / "model_artifacts" / "batches"

CHRONIC_SELECT = """
    CASE WHEN p.sp_alzhdmta THEN 1 ELSE 0 END AS "SP_ALZHDMTA",
    CASE WHEN p.sp_chf THEN 1 ELSE 0 END AS "SP_CHF",
    CASE WHEN p.sp_chrnkidn THEN 1 ELSE 0 END AS "SP_CHRNKIDN",
    CASE WHEN p.sp_cncr THEN 1 ELSE 0 END AS "SP_CNCR",
    CASE WHEN p.sp_copd THEN 1 ELSE 0 END AS "SP_COPD",
    CASE WHEN p.sp_depressn THEN 1 ELSE 0 END AS "SP_DEPRESSN",
    CASE WHEN p.sp_diabetes THEN 1 ELSE 0 END AS "SP_DIABETES",
    CASE WHEN p.sp_ischmcht THEN 1 ELSE 0 END AS "SP_ISCHMCHT",
    CASE WHEN p.sp_osteoprs THEN 1 ELSE 0 END AS "SP_OSTEOPRS",
    CASE WHEN p.sp_ra_oa THEN 1 ELSE 0 END AS "SP_RA_OA",
    CASE WHEN p.sp_strketia THEN 1 ELSE 0 END AS "SP_STRKETIA"
"""

FEATURES_SQL = f"""
    SELECT
        p.patient_id,
        p.age AS "AGE",
        p.sex_code AS "BENE_SEX_IDENT_CD",
        p.race_code AS "BENE_RACE_CD",
        {CHRONIC_SELECT},
        COALESCE(f.total_fills, 0) AS total_fills_early,
        COALESCE(f.avg_days_supply, 0) AS avg_days_supply_early,
        COALESCE(f.avg_cost_burden, 0) AS avg_cost_burden_early,
        COALESCE(f.total_cost_burden, 0) AS total_cost_burden_early,
        COALESCE(f.num_distinct_ndc, 0) AS num_distinct_ndc_early
    FROM clinical.dim_patient_clinical p
    LEFT JOIN (
        SELECT
            patient_id,
            COUNT(*) AS total_fills,
            AVG(days_supply) AS avg_days_supply,
            AVG(patient_pay_amt) AS avg_cost_burden,
            SUM(patient_pay_amt) AS total_cost_burden,
            COUNT(DISTINCT ndc_code) AS num_distinct_ndc
        FROM clinical.fact_prescription_events
        WHERE patient_id = ANY(%(ids)s)
        GROUP BY patient_id
    ) f ON f.patient_id = p.patient_id
    WHERE p.patient_id = ANY(%(ids)s)
"""


def get_current_batch_number(conn) -> int:
    with conn.cursor() as cur:
        cur.execute("SELECT current_batch_number FROM ops.sim_state WHERE id = 1")
        return cur.fetchone()[0]


def batch_file_for(batch_number: int) -> Path:
    return BATCHES_DIR / f"batch_{batch_number:04d}.csv"


def has_more_batches(batch_number: int) -> bool:
    return batch_file_for(batch_number + 1).exists()


def load_batch(batch_number: int) -> dict:
    """
    Loads batch N's prescription events, scores the affected patients,
    and returns a summary dict for the API response.
    """
    csv_path = batch_file_for(batch_number)
    if not csv_path.exists():
        raise FileNotFoundError(f"No batch file at {csv_path}")

    events = pd.read_csv(csv_path)
    patient_ids = events["patient_id"].unique().tolist()

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Register this batch
            cur.execute(
                """
                INSERT INTO ops.sim_batches (batch_number, patient_count, event_count)
                VALUES (%s, %s, %s)
                ON CONFLICT (batch_number) DO NOTHING
                RETURNING batch_id
                """,
                (batch_number, len(patient_ids), len(events)),
            )
            row = cur.fetchone()
            if row is None:
                cur.execute("SELECT batch_id FROM ops.sim_batches WHERE batch_number = %s", (batch_number,))
                row = cur.fetchone()
            batch_id = row[0]

            # Insert fact rows
            insert_rows = [
                (
                    r.patient_id, r.ndc_code, r.service_date, int(r.days_supply),
                    r.qty_dispensed, r.patient_pay_amt, r.total_rx_cost, batch_id,
                )
                for r in events.itertuples(index=False)
            ]
            cur.executemany(
                """
                INSERT INTO clinical.fact_prescription_events
                    (patient_id, ndc_code, service_date, days_supply,
                     qty_dispensed, patient_pay_amt, total_rx_cost, batch_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                insert_rows,
            )
        conn.commit()

        # ---- Feature computation + scoring, only for this batch's patients ----
        with conn.cursor() as cur:
            cur.execute(FEATURES_SQL, {"ids": patient_ids})
            colnames = [d[0] for d in cur.description]
            feat_rows = cur.fetchall()
        feat_df = pd.DataFrame(feat_rows, columns=colnames)

        model = get_model()
        probs = model.predict_proba(feat_df.drop(columns=["patient_id"]))
        explanations = model.explain(feat_df.drop(columns=["patient_id"]))

        tier_counts = {"High": 0, "Medium": 0, "Low": 0}
        with conn.cursor() as cur:
            for i, patient_id in enumerate(feat_df["patient_id"]):
                p = float(probs[i])
                tier = model.tier_from_probability(p)
                tier_counts[tier] += 1
                f1, f2, f3 = explanations[i]

                cur.execute(
                    """
                    INSERT INTO clinical.risk_scores
                        (patient_id, risk_probability, risk_tier, top_factor_1, top_factor_2, top_factor_3, batch_id)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (patient_id) DO UPDATE SET
                        risk_probability = EXCLUDED.risk_probability,
                        risk_tier = EXCLUDED.risk_tier,
                        top_factor_1 = EXCLUDED.top_factor_1,
                        top_factor_2 = EXCLUDED.top_factor_2,
                        top_factor_3 = EXCLUDED.top_factor_3,
                        computed_at = now(),
                        batch_id = EXCLUDED.batch_id
                    """,
                    (patient_id, p, tier, f1, f2, f3, batch_id),
                )

                cur.execute(
                    """
                    INSERT INTO ops.patient_status (patient_id, status, updated_at)
                    VALUES (%s, 'needs_contact', now())
                    ON CONFLICT (patient_id) DO NOTHING
                    """,
                    (patient_id,),
                )
        conn.commit()

        with conn.cursor() as cur:
            cur.execute(
                "UPDATE ops.sim_state SET current_batch_number = %s, updated_at = now() WHERE id = 1",
                (batch_number,),
            )
        conn.commit()

        return {
            "batch_number": batch_number,
            "patients_scored": len(patient_ids),
            "events_loaded": len(events),
            "tier_counts": tier_counts,
            "has_more_batches": has_more_batches(batch_number),
        }
    finally:
        conn.close()
