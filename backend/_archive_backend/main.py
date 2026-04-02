from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.audit import AuditMiddleware
from app.config import get_settings
from app.database import Base, engine
from app.exceptions import register_exception_handlers
from app.ml import load_model_and_explainer
from app.routers import analytics, auth, batch, claims, dashboard, modules, policies, premium, reports

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    model_path = Path(settings.model_path)
    model, explainer = load_model_and_explainer(settings.model_path)
    app.state.model = model
    app.state.explainer = explainer
    app.state.model_loaded = model_path.exists()
    yield


app = FastAPI(title="InsureIQ API", version="0.2.0", lifespan=lifespan)
register_exception_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(AuditMiddleware)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "environment": settings.environment,
        "model_loaded": getattr(app.state, "model_loaded", False),
    }


app.include_router(auth.router, prefix="/api")
app.include_router(policies.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(batch.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(modules.router, prefix="/api")
app.include_router(claims.router, prefix="/api")
app.include_router(premium.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
