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

    if "users" in inspector.get_table_names():
        add("users", "phone", "VARCHAR(20)")
    if "appointments" in inspector.get_table_names():
        add("appointments", "patient_user_id", "VARCHAR(36)")


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
