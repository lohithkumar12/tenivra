"""
Comprehensive smoke test for all Tenivra API endpoints.
Run with: python smoke_test.py
"""
import json
import urllib.request
import urllib.error
import sys

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


print("=" * 60)
print("TENIVRA SMOKE TEST")
print("=" * 60)

# ── Health ──────────────────────────────────────────────────
print("\n-- Health Check --")
s, b = req("GET", "/api/health")
check("GET /api/health", s, 200, b)

# ── Auth: Clinic Admin Login ────────────────────────────────
print("\n-- Auth: Clinic Admin --")
s, b = req("POST", "/api/auth/login", {"email": "admin@sunriseclinic.in", "password": "admin123"})
check("POST /api/auth/login (clinic admin)", s, 200, b)
admin_token = b.get("access_token", "") if s == 200 else ""
admin_user = b.get("user", {}) if s == 200 else {}

s, b = req("GET", "/api/auth/me", token=admin_token)
check("GET /api/auth/me (clinic admin)", s, 200, b)

s, b = req("POST", "/api/auth/login", {"email": "bad@email.com", "password": "wrong"})
check("POST /api/auth/login (bad creds)", s, 401, b)

# ── Public Signup: Self-service Clinic Registration ─────────
print("\n-- Public Signup --")
import time
unique = str(int(time.time()))
s, b = req("POST", "/api/auth/signup", {
    "clinic_name": f"Smoke Test Clinic {unique}",
    "phone": "9876543210",
    "admin_name": "Smoke Owner",
    "admin_email": f"smoke{unique}@clinic.com",
    "admin_password": "smoke123",
})
check("POST /api/auth/signup (new clinic)", s, 201, b)
signup_token = b.get("access_token", "") if s == 201 else ""
signup_user = b.get("user", {}) if s == 201 else {}
if signup_token:
    s, b = req("GET", "/api/auth/me", token=signup_token)
    check("GET /api/auth/me (after signup)", s, 200, b)
    s, b = req("GET", "/api/clinic/profile", token=signup_token)
    check("GET /api/clinic/profile (new clinic)", s, 200, b)

s, b = req("POST", "/api/auth/signup", {
    "clinic_name": "Dup Email",
    "admin_name": "X",
    "admin_email": f"smoke{unique}@clinic.com",
    "admin_password": "smoke123",
})
check("POST /api/auth/signup (duplicate email -> 400)", s, 400, b)

s, b = req("POST", "/api/auth/signup", {
    "clinic_name": "Short Pwd",
    "admin_name": "X",
    "admin_email": f"shortpw{unique}@clinic.com",
    "admin_password": "12",
})
check("POST /api/auth/signup (short password -> 400)", s, 400, b)

# ── Auth: Super Admin Login ─────────────────────────────────
print("\n-- Auth: Super Admin --")
s, b = req("POST", "/api/auth/login", {"email": "super@tenivra.com", "password": "super123"})
check("POST /api/auth/login (super admin)", s, 200, b)
super_token = b.get("access_token", "") if s == 200 else ""

s, b = req("GET", "/api/auth/me", token=super_token)
check("GET /api/auth/me (super admin)", s, 200, b)

# ── Super Admin: Tenant CRUD ────────────────────────────────
print("\n-- Super Admin: Tenants --")
s, b = req("GET", "/api/admin/tenants", token=super_token)
check("GET /api/admin/tenants", s, 200, b)
tenant_count = len(b) if isinstance(b, list) else 0

# ── Super Admin: Platform Metrics ───────────────────────────
print("\n-- Super Admin: Metrics --")
s, b = req("GET", "/api/admin/metrics", token=super_token)
check("GET /api/admin/metrics", s, 200, b)
if s == 200 and isinstance(b, dict):
    expected_keys = {"days_window", "total_clinics", "active_clinics", "total_patients",
                     "total_bookings", "pending_bookings", "trend", "top_clinics",
                     "at_risk_clinics", "recent_clinics", "recent_patients", "clinics_added",
                     "patients_added", "bookings", "funnel", "cohorts", "cities", "revenue"}
    missing = expected_keys - set(b.keys())
    check("  metrics shape", 0 if missing else 200, 200, missing)
    check("  trend has 30 points (default)", 200 if len(b.get("trend", [])) == 30 else 0, 200)
    check("  funnel has 4 stages", 200 if len(b.get("funnel", [])) == 4 else 0, 200)
    rev = b.get("revenue", {}) or {}
    rev_keys = {"mrr_cents", "paying_clinics", "trial_clinics", "arpa_cents"}
    check("  revenue shape", 0 if (rev_keys - set(rev.keys())) else 200, 200)

