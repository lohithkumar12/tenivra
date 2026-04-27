"""
Seed the database with a demo clinic.
Run:  python -m app.seed
"""
import bcrypt
from app.database import SessionLocal, engine, Base
from app.models import (
    Tenant, User, Doctor, Service, FAQ,
    ClinicTiming, AppointmentRule, Appointment,
    UserRole, AppointmentStatus, TenantPlan, SubscriptionStatus,
    PLAN_DEFAULT_PRICE_CENTS,
)


def _hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    if db.query(Tenant).filter(Tenant.slug == "sunrise-clinic").first():
        print("Demo data already exists — skipping.")
        db.close()
        return

    # ── Tenant ────────────────────────────────────────────────────────
    clinic = Tenant(
        name="Sunrise Clinic",
        slug="sunrise-clinic",
        email="info@sunriseclinic.in",
        phone="+91 98765 43210",
        address="Plot 42, Road No. 10, Jubilee Hills, Hyderabad, Telangana 500033",
        city="Hyderabad",
        description=(
            "Sunrise Clinic is a multi-specialty healthcare centre providing "
            "personalized care in dermatology, physiotherapy, and general wellness. "
            "Walk-ins welcome."
        ),
        specializations=["Dermatology", "Physiotherapy", "General Medicine"],
        plan=TenantPlan.STARTER.value,
        monthly_price_cents=PLAN_DEFAULT_PRICE_CENTS[TenantPlan.STARTER.value],
        subscription_status=SubscriptionStatus.ACTIVE.value,
        onboarding_completed=True,
    )
    db.add(clinic)
    db.flush()

    # ── Users ─────────────────────────────────────────────────────────
    db.add(User(
        tenant_id=clinic.id,
        email="admin@sunriseclinic.in",
        hashed_password=_hash("admin123"),
        full_name="Dr. Priya Sharma",
        role=UserRole.CLINIC_ADMIN.value,
    ))
    db.add(User(
        email="super@tenivra.com",
        hashed_password=_hash("super123"),
        full_name="Lohith Kumar",
        role=UserRole.SUPER_ADMIN.value,
    ))
    sample_patient = User(
        email="patient@tenivra.com",
        phone="+91 99887 76655",
        hashed_password=_hash("patient123"),
        full_name="Ananya Reddy",
        role=UserRole.PATIENT.value,
    )
    db.add(sample_patient)
    db.flush()

    # ── Doctors ───────────────────────────────────────────────────────
    doc1 = Doctor(
        tenant_id=clinic.id,
        name="Dr. Priya Sharma",
        specialization="Dermatology",
        qualification="MBBS, MD (Dermatology)",
        bio="12 years of experience in clinical and cosmetic dermatology.",
        available_days=["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        available_from="09:00",
        available_to="17:00",
        consultation_fee=500,
    )
    doc2 = Doctor(
        tenant_id=clinic.id,
        name="Dr. Ravi Teja",
        specialization="Physiotherapy",
        qualification="BPT, MPT (Orthopaedics)",
        bio="Specializes in sports injury rehabilitation and chronic pain management.",
        available_days=["Monday", "Wednesday", "Friday", "Saturday"],
        available_from="10:00",
        available_to="18:00",
        consultation_fee=400,
    )
    db.add_all([doc1, doc2])
    db.flush()

    # ── Services ──────────────────────────────────────────────────────
    svcs = [
        Service(tenant_id=clinic.id, name="General Consultation",
                description="Initial consultation and health assessment with a specialist.",
                duration_minutes=30, fee=500, appointment_required=True),
        Service(tenant_id=clinic.id, name="Follow-up Consultation",
                description="Review visit for existing patients.",
                duration_minutes=15, fee=300, appointment_required=True),
        Service(tenant_id=clinic.id, name="Skin Treatment Session",
                description="Customised dermatology treatment (chemical peel, laser, etc.).",
                duration_minutes=45, fee=1500, doctor_id=doc1.id, appointment_required=True),
        Service(tenant_id=clinic.id, name="Physiotherapy Session",
                description="One-on-one physiotherapy for pain or rehabilitation.",
                duration_minutes=45, fee=800, doctor_id=doc2.id, appointment_required=True),
    ]
    db.add_all(svcs)
    db.flush()

    # ── FAQs ──────────────────────────────────────────────────────────
    db.add_all([
        FAQ(tenant_id=clinic.id, sort_order=1,
            question="What are your clinic timings?",
            answer="We are open Monday to Saturday, 9 AM to 6 PM. Sunday is closed."),
        FAQ(tenant_id=clinic.id, sort_order=2,
            question="What is the consultation fee?",
            answer="General consultation starts at ₹500. Follow-up visits are ₹300. Specialist treatments vary."),
        FAQ(tenant_id=clinic.id, sort_order=3,
            question="Do I need a prior appointment?",
            answer="Appointments are recommended to avoid waiting. You can book online or call us."),
        FAQ(tenant_id=clinic.id, sort_order=4,
            question="Are walk-ins allowed?",
            answer="Yes, walk-ins are accepted subject to doctor availability. Appointments get priority."),
        FAQ(tenant_id=clinic.id, sort_order=5,
            question="Which doctor is available on Saturday?",
            answer="Dr. Ravi Teja (Physiotherapy) is available on Saturdays from 10 AM to 6 PM."),
        FAQ(tenant_id=clinic.id, sort_order=6,
            question="What documents should I bring?",
            answer="Please bring a valid ID, any previous prescriptions or reports, and your insurance card if applicable."),
    ])

    # ── Timings ───────────────────────────────────────────────────────
    for i in range(7):
        is_open = i < 6
        db.add(ClinicTiming(
            tenant_id=clinic.id,
            day_of_week=i,
            is_open=is_open,
            open_time="09:00" if is_open else None,
            close_time="18:00" if is_open else None,
            break_start="13:00" if is_open else None,
            break_end="14:00" if is_open else None,
        ))

    # ── Appointment rules ─────────────────────────────────────────────
    db.add(AppointmentRule(
        tenant_id=clinic.id,
        allow_same_day=True,
        minimum_notice_hours=2,
        max_advance_days=30,
        walk_in_allowed=True,
        manual_approval_required=True,
    ))

    # ── Sample appointments ───────────────────────────────────────────
    db.add_all([
        Appointment(
            tenant_id=clinic.id, service_id=svcs[0].id, doctor_id=doc1.id,
            patient_user_id=sample_patient.id,
            patient_name="Ananya Reddy", patient_phone="+91 99887 76655",
            patient_email="patient@tenivra.com",
            preferred_date="2026-04-10", preferred_time="10:00",
            notes="First visit, mild acne concerns.",
            status=AppointmentStatus.CONFIRMED.value,
        ),
        Appointment(
            tenant_id=clinic.id, service_id=svcs[3].id, doctor_id=doc2.id,
            patient_name="Vikram Patel", patient_phone="+91 98765 11223",
            preferred_date="2026-04-11", preferred_time="14:30",
            notes="Knee pain after sports injury.",
            status=AppointmentStatus.PENDING.value,
        ),
        Appointment(
            tenant_id=clinic.id, service_id=svcs[1].id,
            patient_name="Meera Joshi", patient_phone="+91 91234 56789",
            patient_email="meera.j@example.com",
            preferred_date="2026-04-09", preferred_time="11:00",
            status=AppointmentStatus.COMPLETED.value,
        ),
    ])

    db.commit()
    db.close()

    print("Demo data seeded successfully!")
    print("  Clinic admin  : admin@sunriseclinic.in / admin123")
    print("  Super admin   : super@tenivra.com / super123")
    print("  Sample patient: patient@tenivra.com / patient123")
    print("  Public page   : /clinic/sunrise-clinic")
    print("  Directory     : /clinics")


if __name__ == "__main__":
    seed()
