from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.audit import AuditMiddleware
from app.config import get_settings
from app.database import Base, engine
from app.ml import load_model_and_explainer
from app.routers import analytics, auth, modules, policies

settings = get_settings()
app = FastAPI(title="InsureIQ API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(AuditMiddleware)


@app.on_event("startup")
def startup_event():
    Base.metadata.create_all(bind=engine)
    model, explainer = load_model_and_explainer(settings.model_path)
    app.state.model = model
    app.state.explainer = explainer


@app.get("/health")
def health():
    return {"status": "ok", "environment": settings.environment}


app.include_router(auth.router, prefix="/api")
app.include_router(policies.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(modules.router, prefix="/api")
