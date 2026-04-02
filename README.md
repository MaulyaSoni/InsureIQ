# InsureIQ — Agentic AI Vehicle Insurance Platform

> **Live Demo**: `[your-railway-url].up.railway.app`
>
> Built as a portfolio project demonstrating production-grade Applied AI and Agentic AI engineering.

**InsureIQ** is a full-stack vehicle insurance risk analytics platform that predicts claim probability, explains risk in plain language, recommends premiums, and generates formal underwriting reports — all through a LangGraph StateGraph multi-agent architecture.

The core design principle is **deliberate separation of concerns**: XGBoost handles statistical prediction, SHAP provides feature-level explainability, and Groq LLMs handle reasoning, narration, and structured output generation. LangGraph orchestrates everything via a Supervisor-Worker pattern with persistent shared state.

---

## Table of Contents

1. [Why This Project](#why-this-project) — What it demonstrates and why it matters
2. [Architecture](#architecture) — The Agentic AI system design
3. [How It Works](#how-it-works) — Step-by-step flow of a request
4. [Tech Stack](#tech-stack) — Every technology used and why
5. [Quick Start](#quick-start) — Running locally in 5 minutes
6. [API Reference](#api-reference) — All endpoints with descriptions
7. [The Agentic AI Layer](#the-agentic-ai-layer) — StateGraph, supervisor routing, tool use
8. [ML Pipeline](#ml-pipeline) — XGBoost training, SHAP explainability
9. [Deployment](#deployment) — Railway (backend) + Vercel (frontend)
10. [Project Structure](#project-structure) — File-by-file guide
11. [Environment Variables](#environment-variables) — All config options

---

## Why This Project

Most LLM-powered projects are simple wrappers: send a prompt, get a response. InsureIQ is different — it's a **systems engineering project** that uses AI as a component, not the entire solution.

The key insight driving InsureIQ's architecture: **an LLM is terrible at calibrated probability estimates, but excellent at reasoning and narration**. So we delegate prediction to XGBoost (statistically rigorous, reproducible) and delegate explanation to Groq's llama-3.3-70b (natural language, nuanced reasoning). The LangGraph StateGraph is the orchestration layer that ties them together.

This project demonstrates skills that matter in industry:
- **Agentic AI**: Building multi-agent systems with LangGraph where agents share persistent state and route autonomously
- **ML Engineering**: Training XGBoost on real insurance data, handling class imbalance, computing SHAP values
- **LLM Engineering**: Domain-specific prompting, structured output parsing, retry with exponential backoff, response caching
- **Full-Stack Development**: FastAPI REST API, React SPA, JWT auth, SQLite persistence
- **Production Deployment**: Railway + Vercel, environment management, background job processing

---

## Architecture

```
                            User Request
                         POST /policies/{id}/run-all
                                    │
                                    ▼
                 ┌────────────────────────────────────────────┐
                 │         SUPERVISOR NODE                    │
                 │   Groq llama-3.1-8b-instant (routing)     │
                 │   Classifies intent → 5 possible routes    │
                 └────────────────┬───────────────────────────┘
                                  │
          ┌───────────┬───────────┼───────────┬───────────────┐
          │           │           │           │               │
          ▼           ▼           ▼           ▼               ▼
     risk_only   risk_and_   premium   explain_only    full_report
                  explain
          │           │           │           │               │
          ▼           ▼           ▼           ▼               ▼
     ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐    ┌────────┐
     │  RISK  │  │  RISK  │  │  RISK  │  │EXPLAIN │    │  RISK  │
     │  NODE  │  │  NODE  │  │  NODE  │  │  NODE  │    │  NODE  │
     │(XGBoost│  │(XGBoost│  │(XGBoost│  │(llama- │    │(XGBoost│
     │ +SHAP) │  │ +SHAP) │  │ +SHAP) │  │3.3-70b)│    │ +SHAP) │
     └────┬───┘  └────┬───┘  └────┬───┘  └────┬────┘    └────┬───┘
          │           │           │           │               │
          ▼           ▼           ▼                           ▼
     [END]      ┌────────┐  ┌──────────┐              ┌──────────┐
                │EXPLAIN │  │ PREMIUM  │              │EXPLAINER │
                │  NODE  │  │  NODE    │              │  NODE    │
                │(llama- │  │(mixtral- │              │(llama-   │
                │3.3-70b)│  │ 8x7b)    │              │3.3-70b)  │
                └────┬───┘  └────┬─────┘              └────┬─────┘
                     │           │                           │
                     │           ▼                           │
                     │      ┌────────┐                       │
                     │      │PREMIUM │                       │
                     │      │ NODE   │                       │
                     │      └────┬────┘                       │
                     │           │                            │
                     ▼           ▼                            ▼
                [END]      ┌──────────┐                  ┌──────────┐
                           │ REPORT   │                  │ PREMIUM  │
                           │  NODE   │                  │  NODE   │
                           │(llama-  │                  └────┬────┘
                           │3.3-70b)│                       │
                           └────┬────┘                       ▼
                                │                      ┌──────────┐
                                ▼                      │ REPORT   │
                           [END]                      │  NODE   │
                                                     └────┬────┘
                                                          ▼
                                                     [END]

         ┌──────────────────────────────────────────────────────────┐
         │          InsureIQState (shared, persistent TypedDict)    │
         │  policy_id · claim_probability · risk_score · risk_band   │
         │  shap_features · risk_explanation · premium_min/max       │
         │  premium_narrative · final_report · report_id             │
         └──────────────────────────────────────────────────────────┘
```

### The 5 Routes

| Route | Trigger | Nodes visited | Use case |
|-------|---------|-------------|----------|
| `risk_only` | "Give me just the risk score" | supervisor → risk → END | Quick triage |
| `risk_and_explain` | "What does my risk profile mean?" | supervisor → risk → explainer → END | Detailed explanation |
| `premium` | "Should I increase my coverage?" | supervisor → risk → explainer → premium → END | Premium advisory |
| `explain_only` | "Explain my existing report" | supervisor → explainer → END | Clarification |
| `full_report` | Default / "Generate full underwriting report" | supervisor → risk → explainer → premium → report → END | Complete analysis |

---

## How It Works

### End-to-End Flow: `/policies/{id}/run-all`

**Step 1 — Request arrives**: FastAPI receives POST `/api/policies/{id}/run-all`. The JWT is verified, the policy is loaded from SQLite.

**Step 2 — State initialized**: An `InsureIQState` TypedDict is created with `policy_id`, `policy_data` (serialized policy fields), `user_query = "full_report"`, and empty `messages: []`.

**Step 3 — Supervisor routes**: The supervisor_node invokes Groq's `llama-3.1-8b-instant` with a single-shot classification prompt. It returns `"full_report"`. This sets `state["route"]`.

**Step 4 — Risk node (ML tool)**: The risk_node calls `policy_to_feature_vector()` to convert the policy into a numeric array, then calls `model.predict_proba()` — XGBoost, not an LLM. It also calls `shap.TreeExplainer.shap_values()` for feature attribution. These are **tool calls**: deterministic, reproducible, fast. It writes `claim_probability`, `risk_score`, `risk_band`, `shap_features` to state.

**Step 5 — Explainer node**: The explainer_node checks the LLM cache (SHA256 key based on policy_id + endpoint + model). On a cache miss, it calls Groq's `llama-3.3-70b-versatile` with the RISK_EXPLAINER_PROMPT, passing the risk score and formatted SHAP features. It writes `risk_explanation` to state and stores the response in cache (24h TTL).

**Step 6 — Premium node**: The premium_node checks cache, then calls Groq's `mixtral-8x7b-32768` with the PREMIUM_ADVISOR_PROMPT. It uses regex to parse `₹XX,XXX` from the free-form LLM response to extract `premium_min` and `premium_max`. It writes `premium_min`, `premium_max`, `premium_narrative`, `adjustment_factors` to state.

**Step 7 — Report node**: The report_node checks cache (1h TTL), then calls `llama-3.3-70b` with the REPORT_WRITER_PROMPT. It saves the generated report text to the `Report` table in SQLite. It writes `final_report` and `report_id` to state.

**Step 8 — Response returned**: The `/run-all` endpoint saves a `RiskPrediction` record to the DB and returns the complete accumulated state to the user.

---

## Tech Stack

| Layer | Technology | Role in InsureIQ |
|-------|-----------|-----------------|
| **Frontend** | React 18 + Vite + TypeScript | SPA with Tailwind CSS + shadcn/ui |
| **Backend** | FastAPI 0.115 + Uvicorn | Async REST API with dependency injection |
| **ORM** | SQLAlchemy 2.0 + SQLite | Type-safe database queries |
| **ML** | XGBoost 2.1 + SHAP 0.46 | Gradient-boosted claim prediction + feature attribution |
| **Agents** | LangGraph 0.2 + LangChain 0.3 | StateGraph orchestration, conditional edges |
| **LLM** | Groq API | Free-tier inference for llama-3.3-70b, mixtral-8x7b, llama-3.1-8b |
| **Retry** | Tenacity | 3-attempt exponential backoff (2s→4s→8s) on LLM calls |
| **Cache** | SQLite `LLMCache` table | SHA256-based LLM response cache (24h TTL) |
| **PDF** | ReportLab | Underwriting report PDF generation |
| **Auth** | PyJWT (HS256) + Passlib bcrypt | Stateless 24h JWT authentication |
| **Vector DB** | FAISS (optional) | RAG context retrieval for IRDAI regulations |
| **Deploy** | Railway.app + Vercel | Backend + Frontend on free tiers |

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- [Groq API key](https://console.groq.com/keys) (free tier)
- Git

### 1. Clone and Backend Setup

```bash
git clone https://github.com/yourusername/InsureIQ.git
cd InsureIQ/backend

# Create virtual environment
python -m venv venv
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Open .env and set: GROQ_API_KEY=your_key_here

# Start the server
uvicorn backend.main:app --reload --port 8000
```

API docs available at `http://localhost:8000/docs` (Swagger UI).

### 2. Train the XGBoost Model (Optional — Required for Real Predictions)

```bash
# Download Porto Seguro dataset from Kaggle (free account required)
kaggle competitions download -c porto-seguro-safe-driver-prediction
mkdir -p data
unzip porto-seguro-safe-driver-prediction.zip -d data/

# Train (5-10 minutes on CPU)
python ml/trainer.py
# Saves: ml/model_store/xgb_v1.pkl
```

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Start dev server (proxies /api requests to localhost:8000)
npm run dev
```

App opens at `http://localhost:5173`.

### 4. Register and Login

```
Email: test@insureiq.com
Password: testpassword123
```

Or register a new account at `http://localhost:5173/signup`.

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register — `{email, full_name, password}` |
| `POST` | `/api/auth/login` | Login — returns `{access_token, token_type}` |
| `GET` | `/api/auth/me` | Current user info |

### Policies

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/policies` | List policies — paginated `?page=1&limit=20` |
| `POST` | `/api/policies` | Create policy — all policy fields |
| `GET` | `/api/policies/{id}` | Single policy with latest risk prediction |
| `PUT` | `/api/policies/{id}` | Update policy fields |
| `DELETE` | `/api/policies/{id}` | Soft-delete (sets `is_active=False`) |
| `POST` | `/api/policies/import-csv` | Bulk import — multipart CSV upload |
| `GET` | `/api/policies/sample-csv` | Download sample CSV template |

### Agentic AI Pipeline

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/policies/{id}/run-all` | **Full LangGraph pipeline** — risk + explain + premium + report |

### Claims

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/claims/predict` | XGBoost claim probability + confidence band |
| `POST` | `/api/claims/eligibility` | LLM-structured extraction + ReAct rules |

### Premium

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/premium/advise` | Full premium advisory via LangGraph |
| `POST` | `/api/premium/what-if` | Simulate: add_anti_theft, change_parking, reduce_mileage |

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/reports/generate` | Generate from LangGraph pipeline |
| `GET` | `/api/reports/{id}/pdf` | Download as PDF (ReportLab) |

### Batch Processing

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/batch/run` | Background job — policy_ids list or CSV upload |
| `GET` | `/api/batch/{job_id}/status` | Progress polling — `percentage_complete`, ETA |
| `GET` | `/api/batch/{job_id}/results` | Final aggregates: avg_score, risk_distribution, flagged_critical |

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dashboard/kpis` | total_policies, avg_risk_score, avg_claim_probability, high_risk_count, critical_count, policies_added_this_week |
| `GET` | `/api/dashboard/risk-trend` | Last 12 months — count per risk_band per month |
| `GET` | `/api/dashboard/risk-split` | Current snapshot — distribution + percentages |

---

## The Agentic AI Layer

### InsureIQState — The Shared Brain

Every node reads from and writes to the same `InsureIQState` TypedDict:

```python
class InsureIQState(TypedDict, total=False):
    policy_id: str
    policy_data: Dict[str, Any]
    user_query: Optional[str]
    route: Optional[RouteType]           # ← set by supervisor
    claim_probability: Optional[float]     # ← set by risk_node (XGBoost tool)
    risk_score: Optional[int]              # ← set by risk_node
    risk_band: Optional[RiskBand]          # ← set by risk_node
    shap_features: Optional[List[dict]]     # ← set by risk_node (SHAP tool)
    risk_explanation: Optional[str]         # ← set by explainer_node (LLM)
    premium_min: Optional[float]           # ← set by premium_node (LLM)
    premium_max: Optional[float]            # ← set by premium_node (LLM)
    premium_narrative: Optional[str]        # ← set by premium_node (LLM)
    adjustment_factors: Optional[List[dict]] # ← set by premium_node (LLM)
    final_report: Optional[str]            # ← set by report_node (LLM)
    report_id: Optional[str]               # ← set by report_node
    retrieved_context: Optional[str]        # ← set by modules (RAG)
    error: Optional[str]                   # ← set on any node failure
    messages: List[Dict]                  # ← conversation history
    session_id: str
```

### Supervisor Routing

The supervisor uses a **single LLM call** (llama-3.1-8b-instant — the cheapest and fastest Groq model) to classify the user's intent. The prompt is minimal (~100 tokens):

```
You are the routing supervisor. Classify intent into ONE of:
risk_only | risk_and_explain | premium | full_report | explain_only
Respond with ONLY the intent string.
```

This is NOT a chat completion — it's a deterministic routing decision. If the LLM fails, we fall back to `"full_report"` (the most comprehensive route).

### Tool Use Pattern

The most important architectural decision: **XGBoost and SHAP are tools, not LLMs**.

Why this matters:
- **XGBoost produces calibrated probabilities** — `model.predict_proba()` returns values bounded [0,1] that sum to 1 across classes. An LLM asked "what is the claim probability?" would invent a number that sounds plausible but has no statistical grounding.
- **SHAP produces feature-level attribution** — Each feature gets a signed float: positive = pushes toward claim, negative = pushes away. This is mathematically rigorous (Shapley values from game theory).
- **LLMs handle what they're best at** — Reasoning, nuance, natural language generation, handling edge cases.

The `risk_node` calls three tools:
```python
vector = policy_to_feature_vector(policy)       # Feature engineering
prob = model.predict_proba(vector)[0][1]        # XGBoost tool
shap_vals = explainer.shap_values(vector)        # SHAP tool
```

The `explainer_node`, `premium_node`, and `report_node` call LLMs because they need natural language generation.

### LLM Caching Strategy

LLM calls are cached in SQLite by SHA256(policy_id + endpoint + model):

| Endpoint | TTL | Rationale |
|---------|-----|-----------|
| `risk_explanation` | 24h | SHAP features don't change often |
| `premium_advisory` | 24h | Premium recommendations stable short-term |
| `underwriting_report` | 1h | Reports should be fresher |
| `claim_eligibility` | 0 (never) | Claim data is always new |
| `IRDAI_context` | 7 days | Regulations change slowly |

---

## ML Pipeline

### Training Data

Uses the [Porto Seguro Safe Driver Prediction](https://www.kaggle.com/competitions/porto-seguro-safe-driver-prediction) dataset:
- **595,212 rows** of real anonymised motor insurance policies
- **57 features** (all anonymised: ps_car_01_cat, ps_ind_01, etc.)
- **Binary target**: whether the policyholder filed a claim (0 or 1)
- **Class imbalance**: ~26:1 negative-to-positive ratio

### Feature Engineering

InsureIQ maps its own policy model fields to a numeric vector:

```python
vehicle_age = current_year - vehicle_year
engine_cc_normalised = engine_cc / 4000.0
premium_to_idv_ratio = premium_amount / insured_value
prior_claims_binary = 1.0 if prior_claims_count > 0 else 0.0
prior_claim_severity = prior_claim_amount / insured_value
parking_risk = 0.0 (garage) | 0.5 (covered) | 1.0 (street)
ncb_discount = ncb_percentage / 100.0
```

### XGBoost Parameters

```python
XGBClassifier(
    n_estimators=500,
    max_depth=5,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    scale_pos_weight=26,        # Handle 26:1 class imbalance
    eval_metric='auc',
    early_stopping_rounds=50,  # Stop when AUC stops improving
)
```

### SHAP Explainability

For each prediction, SHAP computes the marginal contribution of each feature:

```python
shap_values = explainer.shap_values(feature_vector)
# Returns: [{"feature_name": "prior_claims_binary", "shap_value": 0.12,
#           "direction": "increases_risk"}, ...]
```

These are displayed as feature cards in the frontend and passed to the LLM explainer node for plain-language translation.

---

## Deployment

### Railway (Backend) — Free Tier

1. Create account at [railway.app](https://railway.app)
2. New Project → Deploy from GitHub repo
3. Railway auto-detects `railway.toml`
4. Add environment variables in Railway dashboard:
   - `GROQ_API_KEY` = your Groq API key
   - `JWT_SECRET` = 32+ character random string
5. Railway provides a public URL: `https://insureiq-xxxx.up.railway.app`

### Vercel (Frontend) — Free Tier

1. Create account at [vercel.com](https://vercel.com)
2. Import GitHub repo
3. Root directory: `frontend`
4. Add environment variable:
   - `VITE_API_BASE_URL` = your Railway URL
5. Deploy

### Verify Deployment

```bash
# Health check
curl https://your-railway-app.up.railway.app/health

# Should return:
# {"status":"ok","model_loaded":true,"db_connected":true,"groq_key_present":true}
```

---

## Project Structure

```
InsureIQ/
├── backend/
│   ├── main.py                     # FastAPI app + lifespan (model loading) + all routers
│   ├── config.py                  # Pydantic Settings from .env
│   ├── exceptions.py               # Global exception handlers
│   ├── requirements.txt
│   ├── .env.example
│   │
│   ├── agents/
│   │   ├── state.py               # InsureIQState TypedDict + SHAPFeature
│   │   ├── graph.py               # StateGraph + 5 nodes + conditional edges
│   │   └── nodes/
│   │       ├── supervisor.py      # llama-3.1-8b routing
│   │       ├── risk_node.py       # XGBoost + SHAP tool calls
│   │       ├── explainer_node.py   # llama-3.3-70b risk explanation
│   │       ├── premium_node.py     # mixtral-8x7b premium advisory
│   │       └── report_node.py      # llama-3.3-70b underwriting report
│   │
│   ├── llm/
│   │   ├── groq_client.py         # invoke_llm() + invoke_with_retry()
│   │   ├── prompts.py              # All 4 system prompts
│   │   └── cache.py               # SHA256 cache + TTL constants
│   │
│   ├── ml/
│   │   ├── feature_engineer.py    # Policy → numeric vector
│   │   ├── predictor.py            # XGBoost model loading
│   │   ├── explainer.py            # SHAP TreeExplainer
│   │   ├── risk_scorer.py          # probability → score → band
│   │   ├── trainer.py              # Run once: train + save xgb_v1.pkl
│   │   └── model_store/
│   │       └── xgb_v1.pkl         # Trained model (gitignored)
│   │
│   ├── routers/
│   │   ├── auth.py                # /auth/register, /login, /me
│   │   ├── policies.py             # CRUD + /run-all (LangGraph invoke)
│   │   ├── claims.py              # /predict, /eligibility (ReAct)
│   │   ├── premium.py             # /advise, /what-if
│   │   ├── reports.py              # /generate, /{id}/pdf
│   │   ├── batch.py               # /run, /{id}/status, /{id}/results
│   │   ├── dashboard.py           # /kpis, /risk-trend, /risk-split
│   │   ├── analytics.py           # /risk-scoring, /claim-prediction, etc.
│   │   ├── risk.py                # /assess, /explain
│   │   └── modules.py             # /form-agent, /claim-session
│   │
│   ├── database/
│   │   ├── db.py                  # engine, SessionLocal, get_db
│   │   ├── models.py              # All SQLAlchemy models
│   │   └── repository.py          # CRUD helper functions
│   │
│   ├── schemas/                   # Pydantic request/response models
│   ├── auth/                      # JWT handler, password bcrypt, dependencies
│   └── middleware/
│       └── audit_middleware.py     # Logs every POST/PUT/DELETE
│
├── frontend/
│   ├── src/
│   │   ├── pages/                # Login, Signup, Policies, PolicyDetails,
│   │   │                         # RiskAssessment, ClaimPrediction,
│   │   │                         # PremiumAdvisory, Reports, BatchAnalysis,
│   │   │                         # AuditLog, Index, Settings
│   │   ├── components/            # shadcn/ui components
│   │   ├── lib/
│   │   │   ├── api.ts             # API client (all endpoints)
│   │   │   └── pdf-export.ts      # Report text export
│   │   └── types/insurance.ts     # TypeScript interfaces
│   ├── vite.config.ts
│   └── .env.production
│
├── railway.toml                   # Railway deployment config
├── Procfile                      # Railway/Heroku start command
└── README.md
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GROQ_API_KEY` | **Yes** | — | Groq API key from console.groq.com |
| `JWT_SECRET` | Yes | `change-me` | HS256 signing secret (32+ chars in prod) |
| `DATABASE_URL` | No | `sqlite:///./insureiq.db` | SQLAlchemy URL (swap for PostgreSQL on Railway) |
| `ENVIRONMENT` | No | `development` | Shown in `/health` response |
| `CACHE_TTL_HOURS` | No | `24` | Default LLM cache TTL |
| `GROQ_MODEL` | No | `llama-3.1-8b-instant` | Default routing model |
| `MODEL_PATH` | No | `ml/model_store/xgb_v1.pkl` | Path to trained XGBoost model |
| `ALLOWED_ORIGINS` | No | `localhost:5173` | CORS origins (comma-separated) |

### Frontend (`frontend/.env.production`)

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `VITE_API_BASE_URL` | **Yes** | `https://your-app.up.railway.app` | Backend public URL |

---

## Performance Characteristics

| Metric | Value |
|--------|-------|
| XGBoost prediction latency | ~5ms (CPU), ~1ms (with model loaded in memory) |
| SHAP explainer latency | ~10-50ms |
| Groq LLM latency (llama-3.1-8b-instant) | ~200-500ms |
| Groq LLM latency (llama-3.3-70b-versatile) | ~500-1500ms |
| Groq LLM latency (mixtral-8x7b-32768) | ~400-1200ms |
| Full `full_report` pipeline (cached) | ~600ms |
| Full `full_report` pipeline (uncached) | ~3-5s |
| Batch throughput (XGBoost only) | ~50 policies/second |
| SQLite concurrent writes | Up to ~100/second with WAL mode |

---

## License

MIT — use freely for learning and portfolio projects. For production insurance use, comply with IRDAI regulations and involve licensed insurance professionals.
