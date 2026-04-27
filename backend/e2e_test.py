"""
End-to-end test: creates 5 clinics, 15 patients, books appointments across all.
Simulates real multi-tenant usage to validate the platform before going live.

Run:  python e2e_test.py          (requires backend running at 127.0.0.1:8000)
"""
import json
import urllib.request
import urllib.error
import time
from datetime import datetime, timedelta

BASE = "http://127.0.0.1:8000"
PASS = 0
FAIL = 0
ERRORS = []


def req(method, path, body=None, token=None):
    url = BASE + path
    data = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(r)
        raw = resp.read().decode()
        return resp.status, json.loads(raw) if raw.strip() else {}
    except urllib.error.HTTPError as e:
        try:
            detail = json.loads(e.read().decode())
        except Exception:
            detail = e.reason
        return e.code, detail


def check(name, status, expected, body=None):
    global PASS, FAIL
    ok = status == expected
    icon = "PASS" if ok else "FAIL"
    print(f"  [{icon}] {name}  (HTTP {status}, expected {expected})")
    if not ok:
        FAIL += 1
        ERRORS.append(f"{name}: got {status}, expected {expected}, body={body}")
    else:
        PASS += 1
    return ok


def next_weekday(start_days=3, weekday=0):
    """Return a future date string for a given weekday (0=Mon). Stays within 28 days."""
    d = datetime.now() + timedelta(days=start_days)
    while d.weekday() != weekday:
        d += timedelta(days=1)
    if (d - datetime.now()).days > 28:
        d -= timedelta(weeks=4)
    return d.strftime("%Y-%m-%d")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CLINIC DATA — 5 realistic Indian clinics
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

uid = str(int(time.time()))[-6:]