s, b = req("GET", "/api/admin/metrics?days=7", token=super_token)
check("GET /api/admin/metrics?days=7", s, 200, b)
if s == 200 and isinstance(b, dict):
    check("  ?days=7 returns 7 trend points", 200 if len(b.get("trend", [])) == 7 else 0, 200)

s, b = req("GET", "/api/admin/metrics", token=admin_token)
check("GET /api/admin/metrics (clinic admin -> 403)", s, 403, b)

# Per-clinic insights
if tenant_count > 0:
    tenants_resp = req("GET", "/api/admin/tenants", token=super_token)[1]
    if isinstance(tenants_resp, list) and tenants_resp:
        first_tid = tenants_resp[0]["id"]
        s, b = req("GET", f"/api/admin/clinics/{first_tid}/insights?days=30", token=super_token)
        check("GET /api/admin/clinics/:id/insights", s, 200, b)
        if s == 200 and isinstance(b, dict):
            insight_keys = {"id", "name", "slug", "plan", "subscription_status",
                            "monthly_price_cents", "trend", "top_services", "top_doctors"}
            check("  insights shape", 0 if (insight_keys - set(b.keys())) else 200, 200)

# Email digest preview
s, b = req("GET", "/api/admin/digest/preview?period=weekly", token=super_token)
check("GET /api/admin/digest/preview?period=weekly", s, 200, b)
if s == 200 and isinstance(b, dict):
    digest_keys = {"subject", "period_label", "summary_lines", "body_html", "body_text"}
    check("  digest shape", 0 if (digest_keys - set(b.keys())) else 200, 200)

tenant_unique = str(int(time.time())) + "x"
s, b = req("POST", "/api/admin/tenants", {
    "name": f"Test Clinic {tenant_unique}",
    "slug": f"test-clinic-{tenant_unique}",
    "email": "test@clinic.com",
    "phone": "9876543210",
    "address": "Test Address",
    "description": "Smoke test clinic",
    "specializations": ["General"],
    "admin_email": f"testadmin{tenant_unique}@clinic.com",
    "admin_password": "test123",
    "admin_name": "Test Admin",
}, token=super_token)
check("POST /api/admin/tenants (create)", s, 201, b)
test_tenant_id = b.get("id", "") if s == 201 else ""

if test_tenant_id:
    s, b = req("GET", f"/api/admin/tenants/{test_tenant_id}", token=super_token)
    check("GET /api/admin/tenants/:id", s, 200, b)

    s, b = req("PATCH", f"/api/admin/tenants/{test_tenant_id}", {
        "description": "Updated desc"
    }, token=super_token)
    check("PATCH /api/admin/tenants/:id", s, 200, b)

# ── Clinic Admin: Profile ───────────────────────────────────
print("\n-- Clinic Admin: Profile --")
s, b = req("GET", "/api/clinic/profile", token=admin_token)
check("GET /api/clinic/profile", s, 200, b)

s, b = req("PATCH", "/api/clinic/profile", {
    "description": "Updated by smoke test"
}, token=admin_token)
check("PATCH /api/clinic/profile", s, 200, b)

# ── Clinic Admin: Doctors CRUD ──────────────────────────────
print("\n-- Clinic Admin: Doctors --")
s, b = req("GET", "/api/clinic/doctors", token=admin_token)
check("GET /api/clinic/doctors", s, 200, b)
existing_doctors = b if isinstance(b, list) else []

s, b = req("POST", "/api/clinic/doctors", {
    "name": "Dr. Smoke Test",
    "specialization": "Testing",
    "qualification": "MBBS",
    "available_days": ["Monday", "Wednesday"],
    "available_from": "10:00",
    "available_to": "17:00",
    "consultation_fee": 500,
}, token=admin_token)
check("POST /api/clinic/doctors (create)", s, 201, b)
test_doc_id = b.get("id", "") if s == 201 else ""

if test_doc_id:
    s, b = req("GET", f"/api/clinic/doctors/{test_doc_id}", token=admin_token)
    check("GET /api/clinic/doctors/:id", s, 200, b)

    s, b = req("PATCH", f"/api/clinic/doctors/{test_doc_id}", {
        "consultation_fee": 600
    }, token=admin_token)
    check("PATCH /api/clinic/doctors/:id", s, 200, b)

    s, b = req("DELETE", f"/api/clinic/doctors/{test_doc_id}", token=admin_token)
    check("DELETE /api/clinic/doctors/:id", s, 204, b)

# ── Clinic Admin: Services CRUD ─────────────────────────────
print("\n-- Clinic Admin: Services --")
s, b = req("GET", "/api/clinic/services", token=admin_token)
check("GET /api/clinic/services", s, 200, b)
existing_services = b if isinstance(b, list) else []

