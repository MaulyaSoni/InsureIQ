# InsureIQ — AI-Powered Vehicle Insurance Risk Analytics

> **Production-grade insurance intelligence platform** combining XGBoost claim prediction, SHAP explainability, and a LangGraph multi-agent pipeline — all powered by Groq LLM on a React + FastAPI stack.

**Live Demo →** `https://insureiq.vercel.app` &nbsp;|&nbsp; **API →** `https://insureiq.up.railway.app`

---

## What It Does

InsureIQ lets insurance underwriters and analysts assess vehicle policy risk in seconds rather than hours. Upload a policy, click **Run Analysis**, and a four-node agentic pipeline automatically scores the risk, explains every factor in plain language, recommends a premium range, and generates a downloadable underwriting report — no manual prompting required.

---

## Why It's an Agentic AI System

Most "AI" insurance tools call a single LLM and return a text blob. InsureIQ is different. It uses a **LangGraph StateGraph** to coordinate four specialised agents, each with a distinct job:

```
User clicks "Run Analysis"
        │
        ▼
 ┌─────────────┐
 │  Supervisor │  llama-3.1-8b classifies intent → routes to correct path
 └──────┬──────┘
        │
        ▼
 ┌─────────────┐
 │  Risk Node  │  XGBoost predicts claim probability  ← TOOL USE (not LLM)
 │             │  SHAP computes feature attribution   ← TOOL USE (not LLM)
 └──────┬──────┘
        │
        ▼
 ┌──────────────────┐
 │  Explainer Node  │  llama-3.3-70b translates SHAP values → plain English
 └──────┬───────────┘
        │
        ▼
 ┌──────────────┐
 │ Premium Node │  mixtral-8x7b → premium range + adjustment factors
 └──────┬───────┘
        │
        ▼
 ┌─────────────┐
 │ Report Node │  llama-3.3-70b → full underwriting report → saved to DB
 └─────────────┘
```

**Key agentic properties demonstrated:**
- **Supervisor routing** — the supervisor node decides which path to run at runtime, not compile time
- **Tool use** — XGBoost and SHAP are tools the agent calls; the LLM never attempts to predict numbers
- **Persistent shared state** — `InsureIQState` TypedDict accumulates knowledge across all nodes
- **Conditional edges** — the graph routes differently for `risk_only` vs `full_report` based on intent
- **ReAct pattern** — the claim eligibility checker uses Reason → Ask → Observe loops

---

## Core Features

| Feature | Technology | What It Shows |
|---|---|---|
| Claim probability prediction | XGBoost (AUC 0.74) | Supervised ML, binary classification |
| Risk explainability | SHAP TreeExplainer | Explainable AI (XAI), feature attribution |
| Plain-language explanations | Groq llama-3.3-70b | Domain-specific LLM prompting |
| Premium advisory + what-if | Groq mixtral-8x7b | Structured LLM output, rule+LLM hybrid |
| Multi-agent orchestration | LangGraph StateGraph | Agentic AI, multi-agent coordination |
| Batch portfolio analysis | FastAPI BackgroundTasks | Async processing, 50K+ policies |
| Underwriting report PDF | ReportLab | Structured output, audit-ready docs |
| Compliance audit log | SQLAlchemy middleware | Production traceability |
| AI Chat Assistant | LangChain + Groq | Conversational AI, RAG over policy data |

---

## Tech Stack

```
Frontend        React 18 + Vite + TypeScript + Tailwind CSS + Shadcn UI
Backend         FastAPI 0.115 + Python 3.11 + Uvicorn
ML              XGBoost 2.1 + SHAP 0.46 + Scikit-learn + Pandas
Agents          LangGraph 0.2 + LangChain 0.3
LLM             Groq API — llama-3.3-70b / mixtral-8x7b / llama-3.1-8b
Database        SQLite + SQLAlchemy ORM
Auth            PyJWT (HS256) + bcrypt
Deploy          Railway (backend) + Vercel (frontend)
Cost            ₹0 — 100% free tier and open-source
```

---

## Setup

**Prerequisites:** Python 3.11, Node 18+, Groq API key (free at console.groq.com)

```bash
# Clone
git clone https://github.com/yourname/insureiq && cd insureiq

# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # add GROQ_API_KEY and JWT_SECRET
python ml/trainer.py           # train XGBoost model (~3 min)
uvicorn main:app --reload

# Frontend
cd ../frontend
npm install
cp .env.example .env.local     # set VITE_API_BASE_URL=http://localhost:8000
npm run dev
```

Open `http://localhost:5173`

---

## Environment Variables

```bash
# backend/.env
GROQ_API_KEY=your_groq_key_here
JWT_SECRET=any_long_random_string
DATABASE_URL=sqlite:///./insureiq.db
ENVIRONMENT=development
ALLOWED_ORIGINS=http://localhost:5173
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/auth/signup` `/auth/login` | JWT authentication |
| GET/POST | `/policies` | Policy CRUD + CSV import |
| POST | `/policies/{id}/run-all` | Full LangGraph pipeline |
| POST | `/risk/assess` | XGBoost + SHAP prediction |
| POST | `/premium/advise` | Premium range + advisory |
| POST | `/premium/what-if` | Scenario comparison |
| POST | `/claims/predict` | Claim probability |
| POST | `/claims/eligibility` | ReAct eligibility check |
| POST | `/reports/generate` | Full underwriting report |
| GET | `/reports/{id}/pdf` | Download as PDF |
| POST | `/batch/run` | Async portfolio analysis |
| GET | `/dashboard/kpis` | Real-time aggregates |
| GET | `/audit/logs` | Compliance audit trail |
| GET | `/health` | DB + model status check |

---

## The ML Model

Trained on the **Porto Seguro Safe Driver Prediction** dataset (595K real insurance policy records, Kaggle). Handles class imbalance (~26:1) with `scale_pos_weight`. Validated AUC > 0.72 on held-out test set.

If Kaggle data is unavailable, `trainer.py` generates a 100K-row synthetic fallback automatically so the project runs out of the box.

---

## Resume Bullet

> *Built InsureIQ — a production vehicle insurance risk platform using XGBoost claim prediction (AUC 0.74), SHAP explainability, and a 4-node LangGraph multi-agent pipeline (Supervisor → Risk → Explainer → Report) orchestrating Groq llama-3.3-70b and mixtral-8x7b. Features batch analysis, PDF report generation, JWT auth, and SQLite audit trail. Deployed on Railway + Vercel. Zero paid APIs.*

---

## Domain Context

InsureIQ operates in the Indian motor insurance market regulated by **IRDAI** (Insurance Regulatory and Development Authority of India). Premium calculations reference real IRDAI motor tariff norms. Insurer comparisons reference ICICI Lombard, HDFC Ergo, Bajaj Allianz, Digit Insurance, and Acko.

---

*Built by Maulya Soni · Stack: FastAPI + XGBoost + LangGraph + Groq + React · Domain: Indian Motor Insurance*
