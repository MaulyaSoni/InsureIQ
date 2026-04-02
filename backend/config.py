import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    groq_api_key: str = ""
    jwt_secret: str = os.environ.get("JWT_SECRET", "change-me")
    database_url: str = os.environ.get("DATABASE_URL", "sqlite:///./insureiq.db")
    environment: str = os.environ.get("ENVIRONMENT", "development")

    jwt_algorithm: str = "HS256"
    jwt_expiry_hours: int = 24

    cors_origins: str = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")

    cache_ttl_hours: int = 24
    groq_model: str = "llama-3.1-8b-instant"
    model_path: str = os.environ.get(
        "MODEL_PATH",
        str(__import__("pathlib").Path(__file__).resolve().parent / "ml" / "model_store" / "xgb_v1.pkl"),
    )

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False)

    def cors_list(self) -> list[str]:
        parts = [p.strip() for p in self.cors_origins.split(",") if p.strip()]
        return parts if parts else ["*"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
