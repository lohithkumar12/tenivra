from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Tenant, User, ClinicTiming, AppointmentRule
from app.schemas import (
    TenantResponse,
    ClinicProfileUpdate,
    ClinicTimingBulk,
    ClinicTimingResponse,
    AppointmentRuleUpdate,
    AppointmentRuleResponse,
)
from app.deps import require_clinic_admin

router = APIRouter(prefix="/api/clinic", tags=["clinic"])


def _tenant(user: User, db: Session) -> Tenant:
    t = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Clinic not found")
    return t


# ── Profile ──────────────────────────────────────────────────────────────

@router.get("/profile", response_model=TenantResponse)
def get_profile(db: Session = Depends(get_db), user: User = Depends(require_clinic_admin)):
    return _tenant(user, db)


@router.patch("/profile", response_model=TenantResponse)
def update_profile(
    body: ClinicProfileUpdate, db: Session = Depends(get_db), user: User = Depends(require_clinic_admin)
):
    tenant = _tenant(user, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(tenant, field, value)
    db.commit()
    db.refresh(tenant)
    return tenant


# ── Timings ──────────────────────────────────────────────────────────────

@router.get("/timings", response_model=list[ClinicTimingResponse])
def get_timings(db: Session = Depends(get_db), user: User = Depends(require_clinic_admin)):
    return (
        db.query(ClinicTiming)
        .filter(ClinicTiming.tenant_id == user.tenant_id)
        .order_by(ClinicTiming.day_of_week)
        .all()
    )


@router.put("/timings", response_model=list[ClinicTimingResponse])
def set_timings(
    body: ClinicTimingBulk, db: Session = Depends(get_db), user: User = Depends(require_clinic_admin)
):
    db.query(ClinicTiming).filter(ClinicTiming.tenant_id == user.tenant_id).delete()
    rows = []
    for t in body.timings:
        row = ClinicTiming(tenant_id=user.tenant_id, **t.model_dump())
        db.add(row)
        rows.append(row)
    db.commit()
    for r in rows:
        db.refresh(r)
    return rows


# ── Appointment rules ────────────────────────────────────────────────────

@router.get("/appointment-rules", response_model=AppointmentRuleResponse)
def get_rules(db: Session = Depends(get_db), user: User = Depends(require_clinic_admin)):
    rules = db.query(AppointmentRule).filter(AppointmentRule.tenant_id == user.tenant_id).first()
    if not rules:
        rules = AppointmentRule(tenant_id=user.tenant_id)
        db.add(rules)
        db.commit()
        db.refresh(rules)
    return rules


@router.put("/appointment-rules", response_model=AppointmentRuleResponse)
def set_rules(
    body: AppointmentRuleUpdate, db: Session = Depends(get_db), user: User = Depends(require_clinic_admin)
):
    rules = db.query(AppointmentRule).filter(AppointmentRule.tenant_id == user.tenant_id).first()
    if not rules:
        rules = AppointmentRule(tenant_id=user.tenant_id)
        db.add(rules)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(rules, field, value)
    db.commit()
    db.refresh(rules)
    return rules