CLINICS = [
    {
        "clinic_name": f"Care Plus Dental {uid}",
        "admin_name": "Dr. Arjun Mehta",
        "admin_email": f"arjun.mehta{uid}@careplus.in",
        "admin_password": "dental123",
        "phone": "+91 98001 11001",
        "profile": {
            "address": "12, MG Road, Indiranagar, Bangalore 560038",
            "description": "Modern dental care with painless procedures. Specialists in orthodontics, implants, and cosmetic dentistry.",
            "specializations": ["Dentistry", "Orthodontics", "Cosmetic Dentistry"],
        },
        "doctors": [
            {"name": "Dr. Arjun Mehta", "specialization": "Orthodontics", "qualification": "BDS, MDS (Ortho)",
             "bio": "10+ years in braces and aligners.", "available_days": ["Monday","Tuesday","Wednesday","Thursday","Friday"],
             "available_from": "09:00", "available_to": "18:00", "consultation_fee": 600},
            {"name": "Dr. Sneha Iyer", "specialization": "Cosmetic Dentistry", "qualification": "BDS, Fellowship Cosmetic Dentistry",
             "bio": "Expert in smile makeovers, veneers, and teeth whitening.", "available_days": ["Monday","Wednesday","Friday","Saturday"],
             "available_from": "10:00", "available_to": "17:00", "consultation_fee": 800},
        ],
        "services": [
            {"name": "Dental Checkup", "description": "Full dental examination with X-ray.", "duration_minutes": 30, "fee": 500, "appointment_required": True},
            {"name": "Teeth Cleaning", "description": "Professional scaling and polishing.", "duration_minutes": 45, "fee": 1200, "appointment_required": True},
            {"name": "Braces Consultation", "description": "Assessment for orthodontic treatment.", "duration_minutes": 30, "fee": 600, "appointment_required": True},
        ],
        "open_days": [0, 1, 2, 3, 4, 5],
    },
    {
        "clinic_name": f"Netra Eye Hospital {uid}",
        "admin_name": "Dr. Kavitha Rao",
        "admin_email": f"kavitha.rao{uid}@netraeye.in",
        "admin_password": "netra123",
        "phone": "+91 98002 22002",
        "profile": {
            "address": "45, Banjara Hills Road No. 3, Hyderabad 500034",
            "description": "Advanced eye care hospital offering LASIK, cataract surgery, and comprehensive ophthalmology services.",
            "specializations": ["Ophthalmology", "LASIK", "Retina"],
        },
        "doctors": [
            {"name": "Dr. Kavitha Rao", "specialization": "Ophthalmology", "qualification": "MBBS, MS (Ophthalmology)",
             "bio": "15 years in cataract and refractive surgery.", "available_days": ["Monday","Tuesday","Wednesday","Thursday","Friday"],
             "available_from": "08:00", "available_to": "16:00", "consultation_fee": 700},
        ],
        "services": [
            {"name": "Eye Examination", "description": "Complete vision and eye health check.", "duration_minutes": 30, "fee": 500, "appointment_required": True},
            {"name": "LASIK Consultation", "description": "Pre-LASIK assessment and counseling.", "duration_minutes": 45, "fee": 1000, "appointment_required": True},
        ],
        "open_days": [0, 1, 2, 3, 4, 5],
    },
    {
        "clinic_name": f"Arogya Ayurveda {uid}",
        "admin_name": "Dr. Ramesh Nair",
        "admin_email": f"ramesh.nair{uid}@arogya.in",
        "admin_password": "arogya123",
        "phone": "+91 98003 33003",
        "profile": {
            "address": "78, T. Nagar, Chennai 600017",
            "description": "Traditional Ayurvedic treatments combined with modern diagnostics. Panchakarma, yoga therapy, and wellness programs.",
            "specializations": ["Ayurveda", "Panchakarma", "Yoga Therapy"],
        },
        "doctors": [
            {"name": "Dr. Ramesh Nair", "specialization": "Ayurveda", "qualification": "BAMS, MD (Ayurveda)",
             "bio": "20 years in Panchakarma and chronic disease management.", "available_days": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
             "available_from": "07:00", "available_to": "14:00", "consultation_fee": 400},
            {"name": "Dr. Lakshmi Devi", "specialization": "Yoga Therapy", "qualification": "BNYS, MSc Yoga",
             "bio": "Certified yoga therapist specializing in stress and back pain.", "available_days": ["Monday","Wednesday","Friday"],
             "available_from": "06:00", "available_to": "12:00", "consultation_fee": 350},
        ],
        "services": [
            {"name": "Ayurvedic Consultation", "description": "Pulse diagnosis and treatment plan.", "duration_minutes": 45, "fee": 400, "appointment_required": True},
            {"name": "Panchakarma Session", "description": "Detox and rejuvenation therapy.", "duration_minutes": 90, "fee": 2500, "appointment_required": True},
            {"name": "Yoga Therapy Session", "description": "Personalized yoga for specific conditions.", "duration_minutes": 60, "fee": 500, "appointment_required": True},
        ],
        "open_days": [0, 1, 2, 3, 4, 5],
    },
    {
        "clinic_name": f"Little Stars Pediatrics {uid}",
        "admin_name": "Dr. Anita Deshmukh",
        "admin_email": f"anita.deshmukh{uid}@littlestars.in",
        "admin_password": "stars123",
        "phone": "+91 98004 44004",
        "profile": {
            "address": "23, Koregaon Park, Pune 411001",
            "description": "Child-friendly pediatric clinic with vaccination, developmental screening, and newborn care. Trusted by 2000+ families.",
            "specializations": ["Pediatrics", "Neonatology", "Vaccination"],
        },
        "doctors": [
            {"name": "Dr. Anita Deshmukh", "specialization": "Pediatrics", "qualification": "MBBS, MD (Pediatrics)",
             "bio": "12 years caring for children. Gentle approach.", "available_days": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
             "available_from": "09:00", "available_to": "19:00", "consultation_fee": 600},
        ],
        "services": [
            {"name": "Well Baby Checkup", "description": "Growth and development assessment.", "duration_minutes": 30, "fee": 500, "appointment_required": True},
            {"name": "Vaccination", "description": "As per national immunization schedule.", "duration_minutes": 15, "fee": 300, "appointment_required": False},
            {"name": "Sick Child Visit", "description": "Fever, cold, infections — urgent consultation.", "duration_minutes": 20, "fee": 600, "appointment_required": True},
        ],
        "open_days": [0, 1, 2, 3, 4, 5],
    },
    {
        "clinic_name": f"PhysioFit Rehab {uid}",
        "admin_name": "Dr. Suresh Kumar",
        "admin_email": f"suresh.kumar{uid}@physiofit.in",
        "admin_password": "physio123",
        "phone": "+91 98005 55005",
        "profile": {
            "address": "56, Sector 18, Noida 201301",
            "description": "Sports physiotherapy and rehabilitation centre. Advanced equipment, experienced therapists, and personalized recovery programs.",
            "specializations": ["Physiotherapy", "Sports Medicine", "Rehabilitation"],
        },
        "doctors": [
            {"name": "Dr. Suresh Kumar", "specialization": "Sports Physiotherapy", "qualification": "BPT, MPT (Sports)",
             "bio": "Worked with IPL teams and Olympic athletes.", "available_days": ["Monday","Tuesday","Wednesday","Thursday","Friday"],
             "available_from": "08:00", "available_to": "20:00", "consultation_fee": 800},
            {"name": "Dr. Priyanka Singh", "specialization": "Neuro Rehab", "qualification": "BPT, MPT (Neuro)",
             "bio": "Specializes in stroke recovery and spinal cord rehab.", "available_days": ["Monday","Wednesday","Friday","Saturday"],
             "available_from": "09:00", "available_to": "17:00", "consultation_fee": 700},
        ],
        "services": [
            {"name": "Physiotherapy Assessment", "description": "Full body movement and posture analysis.", "duration_minutes": 45, "fee": 800, "appointment_required": True},
            {"name": "Sports Rehab Session", "description": "Injury-specific rehabilitation program.", "duration_minutes": 60, "fee": 1500, "appointment_required": True},
            {"name": "Dry Needling", "description": "Trigger point therapy for muscle pain.", "duration_minutes": 30, "fee": 1000, "appointment_required": True},
        ],
        "open_days": [0, 1, 2, 3, 4],
    },
]

