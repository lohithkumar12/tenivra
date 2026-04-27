from datetime import datetime, timedelta, timezone, date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
import bcrypt

from app.database import get_db
from app.models import Tenant, User, UserRole, AppointmentRule, Appointment
from app.schemas import (
    TenantCreate, TenantUpdate, TenantResponse, TenantSummary,
    PlatformMetrics, MetricDelta, TrendPoint, TopClinic, AtRiskClinic,
    RecentClinic, RecentPatient,
)
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


def _aware(dt) -> datetime:
    """SQLite returns naive UTC datetimes; make them aware for safe comparison."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


@router.get("/metrics", response_model=PlatformMetrics)
def platform_metrics(db: Session = Depends(get_db), _: User = Depends(require_super_admin)):
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    two_weeks_ago = now - timedelta(days=14)
    thirty_days_ago = now - timedelta(days=30)

    def count_in_range(model, start, end):
        return (
            db.query(func.count(model.id))
              .filter(model.created_at >= start, model.created_at < end)
              .scalar() or 0
        )

    total_clinics = db.query(func.count(Tenant.id)).scalar() or 0
    total_patients = (
        db.query(func.count(User.id))
          .filter(User.role == UserRole.PATIENT.value).scalar() or 0
    )
    total_bookings = db.query(func.count(Appointment.id)).scalar() or 0
    pending_bookings = (
        db.query(func.count(Appointment.id))
          .filter(Appointment.status == "pending").scalar() or 0
    )

    active_tenant_ids = {
        row[0] for row in db.query(Appointment.tenant_id)
                            .filter(Appointment.created_at >= week_ago)
                            .distinct().all()
    }
    active_clinics = len(active_tenant_ids)

    bookings_this_week = (
        db.query(func.count(Appointment.id))
          .filter(Appointment.created_at >= week_ago).scalar() or 0
    )
    avg_per_active = round(bookings_this_week / active_clinics, 1) if active_clinics else 0.0

    clinics_added = MetricDelta(
        current=count_in_range(Tenant, week_ago, now),
        previous=count_in_range(Tenant, two_weeks_ago, week_ago),
    )

    patients_q = db.query(User).filter(User.role == UserRole.PATIENT.value)
    patients_added = MetricDelta(
        current=patients_q.filter(User.created_at >= week_ago, User.created_at < now).count(),
        previous=patients_q.filter(User.created_at >= two_weeks_ago, User.created_at < week_ago).count(),
    )

    bookings_delta = MetricDelta(
        current=bookings_this_week,
        previous=count_in_range(Appointment, two_weeks_ago, week_ago),
    )

    # ── 30-day trend (bucket in Python to stay DB-agnostic) ────────────
    def bucket(rows):
        out = {}
        for created_at in rows:
            d = _aware(created_at).date().isoformat()
            out[d] = out.get(d, 0) + 1
        return out

    clinic_dates = [r[0] for r in db.query(Tenant.created_at)
                                    .filter(Tenant.created_at >= thirty_days_ago).all()]
    patient_dates = [r[0] for r in db.query(User.created_at)
                                     .filter(User.role == UserRole.PATIENT.value,
                                             User.created_at >= thirty_days_ago).all()]
    booking_dates = [r[0] for r in db.query(Appointment.created_at)
                                     .filter(Appointment.created_at >= thirty_days_ago).all()]

    cb, pb, bb = bucket(clinic_dates), bucket(patient_dates), bucket(booking_dates)
    trend = []
    for i in range(29, -1, -1):
        d = (now - timedelta(days=i)).date().isoformat()
        trend.append(TrendPoint(date=d, clinics=cb.get(d, 0), patients=pb.get(d, 0), bookings=bb.get(d, 0)))

    # ── Top clinics by booking volume (last 30 days) ───────────────────
    top_rows = (
        db.query(
            Tenant.id, Tenant.name, Tenant.slug,
            func.count(Appointment.id).label("bc"),
            func.max(Appointment.created_at).label("last"),
        )
        .join(Appointment, Appointment.tenant_id == Tenant.id)
        .filter(Appointment.created_at >= thirty_days_ago)
        .group_by(Tenant.id, Tenant.name, Tenant.slug)
        .order_by(func.count(Appointment.id).desc())
        .limit(5)
        .all()
    )
    top_clinics = [
        TopClinic(id=r[0], name=r[1], slug=r[2], booking_count=r[3], last_booking_at=_aware(r[4]))
        for r in top_rows
    ]

    # ── At-risk: signed up >14 days ago, zero bookings ─────────────────
    at_risk_rows = (
        db.query(Tenant)
          .filter(Tenant.created_at <= two_weeks_ago, Tenant.is_active.is_(True))
          .all()
    )
    at_risk = []
    for t in at_risk_rows:
        bc = db.query(func.count(Appointment.id)).filter(Appointment.tenant_id == t.id).scalar() or 0
        if bc == 0:
            admin_user = (
                db.query(User)
                  .filter(User.tenant_id == t.id, User.role == UserRole.CLINIC_ADMIN.value)
                  .first()
            )
            created = _aware(t.created_at) or now
            at_risk.append(AtRiskClinic(
                id=t.id, name=t.name, slug=t.slug,
                signed_up_at=created,
                days_since_signup=(now - created).days,
                admin_email=admin_user.email if admin_user else None,
            ))
    at_risk.sort(key=lambda x: x.days_since_signup, reverse=True)
    at_risk = at_risk[:8]

    # ── Recent signups (last 7 days) ───────────────────────────────────
    recent_clinics = [
        RecentClinic(id=t.id, name=t.name, slug=t.slug, signed_up_at=_aware(t.created_at))
        for t in db.query(Tenant)
                   .filter(Tenant.created_at >= week_ago)
                   .order_by(Tenant.created_at.desc())
                   .limit(8).all()
    ]
    recent_patients = [
        RecentPatient(id=u.id, full_name=u.full_name, email=u.email, signed_up_at=_aware(u.created_at))
        for u in db.query(User)
                   .filter(User.role == UserRole.PATIENT.value, User.created_at >= week_ago)
                   .order_by(User.created_at.desc())
                   .limit(8).all()
    ]

    return PlatformMetrics(
        total_clinics=total_clinics,
        active_clinics=active_clinics,
        total_patients=total_patients,
        total_bookings=total_bookings,
        pending_bookings=pending_bookings,
        avg_bookings_per_active_clinic=avg_per_active,
        clinics_added=clinics_added,
        patients_added=patients_added,
        bookings=bookings_delta,
        trend_30d=trend,
        top_clinics=top_clinics,
        at_risk_clinics=at_risk,
        recent_clinics=recent_clinics,
        recent_patients=recent_patients,
    )
