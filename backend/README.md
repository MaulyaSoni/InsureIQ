# InsureIQ Backend (FastAPI)

FastAPI backend for InsureIQ with:
- JWT auth (PyJWT HS256, 24h expiry)
- bcrypt password hashing
- SQLite persistence (`insureiq.db`)
- Audit middleware for every POST/PUT/DELETE
- LLM cache for Groq responses
- XGBoost model load once at startup into `app.state`

## Project Structure

backend/
- app/main.py
- app/config.py
- app/database.py
- app/models.py
- app/schemas.py
- app/auth.py
- app/cache.py
- app/ml.py
- app/audit.py
- app/routers/auth.py
- app/routers/policies.py
- app/routers/analytics.py
- requirements.txt
- .env.example

## Run Locally

1. Create venv and install deps:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Create `.env` from `.env.example` and set secrets:

```env
GROQ_API_KEY=
JWT_SECRET=your-strong-secret
DATABASE_URL=sqlite:///./insureiq.db
ENVIRONMENT=development
```

3. Start server:

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

4. Open docs:
- http://localhost:8000/docs

## API Summary

Public:
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /health`

Protected (JWT bearer required):
- `GET /api/policies`
- `POST /api/policies`
- `GET /api/policies/{policy_id}`
- `POST /api/risk-scoring`
- `POST /api/claim-prediction`
- `POST /api/premium-advisory`
- `POST /api/report`
- `POST /api/batch`
- `GET /api/audit-log`
- `GET /api/dashboard/stats`
- `POST /api/modules/application-form/turn` (Module 2)
- `POST /api/modules/risk-score-explainer` (Module 3)
- `POST /api/modules/policy-pdf-qa` (Module 5)
- `POST /api/modules/claim-eligibility/turn` (Module 6)

## Notes

- All protected endpoints enforce `Depends(get_current_user)`.
- JWT expiry is 24 hours (configurable in `app/config.py`).
- Startup event loads model/explainer once into `app.state.model` and `app.state.explainer`.
- LLM cache key format is SHA-256 over `policy_id + endpoint + model`.
- CORS origins include:
  - `http://localhost:5173`
  - `https://your-vercel-url.vercel.app`

## Railway Deploy

1. Deploy `backend/` as a Python service on Railway.
2. Set env vars from `.env.example`.
3. Start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

4. Ensure persistent volume if you need durable SQLite beyond ephemeral restarts.
