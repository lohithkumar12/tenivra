# Tenivra — Clinic Management Platform

Multi-tenant SaaS platform for service businesses, starting with clinics. Each clinic gets its own workspace to manage doctors, services, FAQs, timings, and appointment rules. Patients interact through a clean public interface with a built-in assistant.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Frontend  (Next.js 14 + Tailwind CSS)              │
│  ├── /login         — Auth                          │
│  ├── /admin/*       — Clinic admin dashboard        │
│  ├── /super/*       — Platform admin                │
│  └── /clinic/[slug] — Patient-facing pages          │
├─────────────────────────────────────────────────────┤
│  Backend   (FastAPI + SQLAlchemy + PostgreSQL)       │
│  ├── /api/auth/*    — JWT authentication            │
│  ├── /api/admin/*   — Super admin endpoints         │
│  ├── /api/clinic/*  — Clinic management (auth'd)    │
│  └── /api/public/*  — Patient endpoints (no auth)   │
└─────────────────────────────────────────────────────┘
```

## Quick start (local development)

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+ (or Docker)

### 1. Start PostgreSQL

**With Docker (recommended):**

```bash
docker run -d --name tenivra-db \
  -e POSTGRES_DB=tenivra \
  -e POSTGRES_USER=tenivra \
  -e POSTGRES_PASSWORD=tenivra_dev_123 \
  -p 5432:5432 \
  postgres:16-alpine
```

**Or use an existing PostgreSQL instance** — update `backend/.env` with your connection string.

### 2. Start the backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt

# Seed demo data
python -m app.seed

# Run the server
uvicorn app.main:app --reload --port 8000
```

The API is now at **http://localhost:8000**. Swagger docs at **http://localhost:8000/docs**.

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The app is now at **http://localhost:3000**.

### 4. Try it

| URL | What it is |
|-----|------------|
| http://localhost:3000 | Landing page |
| http://localhost:3000/login | Login page |
| http://localhost:3000/admin | Clinic admin dashboard |
| http://localhost:3000/super | Platform admin dashboard |
| http://localhost:3000/clinic/sunrise-clinic | Patient-facing clinic page |

## Demo credentials

| Role | Email | Password |
|------|-------|----------|
| Clinic admin | `admin@sunriseclinic.in` | `admin123` |
| Super admin | `super@tenivra.com` | `super123` |

## Full stack with Docker Compose

```bash
docker-compose up --build
```

This starts PostgreSQL, backend, and frontend together. Access the app at http://localhost:3000.

## Project structure

```
backend/
├── app/
│   ├── api/                 # Route handlers
│   │   ├── auth.py          # Login, token, /me
│   │   ├── admin.py         # Super admin: tenant CRUD
│   │   ├── clinic.py        # Clinic profile, timings, rules
│   │   ├── doctors.py       # Doctor CRUD
│   │   ├── services.py      # Service CRUD
│   │   ├── faqs.py          # FAQ CRUD
│   │   ├── appointments.py  # Appointment management
│   │   └── public.py        # Patient-facing + assistant
│   ├── services/
│   │   └── assistant.py     # Rule-based clinic assistant
│   ├── config.py            # Pydantic settings
│   ├── database.py          # SQLAlchemy engine + session
│   ├── models.py            # All SQLAlchemy models
│   ├── schemas.py           # All Pydantic schemas
│   ├── deps.py              # Auth dependencies
│   ├── main.py              # FastAPI app + middleware
│   └── seed.py              # Demo data seeder
├── alembic/                 # Database migrations
├── requirements.txt
├── Dockerfile
└── .env

frontend/
├── src/
│   ├── app/
│   │   ├── admin/           # Clinic admin pages
│   │   ├── super/           # Platform admin pages
│   │   ├── clinic/[slug]/   # Patient-facing pages
│   │   ├── login/           # Login page
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Landing page
│   ├── components/
│   │   └── ui.tsx           # Reusable UI components
│   └── lib/
│       ├── api.ts           # HTTP client
│       ├── auth.tsx         # Auth context
│       └── utils.ts         # Helpers
├── package.json
├── tailwind.config.ts
└── next.config.mjs
```

## Data model

| Table | Description |
|-------|-------------|
| `tenants` | Clinic/workspace — name, slug, contact, specializations |
| `users` | Login accounts — tied to tenant (or null for super admin) |
| `doctors` | Doctors per clinic — schedule, fee, specialization |
| `services` | Services per clinic — duration, fee, doctor assignment |
| `faqs` | FAQ pairs per clinic |
| `clinic_timings` | Weekly schedule (7 rows per clinic) |
| `appointment_rules` | Booking rules per clinic (1 row) |
| `appointments` | Patient appointment requests |

All tenant-specific tables have a `tenant_id` foreign key for isolation.

## API endpoints

### Auth
- `POST /api/auth/login` — Get JWT token
- `GET  /api/auth/me` — Current user info

### Super Admin (requires super_admin role)
- `GET/POST        /api/admin/tenants` — List / create clinics
- `GET/PATCH       /api/admin/tenants/{id}` — Get / update clinic

### Clinic Admin (requires clinic_admin role)
- `GET/PATCH       /api/clinic/profile` — Clinic profile
- `GET/PUT         /api/clinic/timings` — Weekly schedule
- `GET/PUT         /api/clinic/appointment-rules` — Booking rules
- `GET/POST        /api/clinic/doctors` — Doctors CRUD
- `GET/PATCH/DEL   /api/clinic/doctors/{id}`
- `GET/POST        /api/clinic/services` — Services CRUD
- `GET/PATCH/DEL   /api/clinic/services/{id}`
- `GET/POST        /api/clinic/faqs` — FAQ CRUD
- `PATCH/DEL       /api/clinic/faqs/{id}`
- `GET             /api/clinic/appointments` — List (filterable)
- `PATCH           /api/clinic/appointments/{id}/status`

### Public (no auth)
- `GET  /api/public/{slug}/profile`
- `GET  /api/public/{slug}/doctors`
- `GET  /api/public/{slug}/services`
- `GET  /api/public/{slug}/faqs`
- `GET  /api/public/{slug}/timings`
- `GET  /api/public/{slug}/appointment-rules`
- `POST /api/public/{slug}/appointments` — Book appointment
- `POST /api/public/{slug}/assistant` — Chat assistant

## Key design decisions

1. **String UUIDs** — Compatible with both PostgreSQL and SQLite for easy local testing.
2. **Slug-based public URLs** — Each clinic gets `/clinic/{slug}` (e.g., `/clinic/sunrise-clinic`).
3. **Rule-based assistant** — Keyword matching against clinic data. Designed so an LLM can replace `process_query()` later without changing the API.
4. **Next.js rewrites** — Frontend proxies `/api/*` to the backend, avoiding CORS in production.
5. **Manual approval flow** — Appointment requests default to "pending" when manual approval is enabled.

## Environment variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://tenivra:...@localhost:5432/tenivra` | PostgreSQL connection |
| `SECRET_KEY` | `dev-secret-key-...` | JWT signing key (change in production!) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `480` | Token lifetime |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed origins |

### Frontend (`frontend/.env.local`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend URL for API proxy |

## Future-ready hooks

The architecture is designed so these can be added without restructuring:

- **WhatsApp / SMS** — Add channel adapters that read the same clinic data as the assistant.
- **AI chat (LLM)** — Replace `assistant.py/process_query()` with an OpenAI/Anthropic call, using clinic data as context.
- **Reminders** — Add a scheduled job that queries upcoming appointments and sends notifications.
- **Payments** — Add a payment model linked to appointments; integrate Razorpay/Stripe.
- **Analytics** — Query existing tables (appointments, services) for dashboard metrics.
- **Patient portal** — Add patient auth and appointment history.

## Production deployment notes

1. **Change `SECRET_KEY`** to a random 32+ character string.
2. Use a managed PostgreSQL (AWS RDS, Supabase, Neon, etc.).
3. Deploy backend on Railway, Render, or AWS ECS.
4. Deploy frontend on Vercel (recommended for Next.js).
5. Set `NEXT_PUBLIC_API_URL` to your backend's production URL.
6. Add HTTPS, rate limiting, and proper logging.
7. Run `alembic upgrade head` for migrations instead of auto-creating tables.
