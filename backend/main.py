from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from backend.config import get_settings
from backend.database.db import init_db
from backend.exceptions import register_exception_handlers
from backend.middleware.audit_middleware import AuditMiddleware
from backend.ml.predictor import load_model
from backend.routers import (
    analytics,
    audit_log,
    auth,
    batch,
    claims,
    dashboard,
    fraud,
    modules,
    policies,
    premium,
    reports,
    risk,
    renewal,
    teams,
    workbench,
)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    model = None
    explainer = None
    model_loaded = False
    model_path = Path(settings.model_path)
    if model_path.exists():
        try:
            model = load_model(str(model_path))
            import shap
            explainer = shap.TreeExplainer(model)
            model_loaded = True
        except Exception:
            model = None
            explainer = None
            model_loaded = False
    app.state.model = model
    app.state.explainer = explainer
    app.state.model_loaded = model_loaded
    yield


app = FastAPI(title="InsureIQ API", version="1.0.0", lifespan=lifespan)
register_exception_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(AuditMiddleware)


@app.get("/health")
def health():
    from backend.database.db import engine

    db_ok = False
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass

    return {
        "status": "ok",
        "environment": settings.environment,
        "model_loaded": getattr(app.state, "model_loaded", False),
        "db_connected": db_ok,
        "groq_key_present": bool(settings.groq_api_key),
        "modules_loaded": ["fraud", "renewal", "workbench", "analytics", "teams"],
    }


app.include_router(auth.router, prefix="/api")
app.include_router(policies.router, prefix="/api")
app.include_router(risk.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(audit_log.router, prefix="/api")
app.include_router(batch.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(modules.router, prefix="/api")
app.include_router(claims.router, prefix="/api")
app.include_router(premium.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(fraud.router, prefix="/api")
app.include_router(workbench.router, prefix="/api")
app.include_router(renewal.router, prefix="/api")
app.include_router(teams.router, prefix="/api")
