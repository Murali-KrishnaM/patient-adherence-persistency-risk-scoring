"""
Run this ONCE, offline, before running the platform. It does NOT touch Postgres.

It reads your real Beneficiary Summary + PDE CSVs (same files used in the
notebook), replicates the same cleaning steps used in training (chronic
condition 1/2 -> 1/0, AGE, full-year Part D filter, drop deceased), picks
a simulated pool of patients, and splits them into "batch" CSV files that
the platform ingests one at a time via the Simulate Next Day button.

It also generates clearly-fake PII (name/phone/email) for the simulated pool --
these are NOT real people, this is a synthetic public-use dataset with no
real patient identity attached, so PII is fabricated for simulation purposes only.

Output (all under backend/model_artifacts/):
    patients_clinical.csv      -- one row per simulated patient, model-safe fields
    patients_pii.csv           -- one row per simulated patient, contact fields
    batches/batch_0001.csv ... -- prescription events, revealed incrementally
    true_labels.csv            -- (for our own reference only, NOT loaded to DB)
"""
import argparse
import random
import pandas as pd
import numpy as np
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
ARTIFACTS = HERE / "model_artifacts"
BATCHES_DIR = ARTIFACTS / "batches"

CHRONIC_COLS = [
    "SP_ALZHDMTA", "SP_CHF", "SP_CHRNKIDN", "SP_CNCR", "SP_COPD",
    "SP_DEPRESSN", "SP_DIABETES", "SP_ISCHMCHT", "SP_OSTEOPRS",
    "SP_RA_OA", "SP_STRKETIA",
]

FIRST_NAMES = [
    "James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda",
    "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
    "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Nancy", "Daniel", "Margaret",
    "Paul", "Lisa", "Mark", "Betty", "Donald", "Dorothy", "George", "Sandra", "Kenneth",
    "Ashley", "Steven", "Kimberly", "Edward", "Emily", "Brian", "Donna",
]
LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
    "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
    "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker",
]


def fake_name(rng):
    return f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_NAMES)}"


def fake_phone(rng):
    return f"({rng.randint(200,999)}) {rng.randint(200,999)}-{rng.randint(1000,9999)}"


def fake_email(name, rng):
    handle = name.lower().replace(" ", ".") + str(rng.randint(1, 99))
    domain = rng.choice(["mailbox.com", "inboxpro.net", "webmail.org"])
    return f"{handle}@{domain}"


def clean_beneficiary(bene_path):
    bene = pd.read_csv(bene_path)
    bene["BENE_BIRTH_DT"] = pd.to_datetime(bene["BENE_BIRTH_DT"], format="%Y%m%d")
    bene["BENE_DEATH_DT"] = pd.to_datetime(bene["BENE_DEATH_DT"], format="%Y%m%d", errors="coerce")
    bene["AGE"] = 2008 - bene["BENE_BIRTH_DT"].dt.year

    for col in CHRONIC_COLS:
        bene[col] = bene[col].map({1: 1, 2: 0})

    bene = bene[bene["PLAN_CVRG_MOS_NUM"] == 12].copy()
    bene = bene[bene["BENE_DEATH_DT"].isna()].copy()

    keep = ["DESYNPUF_ID", "AGE", "BENE_SEX_IDENT_CD", "BENE_RACE_CD"] + CHRONIC_COLS
    return bene[keep].copy()


