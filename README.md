# 🏥 MedCare Patient Adherence Risk Platform

> **A production-ready, ML-powered patient adherence & persistency risk scoring dashboard built for pharma care teams.**

This repository contains the complete full-stack implementation of the MedCare Patient Adherence Risk Platform — featuring an incremental machine-learning pipeline, a secure multi-schema PostgreSQL data warehouse, a Flask REST API with JWT-based RBAC, and a modern Vite/React dashboard.

The system incrementally scores patients for non-adherence/persistency risk as new prescription data arrives (simulated as "batches"), enabling care teams to proactively reach out to high-risk patients through a structured outreach workflow.

---

## 🛠️ Full Technology Stack

### Frontend (UI & Visual Analytics)
| Technology | Purpose |
|---|---|
| **React.js** | Core component-based SPA framework |
| **Vite** | Ultra-fast build tool with hot module replacement |
| **Tailwind CSS** | Utility-first CSS — powers Glassmorphism UI & Dark/Light Mode |
| **Recharts** | Composable charting for Risk Tier & Condition analytics |
| **Lucide-React** | Modern SVG icon library |

### Backend (API & Security)
| Technology | Purpose |
|---|---|
| **Python 3** | Core backend language |
| **Flask** | Lightweight REST API framework |
| **Flask-CORS** | Cross-origin resource sharing for frontend↔backend |
| **PyJWT** | JSON Web Token generation & validation for RBAC |
| **Werkzeug** | Cryptographic password hashing (pbkdf2:sha256) |

### Machine Learning & Data Pipeline
| Technology | Purpose |
|---|---|
| **XGBoost** | Gradient boosting classifier (0.81 Recall on hold-out set) |
| **SHAP** | SHapley Additive exPlanations for per-patient risk interpretability |
| **Scikit-Learn** | Standard scaling, evaluation metrics |
| **Pandas** | ETL engine — processes and transforms raw CMS batch CSV data |

### Database & Storage
| Technology | Purpose |
|---|---|
| **PostgreSQL** | Multi-schema relational data warehouse |
| **Psycopg2** | High-performance Python↔Postgres adapter |
| **CMS DE1.0 Dataset** | 2008–2010 CMS Synthetic Public Use File (real-world structure) |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React/Vite)                   │
│   Dashboard · Patient Queue · Risk Charts · Detail Modal        │
└────────────────────────┬────────────────────────────────────────┘
                         │ REST API (JSON/JWT)
┌────────────────────────▼────────────────────────────────────────┐
│                      BACKEND (Flask API)                        │
│   Auth · RBAC · Patient Actions · Batch Simulation Trigger      │
└───────┬────────────────────────────────────────┬────────────────┘
        │                                        │
┌───────▼──────────┐                   ┌─────────▼──────────────┐
│  PostgreSQL DB   │                   │  ML Pipeline (ETL)     │
│  ┌─────────────┐ │                   │  etl.py + model_utils  │
│  │  clinical   │ │◄──────────────────│  XGBoost + SHAP        │
│  │  pii        │ │                   └────────────────────────┘
│  │  ops        │ │
│  │  auth       │ │
│  └─────────────┘ │
└──────────────────┘
```

### Schema Segregation (Security by Design)
| Schema | Contents | Accessed By |
|---|---|---|
| `clinical` | Patient medical history, prescriptions, ML risk scores | ML pipeline, API (anon) |
| `pii` | Names, phone, email, contact preference | API only (on detail view) |
| `ops` | Batch tracking, patient action status, snooze state, audit history | API, ETL |
| `auth` | Users, roles, password hashes | Auth endpoints only |

---

## 🔒 Security & Role-Based Access Control (RBAC)

JWT-secured endpoints with strict role enforcement:

| Role | Permissions |
|---|---|
| **Admin** | Full access: view queue, patient details, edit PII, trigger batch simulation, view batch history |
| **Care Rep (`rep`)** | Restricted: view queue, mark contacted/closed, add notes, snooze patients — **cannot** simulate batches or edit PII |

---

## ✨ Key Features

### 🤖 ML Risk Scoring (Incremental)
- XGBoost model trained on CMS claims data
- Patients scored in real-time as each simulated batch loads
- SHAP-derived top-3 risk factors shown per patient for explainability

### 📋 Patient Outreach Queue
- Sorted by Risk Tier (High → Medium → Low) then by raw probability
- Filterable by tier and text search
- Actions: **Mark Contacted**, **Close Case**, **Snooze**, **Reactivate**

### 💤 Simulation-Aware Snooze
- When clicking **Snooze**, a prompt asks: *"Remind later after how many simulated days?"*
- The system stores the **target batch number** (`current_batch + X`) in the database
- When "Simulate Next Day" advances past that batch number, the patient **automatically reappears** in the queue
- Snoozed patient modal shows: `"Snoozed until batch #N"`

### 📝 Persistent Patient Notes
- Reps and Admins can add freeform notes to any patient
- Notes are **permanently saved** to the database tied to `patient_id`
- Full history of all actions (status changes + notes) shown in patient modal as a timeline audit trail

### 🧪 Batch Simulation ("Simulate Next Day")
- Admin-only control that loads the next pre-built CSV batch
- Each click = 1 simulated day of new prescription claims
- Triggers the full ETL pipeline: ingest → feature compute → ML score → upsert → unsnooze check

### 📊 Analytics Visualizations
- Real-time Risk Tier distribution chart
- Chronic condition breakdown chart
- Stats bar (High / Medium / Low counts, current simulation day)

### 🌗 Dark / Light Mode
- Full theme toggle with smooth transitions
- Premium glassmorphism design

---

## 🚀 Local Development Setup

### Prerequisites
- PostgreSQL 14+
- Python 3.9+
- Node.js 18+

### 1. Database & Environment Setup

```bash
# Create the database
createdb adherence_warehouse

