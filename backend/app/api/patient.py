from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Appointment, AppointmentStatus, Tenant, Service, Doctor
from app.schemas import AppointmentResponse, UserResponse
from app.deps import require_patient

router = APIRouter(prefix="/api/patient", tags=["patient"])


@router.get("/me", response_model=UserResponse)
def patient_me(user: User = Depends(require_patient)):
    return UserResponse.model_validate(user)


@router.get("/appointments", response_model=list[AppointmentResponse])
def my_appointments(
    db: Session = Depends(get_db),
    user: User = Depends(require_patient),
):
    rows = (
        db.query(Appointment)
          .filter(Appointment.patient_user_id == user.id)
          .order_by(Appointment.created_at.desc())
          .all()
    )
    out = []
    for a in rows:
        r = AppointmentResponse.model_validate(a)
        if a.service:
            r.service_name = a.service.name
        if a.doctor:
            r.doctor_name = a.doctor.name
        if a.tenant:
            r.clinic_name = a.tenant.name
            r.clinic_slug = a.tenant.slug
        out.append(r)
    return out


@router.post("/appointments/{appointment_id}/cancel", response_model=AppointmentResponse)
def cancel_my_appointment(
    appointment_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_patient),
):
    appt = (
        db.query(Appointment)
          .filter(Appointment.id == appointment_id, Appointment.patient_user_id == user.id)
          .first()
    )
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if appt.status in (AppointmentStatus.COMPLETED.value, AppointmentStatus.CANCELLED.value):
        raise HTTPException(status_code=400, detail=f"Cannot cancel {appt.status} appointment")
    appt.status = AppointmentStatus.CANCELLED.value
    db.commit()
    db.refresh(appt)

    r = AppointmentResponse.model_validate(appt)
    if appt.service:
        r.service_name = appt.service.name
    if appt.doctor:
        r.doctor_name = appt.doctor.name
    if appt.tenant:
        r.clinic_name = appt.tenant.name
        r.clinic_slug = appt.tenant.slug
    return r
