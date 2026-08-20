# MedCare Patient Adherence Risk Platform

This repository contains the complete, production-ready stack for the MedCare Patient Adherence Risk Platform. It features a machine-learning powered backend pipeline, a secure PostgreSQL data warehouse, a Flask API, and a modern, responsive Vite/React frontend dashboard with Role-Based Access Control (RBAC).

The system is designed to incrementally score patients for non-adherence/persistency risk as new prescription data arrives, enabling care teams to proactively reach out to high-risk patients.

## 🛠️ Full Technology Stack

### Frontend (UI & Visual Analytics)
* **React.js:** Core component-based framework for a dynamic Single Page Application (SPA).
* **Vite:** Next-generation frontend build tool for ultra-fast hot reloading.
* **Tailwind CSS:** Utility-first framework used to build our custom "Glassmorphism" UI and Dark Mode.
* **Recharts:** Composable charting library powering the interactive Risk Tier and Condition visual analytics.
* **Lucide-React:** Crisp, modern SVG iconography.

### Backend (API & Security)
* **Python 3:** Core backend programming language.
* **Flask:** Lightweight REST API framework routing all frontend requests.
* **PyJWT:** Handles JSON Web Tokens for our secure Role-Based Access Control (Admin vs Rep).
* **Werkzeug:** Powers cryptographic password hashing for user authentication.

### Machine Learning & Data Pipeline
* **XGBoost:** High-performance gradient boosting algorithm (achieving 0.81 Recall).
* **SHAP (SHapley Additive exPlanations):** Model interpretability library providing patient-specific risk explanations.
* **Scikit-Learn:** Used for data standard scaling and model evaluation metrics.
* **Pandas:** Powers the ETL engine, processing and transforming raw CMS batch data.

### Database & Storage
* **PostgreSQL:** Relational Data Warehouse utilizing strict schema segregation.
* **Psycopg2:** High-performance database adapter bridging our Flask API and Postgres.
* **Data Source:** CMS 2008-2010 Data Entrepreneurs’ Synthetic Public Use File (DE1.0).

## 🏗️ Architecture Overview

1. **Frontend**: A dynamic, premium dashboard featuring dark/light modes, data visualizations, and an organized queue for care coordinators.
2. **Backend API**: Serves the frontend, manages JWT authentication, and securely queries the data warehouse.
3. **Data Warehouse (PostgreSQL)**: Strictly segregated schemas for security:
   - `clinical`: Medical history, prescription data, and ML risk scores.
   - `pii`: Patient Personally Identifiable Information (names, contacts). Isolated from the ML models.
   - `ops`: Operational state (batch tracking, application metrics).
   - `auth`: Role-Based Access Control (RBAC) tables, user credentials, and roles.
4. **Machine Learning Pipeline**: Incrementally scores patients using an XGBoost model and SHAP values for explainability.

## 🔒 Security & RBAC

The platform implements strict Role-Based Access Control at the API level:

- **Admin (`admin`)**: Full access. Can view the queue, patient details, edit sensitive PII, and crucially, has the authority to trigger the simulation of new data batches.
- **Care Coordinator (`rep`)**: Restricted access. Can view the queue and process patient outreach (mark contacted/closed), but cannot ingest new data or edit patient PII.

API endpoints are secured using JSON Web Tokens (JWT).

## 🚀 Local Development Setup

The system is designed to run locally. Ensure you have PostgreSQL, Python 3.9+, and Node.js installed.

### 1. Database & Environment Setup

```bash
# 1. Create an empty Postgres database
createdb adherence_warehouse

# 2. Install Python dependencies
pip install -r requirements.txt
```

Create a `.env` file in the root directory to securely configure your database connection:
```ini
PG_DATABASE=adherence_warehouse
PG_USER=postgres
PG_PASSWORD=1234
PG_HOST=localhost
PG_PORT=5432
```

### 2. Data Preparation
```bash
# 1. Prepare data batches
python scripts/prepare_batches.py \
    --beneficiary-csv /path/to/DE1_0_2008_Beneficiary_Summary_File_Sample_1.csv \
    --pde-csv /path/to/DE1_0_2008_to_2010_Prescription_Drug_Events_Sample_1.csv \
    --pool-size 480 \
    --batch-size 16

# 2. Initialize the database schema and seed demo users
# This creates the clinical, pii, ops, and auth schemas, and seeds the 'admin' and 'rep' accounts.
python scripts/init_db.py
```

### 3. Running the Application (Windows PowerShell)

We have provided a convenient launch script. Open PowerShell and run:
```powershell
.\start-dev.ps1
```
This script will automatically start the Flask backend in a new window and the Vite frontend in the current window.
The application will be available at `http://localhost:3000`.

## 🎬 Demo Script (Suggested Flow)

1. **Login as Admin**: Open the dashboard and log in with `admin` / `password`.
2. **Initial State**: The queue is empty, and stats show 0 patients scored (as intended).
3. **Simulate Data**: Click **Simulate Next Day**. A batch of ~16 new patients will be ingested, scored by the ML model, and will appear in the queue, sorted High → Low risk.
4. **Explainability & History**: Open a High Risk patient to view SHAP-derived "why" factors alongside their contact card. View the "History" tab to see audit logs of all actions taken on this patient.
5. **PII Editing (Admin Only)**: As an Admin, use the "Edit Patient Details" button to update their contact info. This writes securely to the `pii` schema.
6. **Role Switch**: Log out, and log back in as the Care Coordinator (`rep` / `password`). 
7. **Outreach Workflow**: Notice the "Simulate Next Day" button is gone, and you cannot edit PII. Click **Mark Contacted** on a patient. They immediately drop off the queue.
8. **Incrementality**: Log back in as `admin` and click **Simulate Next Day** again. A fresh batch appears. Previously contacted patients do not resurface.

## 🔌 API Reference

| Method | Path | Auth Required | Role | Purpose |
|---|---|---|---|---|
| POST | `/api/login` | No | - | Authenticate and receive JWT |
| GET | `/api/me` | Yes | Any | Get current user profile |
| GET | `/api/stats` | Yes | Any | Tier × status counts, current batch number |
| GET | `/api/queue?tier=High` | Yes | Any | Ranked outreach queue (no PII) |
| GET | `/api/patient/<id>` | Yes | Any | Full detail incl. PII + SHAP top factors |
| POST | `/api/patient/<id>/contact`| Yes | Any | Mark contacted, removes from queue |
| POST | `/api/patient/<id>/close` | Yes | Any | Mark case closed (resolved elsewhere) |
| POST | `/api/patient/<id>/snooze`| Yes | Any | Snooze patient, auto-resets next batch |
| PUT  | `/api/patient/<id>/pii`   | Yes | **Admin** | Edit patient contact info securely |
| POST | `/api/simulate-next-batch`| Yes | Any | Ingest next batch, score, update queue |

## 📐 Design Notes for Q&A

- **PII Isolation:** `pii.dim_patient_pii` is a separate schema. The ML scoring path (`etl.py` → `model_utils.py`) only ever queries `clinical.*` and `ops.*` — never `pii.*`. Only `GET /api/patient/<id>` joins across schemas, strictly at the moment a representative views the contact card.
- **Risk Tiers:** The trained model outputs `predict_proba` (continuous 0–1). Tiers are threshold bands over that probability, while ranking within a tier utilizes the raw probability. The most urgent patient is always first.
- **Simulation Strategy:** Instead of true real-time streaming, the demo utilizes pre-built batches of unseen patients. This simulates a real-world nightly or weekly batch ingestion process (common in healthcare like CMS claims processing) while keeping the demo perfectly paced.
