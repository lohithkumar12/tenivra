from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Appointment, User, AppointmentStatus, Tenant
from app.schemas import AppointmentResponse, AppointmentStatusUpdate
from app.deps import require_clinic_workspace
from app.services.notifications import notify_appointment_status_change

router = APIRouter(prefix="/api/clinic/appointments", tags=["appointments"])


def _enrich(appt: Appointment) -> AppointmentResponse:
    r = AppointmentResponse.model_validate(appt)
    r.service_name = appt.service.name if appt.service else None
    r.doctor_name = appt.doctor.name if appt.doctor else None
    return r


@router.get("", response_model=list[AppointmentResponse])
def list_appointments(
    status: str | None = None,
    date: str | None = None,
    doctor_id: str | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_clinic_workspace),
):
    q = (
        db.query(Appointment)
        .options(joinedload(Appointment.service), joinedload(Appointment.doctor))
        .filter(Appointment.tenant_id == user.tenant_id)
    )
    if status:
        q = q.filter(Appointment.status == status)
    if date:
        q = q.filter(Appointment.preferred_date == date)
    if doctor_id:
        q = q.filter(Appointment.doctor_id == doctor_id)
    if search:
        pat = f"%{search}%"
        q = q.filter(Appointment.patient_name.ilike(pat) | Appointment.patient_phone.ilike(pat))
    return [_enrich(a) for a in q.order_by(Appointment.created_at.desc()).all()]


@router.get("/{appt_id}", response_model=AppointmentResponse)
def get_appointment(appt_id: str, db: Session = Depends(get_db), user: User = Depends(require_clinic_workspace)):
    appt = (
        db.query(Appointment)
        .options(joinedload(Appointment.service), joinedload(Appointment.doctor))
        .filter(Appointment.id == appt_id, Appointment.tenant_id == user.tenant_id)
        .first()
    )
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return _enrich(appt)


@router.patch("/{appt_id}/status", response_model=AppointmentResponse)
def update_status(
    appt_id: str,
    body: AppointmentStatusUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_clinic_workspace),
):
    appt = (
        db.query(Appointment)
        .options(joinedload(Appointment.service), joinedload(Appointment.doctor))
        .filter(Appointment.id == appt_id, Appointment.tenant_id == user.tenant_id)
        .first()
    )
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    valid = {s.value for s in AppointmentStatus}
    if body.status not in valid:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {', '.join(sorted(valid))}")

    appt.status = body.status
    if body.admin_notes is not None:
        appt.admin_notes = body.admin_notes
    db.commit()
    db.refresh(appt)

    tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
    if tenant:
        notify_appointment_status_change(
            patient_email=appt.patient_email,
            patient_phone=appt.patient_phone,
            patient_name=appt.patient_name,
            clinic_name=tenant.name,
            status=body.status,
            preferred_date=appt.preferred_date,
            preferred_time=appt.preferred_time,
        )

    return _enrich(appt)
