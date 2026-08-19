# MedCare Patient Adherence Risk Platform

This repository contains the complete, production-ready stack for the MedCare Patient Adherence Risk Platform. It features a machine-learning powered backend pipeline, a secure PostgreSQL data warehouse, a Flask API, and a modern, responsive Vite/React frontend dashboard with Role-Based Access Control (RBAC).

The system is designed to incrementally score patients for non-adherence/persistency risk as new prescription data arrives, enabling care teams to proactively reach out to high-risk patients.

## Architecture Overview

1. **Frontend (Vite + React)**: A dynamic, premium dashboard featuring dark/light modes, data visualizations, and an organized queue for care coordinators.
2. **Backend API (Flask)**: Serves the frontend, manages JWT authentication, and securely queries the data warehouse.
3. **Data Warehouse (PostgreSQL)**: Strictly segregated schemas for security:
   - `clinical`: Medical history, prescription data, and ML risk scores.
   - `pii`: Patient Personally Identifiable Information (names, contacts). Isolated from the ML models.
   - `ops`: Operational state (batch tracking, application metrics).
   - `auth`: Role-Based Access Control (RBAC) tables, user credentials, and roles.
4. **Machine Learning Pipeline**: Incrementally scores patients using an XGBoost model and SHAP values for explainability.

## Security & RBAC

The platform implements strict Role-Based Access Control:

- **Admin (`admin`)**: Full access. Can view the queue, patient details, and crucially, has the authority to trigger the simulation of new data batches.
- **Care Coordinator (`rep`)**: Restricted access. Can view the queue and process patient outreach (mark contacted/closed), but cannot ingest new data.

API endpoints are secured using JSON Web Tokens (JWT).

## Local Development Setup

The system is designed to run locally. Ensure you have PostgreSQL, Python 3.9+, and Node.js installed.

### 1. Database & Backend Setup

```bash
# 1. Create an empty Postgres database
createdb adherence_warehouse

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Export your trained model (If not already present)
# Paste `scripts/export_model_FROM_NOTEBOOK.py` into your Jupyter Notebook after XGBoost training, run it, and place the artifacts in `backend/model_artifacts/`.

# 4. Prepare data batches (If not already present)
python scripts/prepare_batches.py \
    --beneficiary-csv /path/to/DE1_0_2008_Beneficiary_Summary_File_Sample_1.csv \
    --pde-csv /path/to/DE1_0_2008_to_2010_Prescription_Drug_Events_Sample_1.csv \
    --pool-size 480 \
    --batch-size 16

# 5. Initialize the database schema and seed demo users
# This creates the clinical, pii, ops, and auth schemas, and seeds the 'admin' and 'rep' accounts.
export PG_DATABASE=adherence_warehouse PG_USER=postgres PG_PASSWORD=postgres
python scripts/init_db.py
```

### 2. Running the Application

You need two terminal windows to run the full stack.

**Terminal 1: Start the Backend API**
```bash
export PG_DATABASE=adherence_warehouse PG_USER=postgres PG_PASSWORD=postgres
flask --app app run --debug --port 5000
```

**Terminal 2: Start the Frontend App**
```bash
cd frontend
npm install
npm run dev
```

The application will be available at `http://localhost:3000`.

## Demo Script (Suggested Flow)

1. **Login as Admin**: Open the dashboard and log in with `admin` / `password`.
2. **Initial State**: The queue is empty, and stats show 0 patients scored (as intended).
3. **Simulate Data**: Click **Simulate Next Day**. A batch of ~16 new patients will be ingested, scored by the ML model, and will appear in the queue, sorted High → Low risk.
4. **Explainability**: Open a High Risk patient to view SHAP-derived "why" factors (e.g., "high number of distinct pharmacies") alongside their contact card.
5. **Role Switch**: Log out, and log back in as the Care Coordinator (`rep` / `password`). 
6. **Outreach Workflow**: Notice the "Simulate Next Day" button is gone. Click **Mark Contacted** on a patient. They immediately disappear from the queue.
7. **Incrementality**: Log back in as `admin` and click **Simulate Next Day** again. A fresh batch appears. Previously contacted patients do not resurface.

## API Reference

| Method | Path | Auth Required | Role | Purpose |
|---|---|---|---|---|
| POST | `/api/login` | No | - | Authenticate and receive JWT |
| GET | `/api/me` | Yes | Any | Get current user profile |
| GET | `/api/stats` | Yes | Any | Tier × status counts, current batch number |
| GET | `/api/queue?tier=High` | Yes | Any | Ranked outreach queue (no PII) |
| GET | `/api/patient/<id>` | Yes | Any | Full detail incl. PII + SHAP top factors |
| POST | `/api/patient/<id>/contact`| Yes | Any | Mark contacted, removes from queue |
| POST | `/api/patient/<id>/close` | Yes | Any | Mark case closed (resolved elsewhere) |
| POST | `/api/simulate-next-batch`| Yes | **Admin** | Ingest next batch, score, update queue |

## Design Notes for Q&A

- **PII Isolation:** `pii.dim_patient_pii` is a separate schema. The ML scoring path (`etl.py` → `model_utils.py`) only ever queries `clinical.*` and `ops.*` — never `pii.*`. Only `GET /api/patient/<id>` joins across schemas, strictly at the moment a representative views the contact card.
- **Risk Tiers:** The trained model outputs `predict_proba` (continuous 0–1). Tiers are threshold bands over that probability, while ranking within a tier utilizes the raw probability. The most urgent patient is always first.
- **Simulation Strategy:** Instead of true real-time streaming, the demo utilizes pre-built batches of unseen patients. This simulates a real-world nightly or weekly batch ingestion process (common in healthcare like CMS claims processing) while keeping the demo perfectly paced.
