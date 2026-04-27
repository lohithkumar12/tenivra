import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from jose import jwt
import bcrypt

from app.database import get_db
from app.config import get_settings
from app.models import User, Tenant, AppointmentRule, UserRole
from app.schemas import LoginRequest, TokenResponse, UserResponse, ClinicSignupRequest, PatientSignupRequest
from app.deps import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


def create_access_token(user_id: str) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode({"sub": user_id, "exp": expire}, settings.secret_key, algorithm="HS256")


def slugify(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s or "clinic"


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not bcrypt.checkpw(body.password.encode(), user.hashed_password.encode()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")
    return TokenResponse(access_token=create_access_token(user.id), user=UserResponse.model_validate(user))


@router.post("/signup", response_model=TokenResponse, status_code=201)
def signup(body: ClinicSignupRequest, db: Session = Depends(get_db)):
    if len(body.admin_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if db.query(User).filter(User.email == body.admin_email).first():
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    base_slug = slugify(body.clinic_name)
    slug = base_slug
    suffix = 1
    while db.query(Tenant).filter(Tenant.slug == slug).first():
        suffix += 1
        slug = f"{base_slug}-{suffix}"

    tenant = Tenant(
        name=body.clinic_name,
        slug=slug,
        phone=body.phone,
    )
    db.add(tenant)
    db.flush()

    user = User(
        tenant_id=tenant.id,
        email=body.admin_email,
        hashed_password=bcrypt.hashpw(body.admin_password.encode(), bcrypt.gensalt()).decode(),
        full_name=body.admin_name,
        role=UserRole.CLINIC_ADMIN.value,
    )
    db.add(user)
    db.add(AppointmentRule(tenant_id=tenant.id))

    db.commit()
    db.refresh(user)
    return TokenResponse(access_token=create_access_token(user.id), user=UserResponse.model_validate(user))


@router.post("/patient/signup", response_model=TokenResponse, status_code=201)
def patient_signup(body: PatientSignupRequest, db: Session = Depends(get_db)):
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    user = User(
        tenant_id=None,
        email=body.email,
        phone=body.phone,
        hashed_password=bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode(),
        full_name=body.full_name,
        role=UserRole.PATIENT.value,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return TokenResponse(access_token=create_access_token(user.id), user=UserResponse.model_validate(user))


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)):
    return UserResponse.model_validate(user)
