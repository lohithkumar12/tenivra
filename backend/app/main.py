from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from app.config import get_settings
from app.database import engine, Base, SessionLocal
from app.api import api_router


def _ensure_columns():
    """Add columns introduced after initial release. Idempotent, works on SQLite + Postgres."""
    inspector = inspect(engine)

    def add(table: str, col: str, ddl: str):
        existing = {c["name"] for c in inspector.get_columns(table)}
        if col in existing:
            return
        with engine.begin() as conn:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {ddl}"))

    tables = inspector.get_table_names()
    if "users" in tables:
        add("users", "phone", "VARCHAR(20)")
        add("users", "password_reset_token", "VARCHAR(128)")
        add("users", "password_reset_expires", "DATETIME")
    if "appointments" in tables:
        add("appointments", "patient_user_id", "VARCHAR(36)")
    if "tenants" in tables:
        add("tenants", "city", "VARCHAR(100)")
        add("tenants", "plan", "VARCHAR(20) DEFAULT 'free' NOT NULL")
        add("tenants", "monthly_price_cents", "INTEGER DEFAULT 0 NOT NULL")
        add("tenants", "subscription_status", "VARCHAR(20) DEFAULT 'trial' NOT NULL")
        add("tenants", "stripe_customer_id", "VARCHAR(120)")
        add("tenants", "stripe_subscription_id", "VARCHAR(120)")
        add("tenants", "onboarding_completed", "BOOLEAN DEFAULT FALSE NOT NULL")


@asynccontextmanager
async def lifespan(application: FastAPI):
    Base.metadata.create_all(bind=engine)
    try:
        _ensure_columns()
    except Exception as e:
        print(f"[startup] column migration skipped: {e}")
    from app.models import Tenant
    db = SessionLocal()
    try:
        if db.query(Tenant).count() == 0:
            db.close()
            from app.seed import seed
            seed()
    except Exception:
        pass
    finally:
        db.close()
    yield


settings = get_settings()

app = FastAPI(
    title="Tenivra API",
    version="1.0.0",
    description="Multi-tenant clinic management platform",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "tenivra"}
