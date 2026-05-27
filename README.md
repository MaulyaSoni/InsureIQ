# InsureIQ

> **A B2B underwriting intelligence platform**

[![Live Demo](https://img.shields.io/badge/Live_Demo-insureiq.vercel.app-blue?style=for-the-badge)](https://insure-iq-com.vercel.app)
[![API](https://img.shields.io/badge/API-insureiq.up.railway.app-green?style=for-the-badge)](https://insureiq.up.railway.app)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![XGBoost](https://img.shields.io/badge/XGBoost-1296DB?style=for-the-badge)
![Groq](https://img.shields.io/badge/Groq-f55036?style=for-the-badge)

## The Problem

Insurance underwriters in India manually review each policy application — checking vehicle age, city risk, prior claims, and declared use against years of experience. Most insurers process 15–20 policies per underwriter per day. There is no ML layer, no explainability, and no audit trail for pricing decisions. IRDAI increasingly requires insurers to justify their underwriting logic — but most firms cannot do this systematically.

## What InsureIQ Does

InsureIQ is a B2B underwriting intelligence platform that sits between raw policy data and human decisions. An underwriter uploads a policy, clicks **Run Analysis**, and a multi-agent AI pipeline produces a risk score, a SHAP-explained breakdown of every contributing factor, a premium recommendation, and a downloadable underwriting report — in under 15 seconds, with every reasoning step visible on screen.

## Architecture

```text
[1] INPUT           Raw Policy Data / CSV Uploads / User UI
       │
[2] PIPELINE        LangGraph StateGraph 
       ├─► Supervisor (llama-3.1-8b): Classifies intent
       ├─► Risk Node: XGBoost prediction + SHAP explainability tool
       ├─► Explainer Node: SHAP translation (llama-3.3-70b)
       ├─► Premium Node: Range advisory (mixtral-8x7b)
       └─► Report Node: Full underwriting document (llama-3.3-70b)
       │
[3] STORAGE         SQLite + SQLAlchemy ORM (Audit Trail & Policies)
       │
[4] OUTPUTS         Real-time SSE Streaming + PDF Generator (ReportLab)
       │
[5] CHAT            Conversational UI with context awareness (RAG over policy)
       │
[6] B2B DEPLOY      Single-Tenant / Railway (Backend) + Vercel (Frontend)
       │
[7] v2 TOOLS        [In Progress] MCP Tool Registry (IRDAI APIs, Fraud Check, etc.)
```

## Features

### v1 (Live)
- XGBoost claim prediction with SHAP explainability
- 4-node LangGraph StateGraph with live agent execution tracing
- Real-time SSE streaming — watch each node execute
- Streaming chatbot with full policy context awareness
- Batch portfolio analysis
- PDF underwriting report generation
- JWT auth with 4-role RBAC
- IRDAI-compliant audit trail
- Deployed on Vercel + Render

### v2 (In Progress)
- MCP Tool Registry — 6 external tools the agent calls autonomously
  - IRDAI tariff lookup
  - Fraud signal check
  - Vehicle registration (Vahan)
  - Market benchmark
  - Portfolio analytics
  - IRDAI circular search
- LangGraph ReAct loop — Thought → Tool → Observe → Answer
- Tool call UI — users see exactly which data source the agent queried

## Tech Stack

| Layer | Technology |
|---|---|
| **ML** | XGBoost 2.1, Scikit-learn, Pandas |
| **Explainability** | SHAP TreeExplainer |
| **Agents** | LangGraph 0.2, LangChain 0.3 |
| **LLM** | Groq API (llama-3.3-70b, mixtral-8x7b, llama-3.1-8b) |
| **Backend** | FastAPI 0.115, Python 3.11, Uvicorn |
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Shadcn UI |
| **Animations** | Framer Motion |
| **Streaming** | Server-Sent Events (SSE) |
| **Auth** | PyJWT (HS256), bcrypt |
| **Database** | SQLite, SQLAlchemy ORM |
| **Deploy** | Railway (Backend) + Vercel (Frontend) |
| **Cost** | ₹0 — 100% free tier and open-source |

## B2B Deployment Model

Each client gets their own Docker instance, own database, own credentials, deployed inside their own cloud. Zero cross-client data exposure. This is how you sell to IRDAI-regulated entities.

## Setup Instructions

**Prerequisites:** Python 3.11, Node.js 18+, Groq API key (free at console.groq.com)

1. **Clone Repo:** `git clone https://github.com/yourname/insureiq && cd insureiq`
2. **Setup Backend Config:** `cd backend && cp .env.example .env`
3. **Set Variables:** Add `GROQ_API_KEY`, `JWT_SECRET`, and `DATABASE_URL` in `.env`
4. **Backend Virtual Env:** `python -m venv venv && source venv/bin/activate` *(Windows: `venv\Scripts\activate`)*
5. **Install Python Deps:** `pip install -r requirements.txt`
6. **Train ML Model:** `python ml/trainer.py` (Generates synthetic dataset if local data is not found, takes ~3 min)
7. **Seed Database:** `python seed_data.py` (Optional: Seeds dummy policies)
8. **Run API:** `uvicorn main:app --reload` (Runs on http://localhost:8000)
9. **Setup Frontend Config:** `cd ../frontend && cp .env.example .env.local`
10. **Set Frontend URL:** Ensure `VITE_API_BASE_URL=http://localhost:8000` is set in `.env.local`
11. **Install Node Deps:** `npm install`
12. **Run Web App:** `npm run dev` (Runs on http://localhost:5173)

## Who Should Use This

Underwriting analysts, risk managers, insurance brokers, anyone managing a portfolio of vehicle policies. Not individual policyholders.

## Resume Bullet

> *Built InsureIQ — a production vehicle insurance risk platform using XGBoost claim prediction (AUC 0.74), SHAP explainability, and a 4-node LangGraph multi-agent pipeline (Supervisor → Risk → Explainer → Report) orchestrating Groq llama-3.3-70b and mixtral-8x7b. Features real-time SSE execution tracing, PDF report generation, JWT auth, and an SQLite compliance audit trail. Deployed on Railway + Vercel.*

---

*Built by Maulya Soni · Stack: FastAPI + XGBoost + LangGraph + Groq + React · Domain: Indian motor insurance · Zero paid APIs.*