PATIENTS = [
    {"full_name": "Rahul Verma",       "email": f"rahul.verma{uid}@gmail.com",       "phone": "+91 90001 00001", "password": "test1234"},
    {"full_name": "Priya Krishnan",    "email": f"priya.k{uid}@gmail.com",           "phone": "+91 90001 00002", "password": "test1234"},
    {"full_name": "Amir Khan",         "email": f"amir.khan{uid}@gmail.com",         "phone": "+91 90001 00003", "password": "test1234"},
    {"full_name": "Deepa Iyer",        "email": f"deepa.iyer{uid}@gmail.com",        "phone": "+91 90001 00004", "password": "test1234"},
    {"full_name": "Vikash Gupta",      "email": f"vikash.g{uid}@gmail.com",          "phone": "+91 90001 00005", "password": "test1234"},
    {"full_name": "Neha Sharma",       "email": f"neha.sharma{uid}@gmail.com",       "phone": "+91 90001 00006", "password": "test1234"},
    {"full_name": "Sanjay Patel",      "email": f"sanjay.patel{uid}@gmail.com",      "phone": "+91 90001 00007", "password": "test1234"},
    {"full_name": "Ritu Agarwal",      "email": f"ritu.agarwal{uid}@gmail.com",      "phone": "+91 90001 00008", "password": "test1234"},
    {"full_name": "Karthik Reddy",     "email": f"karthik.r{uid}@gmail.com",         "phone": "+91 90001 00009", "password": "test1234"},
    {"full_name": "Anjali Menon",      "email": f"anjali.menon{uid}@gmail.com",      "phone": "+91 90001 00010", "password": "test1234"},
    {"full_name": "Rohan Das",         "email": f"rohan.das{uid}@gmail.com",         "phone": "+91 90001 00011", "password": "test1234"},
    {"full_name": "Swati Joshi",       "email": f"swati.joshi{uid}@gmail.com",       "phone": "+91 90001 00012", "password": "test1234"},
    {"full_name": "Manoj Tiwari",      "email": f"manoj.tiwari{uid}@gmail.com",      "phone": "+91 90001 00013", "password": "test1234"},
    {"full_name": "Pooja Nair",        "email": f"pooja.nair{uid}@gmail.com",        "phone": "+91 90001 00014", "password": "test1234"},
    {"full_name": "Arjun Saxena",      "email": f"arjun.saxena{uid}@gmail.com",      "phone": "+91 90001 00015", "password": "test1234"},
]