def load_pde(pde_path):
    pde = pd.read_csv(pde_path, dtype={"PROD_SRVC_ID": str})
    pde["SRVC_DT"] = pd.to_datetime(pde["SRVC_DT"], format="%Y%m%d", errors="coerce")
    valid = (pde["SRVC_DT"] >= "2008-01-01") & (pde["SRVC_DT"] <= "2010-12-31")
    return pde[valid].copy()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--beneficiary-csv", required=True, help="Path to DE1_0_2008_Beneficiary_Summary_File_Sample_1.csv")
    ap.add_argument("--pde-csv", required=True, help="Path to full PDE csv (5.5M rows)")
    ap.add_argument("--pool-size", type=int, default=480, help="Number of demo patients to select")
    ap.add_argument("--batch-size", type=int, default=16, help="Patients revealed per Simulate Next Day click")
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    rng = random.Random(args.seed)
    np.random.seed(args.seed)

    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    BATCHES_DIR.mkdir(parents=True, exist_ok=True)

    print("Cleaning Beneficiary Summary...")
    bene_clean = clean_beneficiary(args.beneficiary_csv)
    print(f"  eligible patients (full Part D, alive): {len(bene_clean)}")

    print("Loading PDE (this can take a minute on 5.5M rows)...")
    pde = load_pde(args.pde_csv)

    # Only patients with at least 2 fills are interesting for a live demo
    fill_counts = pde.groupby("DESYNPUF_ID").size()
    eligible_with_activity = set(fill_counts[fill_counts >= 2].index)
    bene_clean = bene_clean[bene_clean["DESYNPUF_ID"].isin(eligible_with_activity)].copy()
    print(f"  eligible patients with 2+ fills: {len(bene_clean)}")

    pool_size = min(args.pool_size, len(bene_clean))
    demo_patients = bene_clean.sample(n=pool_size, random_state=args.seed).reset_index(drop=True)
    print(f"Selected demo pool: {len(demo_patients)} patients")

    # ---- Generate PII (fabricated, for demo only) ----
    names, phones, emails, prefs = [], [], [], []
    for _ in range(len(demo_patients)):
        n = fake_name(rng)
        names.append(n)
        phones.append(fake_phone(rng))
        emails.append(fake_email(n, rng))
        prefs.append(rng.choice(["phone", "email"]))

    pii_df = pd.DataFrame({
        "patient_id": demo_patients["DESYNPUF_ID"],
        "full_name": names,
        "phone_number": phones,
        "email": emails,
        "preferred_contact": prefs,
    })
    pii_df.to_csv(ARTIFACTS / "patients_pii.csv", index=False)
    print(f"Wrote {ARTIFACTS / 'patients_pii.csv'}")

    clinical_out = demo_patients.rename(columns={"DESYNPUF_ID": "patient_id"})
    clinical_out.to_csv(ARTIFACTS / "patients_clinical.csv", index=False)
    print(f"Wrote {ARTIFACTS / 'patients_clinical.csv'}")

    # ---- Split patients into batches, shuffled so each click has variety ----
    patient_ids = demo_patients["DESYNPUF_ID"].tolist()
    rng.shuffle(patient_ids)

    batch_num = 1
    for i in range(0, len(patient_ids), args.batch_size):
        batch_ids = patient_ids[i:i + args.batch_size]
        batch_events = pde[pde["DESYNPUF_ID"].isin(batch_ids)].copy()
        batch_events = batch_events.rename(columns={
            "DESYNPUF_ID": "patient_id",
            "PROD_SRVC_ID": "ndc_code",
            "SRVC_DT": "service_date",
            "DAYS_SUPLY_NUM": "days_supply",
            "QTY_DSPNSD_NUM": "qty_dispensed",
            "PTNT_PAY_AMT": "patient_pay_amt",
            "TOT_RX_CST_AMT": "total_rx_cost",
        })
        cols = ["patient_id", "ndc_code", "service_date", "days_supply",
                "qty_dispensed", "patient_pay_amt", "total_rx_cost"]
        batch_events[cols].to_csv(BATCHES_DIR / f"batch_{batch_num:04d}.csv", index=False)
        batch_num += 1

    total_batches = batch_num - 1
    print(f"Wrote {total_batches} batch files to {BATCHES_DIR}")
    print("\nDone. Next: run scripts/init_db.py to create the schema and load patient identities.")


if __name__ == "__main__":
    main()
