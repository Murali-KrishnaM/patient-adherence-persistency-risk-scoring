"""
Flask API for the Patient Adherence & Persistency Risk Scoring demo.

Run locally:
    flask --app app run --debug --port 5000

Endpoints (all JSON):
    GET  /api/stats
    GET  /api/queue?tier=High&limit=50
    GET  /api/patient/<patient_id>
    POST /api/patient/<patient_id>/contact
    POST /api/patient/<patient_id>/close        body: {"reason": "..."}  (optional)
    POST /api/patient/<patient_id>/snooze
    POST /api/simulate-next-batch
"""
from dotenv import load_dotenv
load_dotenv()  # Added to ensure credentials are read if run directly

from flask import Flask, jsonify, request
from flask_cors import CORS

from db import query, query_one
import etl

app = Flask(__name__)


# for staging/prod as needed). Avoid a bare CORS(app) since this API
# returns PII on /api/patient/<id>.
# Allow both Vite (5173) and standard React/Next.js (3000) origins
CORS(
    app,
    resources={r"/api/*": {"origins": [
        "http://localhost:5173", 
        "http://localhost:3000"
    ]}},
    supports_credentials=True,
)

TIER_RANK_SQL = "CASE risk_tier WHEN 'High' THEN 0 WHEN 'Medium' THEN 1 ELSE 2 END"


@app.route("/api/stats")
def stats():
    counts = query(
        """
        SELECT rs.risk_tier, ps.status, COUNT(*) AS n
        FROM clinical.risk_scores rs
        JOIN ops.patient_status ps ON ps.patient_id = rs.patient_id
        GROUP BY rs.risk_tier, ps.status
        """
    )
    sim = query_one("SELECT current_batch_number FROM ops.sim_state WHERE id = 1")
    total_batches = query_one(
        "SELECT COUNT(*) AS n FROM ops.sim_batches"
    )
    return jsonify({
        "breakdown": counts,
        "current_batch": sim["current_batch_number"] if sim else 0,
        "batches_loaded": total_batches["n"] if total_batches else 0,
    })


@app.route("/api/queue")
def queue():
    tier = request.args.get("tier")  # optional filter: High / Medium / Low
    limit = int(request.args.get("limit", 50))

    where = "ps.status = 'needs_contact'"
    params = []
    if tier:
        where += " AND rs.risk_tier = %s"
        params.append(tier)

    sql = f"""
        SELECT
            p.patient_id, p.age, p.sex_code, p.race_code,
            rs.risk_probability, rs.risk_tier,
            rs.top_factor_1, rs.top_factor_2, rs.top_factor_3,
            rs.computed_at
        FROM clinical.risk_scores rs
        JOIN clinical.dim_patient_clinical p ON p.patient_id = rs.patient_id
        JOIN ops.patient_status ps ON ps.patient_id = rs.patient_id
        WHERE {where}
        ORDER BY {TIER_RANK_SQL} ASC, rs.risk_probability DESC
        LIMIT %s
    """
    params.append(limit)
    rows = query(sql, params)
    return jsonify(rows)


@app.route("/api/patient/<patient_id>")
def patient_detail(patient_id):
    """
    Full detail view -- this is the ONLY endpoint that joins clinical and
    pii schemas, and only for a single patient a rep is about to contact.
    """
    row = query_one(
        """
        SELECT
            p.patient_id, p.age, p.sex_code, p.race_code,
            p.sp_alzhdmta, p.sp_chf, p.sp_chrnkidn, p.sp_cncr, p.sp_copd,
            p.sp_depressn, p.sp_diabetes, p.sp_ischmcht, p.sp_osteoprs,
            p.sp_ra_oa, p.sp_strketia,
            rs.risk_probability, rs.risk_tier,
            rs.top_factor_1, rs.top_factor_2, rs.top_factor_3, rs.computed_at,
            pii.full_name, pii.phone_number, pii.email, pii.preferred_contact,
            ps.status, ps.notes, ps.last_action_at
        FROM clinical.dim_patient_clinical p
        LEFT JOIN clinical.risk_scores rs ON rs.patient_id = p.patient_id
        LEFT JOIN pii.dim_patient_pii pii ON pii.patient_id = p.patient_id
        LEFT JOIN ops.patient_status ps ON ps.patient_id = p.patient_id
        WHERE p.patient_id = %s
        """,
        (patient_id,),
    )
    if row is None:
        return jsonify({"error": "patient not found"}), 404
    return jsonify(row)


def _update_status(patient_id, status, notes=None):
    row = query_one(
        "SELECT patient_id FROM ops.patient_status WHERE patient_id = %s", (patient_id,)
    )
    if row is None:
        return jsonify({"error": "patient not found or not yet scored"}), 404

    query(
        """
        UPDATE ops.patient_status
        SET status = %s, notes = COALESCE(%s, notes), last_action_at = now(), updated_at = now()
        WHERE patient_id = %s
        """,
        (status, notes, patient_id),
        fetch=False,
    )
    return jsonify({"patient_id": patient_id, "status": status})


@app.route("/api/patient/<patient_id>/contact", methods=["POST"])
def mark_contacted(patient_id):
    notes = (request.get_json(silent=True) or {}).get("notes")
    return _update_status(patient_id, "contacted", notes)


@app.route("/api/patient/<patient_id>/close", methods=["POST"])
def mark_closed(patient_id):
    reason = (request.get_json(silent=True) or {}).get("reason")
    return _update_status(patient_id, "case_closed", reason)


@app.route("/api/patient/<patient_id>/snooze", methods=["POST"])
def mark_snoozed(patient_id):
    return _update_status(patient_id, "snoozed")


@app.route("/api/simulate-next-batch", methods=["POST"])
def simulate_next_batch():
    from db import get_connection
    conn = get_connection()
    try:
        current = etl.get_current_batch_number(conn)
    finally:
        conn.close()

    next_batch = current + 1
    try:
        summary = etl.load_batch(next_batch)
    except FileNotFoundError:
        return jsonify({"error": "no more batches available", "current_batch": current}), 409

    return jsonify(summary)


if __name__ == "__main__":
    app.run(debug=True, port=5000)