import os
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    groq_api_key: str = ""
    jwt_secret: str = os.environ.get("JWT_SECRET", "change-me")
    database_url: str = os.environ.get("DATABASE_URL", "sqlite:///./insureiq.db")
    environment: str = os.environ.get("ENVIRONMENT", "development")

    jwt_algorithm: str = "HS256"
    jwt_expiry_hours: int = 24

    cors_origins: str = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174")

    cache_ttl_hours: int = 24
    groq_model: str = "llama-3.1-8b-instant"
    model_path: str = os.environ.get(
        "MODEL_PATH",
        str(__import__("pathlib").Path(__file__).resolve().parent / "ml" / "model_store" / "xgb_v1.pkl"),
    )

    _backend_env = Path(__file__).resolve().parent / ".env"
    model_config = SettingsConfigDict(
        env_file=(str(_backend_env), ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    def cors_list(self) -> list[str]:
        parts = [p.strip() for p in self.cors_origins.split(",") if p.strip()]
        
        # Always allow localhost for development
        base_origins = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
        ]
        
        # Add production domains
        if self.environment == "production":
            base_origins.extend([
                "https://insure-iq-beta.vercel.app",
                "https://insure-iq-production.vercel.app",
            ])
        
        # Merge with configured origins
        all_origins = list(set(base_origins + parts))
        return all_origins if all_origins else ["*"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
