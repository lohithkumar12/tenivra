import re
import secrets
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from datetime import datetime, timedelta, timezone
from jose import jwt
import bcrypt

from app.database import get_db
from app.config import get_settings
from app.models import User, Tenant, AppointmentRule, UserRole
from app.schemas import (
    LoginRequest, TokenResponse, UserResponse, ClinicSignupRequest, PatientSignupRequest,
    ForgotPasswordRequest, ResetPasswordRequest,
)
from app.deps import get_current_user
from app.services.notifications import send_password_reset_email
from app.rate_limit import limiter

router = APIRouter(prefix="/api/auth", tags=["auth"])


def create_access_token(user_id: str) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode({"sub": user_id, "exp": expire}, settings.secret_key, algorithm="HS256")


def slugify(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s or "clinic"


def normalize_email(email: str) -> str:
    return email.strip().lower()


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    email = normalize_email(body.email)
    user = db.query(User).filter(func.lower(User.email) == email).first()
    if not user or not bcrypt.checkpw(body.password.encode(), user.hashed_password.encode()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")
    return TokenResponse(access_token=create_access_token(user.id), user=UserResponse.model_validate(user))


@router.post("/signup", response_model=TokenResponse, status_code=201)
@limiter.limit("5/minute")
def signup(request: Request, body: ClinicSignupRequest, db: Session = Depends(get_db)):
    if len(body.admin_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    admin_email = normalize_email(body.admin_email)
    if db.query(User).filter(func.lower(User.email) == admin_email).first():
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
        email=admin_email,
        hashed_password=bcrypt.hashpw(body.admin_password.encode(), bcrypt.gensalt()).decode(),
        full_name=body.admin_name,
        role=UserRole.CLINIC_ADMIN.value,
    )
    db.add(user)
    db.add(AppointmentRule(tenant_id=tenant.id))

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Signup conflict. Try a different clinic name or email.")
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Unable to create account right now. Please try again.")
    db.refresh(user)
    return TokenResponse(access_token=create_access_token(user.id), user=UserResponse.model_validate(user))


@router.post("/patient/signup", response_model=TokenResponse, status_code=201)
@limiter.limit("5/minute")
def patient_signup(request: Request, body: PatientSignupRequest, db: Session = Depends(get_db)):
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    email = normalize_email(body.email)
    if db.query(User).filter(func.lower(User.email) == email).first():
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    user = User(
        tenant_id=None,
        email=email,
        phone=body.phone,
        hashed_password=bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode(),
        full_name=body.full_name,
        role=UserRole.PATIENT.value,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Unable to create account right now. Please try again.")
    db.refresh(user)
    return TokenResponse(access_token=create_access_token(user.id), user=UserResponse.model_validate(user))


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)):
    return UserResponse.model_validate(user)


@router.post("/forgot-password")
@limiter.limit("3/minute")
def forgot_password(request: Request, body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == email).first()
    if user:
        token = secrets.token_urlsafe(32)
        user.password_reset_token = token
        user.password_reset_expires = datetime.now(timezone.utc) + timedelta(hours=1)
        db.commit()
        settings = get_settings()
        link = f"{settings.public_app_url.rstrip('/')}/reset-password?token={token}"
        send_password_reset_email(user.email, user.full_name or "there", link)
    return {"ok": True, "detail": "If an account exists, we sent reset instructions."}


@router.post("/reset-password")
@limiter.limit("5/minute")
def reset_password(request: Request, body: ResetPasswordRequest, db: Session = Depends(get_db)):
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    user = db.query(User).filter(User.password_reset_token == body.token).first()
    now = datetime.now(timezone.utc)
    exp = user.password_reset_expires if user else None
    if exp is not None and exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if not user or not exp or exp < now:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    user.hashed_password = bcrypt.hashpw(body.new_password.encode(), bcrypt.gensalt()).decode()
    user.password_reset_token = None
    user.password_reset_expires = None
    db.commit()
    return {"ok": True}
