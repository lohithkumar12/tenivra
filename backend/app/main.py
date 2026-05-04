from contextlib import asynccontextmanager
import asyncio
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import inspect, text
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.database import engine, Base, SessionLocal
from app.api import api_router
from app.rate_limit import limiter

logger = logging.getLogger(__name__)


def _ensure_columns():
    """Add columns introduced after initial release. Idempotent, works on SQLite + Postgres."""
    dialect = engine.dialect.name
    timestamp_type = "TIMESTAMP" if dialect == "postgresql" else "DATETIME"
    bool_false = "FALSE" if dialect == "postgresql" else "0"

    def add(table: str, col: str, ddl: str):
        try:
            inspector = inspect(engine)
            existing = {c["name"] for c in inspector.get_columns(table)}
            if col in existing:
                return
            with engine.begin() as conn:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {ddl}"))
            print(f"[startup] added column {table}.{col}")
        except Exception as e:
            # Keep applying the rest of the lightweight migrations even if one column fails.
            print(f"[startup] column migration failed for {table}.{col}: {e}")

    inspector = inspect(engine)
    tables = inspector.get_table_names()
    if "users" in tables:
        add("users", "phone", "VARCHAR(20)")
        add("users", "password_reset_token", "VARCHAR(128)")
        add("users", "password_reset_expires", timestamp_type)
    if "appointments" in tables:
        add("appointments", "patient_user_id", "VARCHAR(36)")
    if "tenants" in tables:
        add("tenants", "city", "VARCHAR(100)")
        add("tenants", "plan", "VARCHAR(20) DEFAULT 'free' NOT NULL")
        add("tenants", "monthly_price_cents", "INTEGER DEFAULT 0 NOT NULL")
        add("tenants", "subscription_status", "VARCHAR(20) DEFAULT 'trial' NOT NULL")
        add("tenants", "stripe_customer_id", "VARCHAR(120)")
        add("tenants", "stripe_subscription_id", "VARCHAR(120)")
        add("tenants", "onboarding_completed", f"BOOLEAN DEFAULT {bool_false} NOT NULL")


async def _auto_confirm_loop():
    """Background task: auto-confirm stale pending appointments."""
    from app.api.realtime import auto_confirm_pending
    settings = get_settings()
    window = settings.auto_confirm_minutes
    if window <= 0:
        return
    while True:
        await asyncio.sleep(60)
        try:
            db = SessionLocal()
            count = auto_confirm_pending(db, window_minutes=window)
            if count:
                logger.info("[auto-confirm] confirmed %d appointments", count)
            db.close()
        except Exception as e:
            logger.warning("[auto-confirm] error: %s", e)


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

    from app.services.sse import set_main_loop
    set_main_loop(asyncio.get_running_loop())

    task = asyncio.create_task(_auto_confirm_loop())
    yield
    task.cancel()


settings = get_settings()

app = FastAPI(
    title="Tenivra API",
    version="1.0.0",
    description="Multi-tenant clinic management platform",
    lifespan=lifespan,
)

app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please try again shortly."},
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
