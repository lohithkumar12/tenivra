from __future__ import annotations
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional


# ── Auth ─────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    email: str
    full_name: str
    role: str
    phone: Optional[str] = None
    tenant_id: Optional[str] = None


class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "clinic_admin"


class ClinicSignupRequest(BaseModel):
    clinic_name: str
    phone: Optional[str] = None
    admin_name: str
    admin_email: str
    admin_password: str


class PatientSignupRequest(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = None
    password: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


# ── Public clinic directory ──────────────────────────────────────────────

class PublicClinicSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    slug: str
    address: Optional[str] = None
    phone: Optional[str] = None
    description: Optional[str] = None
    specializations: list[str] = []
    doctor_count: int = 0
    service_count: int = 0


# ── Tenant ───────────────────────────────────────────────────────────────

class TenantCreate(BaseModel):
    name: str
    slug: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    description: Optional[str] = None
    specializations: list[str] = []
    admin_email: str
    admin_password: str
    admin_name: str


class TenantUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    description: Optional[str] = None
    specializations: Optional[list[str]] = None
    is_active: Optional[bool] = None
    plan: Optional[str] = None
    monthly_price_cents: Optional[int] = None
    subscription_status: Optional[str] = None


class TenantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    slug: str
    logo_url: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    description: Optional[str] = None
    specializations: list[str] = []
    is_active: bool
    plan: str = "free"
    monthly_price_cents: int = 0
    subscription_status: str = "trial"
    onboarding_completed: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class TenantSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    slug: str
    is_active: bool
    created_at: Optional[datetime] = None


# ── Platform metrics (super admin) ───────────────────────────────────────

class MetricDelta(BaseModel):
    current: int
    previous: int


class TrendPoint(BaseModel):
    date: str
    clinics: int
    patients: int
    bookings: int


class TopClinic(BaseModel):
    id: str
    name: str
    slug: str
    booking_count: int
    last_booking_at: Optional[datetime] = None


class AtRiskClinic(BaseModel):
    id: str
    name: str
    slug: str
    signed_up_at: datetime
    days_since_signup: int
    admin_email: Optional[str] = None


class RecentClinic(BaseModel):
    id: str
    name: str
    slug: str
    signed_up_at: datetime


class RecentPatient(BaseModel):
    id: str
    full_name: str
    email: str
    signed_up_at: datetime


class FunnelStage(BaseModel):
    label: str
    count: int
    pct_of_top: float


class CohortRow(BaseModel):
    cohort_label: str  # e.g. "Mar 31"
    cohort_size: int
    weeks: list[Optional[float]]  # retention % per week-from-signup, None = future


class CityStat(BaseModel):
    city: str
    clinic_count: int
    patient_count: int


class RevenueMetrics(BaseModel):
    mrr_cents: int
    paying_clinics: int
    trial_clinics: int
    arpa_cents: int  # average revenue per active clinic


class PlatformMetrics(BaseModel):
    days_window: int
    total_clinics: int
    active_clinics: int
    total_patients: int
    total_bookings: int
    pending_bookings: int
    avg_bookings_per_active_clinic: float
    clinics_added: MetricDelta
    patients_added: MetricDelta
    bookings: MetricDelta
    trend: list[TrendPoint]
    top_clinics: list[TopClinic]
    at_risk_clinics: list[AtRiskClinic]
    recent_clinics: list[RecentClinic]
    recent_patients: list[RecentPatient]
    funnel: list[FunnelStage]
    cohorts: list[CohortRow]
    cities: list[CityStat]
    revenue: RevenueMetrics


# ── Per-clinic insights ──────────────────────────────────────────────────

class ClinicInsightsTop(BaseModel):
    name: str
    count: int


class ClinicInsights(BaseModel):
    id: str
    name: str
    slug: str
    city: Optional[str] = None
    plan: str
    subscription_status: str
    monthly_price_cents: int
    signed_up_at: datetime
    days_active: int
    total_bookings: int
    bookings_last_window: int
    pending_bookings: int
    completed_bookings: int
    doctors_count: int
    services_count: int
    last_booking_at: Optional[datetime] = None
    trend: list[TrendPoint]
    top_services: list[ClinicInsightsTop]
    top_doctors: list[ClinicInsightsTop]
    admin_email: Optional[str] = None


# ── Email digest ─────────────────────────────────────────────────────────

class DigestPreview(BaseModel):
    subject: str
    period_label: str
    summary_lines: list[str]
    body_html: str
    body_text: str
    generated_at: datetime


# ── Clinic profile ───────────────────────────────────────────────────────

class ClinicProfileUpdate(BaseModel):
    name: Optional[str] = None
    logo_url: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    description: Optional[str] = None
    specializations: Optional[list[str]] = None
    onboarding_completed: Optional[bool] = None


class OnboardingStatusResponse(BaseModel):
    onboarding_completed: bool
    has_doctors: bool
    has_services: bool
    has_open_days: bool
    public_clinic_url: str
    brand_tagline: str = "Tenivra Pulse — verified slots & AI receptionist. Not generic automation."


# ── Doctor ───────────────────────────────────────────────────────────────

class DoctorCreate(BaseModel):
    name: str
    specialization: Optional[str] = None
    qualification: Optional[str] = None
    bio: Optional[str] = None
    available_days: list[str] = []
    available_from: Optional[str] = None
    available_to: Optional[str] = None
    consultation_fee: float = 0


class DoctorUpdate(BaseModel):
    name: Optional[str] = None
    specialization: Optional[str] = None
    qualification: Optional[str] = None
    bio: Optional[str] = None
    available_days: Optional[list[str]] = None
    available_from: Optional[str] = None
    available_to: Optional[str] = None
    consultation_fee: Optional[float] = None
    is_active: Optional[bool] = None


class DoctorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    tenant_id: str
    name: str
    specialization: Optional[str] = None
    qualification: Optional[str] = None
    bio: Optional[str] = None
    available_days: list[str] = []
    available_from: Optional[str] = None
    available_to: Optional[str] = None
    consultation_fee: float = 0
    is_active: bool = True
    created_at: Optional[datetime] = None


# ── Service ──────────────────────────────────────────────────────────────

class ServiceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    duration_minutes: int = 30
    fee: float = 0
    doctor_id: Optional[str] = None
    appointment_required: bool = True


class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    fee: Optional[float] = None
    doctor_id: Optional[str] = None
    appointment_required: Optional[bool] = None
    is_active: Optional[bool] = None


class ServiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    tenant_id: str
    name: str
    description: Optional[str] = None
    duration_minutes: int = 30
    fee: float = 0
    doctor_id: Optional[str] = None
    appointment_required: bool = True
    is_active: bool = True
    created_at: Optional[datetime] = None


# ── FAQ ──────────────────────────────────────────────────────────────────

class FAQCreate(BaseModel):
    question: str
    answer: str
    sort_order: int = 0


class FAQUpdate(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class FAQResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    tenant_id: str
    question: str
    answer: str
    sort_order: int = 0
    is_active: bool = True
    created_at: Optional[datetime] = None


# ── Clinic timing ────────────────────────────────────────────────────────

class ClinicTimingUpdate(BaseModel):
    day_of_week: int
    is_open: bool = True
    open_time: Optional[str] = None
    close_time: Optional[str] = None
    break_start: Optional[str] = None
    break_end: Optional[str] = None


class ClinicTimingBulk(BaseModel):
    timings: list[ClinicTimingUpdate]


class ClinicTimingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    tenant_id: str
    day_of_week: int
    is_open: bool
    open_time: Optional[str] = None
    close_time: Optional[str] = None
    break_start: Optional[str] = None
    break_end: Optional[str] = None


# ── Appointment rules ────────────────────────────────────────────────────

class AppointmentRuleUpdate(BaseModel):
    allow_same_day: Optional[bool] = None
    minimum_notice_hours: Optional[int] = None
    max_advance_days: Optional[int] = None
    walk_in_allowed: Optional[bool] = None
    manual_approval_required: Optional[bool] = None


class AppointmentRuleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    tenant_id: str
    allow_same_day: bool = True
    minimum_notice_hours: int = 2
    max_advance_days: int = 30
    walk_in_allowed: bool = True
    manual_approval_required: bool = True


# ── Appointment ──────────────────────────────────────────────────────────

class AppointmentCreate(BaseModel):
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    service_id: str
    doctor_id: Optional[str] = None
    preferred_date: str
    preferred_time: str
    notes: Optional[str] = None


class AppointmentStatusUpdate(BaseModel):
    status: str
    admin_notes: Optional[str] = None


class AppointmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    tenant_id: str
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    service_id: str
    doctor_id: Optional[str] = None
    patient_user_id: Optional[str] = None
    preferred_date: str
    preferred_time: str
    notes: Optional[str] = None
    status: str
    admin_notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    service_name: Optional[str] = None
    doctor_name: Optional[str] = None
    clinic_name: Optional[str] = None
    clinic_slug: Optional[str] = None
    tracking_code: Optional[str] = None


# ── Assistant ────────────────────────────────────────────────────────────

class AssistantHistoryTurn(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class AssistantQuery(BaseModel):
    message: str
    history: list[AssistantHistoryTurn] = Field(default_factory=list)


class BookingPrefill(BaseModel):
    """Filled by AI assistant when patient is ready to book — opens booking with query params."""
    service_id: Optional[str] = None
    doctor_id: Optional[str] = None
    preferred_date: Optional[str] = None
    preferred_time: Optional[str] = None
    notes_for_staff: Optional[str] = None


class AssistantResponse(BaseModel):
    message: str
    type: str = "text"
    data: Optional[dict] = None
    booking_prefill: Optional[BookingPrefill] = None
