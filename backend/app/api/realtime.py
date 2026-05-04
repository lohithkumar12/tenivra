"""
SSE streaming endpoints + public tracking + auto-confirm scheduler.
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.database import get_db, SessionLocal
from app.models import Appointment, AppointmentStatus, Tenant, User, UserRole
from app.deps import require_clinic_workspace, require_patient
from app.services.sse import subscribe_tenant, subscribe_patient, notify_tenant, notify_patient
from app.services.notifications import notify_appointment_status_change
from app.schemas import AppointmentResponse
from app.config import get_settings
from app.rate_limit import limiter

router = APIRouter(tags=["realtime"])


def _user_from_query_token(token: str) -> User | None:
    """Resolve user from a JWT passed as query param (for EventSource which can't set headers)."""
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        user_id = payload.get("sub")
        if not user_id:
            return None
    except JWTError:
        return None
    db = SessionLocal()
    try:
        return db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
    finally:
        db.close()


# ── SSE streams ──────────────────────────────────────────────────────────

@router.get("/api/sse/clinic")
async def sse_clinic(token: str = Query(...)):
    user = _user_from_query_token(token)
    if not user or user.role not in (UserRole.CLINIC_ADMIN.value, UserRole.RECEPTIONIST.value) or not user.tenant_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return StreamingResponse(
        subscribe_tenant(user.tenant_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/api/sse/patient")
async def sse_patient(token: str = Query(...)):
    user = _user_from_query_token(token)
    if not user or user.role != UserRole.PATIENT.value:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return StreamingResponse(
        subscribe_patient(user.id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── Public appointment tracking ─────────────────────────────────────────

def _tracking_code(appt_id: str) -> str:
    return hashlib.sha256(appt_id.encode()).hexdigest()[:8].upper()


def make_tracking_code(appt_id: str) -> str:
    return _tracking_code(appt_id)


@router.get("/api/track/{code}")
def track_appointment(code: str, db: Session = Depends(get_db)):
    """Public endpoint — no auth needed. Returns appointment journey by tracking code."""
    appointments = db.query(Appointment).options(
        joinedload(Appointment.service),
        joinedload(Appointment.doctor),
        joinedload(Appointment.tenant),
    ).all()

    for appt in appointments:
        if _tracking_code(appt.id) == code.upper():
            steps = _build_journey(appt)
            return {
                "tracking_code": code.upper(),
                "patient_name": appt.patient_name,
                "service_name": appt.service.name if appt.service else None,
                "doctor_name": appt.doctor.name if appt.doctor else None,
                "clinic_name": appt.tenant.name if appt.tenant else None,
                "clinic_address": appt.tenant.address if appt.tenant else None,
                "preferred_date": appt.preferred_date,
                "preferred_time": appt.preferred_time,
                "status": appt.status,
                "admin_notes": appt.admin_notes,
                "created_at": appt.created_at.isoformat() if appt.created_at else None,
                "updated_at": appt.updated_at.isoformat() if appt.updated_at else None,
                "journey": steps,
            }

    raise HTTPException(status_code=404, detail="Tracking code not found")


class TrackingCancelRequest(BaseModel):
    phone: str


@router.post("/api/track/{code}/cancel")
@limiter.limit("5/minute")
def cancel_by_tracking(request: Request, code: str, body: TrackingCancelRequest, db: Session = Depends(get_db)):
    """Cancel an appointment using tracking code + phone verification."""
    appointments = db.query(Appointment).options(
        joinedload(Appointment.tenant),
    ).all()

    for appt in appointments:
        if _tracking_code(appt.id) != code.upper():
            continue

        # Verify phone: strip all non-digits and compare last 10
        req_digits = "".join(c for c in body.phone if c.isdigit())[-10:]
        appt_digits = "".join(c for c in appt.patient_phone if c.isdigit())[-10:]
        if req_digits != appt_digits or len(req_digits) < 10:
            raise HTTPException(status_code=403, detail="Phone number does not match the booking")

        if appt.status in (AppointmentStatus.COMPLETED.value, AppointmentStatus.CANCELLED.value):
            raise HTTPException(status_code=400, detail=f"Cannot cancel a {appt.status} appointment")

        appt.status = AppointmentStatus.CANCELLED.value
        db.commit()
        db.refresh(appt)

        if appt.tenant:
            notify_tenant(appt.tenant_id, "patient_cancelled", {
                "appointment_id": appt.id,
                "patient_name": appt.patient_name,
                "preferred_date": appt.preferred_date,
                "preferred_time": appt.preferred_time,
            })
            notify_appointment_status_change(
                patient_email=appt.patient_email,
                patient_phone=appt.patient_phone,
                patient_name=appt.patient_name,
                clinic_name=appt.tenant.name,
                status="cancelled",
                preferred_date=appt.preferred_date,
                preferred_time=appt.preferred_time,
            )

        return {"status": "cancelled", "message": "Appointment cancelled successfully"}

    raise HTTPException(status_code=404, detail="Tracking code not found")


def _build_journey(appt: Appointment) -> list[dict]:
    stages = [
        {"key": "booked", "label": "Booked", "done": True, "active": appt.status == "pending", "ts": appt.created_at.isoformat() if appt.created_at else None},
    ]

    if appt.status == "rejected":
        stages.append({"key": "rejected", "label": "Rejected", "done": True, "active": True, "ts": appt.updated_at.isoformat() if appt.updated_at else None})
        return stages

    if appt.status == "cancelled":
        stages.append({"key": "cancelled", "label": "Cancelled", "done": True, "active": True, "ts": appt.updated_at.isoformat() if appt.updated_at else None})
        return stages

    confirmed = appt.status in ("confirmed", "completed")
    stages.append({"key": "confirmed", "label": "Confirmed", "done": confirmed, "active": appt.status == "confirmed", "ts": appt.updated_at.isoformat() if confirmed else None})

    completed = appt.status == "completed"
    stages.append({"key": "visit", "label": "Visit Day", "done": completed, "active": completed, "ts": appt.updated_at.isoformat() if completed else None})

    return stages


# ── Auto-confirm runner (called from scheduler) ─────────────────────────

def auto_confirm_pending(db: Session, window_minutes: int = 15):
    """Confirm pending appointments older than `window_minutes`. Returns count."""
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=window_minutes)
    pending = (
        db.query(Appointment)
        .options(joinedload(Appointment.tenant))
        .filter(
            Appointment.status == AppointmentStatus.PENDING.value,
            Appointment.created_at <= cutoff,
        )
        .all()
    )
    count = 0
    for appt in pending:
        appt.status = AppointmentStatus.CONFIRMED.value
        db.commit()
        db.refresh(appt)
        count += 1

        if appt.tenant:
            notify_appointment_status_change(
                patient_email=appt.patient_email,
                patient_phone=appt.patient_phone,
                patient_name=appt.patient_name,
                clinic_name=appt.tenant.name,
                status="confirmed",
                preferred_date=appt.preferred_date,
                preferred_time=appt.preferred_time,
            )
            notify_tenant(appt.tenant_id, "status_change", {
                "appointment_id": appt.id,
                "status": "confirmed",
                "patient_name": appt.patient_name,
                "auto_confirmed": True,
            })
        if appt.patient_user_id:
            notify_patient(appt.patient_user_id, "status_change", {
                "appointment_id": appt.id,
                "status": "confirmed",
                "auto_confirmed": True,
            })

    return count
