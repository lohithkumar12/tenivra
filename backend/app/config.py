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
    # Public URL of the Next.js app (password-reset links, booking URLs in emails)
    public_app_url: str = "http://localhost:3000"
    # Transactional email (https://resend.com). If unset, emails are logged only.
    resend_api_key: Optional[str] = None
    email_from: str = "Tenivra <onboarding@resend.dev>"
    # SMS (Twilio). If unset, SMS is logged only.
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_from_number: Optional[str] = None  # E.164
    # WhatsApp Business Cloud API (Meta Graph API). If unset, messages are logged only.
    whatsapp_token: Optional[str] = None
    whatsapp_phone_number_id: Optional[str] = None
    # Auto-confirm: pending bookings auto-confirm after this many minutes (0 = disabled)
    auto_confirm_minutes: int = 15

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