print("=" * 70)
print("TENIVRA E2E TEST - 5 Clinics, 15 Patients, Full Booking Flow")
print("=" * 70)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PHASE 1: Create 5 clinics via self-service signup
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
print("\n" + "=" * 70)
print("PHASE 1: Clinic Signups")
print("=" * 70)

clinic_tokens = []
clinic_slugs = []

for c in CLINICS:
    s, b = req("POST", "/api/auth/signup", {
        "clinic_name": c["clinic_name"],
        "admin_name": c["admin_name"],
        "admin_email": c["admin_email"],
        "admin_password": c["admin_password"],
        "phone": c["phone"],
    })
    ok = check(f"Signup: {c['clinic_name']}", s, 201, b)
    if ok:
        clinic_tokens.append(b["access_token"])
        # derive slug from response
        user_resp = b.get("user", {})
        # need to get profile to find slug
    else:
        clinic_tokens.append(None)
    time.sleep(0.3)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PHASE 2: Each clinic sets up profile, doctors, services, timings
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
print("\n" + "=" * 70)
print("PHASE 2: Clinic Setup (Profile, Doctors, Services, Timings)")
print("=" * 70)

for i, c in enumerate(CLINICS):
    t = clinic_tokens[i]
    if not t:
        print(f"\n  [SKIP] {c['clinic_name']} — signup failed")
        clinic_slugs.append(None)
        continue

    print(f"\n-- Setting up: {c['clinic_name']} --")

    # Update profile
    s, b = req("PATCH", "/api/clinic/profile", c["profile"], t)
    check(f"  Profile update", s, 200, b)
    slug = b.get("slug", "")
    clinic_slugs.append(slug)

    # Add doctors
    doctor_ids = []
    for doc in c["doctors"]:
        s, b = req("POST", "/api/clinic/doctors", doc, t)
        ok = check(f"  Add doctor: {doc['name']}", s, 201, b)
        doctor_ids.append(b.get("id") if ok else None)

    # Add services (link to first doctor if available)
    service_ids = []
    for svc in c["services"]:
        s, b = req("POST", "/api/clinic/services", svc, t)
        ok = check(f"  Add service: {svc['name']}", s, 201, b)
        service_ids.append(b.get("id") if ok else None)

    # Set timings
    timings = []
    for day in range(7):
        is_open = day in c["open_days"]
        timings.append({
            "day_of_week": day,
            "is_open": is_open,
            "open_time": "09:00" if is_open else None,
            "close_time": "18:00" if is_open else None,
            "break_start": "13:00" if is_open else None,
            "break_end": "14:00" if is_open else None,
        })
    s, b = req("PUT", "/api/clinic/timings", {"timings": timings}, t)
    check(f"  Set timings", s, 200, b)

    # Check onboarding status
    s, b = req("GET", "/api/clinic/onboarding", token=t)
    check(f"  Onboarding status", s, 200, b)
    if s == 200:
        has_all = b.get("has_doctors") and b.get("has_services") and b.get("has_open_days")
        print(f"     doctors={b.get('has_doctors')} services={b.get('has_services')} timings={b.get('has_open_days')} -> {'READY' if has_all else 'INCOMPLETE'}")

    # Mark onboarding complete
    if has_all:
        s, b = req("POST", "/api/clinic/onboarding/complete", {}, t)
        check(f"  Mark onboarding complete", s, 200, b)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PHASE 3: Register 15 patients
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
print("\n" + "=" * 70)
print("PHASE 3: Patient Registrations (15 patients)")
print("=" * 70)