s, b = req("POST", "/api/clinic/services", {
    "name": "Smoke Test Service",
    "description": "For testing",
    "duration_minutes": 15,
    "fee": 200,
    "appointment_required": True,
}, token=admin_token)
check("POST /api/clinic/services (create)", s, 201, b)
test_svc_id = b.get("id", "") if s == 201 else ""

if test_svc_id:
    s, b = req("GET", f"/api/clinic/services/{test_svc_id}", token=admin_token)
    check("GET /api/clinic/services/:id", s, 200, b)

    s, b = req("PATCH", f"/api/clinic/services/{test_svc_id}", {"fee": 250}, token=admin_token)
    check("PATCH /api/clinic/services/:id", s, 200, b)

    s, b = req("DELETE", f"/api/clinic/services/{test_svc_id}", token=admin_token)
    check("DELETE /api/clinic/services/:id", s, 204, b)

# ── Clinic Admin: FAQs CRUD ────────────────────────────────
print("\n-- Clinic Admin: FAQs --")
s, b = req("GET", "/api/clinic/faqs", token=admin_token)
check("GET /api/clinic/faqs", s, 200, b)

s, b = req("POST", "/api/clinic/faqs", {
    "question": "Smoke test question?",
    "answer": "Smoke test answer.",
    "sort_order": 99,
}, token=admin_token)
check("POST /api/clinic/faqs (create)", s, 201, b)
test_faq_id = b.get("id", "") if s == 201 else ""

if test_faq_id:
    s, b = req("PATCH", f"/api/clinic/faqs/{test_faq_id}", {"answer": "Updated answer"}, token=admin_token)
    check("PATCH /api/clinic/faqs/:id", s, 200, b)

    s, b = req("DELETE", f"/api/clinic/faqs/{test_faq_id}", token=admin_token)
    check("DELETE /api/clinic/faqs/:id", s, 204, b)

# ── Clinic Admin: Timings ───────────────────────────────────
print("\n-- Clinic Admin: Timings --")
s, b = req("GET", "/api/clinic/timings", token=admin_token)
check("GET /api/clinic/timings", s, 200, b)

s, b = req("PUT", "/api/clinic/timings", {
    "timings": [
        {"day_of_week": 0, "is_open": True, "open_time": "09:00", "close_time": "18:00"},
        {"day_of_week": 6, "is_open": False},
    ]
}, token=admin_token)
check("PUT /api/clinic/timings (bulk)", s, 200, b)

# ── Clinic Admin: Appointment Rules ─────────────────────────
print("\n-- Clinic Admin: Appointment Rules --")
s, b = req("GET", "/api/clinic/appointment-rules", token=admin_token)
check("GET /api/clinic/appointment-rules", s, 200, b)

s, b = req("PUT", "/api/clinic/appointment-rules", {
    "allow_same_day": True,
    "minimum_notice_hours": 1,
    "manual_approval_required": True,
}, token=admin_token)
check("PUT /api/clinic/appointment-rules", s, 200, b)

# ── Clinic Admin: Appointments ──────────────────────────────
print("\n-- Clinic Admin: Appointments --")
s, b = req("GET", "/api/clinic/appointments", token=admin_token)
check("GET /api/clinic/appointments", s, 200, b)
appointments = b if isinstance(b, list) else []

if appointments:
    appt_id = appointments[0]["id"]
    s, b = req("GET", f"/api/clinic/appointments/{appt_id}", token=admin_token)
    check("GET /api/clinic/appointments/:id", s, 200, b)

    s, b = req("PATCH", f"/api/clinic/appointments/{appt_id}/status", {
        "status": "confirmed",
        "admin_notes": "Confirmed by smoke test",
    }, token=admin_token)
    check("PATCH /api/clinic/appointments/:id/status", s, 200, b)

# ── Public: Patient Endpoints ───────────────────────────────
SLUG = "sunrise-clinic"
print(f"\n-- Public: Patient ({SLUG}) --")

s, b = req("GET", f"/api/public/{SLUG}/profile")
check("GET /api/public/:slug/profile", s, 200, b)

s, b = req("GET", f"/api/public/{SLUG}/doctors")
check("GET /api/public/:slug/doctors", s, 200, b)
pub_doctors = b if isinstance(b, list) else []

s, b = req("GET", f"/api/public/{SLUG}/services")
check("GET /api/public/:slug/services", s, 200, b)
pub_services = b if isinstance(b, list) else []

s, b = req("GET", f"/api/public/{SLUG}/faqs")
check("GET /api/public/:slug/faqs", s, 200, b)

s, b = req("GET", f"/api/public/{SLUG}/timings")
check("GET /api/public/:slug/timings", s, 200, b)

s, b = req("GET", f"/api/public/{SLUG}/appointment-rules")
check("GET /api/public/:slug/appointment-rules", s, 200, b)

