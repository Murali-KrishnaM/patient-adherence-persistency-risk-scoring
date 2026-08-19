"""
Run this ONCE after prepare_batches.py, and after your Postgres server
and empty database already exist.

1. Creates the schemas (clinical / pii / ops / auth).
2. Loads the simulated patient pool into clinical.dim_patient_clinical and
   pii.dim_patient_pii -- identities exist, but NO prescription events
   and NO risk scores yet. Those only appear as you click
   "Simulate Next Day" in the running app as an admin.
3. Resets ops.sim_state to batch 0.
4. Seeds 'admin' and 'rep' users for RBAC.

Usage:
    python scripts/init_db.py
"""
from dotenv import load_dotenv

load_dotenv()  # Automatically loads variables from .env
import sys
from pathlib import Path

import pandas as pd

sys.path.append(str(Path(__file__).resolve().parent.parent))
from db import get_connection  # noqa: E402

from werkzeug.security import generate_password_hash

HERE = Path(__file__).resolve().parent.parent
ARTIFACTS = HERE / "model_artifacts"
SCHEMA_SQL = HERE / "sql" / "schema.sql"
AUTH_SCHEMA_SQL = HERE / "sql" / "auth_schema.sql"

CHRONIC_COLS = [
    "SP_ALZHDMTA", "SP_CHF", "SP_CHRNKIDN", "SP_CNCR", "SP_COPD",
    "SP_DEPRESSN", "SP_DIABETES", "SP_ISCHMCHT", "SP_OSTEOPRS",
    "SP_RA_OA", "SP_STRKETIA",
]


def run_schema(conn):
    sql = SCHEMA_SQL.read_text()
    with conn.cursor() as cur:
        cur.execute(sql)
    conn.commit()
    print("Schema created (clinical / pii / ops).")

def run_auth_schema(conn):
    sql = AUTH_SCHEMA_SQL.read_text()
    with conn.cursor() as cur:
        cur.execute(sql)
        # Seed roles
        cur.execute("INSERT INTO auth.roles (name) VALUES ('admin'), ('care_coordinator') ON CONFLICT DO NOTHING;")
        
        # Seed users
        admin_hash = generate_password_hash("password")
        rep_hash = generate_password_hash("password")
        
        cur.execute("SELECT id FROM auth.roles WHERE name = 'admin'")
        admin_role_id = cur.fetchone()[0]
        cur.execute("SELECT id FROM auth.roles WHERE name = 'care_coordinator'")
        rep_role_id = cur.fetchone()[0]
        
        cur.execute(
            "INSERT INTO auth.users (username, password_hash, role_id) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
            ("admin", admin_hash, admin_role_id)
        )
        cur.execute(
            "INSERT INTO auth.users (username, password_hash, role_id) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
            ("rep", rep_hash, rep_role_id)
        )
    conn.commit()
    print("Auth schema created and seeded with 'admin' and 'rep'.")


def load_clinical(conn):
    df = pd.read_csv(ARTIFACTS / "patients_clinical.csv")
    rows = []
    for _, r in df.iterrows():
        rows.append((
            r["patient_id"], int(r["AGE"]), int(r["BENE_SEX_IDENT_CD"]), int(r["BENE_RACE_CD"]),
            *[bool(r[c]) for c in CHRONIC_COLS],
        ))
    cols = "patient_id, age, sex_code, race_code, " + ", ".join(c.lower() for c in CHRONIC_COLS)
    placeholders = ", ".join(["%s"] * (4 + len(CHRONIC_COLS)))
    sql = f"""
        INSERT INTO clinical.dim_patient_clinical ({cols})
        VALUES ({placeholders})
        ON CONFLICT (patient_id) DO NOTHING
    """
    with conn.cursor() as cur:
        cur.executemany(sql, rows)
    conn.commit()
    print(f"Loaded {len(rows)} patients into clinical.dim_patient_clinical.")


def load_pii(conn):
    df = pd.read_csv(ARTIFACTS / "patients_pii.csv")
    rows = list(df[["patient_id", "full_name", "phone_number", "email", "preferred_contact"]].itertuples(index=False, name=None))
    sql = """
        INSERT INTO pii.dim_patient_pii (patient_id, full_name, phone_number, email, preferred_contact)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (patient_id) DO NOTHING
    """
    with conn.cursor() as cur:
        cur.executemany(sql, rows)
    conn.commit()
    print(f"Loaded {len(rows)} patients into pii.dim_patient_pii.")


def reset_sim_state(conn):
    with conn.cursor() as cur:
        cur.execute("UPDATE ops.sim_state SET current_batch_number = 0, updated_at = now() WHERE id = 1")
    conn.commit()
    print("Simulation state reset to batch 0.")


def main():
    conn = get_connection()
    try:
        run_schema(conn)
        run_auth_schema(conn)
        load_clinical(conn)
        load_pii(conn)
        reset_sim_state(conn)
        print("\nDone. Patient identities exist, but nobody has prescription history or a risk score yet.")
        print("Start the Flask app and click 'Simulate Next Day' to begin.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