patient_tokens = []
for p in PATIENTS:
    s, b = req("POST", "/api/auth/patient/signup", p)
    ok = check(f"Register: {p['full_name']}", s, 201, b)
    patient_tokens.append(b.get("access_token") if ok else None)
    time.sleep(0.15)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PHASE 4: Patients browse clinics, view profiles, ask AI, and book
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
print("\n" + "=" * 70)
print("PHASE 4: Patient Browsing & Booking")
print("=" * 70)

# Check the clinics directory first
s, b = req("GET", "/api/public/clinics")
check("Public clinic directory", s, 200, b)
if s == 200:
    print(f"     {len(b)} clinics in directory")

booking_count = 0
epoch_min = int(time.time() // 60)

for ci, slug in enumerate(clinic_slugs):
    if not slug:
        continue

    print(f"\n-- Patients visiting: {CLINICS[ci]['clinic_name']} ({slug}) --")

    # View public profile
    s, b = req("GET", f"/api/public/{slug}/profile")
    check(f"  View profile", s, 200, b)

    # View doctors
    s, b = req("GET", f"/api/public/{slug}/doctors")
    check(f"  View doctors", s, 200, b)
    pub_doctors = b if s == 200 else []

    # View services
    s, b = req("GET", f"/api/public/{slug}/services")
    check(f"  View services", s, 200, b)
    pub_services = b if s == 200 else []

    # View timings
    s, b = req("GET", f"/api/public/{slug}/timings")
    check(f"  View timings", s, 200, b)

    if not pub_services:
        print(f"  [SKIP] No services — can't book")
        continue

    # 3 patients book at each clinic
    patient_indices = [(ci * 3 + j) % len(PATIENTS) for j in range(3)]

    for j, pi in enumerate(patient_indices):
        pt = PATIENTS[pi]
        pt_token = patient_tokens[pi]

        svc = pub_services[j % len(pub_services)]
        doc_id = pub_doctors[j % len(pub_doctors)]["id"] if pub_doctors else None

        # Unique time for each booking — avoid 13:00-14:00 break, stay 09-12 or 14-17
        safe_hours = [9, 10, 11, 12, 14, 15, 16]
        hour = safe_hours[(epoch_min + ci * 3 + j * 2) % len(safe_hours)]
        minute = (epoch_min * 3 + ci * 17 + j * 11) % 55
        book_date = next_weekday(start_days=3 + ci + j, weekday=ci % 5)

        appt_body = {
            "patient_name": pt["full_name"],
            "patient_phone": pt["phone"],
            "patient_email": pt["email"],
            "service_id": svc["id"],
            "preferred_date": book_date,
            "preferred_time": f"{hour:02d}:{minute:02d}",
            "notes": f"E2E test booking by {pt['full_name']}",
        }
        if doc_id:
            appt_body["doctor_id"] = doc_id

        s, b = req("POST", f"/api/public/{slug}/appointments", appt_body, token=pt_token)
        ok = check(f"  Book: {pt['full_name']} -> {svc['name']} on {book_date}", s, 201, b)
        if ok:
            booking_count += 1
            if b.get("patient_user_id"):
                print(f"     [OK] patient_user_id linked")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PHASE 5: Clinic admins manage appointments
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
print("\n" + "=" * 70)
print("PHASE 5: Clinic Admins Managing Appointments")
print("=" * 70)

for ci, slug in enumerate(clinic_slugs):
    if not slug or not clinic_tokens[ci]:
        continue

    t = clinic_tokens[ci]
    print(f"\n-- Admin: {CLINICS[ci]['clinic_name']} --")

    s, b = req("GET", "/api/clinic/appointments", token=t)
    check(f"  List appointments", s, 200, b)
    appts = b if s == 200 else []
    print(f"     {len(appts)} appointments found")

    # Confirm the first appointment, reject none (leave as pending to test dashboard)
    if appts:
        first = appts[0]
        s, b = req("PATCH", f"/api/clinic/appointments/{first['id']}/status",
                    {"status": "confirmed", "admin_notes": "Confirmed via E2E test"}, t)
        check(f"  Confirm appt for {first.get('patient_name', '?')}", s, 200, b)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PHASE 6: Patients check their bookings
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
print("\n" + "=" * 70)
print("PHASE 6: Patients Checking Their Bookings")
print("=" * 70)

patients_with_bookings = 0
for pi, pt in enumerate(PATIENTS):
    pt_token = patient_tokens[pi]
    if not pt_token:
        continue
    s, b = req("GET", "/api/patient/appointments", token=pt_token)
    count = len(b) if s == 200 else 0
    if count > 0:
        patients_with_bookings += 1
        check(f"  {pt['full_name']}: {count} booking(s)", s, 200)
    else:
        check(f"  {pt['full_name']}: no bookings (visited later)", s, 200)

print(f"\n     {patients_with_bookings} patients have bookings")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PHASE 7: AI Assistant works for each clinic
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
print("\n" + "=" * 70)
print("PHASE 7: AI Assistant (1 question per clinic)")
print("=" * 70)

questions = [
    "What are your clinic timings?",
    "Which doctors are available?",
    "What is the consultation fee?",
    "How do I book an appointment?",
    "Do you accept walk-ins?",
]

for ci, slug in enumerate(clinic_slugs):
    if not slug:
        continue
    q = questions[ci % len(questions)]
    s, b = req("POST", f"/api/public/{slug}/assistant", {"message": q})
    rtype = b.get("type", "?") if s == 200 else "ERROR"
    check(f"  {CLINICS[ci]['clinic_name']}: '{q}' -> {rtype}", s, 200, b)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PHASE 8: Super admin sees all clinics
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
print("\n" + "=" * 70)
print("PHASE 8: Super Admin Overview")
print("=" * 70)

s, b = req("POST", "/api/auth/login", {"email": "super@tenivra.com", "password": "super123"})
if check("Super admin login", s, 200, b):
    super_token = b["access_token"]

    s, b = req("GET", "/api/admin/tenants", token=super_token)
    check("List all tenants", s, 200, b)
    if s == 200:
        print(f"     {len(b)} total tenants on platform")
        for t in b:
            print(f"       - {t.get('name')} ({t.get('slug')}) - {t.get('plan', 'free')} plan")

    s, b = req("GET", "/api/admin/metrics", token=super_token)
    check("Platform metrics", s, 200, b)
    if s == 200:
        print(f"       total_clinics: {b.get('total_clinics')}")
        print(f"       total_patients: {b.get('total_patients')}")
        print(f"       total_bookings: {b.get('total_bookings')}")
        print(f"       pending_bookings: {b.get('pending_bookings')}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# RESULTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
print("\n" + "=" * 70)
print(f"RESULTS: {PASS} passed, {FAIL} failed, {PASS + FAIL} total")
print(f"         {len(CLINICS)} clinics created, {len(PATIENTS)} patients registered, {booking_count} appointments booked")
print("=" * 70)

if ERRORS:
    print("\nFAILURES:")
    for e in ERRORS:
        print(f"  - {e}")
    print()
    exit(1)
else:
    print("\nAll tests passed! Platform is ready.\n")
    print("CLINIC LOGINS (use these to demo):")
    print("-" * 50)
    for i, c in enumerate(CLINICS):
        slug = clinic_slugs[i] if i < len(clinic_slugs) else "?"
        print(f"  {c['clinic_name']}")
        print(f"    Admin: {c['admin_email']} / {c['admin_password']}")
        print(f"    Public: /clinic/{slug}")
        print()

    print("PATIENT LOGINS (first 5):")
    print("-" * 50)
    for p in PATIENTS[:5]:
        print(f"  {p['full_name']}: {p['email']} / {p['password']}")
    print()
    exit(0)