# Install Python dependencies
pip install -r requirements.txt
```

Create a `.env` file in the project root:
```ini
PG_DATABASE=adherence_warehouse
PG_USER=postgres
PG_PASSWORD=YOUR_PASSWORD
PG_HOST=localhost
PG_PORT=5432
JWT_SECRET=your-secret-key-here
```

### 2. Data Preparation & Schema Initialization

```bash
# Prepare batch CSVs from raw CMS data
python scripts/prepare_batches.py \
    --beneficiary-csv /path/to/DE1_0_2008_Beneficiary_Summary_File_Sample_1.csv \
    --pde-csv /path/to/DE1_0_2008_to_2010_Prescription_Drug_Events_Sample_1.csv \
    --pool-size 480 \
    --batch-size 16

# Initialize schema, seed demo users, load first batch
python scripts/init_db.py
```

### 3. Run the Application (Windows PowerShell)

```powershell
.\start-dev.ps1
```

This starts:
- **Flask backend** → `http://localhost:5000`
- **Vite frontend** → `http://localhost:3000` (or next available port)

> **Note:** If port 3000 is busy, Vite auto-selects the next free port (3001, 3002, etc.). The Flask CORS config already handles this.

---

## 🎬 Demo Script (Suggested Presentation Flow)

1. **Login as Admin** → `admin` / `password`
2. **Simulate Day 1** → Click **Simulate Next Day** → Watch 16 patients appear, sorted by risk
3. **Explore a High Risk Patient** → Open modal → See SHAP risk factors + contact info
4. **Add a Note** → Type a note in "Patient History & Notes" → Click **Save Note** → Confirm it persists in the history timeline
5. **Snooze a Patient** → Click **Snooze** → Enter `3` days → Confirm "Snoozed until batch #N" message
6. **Simulate Day 2 & 3** → Click Simulate twice → Watch the snoozed patient stay hidden
7. **Simulate Day 4** → Click again → Watch the snoozed patient **automatically reappear** ✨
8. **Switch to Rep** → Log out → Login as `rep` / `password`
9. **Show RBAC** → "Simulate Next Day" is gone · PII is read-only · Rep can contact/snooze/add notes
10. **Mark Contacted** → Patient drops off the queue immediately

---

## 🔌 API Reference

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/api/login` | Public | Authenticate, receive JWT |
| GET | `/api/me` | Any | Current user profile |
| GET | `/api/stats` | Any | Tier × status counts, current batch |
| GET | `/api/queue` | Any | Ranked outreach queue (no PII) |
| GET | `/api/patient/<id>` | Any | Full detail: PII + SHAP factors + snooze status |
| GET | `/api/patient/<id>/history` | Any | Full audit trail of actions & notes |
| POST | `/api/patient/<id>/contact` | Any | Mark contacted, removes from queue |
| POST | `/api/patient/<id>/close` | Any | Mark case closed |
| POST | `/api/patient/<id>/snooze` | Any | Snooze with `{"days": N}` — batch-aware |
| POST | `/api/patient/<id>/notes` | Any | Add persistent note |
| POST | `/api/patient/<id>/reset` | Any | Reactivate snoozed/closed patient |
| PUT | `/api/patient/<id>/pii` | **Admin** | Edit patient contact info |
| POST | `/api/simulate-next-batch` | **Admin** | Load next CSV batch, score patients |
| GET | `/api/batches` | **Admin** | Batch history with action breakdown |

---

## 📐 Design Notes

- **PII Isolation:** The ML scoring path (`etl.py` → `model_utils.py`) only queries `clinical.*` and `ops.*` — **never `pii.*`**. PII is joined only at the API layer when a rep explicitly opens a patient's contact card.
- **Risk Tiers:** XGBoost outputs continuous `predict_proba` (0–1). Tiers are threshold bands over that score; ranking within a tier uses raw probability so the most urgent patient is always first.
- **Simulation Strategy:** Pre-built CSV batches simulate nightly/weekly batch ingestion (standard in healthcare claims processing like CMS). Each batch click advances the "simulation day" counter.
- **Snooze Logic:** Snooze duration is stored as a target **batch number** (`snoozed_until_batch`), not a real-world timestamp. This ensures the snooze logic is perfectly synchronized with the simulation clock.
- **Audit Trail:** Every patient action (status change, note added) is written to `ops.patient_status_history` with a timestamp, providing a complete, tamper-evident activity log.
