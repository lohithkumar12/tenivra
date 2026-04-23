from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import engine, Base, SessionLocal
from app.api import api_router


@asynccontextmanager
async def lifespan(application: FastAPI):
    Base.metadata.create_all(bind=engine)
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
