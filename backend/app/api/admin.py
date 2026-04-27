from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
import bcrypt

from app.database import get_db
from app.models import (
    Tenant, User, UserRole, AppointmentRule, Appointment, Doctor, Service,
    SubscriptionStatus, TenantPlan,
)
from app.schemas import (
    TenantCreate, TenantUpdate, TenantResponse, TenantSummary,
    PlatformMetrics, MetricDelta, TrendPoint, TopClinic, AtRiskClinic,
    RecentClinic, RecentPatient, FunnelStage, CohortRow, CityStat, RevenueMetrics,
    ClinicInsights, ClinicInsightsTop, DigestPreview,
)
from app.deps import require_super_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ── Tenant CRUD ─────────────────────────────────────────────────────────

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
    payload = body.model_dump(exclude_unset=True)
    if "plan" in payload and payload["plan"] not in {p.value for p in TenantPlan}:
        raise HTTPException(status_code=400, detail="Invalid plan")
    if "subscription_status" in payload and payload["subscription_status"] not in {s.value for s in SubscriptionStatus}:
        raise HTTPException(status_code=400, detail="Invalid subscription status")
    for field, value in payload.items():
        setattr(tenant, field, value)
    db.commit()
    db.refresh(tenant)
    return tenant


# ── Helpers ─────────────────────────────────────────────────────────────

