from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    groq_api_key: str = ""
    jwt_secret: str = "change-me"
    database_url: str = "sqlite:///./insureiq.db"
    environment: str = "development"

    jwt_algorithm: str = "HS256"
    jwt_expiry_hours: int = 24

    cors_origins: list[str] = ["*"]  # Allow all during dev

    cache_ttl_hours: int = 24
    groq_model: str = "llama-3.1-8b-instant"
    model_path: str = "./model/xgboost_model.json"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False)


@lru_cache
def get_settings() -> Settings:
    return Settings()