# Book an appointment
if pub_services:
    svc_id = pub_services[0]["id"]
    doc_id = pub_doctors[0]["id"] if pub_doctors else None
    appt_body = {
        "patient_name": "Smoke Test Patient",
        "patient_phone": "9999999999",
        "patient_email": "smoke@test.com",
        "service_id": svc_id,
        "preferred_date": "2026-04-25",
        "preferred_time": "10:00",
        "notes": "Smoke test appointment",
    }
    if doc_id:
        appt_body["doctor_id"] = doc_id
    s, b = req("POST", f"/api/public/{SLUG}/appointments", appt_body)
    check("POST /api/public/:slug/appointments (book)", s, 201, b)

# ── Public: Assistant ───────────────────────────────────────
print(f"\n-- Public: Assistant ({SLUG}) --")
for q in ["What are your timings?", "What is the consultation fee?", "Who are the doctors?",
           "What services do you offer?", "How do I book an appointment?", "Hello"]:
    s, b = req("POST", f"/api/public/{SLUG}/assistant", {"message": q})
    resp_type = b.get("type", "?") if s == 200 else "ERROR"
    check(f"Assistant: '{q}' -> {resp_type}", s, 200, b)

# ── Public: Clinic Directory ────────────────────────────────
print("\n-- Public: Clinic Directory --")
s, b = req("GET", "/api/public/clinics")
check("GET /api/public/clinics", s, 200, b)
if isinstance(b, list) and b:
    print(f"     {len(b)} clinic(s) listed; first: {b[0].get('name')} (slug: {b[0].get('slug')})")

s, b = req("GET", "/api/public/clinics?q=sunrise")
check("GET /api/public/clinics?q=sunrise", s, 200, b)

# ── Patient Auth + My Bookings ──────────────────────────────
print("\n-- Patient: Signup + Bookings --")
puniq = str(int(time.time())) + "p"
s, b = req("POST", "/api/auth/patient/signup", {
    "full_name": "Smoke Patient",
    "email": f"smokepatient{puniq}@example.com",
    "phone": "9000000000",
    "password": "patient123",
})
check("POST /api/auth/patient/signup", s, 201, b)
patient_token = b.get("access_token", "") if s == 201 else ""

s, b = req("POST", "/api/auth/patient/signup", {
    "full_name": "X", "email": f"smokepatient{puniq}@example.com", "password": "patient123",
})
check("POST /api/auth/patient/signup (dup email -> 400)", s, 400, b)

s, b = req("GET", "/api/patient/me", token=patient_token)
check("GET /api/patient/me", s, 200, b)

s, b = req("GET", "/api/patient/appointments", token=patient_token)
check("GET /api/patient/appointments (empty)", s, 200, b)

# Book as authenticated patient → should attach patient_user_id
if pub_services:
    appt_body = {
        "patient_name": "Smoke Patient",
        "patient_phone": "9000000000",
        "patient_email": f"smokepatient{puniq}@example.com",
        "service_id": pub_services[0]["id"],
        "preferred_date": "2026-04-26",
        "preferred_time": "11:00",
        "notes": "Booked while logged in",
    }
    s, b = req("POST", f"/api/public/{SLUG}/appointments", appt_body, token=patient_token)
    check("POST /api/public/:slug/appointments (as patient)", s, 201, b)
    if s == 201:
        if b.get("patient_user_id"):
            check("  -> patient_user_id linked", 200, 200)
        else:
            check("  -> patient_user_id linked", 0, 200, b)

    s, b = req("GET", "/api/patient/appointments", token=patient_token)
    check("GET /api/patient/appointments (after booking)", s, 200, b)
    if isinstance(b, list) and b:
        print(f"     {len(b)} booking(s); clinic_name: {b[0].get('clinic_name')}")

# Patient role gate on clinic admin endpoints
s, b = req("GET", "/api/clinic/profile", token=patient_token)
check("GET /api/clinic/profile (patient -> 403)", s, 403, b)

# ── Public: 404 for bad slug ────────────────────────────────
print("\n-- Edge Cases --")
s, b = req("GET", "/api/public/nonexistent-clinic/profile")
check("GET /api/public/bad-slug (404)", s, 404, b)

s, b = req("GET", "/api/clinic/profile")
check("GET /api/clinic/profile (no auth, 401)", s, 401, b)

# ── Summary ─────────────────────────────────────────────────
print("\n" + "=" * 60)
print(f"RESULTS: {PASS} passed, {FAIL} failed, {PASS + FAIL} total")
print("=" * 60)
if ERRORS:
    print("\nFAILURES:")
    for e in ERRORS:
        print(f"  - {e}")
    sys.exit(1)
else:
    print("\nAll tests passed!")
    sys.exit(0)
