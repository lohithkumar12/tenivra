from typing import Optional
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "sqlite:///./tenivra.db"
    secret_key: str = "dev-secret-key-change-in-production-abc123"
    access_token_expire_minutes: int = 480
    cors_origins: str = "http://localhost:3000"
    # Patient-facing AI assistant (OpenAI). If unset, falls back to rule-based assistant.
    openai_api_key: Optional[str] = None
    assistant_model: str = "gpt-4o-mini"
    assistant_max_history: int = 24

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
