from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import bcrypt

from app.database import get_db
from app.models import Tenant, User, UserRole, AppointmentRule
from app.schemas import TenantCreate, TenantUpdate, TenantResponse, TenantSummary
from app.deps import require_super_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/tenants", response_model=list[TenantSummary])
def list_tenants(db: Session = Depends(get_db), _: User = Depends(require_super_admin)):
    return db.query(Tenant).order_by(Tenant.created_at.desc()).all()


@router.post("/tenants", response_model=TenantResponse, status_code=201)
def create_tenant(body: TenantCreate, db: Session = Depends(get_db), _: User = Depends(require_super_admin)):
    if db.query(Tenant).filter(Tenant.slug == body.slug).first():
        raise HTTPException(status_code=400, detail="Slug already taken")
    if db.query(User).filter(User.email == body.admin_email).first():
        raise HTTPException(status_code=400, detail="Admin email already registered")

    tenant = Tenant(
        name=body.name,
        slug=body.slug,
        email=body.email,
        phone=body.phone,
        address=body.address,
        description=body.description,
        specializations=body.specializations,
    )
    db.add(tenant)
    db.flush()

    db.add(User(
        tenant_id=tenant.id,
        email=body.admin_email,
        hashed_password=bcrypt.hashpw(body.admin_password.encode(), bcrypt.gensalt()).decode(),
        full_name=body.admin_name,
        role=UserRole.CLINIC_ADMIN.value,
    ))
    db.add(AppointmentRule(tenant_id=tenant.id))

    db.commit()
    db.refresh(tenant)
    return tenant


@router.get("/tenants/{tenant_id}", response_model=TenantResponse)
def get_tenant(tenant_id: str, db: Session = Depends(get_db), _: User = Depends(require_super_admin)):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant


@router.patch("/tenants/{tenant_id}", response_model=TenantResponse)
def update_tenant(
    tenant_id: str, body: TenantUpdate, db: Session = Depends(get_db), _: User = Depends(require_super_admin)
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(tenant, field, value)
    db.commit()
    db.refresh(tenant)
    return tenant
