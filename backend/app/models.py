import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Text, Boolean, Integer, Float,
    DateTime, ForeignKey, JSON,
)
from sqlalchemy.orm import relationship
from app.database import Base


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    CLINIC_ADMIN = "clinic_admin"
    RECEPTIONIST = "receptionist"
    PATIENT = "patient"


class TenantPlan(str, enum.Enum):
    FREE = "free"
    STARTER = "starter"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class SubscriptionStatus(str, enum.Enum):
    TRIAL = "trial"
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELLED = "cancelled"


PLAN_DEFAULT_PRICE_CENTS = {
    TenantPlan.FREE.value: 0,
    TenantPlan.STARTER.value: 99900,    # ₹999/mo
    TenantPlan.PRO.value: 299900,       # ₹2999/mo
    TenantPlan.ENTERPRISE.value: 999900,
}


class AppointmentStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


def _uuid():
    return str(uuid.uuid4())


def _now():
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Tenant (clinic)
# ---------------------------------------------------------------------------
class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(String(36), primary_key=True, default=_uuid)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    logo_url = Column(String(500))
    address = Column(Text)
    city = Column(String(100), index=True)
    phone = Column(String(20))
    email = Column(String(255))
    description = Column(Text)
    specializations = Column(JSON, default=list)
    is_active = Column(Boolean, default=True)
    plan = Column(String(20), default=TenantPlan.FREE.value, nullable=False)
    monthly_price_cents = Column(Integer, default=0, nullable=False)
    subscription_status = Column(String(20), default=SubscriptionStatus.TRIAL.value, nullable=False)
    stripe_customer_id = Column(String(120))
    stripe_subscription_id = Column(String(120))
    created_at = Column(DateTime(timezone=True), default=_now)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now)

    users = relationship("User", back_populates="tenant", cascade="all, delete-orphan")
    doctors = relationship("Doctor", back_populates="tenant", cascade="all, delete-orphan")
    services = relationship("Service", back_populates="tenant", cascade="all, delete-orphan")
    faqs = relationship("FAQ", back_populates="tenant", cascade="all, delete-orphan")
    timings = relationship("ClinicTiming", back_populates="tenant", cascade="all, delete-orphan")
    appointment_rules = relationship(
        "AppointmentRule", back_populates="tenant", uselist=False, cascade="all, delete-orphan"
    )
    appointments = relationship("Appointment", back_populates="tenant", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id"), nullable=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(20))
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default=UserRole.CLINIC_ADMIN.value)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=_now)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now)

    tenant = relationship("Tenant", back_populates="users")
    appointments = relationship("Appointment", back_populates="patient_user")


# ---------------------------------------------------------------------------
# Doctor
# ---------------------------------------------------------------------------
class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(String(36), primary_key=True, default=_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id"), nullable=False)
    name = Column(String(255), nullable=False)
    specialization = Column(String(255))
    qualification = Column(String(500))
    bio = Column(Text)
    available_days = Column(JSON, default=list)
    available_from = Column(String(5))
    available_to = Column(String(5))
    consultation_fee = Column(Float, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=_now)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now)

    tenant = relationship("Tenant", back_populates="doctors")
    services = relationship("Service", back_populates="doctor")
    appointments = relationship("Appointment", back_populates="doctor")


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------
class Service(Base):
    __tablename__ = "services"

    id = Column(String(36), primary_key=True, default=_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id"), nullable=False)
    doctor_id = Column(String(36), ForeignKey("doctors.id"), nullable=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    duration_minutes = Column(Integer, default=30)
    fee = Column(Float, default=0)
    appointment_required = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=_now)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now)

    tenant = relationship("Tenant", back_populates="services")
    doctor = relationship("Doctor", back_populates="services")
    appointments = relationship("Appointment", back_populates="service")


# ---------------------------------------------------------------------------
# FAQ
# ---------------------------------------------------------------------------
class FAQ(Base):
    __tablename__ = "faqs"

    id = Column(String(36), primary_key=True, default=_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id"), nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=_now)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now)

    tenant = relationship("Tenant", back_populates="faqs")


# ---------------------------------------------------------------------------
# Clinic timing (one row per day-of-week per tenant)
# ---------------------------------------------------------------------------
class ClinicTiming(Base):
    __tablename__ = "clinic_timings"

    id = Column(String(36), primary_key=True, default=_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0 = Monday … 6 = Sunday
    is_open = Column(Boolean, default=True)
    open_time = Column(String(5))   # "09:00"
    close_time = Column(String(5))  # "18:00"
    break_start = Column(String(5))
    break_end = Column(String(5))
    created_at = Column(DateTime(timezone=True), default=_now)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now)

    tenant = relationship("Tenant", back_populates="timings")


# ---------------------------------------------------------------------------
# Appointment rules (one row per tenant)
# ---------------------------------------------------------------------------
class AppointmentRule(Base):
    __tablename__ = "appointment_rules"

    id = Column(String(36), primary_key=True, default=_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id"), unique=True, nullable=False)
    allow_same_day = Column(Boolean, default=True)
    minimum_notice_hours = Column(Integer, default=2)
    max_advance_days = Column(Integer, default=30)
    walk_in_allowed = Column(Boolean, default=True)
    manual_approval_required = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=_now)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now)

    tenant = relationship("Tenant", back_populates="appointment_rules")


# ---------------------------------------------------------------------------
# Appointment request
# ---------------------------------------------------------------------------
class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(String(36), primary_key=True, default=_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id"), nullable=False)
    service_id = Column(String(36), ForeignKey("services.id"), nullable=False)
    doctor_id = Column(String(36), ForeignKey("doctors.id"), nullable=True)
    patient_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    patient_name = Column(String(255), nullable=False)
    patient_phone = Column(String(20), nullable=False)
    patient_email = Column(String(255))
    preferred_date = Column(String(10), nullable=False)  # "2026-04-15"
    preferred_time = Column(String(5), nullable=False)   # "10:30"
    notes = Column(Text)
    status = Column(String(20), default=AppointmentStatus.PENDING.value)
    admin_notes = Column(Text)
    created_at = Column(DateTime(timezone=True), default=_now)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now)

    tenant = relationship("Tenant", back_populates="appointments")
    service = relationship("Service", back_populates="appointments")
    doctor = relationship("Doctor", back_populates="appointments")
    patient_user = relationship("User", back_populates="appointments", foreign_keys=[patient_user_id])
