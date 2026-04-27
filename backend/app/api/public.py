from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    Tenant, Doctor, Service, FAQ, ClinicTiming,
    AppointmentRule, Appointment, AppointmentStatus, User, UserRole,
)
from app.schemas import (
    TenantResponse, DoctorResponse, ServiceResponse, FAQResponse,
    ClinicTimingResponse, AppointmentRuleResponse,
    AppointmentCreate, AppointmentResponse, PublicClinicSummary,
    AssistantQuery, AssistantResponse,
)
from app.services.assistant import process_query
from app.deps import get_optional_user

router = APIRouter(prefix="/api/public", tags=["public"])


def _active_tenant(slug: str, db: Session) -> Tenant:
    t = db.query(Tenant).filter(Tenant.slug == slug, Tenant.is_active.is_(True)).first()
    if not t:
        raise HTTPException(status_code=404, detail="Clinic not found")
    return t


@router.get("/clinics", response_model=list[PublicClinicSummary])
def list_public_clinics(
    q: Optional[str] = Query(None, description="Search by name, address, specialization"),
    db: Session = Depends(get_db),
):
    """Public marketplace listing of all active clinics."""
    query = db.query(Tenant).filter(Tenant.is_active.is_(True))
    if q:
        like = f"%{q.lower()}%"
        query = query.filter(or_(
            func.lower(Tenant.name).like(like),
            func.lower(Tenant.address).like(like),
            func.lower(Tenant.description).like(like),
        ))
    tenants = query.order_by(Tenant.created_at.desc()).all()

    doc_counts = dict(
        db.query(Doctor.tenant_id, func.count(Doctor.id))
          .filter(Doctor.is_active.is_(True))
          .group_by(Doctor.tenant_id).all()
    )
    svc_counts = dict(
        db.query(Service.tenant_id, func.count(Service.id))
          .filter(Service.is_active.is_(True))
          .group_by(Service.tenant_id).all()
    )

    out = []
    for t in tenants:
        item = PublicClinicSummary.model_validate(t)
        item.doctor_count = doc_counts.get(t.id, 0)
        item.service_count = svc_counts.get(t.id, 0)
        out.append(item)
    return out


@router.get("/{slug}/profile", response_model=TenantResponse)
def public_profile(slug: str, db: Session = Depends(get_db)):
    return _active_tenant(slug, db)


@router.get("/{slug}/doctors", response_model=list[DoctorResponse])
def public_doctors(slug: str, db: Session = Depends(get_db)):
    t = _active_tenant(slug, db)
    return db.query(Doctor).filter(Doctor.tenant_id == t.id, Doctor.is_active.is_(True)).order_by(Doctor.name).all()


@router.get("/{slug}/services", response_model=list[ServiceResponse])
def public_services(slug: str, db: Session = Depends(get_db)):
    t = _active_tenant(slug, db)
    return db.query(Service).filter(Service.tenant_id == t.id, Service.is_active.is_(True)).order_by(Service.name).all()


@router.get("/{slug}/faqs", response_model=list[FAQResponse])
def public_faqs(slug: str, db: Session = Depends(get_db)):
    t = _active_tenant(slug, db)
    return db.query(FAQ).filter(FAQ.tenant_id == t.id, FAQ.is_active.is_(True)).order_by(FAQ.sort_order).all()


@router.get("/{slug}/timings", response_model=list[ClinicTimingResponse])
def public_timings(slug: str, db: Session = Depends(get_db)):
    t = _active_tenant(slug, db)
    return db.query(ClinicTiming).filter(ClinicTiming.tenant_id == t.id).order_by(ClinicTiming.day_of_week).all()


@router.get("/{slug}/appointment-rules", response_model=AppointmentRuleResponse)
def public_rules(slug: str, db: Session = Depends(get_db)):
    t = _active_tenant(slug, db)
    rules = db.query(AppointmentRule).filter(AppointmentRule.tenant_id == t.id).first()
    if not rules:
        return AppointmentRuleResponse(id="", tenant_id=t.id)
    return rules


@router.post("/{slug}/appointments", response_model=AppointmentResponse, status_code=201)
def book_appointment(
    slug: str,
    body: AppointmentCreate,
    db: Session = Depends(get_db),
    current: Optional[User] = Depends(get_optional_user),
):
    t = _active_tenant(slug, db)

    svc = db.query(Service).filter(Service.id == body.service_id, Service.tenant_id == t.id).first()
    if not svc:
        raise HTTPException(status_code=400, detail="Invalid service")

    rules = db.query(AppointmentRule).filter(AppointmentRule.tenant_id == t.id).first()
    initial = AppointmentStatus.PENDING.value
    if rules and not rules.manual_approval_required:
        initial = AppointmentStatus.CONFIRMED.value

    patient_user_id = None
    if current and current.role == UserRole.PATIENT.value:
        patient_user_id = current.id

    appt = Appointment(
        tenant_id=t.id,
        status=initial,
        patient_user_id=patient_user_id,
        **body.model_dump(),
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)

    r = AppointmentResponse.model_validate(appt)
    r.service_name = svc.name
    if appt.doctor:
        r.doctor_name = appt.doctor.name
    r.clinic_name = t.name
    r.clinic_slug = t.slug
    return r


@router.post("/{slug}/assistant", response_model=AssistantResponse)
def assistant_chat(slug: str, body: AssistantQuery, db: Session = Depends(get_db)):
    t = _active_tenant(slug, db)

    clinic_data = {
        "profile": TenantResponse.model_validate(t).model_dump(),
        "doctors": [DoctorResponse.model_validate(d).model_dump()
                     for d in db.query(Doctor).filter(Doctor.tenant_id == t.id, Doctor.is_active.is_(True)).all()],
        "services": [ServiceResponse.model_validate(s).model_dump()
                      for s in db.query(Service).filter(Service.tenant_id == t.id, Service.is_active.is_(True)).all()],
        "faqs": [FAQResponse.model_validate(f).model_dump()
                  for f in db.query(FAQ).filter(FAQ.tenant_id == t.id, FAQ.is_active.is_(True)).all()],
        "timings": [ClinicTimingResponse.model_validate(ct).model_dump()
                     for ct in db.query(ClinicTiming).filter(ClinicTiming.tenant_id == t.id).all()],
    }
    return process_query(body.message, clinic_data)
