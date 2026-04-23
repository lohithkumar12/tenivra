from fastapi import APIRouter
from app.api import auth, admin, clinic, doctors, services, faqs, appointments, public

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(admin.router)
api_router.include_router(clinic.router)
api_router.include_router(doctors.router)
api_router.include_router(services.router)
api_router.include_router(faqs.router)
api_router.include_router(appointments.router)
api_router.include_router(public.router)
