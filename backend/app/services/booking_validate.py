"""
Verified-slot validation — Tenivra blocks impossible or double-booked times.
Other tools let patients pick anything; we enforce clinic hours + doctor schedules + conflicts.
"""

from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models import Appointment, AppointmentRule, AppointmentStatus, ClinicTiming, Doctor, Tenant
from app.schemas import AppointmentCreate

TZ = ZoneInfo("Asia/Kolkata")
DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def _minutes(hhmm: str) -> int:
    parts = hhmm.strip().split(":")
    return int(parts[0]) * 60 + int(parts[1])


def validate_public_booking(
    db: Session,
    tenant: Tenant,
    body: AppointmentCreate,
    rules: AppointmentRule | None,
    doctor: Doctor | None,
):
    """Raise HTTPException 400 if booking violates clinic rules, hours, or conflicts."""
    try:
        appt_dt = datetime.strptime(f"{body.preferred_date} {body.preferred_time}", "%Y-%m-%d %H:%M").replace(tzinfo=TZ)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date or time format. Use YYYY-MM-DD and HH:MM (24h).")

    now = datetime.now(TZ)

    # --- Appointment rules ---
    if rules:
        appt_date = appt_dt.date()
        today = now.date()
        days_ahead = (appt_date - today).days

        if days_ahead < 0:
            raise HTTPException(status_code=400, detail="Cannot book an appointment in the past.")

        if not rules.allow_same_day and days_ahead == 0:
            raise HTTPException(status_code=400, detail="Same-day bookings are not allowed for this clinic.")

        max_days = rules.max_advance_days or 30
        if days_ahead > max_days:
            raise HTTPException(
                status_code=400,
                detail=f"You can only book up to {max_days} days in advance.",
            )

        min_hours = rules.minimum_notice_hours or 0
        delta_h = (appt_dt - now).total_seconds() / 3600
        if delta_h < min_hours:
            raise HTTPException(
                status_code=400,
                detail=f"Please book at least {min_hours} hours ahead (clinic rule).",
            )

    weekday = appt_dt.weekday()  # Monday=0
    day_name = DAY_NAMES[weekday]

    # --- Clinic open + hours ---
    timings = (
        db.query(ClinicTiming)
        .filter(ClinicTiming.tenant_id == tenant.id)
        .all()
    )
    ct = next((t for t in timings if t.day_of_week == weekday), None)
    if not ct or not ct.is_open:
        raise HTTPException(
            status_code=400,
            detail=f"The clinic is closed on {day_name}s. Pick another day.",
        )
    if not ct.open_time or not ct.close_time:
        raise HTTPException(status_code=400, detail="Clinic hours are not configured for this day.")

    tmin = _minutes(body.preferred_time)
    open_m = _minutes(ct.open_time)
    close_m = _minutes(ct.close_time)
    if tmin < open_m or tmin > close_m:
        raise HTTPException(
            status_code=400,
            detail=f"Choose a time between {ct.open_time} and {ct.close_time} on {day_name}.",
        )
    if ct.break_start and ct.break_end:
        bs, be = _minutes(ct.break_start), _minutes(ct.break_end)
        if bs <= tmin <= be:
            raise HTTPException(
                status_code=400,
                detail=f"The clinic is on break ({ct.break_start}–{ct.break_end}). Pick another time.",
            )

    # --- Doctor schedule ---
    if doctor:
        avail = doctor.available_days or []
        ok_day = any(day_name.lower() == str(d).strip().lower() for d in avail)
        if avail and not ok_day:
            raise HTTPException(
                status_code=400,
                detail=f"{doctor.name} is not scheduled on {day_name}s. Choose another day or doctor.",
            )
        if doctor.available_from and doctor.available_to:
            df, dt = _minutes(doctor.available_from), _minutes(doctor.available_to)
            if not (df <= tmin <= dt):
                raise HTTPException(
                    status_code=400,
                    detail=f"{doctor.name} is available {doctor.available_from}–{doctor.available_to} on working days.",
                )

    # --- Conflict detection (verified slot — no double booking) ---
    terminal = {AppointmentStatus.CANCELLED.value, AppointmentStatus.REJECTED.value}

    q = db.query(Appointment).filter(
        Appointment.tenant_id == tenant.id,
        Appointment.preferred_date == body.preferred_date,
        Appointment.preferred_time == body.preferred_time,
        ~Appointment.status.in_(terminal),
    )
    if body.doctor_id:
        q = q.filter(Appointment.doctor_id == body.doctor_id)
    else:
        q = q.filter(or_(Appointment.doctor_id.is_(None), Appointment.doctor_id == body.doctor_id))

    if q.first():
        raise HTTPException(
            status_code=409,
            detail="That time slot was just taken. Please choose another time.",
        )