def _aware(dt) -> Optional[datetime]:
    """SQLite returns naive UTC datetimes; make them aware for safe comparison."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _normalize_days(days: Optional[int]) -> int:
    """Clamp the date-range param to one of {7, 30, 90, 365} (default 30)."""
    if not days or days <= 0:
        return 30
    if days >= 365:
        return 365
    if days >= 90:
        return 90
    if days >= 30:
        return 30
    return 7


# ── Metrics dashboard ───────────────────────────────────────────────────

@router.get("/metrics", response_model=PlatformMetrics)
def platform_metrics(
    days: Optional[int] = Query(30, description="Trend window in days: 7|30|90|365"),
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    days = _normalize_days(days)
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    two_weeks_ago = now - timedelta(days=14)
    window_start = now - timedelta(days=days)

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

    # WoW deltas always use 7-day buckets so they remain comparable across views
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

    # ── Trend across the selected window ───────────────────────────────
    def bucket(rows):
        out: dict[str, int] = {}
        for created_at in rows:
            d = _aware(created_at).date().isoformat()
            out[d] = out.get(d, 0) + 1
        return out

    clinic_dates = [r[0] for r in db.query(Tenant.created_at)
                                    .filter(Tenant.created_at >= window_start).all()]
    patient_dates = [r[0] for r in db.query(User.created_at)
                                     .filter(User.role == UserRole.PATIENT.value,
                                             User.created_at >= window_start).all()]
    booking_dates = [r[0] for r in db.query(Appointment.created_at)
                                     .filter(Appointment.created_at >= window_start).all()]

    cb, pb, bb = bucket(clinic_dates), bucket(patient_dates), bucket(booking_dates)
    trend = []
    for i in range(days - 1, -1, -1):
        d = (now - timedelta(days=i)).date().isoformat()
        trend.append(TrendPoint(date=d, clinics=cb.get(d, 0), patients=pb.get(d, 0), bookings=bb.get(d, 0)))

    # ── Top clinics by booking volume in the selected window ───────────
    top_rows = (
        db.query(
            Tenant.id, Tenant.name, Tenant.slug,
            func.count(Appointment.id).label("bc"),
            func.max(Appointment.created_at).label("last"),
        )
        .join(Appointment, Appointment.tenant_id == Tenant.id)
        .filter(Appointment.created_at >= window_start)
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

    # ── Recent signups (last 7 days, regardless of window) ─────────────
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

    # ── Activation funnel (clinics) ────────────────────────────────────
    clinics_with_doctors = {
        r[0] for r in db.query(Doctor.tenant_id).distinct().all()
    }
    booking_counts: dict[str, int] = {}
    for tid, cnt in (
        db.query(Appointment.tenant_id, func.count(Appointment.id))
          .group_by(Appointment.tenant_id).all()
    ):
        booking_counts[tid] = cnt
    clinics_with_first_booking = sum(1 for c in booking_counts.values() if c >= 1)
    clinics_with_engaged = sum(1 for c in booking_counts.values() if c >= 5)
    funnel_top = max(total_clinics, 1)
    funnel_stages = [
        ("Signed up", total_clinics),
        ("Added a doctor", len(clinics_with_doctors)),
        ("Got first booking", clinics_with_first_booking),
        ("5+ bookings", clinics_with_engaged),
    ]
    funnel = [
        FunnelStage(label=label, count=count, pct_of_top=round((count / funnel_top) * 100, 1))
        for label, count in funnel_stages
    ]

    # ── Cohort retention (weekly cohorts of clinics, 6 weeks) ──────────
    cohorts: list[CohortRow] = []
    cohort_count = 6
    today_date = now.date()
    monday = today_date - timedelta(days=today_date.weekday())  # this week's Monday
    week_starts = [(monday - timedelta(days=7 * i)) for i in range(cohort_count - 1, -1, -1)]
    tenants_by_cohort: dict[str, list[str]] = {}
    for t in db.query(Tenant).all():
        created = _aware(t.created_at)
        if not created:
            continue
        c_date = created.date()
        for ws in week_starts:
            we = ws + timedelta(days=7)
            if ws <= c_date < we:
                key = ws.isoformat()
                tenants_by_cohort.setdefault(key, []).append(t.id)
                break

    for idx, ws in enumerate(week_starts):
        key = ws.isoformat()
        members = tenants_by_cohort.get(key, [])
        size = len(members)
        weeks: list[Optional[float]] = []
        weeks_since = cohort_count - 1 - idx
        for w in range(cohort_count):
            if w > weeks_since:
                weeks.append(None)
                continue
            if size == 0:
                weeks.append(0.0)
                continue
            window_start_w = datetime.combine(ws + timedelta(days=7 * w), datetime.min.time(), tzinfo=timezone.utc)
            window_end_w = window_start_w + timedelta(days=7)
            active = (
                db.query(func.count(func.distinct(Appointment.tenant_id)))
                  .filter(
                      Appointment.tenant_id.in_(members),
                      Appointment.created_at >= window_start_w,
                      Appointment.created_at < window_end_w,
                  ).scalar() or 0
            )
            weeks.append(round((active / size) * 100, 1))
        label = ws.strftime("%b %d")
        cohorts.append(CohortRow(cohort_label=label, cohort_size=size, weeks=weeks))

    # ── Geographic insight (top cities) ────────────────────────────────
    city_clinic_rows = (
        db.query(Tenant.city, func.count(Tenant.id))
          .group_by(Tenant.city).all()
    )
    city_patient_rows = (
        db.query(Tenant.city, func.count(User.id))
          .join(User, User.tenant_id == Tenant.id)
          .filter(User.role == UserRole.PATIENT.value)
          .group_by(Tenant.city).all()
    )
    city_patient_map = {(c or "Unspecified"): n for c, n in city_patient_rows}
    cities = [
        CityStat(
            city=(c or "Unspecified"),
            clinic_count=n,
            patient_count=city_patient_map.get(c or "Unspecified", 0),
        )
        for c, n in city_clinic_rows
    ]
    cities.sort(key=lambda x: x.clinic_count, reverse=True)
    cities = cities[:10]

    # ── Revenue (Stripe-ready: pulls from local DB, no external call) ──
    paying_clinics = (
        db.query(func.count(Tenant.id))
          .filter(
              Tenant.subscription_status == SubscriptionStatus.ACTIVE.value,
              Tenant.monthly_price_cents > 0,
          ).scalar() or 0
    )
    trial_clinics = (
        db.query(func.count(Tenant.id))
          .filter(Tenant.subscription_status == SubscriptionStatus.TRIAL.value).scalar() or 0
    )
    mrr_cents = (
        db.query(func.coalesce(func.sum(Tenant.monthly_price_cents), 0))
          .filter(Tenant.subscription_status == SubscriptionStatus.ACTIVE.value).scalar() or 0
    )
    arpa_cents = round(mrr_cents / paying_clinics) if paying_clinics else 0
    revenue = RevenueMetrics(
        mrr_cents=int(mrr_cents),
        paying_clinics=int(paying_clinics),
        trial_clinics=int(trial_clinics),
        arpa_cents=int(arpa_cents),
    )

    return PlatformMetrics(
        days_window=days,
        total_clinics=total_clinics,
        active_clinics=active_clinics,
        total_patients=total_patients,
        total_bookings=total_bookings,
        pending_bookings=pending_bookings,
        avg_bookings_per_active_clinic=avg_per_active,
        clinics_added=clinics_added,
        patients_added=patients_added,
        bookings=bookings_delta,
        trend=trend,
        top_clinics=top_clinics,
        at_risk_clinics=at_risk,
        recent_clinics=recent_clinics,
        recent_patients=recent_patients,
        funnel=funnel,
        cohorts=cohorts,
        cities=cities,
        revenue=revenue,
    )


# ── Per-clinic insights (drill-down) ────────────────────────────────────

@router.get("/clinics/{tenant_id}/insights", response_model=ClinicInsights)
def clinic_insights(
    tenant_id: str,
    days: Optional[int] = Query(30),
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    days = _normalize_days(days)
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Clinic not found")

    now = datetime.now(timezone.utc)
    window_start = now - timedelta(days=days)
    created = _aware(tenant.created_at) or now

    total_bookings = (
        db.query(func.count(Appointment.id))
          .filter(Appointment.tenant_id == tenant_id).scalar() or 0
    )
    bookings_in_window = (
        db.query(func.count(Appointment.id))
          .filter(Appointment.tenant_id == tenant_id, Appointment.created_at >= window_start)
          .scalar() or 0
    )
    pending = (
        db.query(func.count(Appointment.id))
          .filter(Appointment.tenant_id == tenant_id, Appointment.status == "pending").scalar() or 0
    )
    completed = (
        db.query(func.count(Appointment.id))
          .filter(Appointment.tenant_id == tenant_id, Appointment.status == "completed").scalar() or 0
    )
    doctors_count = (
        db.query(func.count(Doctor.id)).filter(Doctor.tenant_id == tenant_id).scalar() or 0
    )
    services_count = (
        db.query(func.count(Service.id)).filter(Service.tenant_id == tenant_id).scalar() or 0
    )
    last_booking = (
        db.query(func.max(Appointment.created_at)).filter(Appointment.tenant_id == tenant_id).scalar()
    )

    # Trend
    rows = [
        r[0] for r in db.query(Appointment.created_at)
                        .filter(Appointment.tenant_id == tenant_id, Appointment.created_at >= window_start)
                        .all()
    ]
    bucket: dict[str, int] = {}
    for ts in rows:
        d = _aware(ts).date().isoformat()
        bucket[d] = bucket.get(d, 0) + 1
    trend = []
    for i in range(days - 1, -1, -1):
        d = (now - timedelta(days=i)).date().isoformat()
        trend.append(TrendPoint(date=d, clinics=0, patients=0, bookings=bucket.get(d, 0)))

    # Top services
    top_service_rows = (
        db.query(Service.name, func.count(Appointment.id))
          .join(Appointment, Appointment.service_id == Service.id)
          .filter(Appointment.tenant_id == tenant_id)
          .group_by(Service.name)
          .order_by(func.count(Appointment.id).desc())
          .limit(5).all()
    )
    top_services = [ClinicInsightsTop(name=n, count=c) for n, c in top_service_rows]

    # Top doctors (skip rows where doctor is null)
    top_doctor_rows = (
        db.query(Doctor.name, func.count(Appointment.id))
          .join(Appointment, Appointment.doctor_id == Doctor.id)
          .filter(Appointment.tenant_id == tenant_id)
          .group_by(Doctor.name)
          .order_by(func.count(Appointment.id).desc())
          .limit(5).all()
    )
    top_doctors = [ClinicInsightsTop(name=n, count=c) for n, c in top_doctor_rows]

    admin_user = (
        db.query(User)
          .filter(User.tenant_id == tenant_id, User.role == UserRole.CLINIC_ADMIN.value)
          .first()
    )

    return ClinicInsights(
        id=tenant.id,
        name=tenant.name,
        slug=tenant.slug,
        city=tenant.city,
        plan=tenant.plan or "free",
        subscription_status=tenant.subscription_status or "trial",
        monthly_price_cents=tenant.monthly_price_cents or 0,
        signed_up_at=created,
        days_active=(now - created).days,
        total_bookings=total_bookings,
        bookings_last_window=bookings_in_window,
        pending_bookings=pending,
        completed_bookings=completed,
        doctors_count=doctors_count,
        services_count=services_count,
        last_booking_at=_aware(last_booking),
        trend=trend,
        top_services=top_services,
        top_doctors=top_doctors,
        admin_email=admin_user.email if admin_user else None,
    )


# ── Email digest preview ───────────────────────────────────────────────

@router.get("/digest/preview", response_model=DigestPreview)
def digest_preview(
    period: str = Query("weekly", description="daily | weekly"),
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    period = period if period in {"daily", "weekly"} else "weekly"
    days = 1 if period == "daily" else 7
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=days)

    new_clinics = (
        db.query(func.count(Tenant.id))
          .filter(Tenant.created_at >= start).scalar() or 0
    )
    new_patients = (
        db.query(func.count(User.id))
          .filter(User.role == UserRole.PATIENT.value, User.created_at >= start).scalar() or 0
    )
    new_bookings = (
        db.query(func.count(Appointment.id))
          .filter(Appointment.created_at >= start).scalar() or 0
    )
    active_clinics = (
        db.query(func.count(func.distinct(Appointment.tenant_id)))
          .filter(Appointment.created_at >= start).scalar() or 0
    )
    pending = (
        db.query(func.count(Appointment.id))
          .filter(Appointment.status == "pending").scalar() or 0
    )

    period_label = "yesterday" if period == "daily" else "this week"
    subject = (
        f"Tenivra {period}: {new_clinics} new clinics, "
        f"{new_bookings} bookings, {new_patients} patients"
    )
    summary = [
        f"{new_clinics} new clinics signed up {period_label}",
        f"{new_patients} new patients registered {period_label}",
        f"{new_bookings} bookings created {period_label}",
        f"{active_clinics} clinics had at least one booking",
        f"{pending} bookings are pending review across the platform",
    ]
    bullets = "".join(f"<li style='margin:6px 0;'>{line}</li>" for line in summary)
    body_html = f"""
<div style="font-family: Inter, sans-serif; max-width: 560px; margin: auto; padding: 24px; color: #0f172a;">
  <div style="background: linear-gradient(135deg,#6366f1,#a855f7); padding: 20px; border-radius: 12px; color: white;">
    <div style="font-size: 13px; opacity: 0.85; text-transform: uppercase; letter-spacing: 1px;">Tenivra {period} digest</div>
    <div style="font-size: 22px; font-weight: 700; margin-top: 4px;">{subject}</div>
  </div>
  <div style="margin-top: 20px;">
    <div style="font-size: 14px; color: #475569;">Here's what happened {period_label} on Tenivra:</div>
    <ul style="font-size: 15px; line-height: 1.6; padding-left: 18px;">{bullets}</ul>
    <div style="margin-top: 24px; font-size: 13px; color: #64748b;">
      Open the dashboard for the full picture.
    </div>
  </div>
</div>
""".strip()
    body_text = subject + "\n\n" + "\n".join(f"- {line}" for line in summary)
    return DigestPreview(
        subject=subject,
        period_label=period_label,
        summary_lines=summary,
        body_html=body_html,
        body_text=body_text,
        generated_at=now,
    )
