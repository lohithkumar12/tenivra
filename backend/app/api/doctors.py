from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Doctor, User
from app.schemas import DoctorCreate, DoctorUpdate, DoctorResponse
from app.deps import require_clinic_workspace

router = APIRouter(prefix="/api/clinic/doctors", tags=["doctors"])


@router.get("", response_model=list[DoctorResponse])
def list_doctors(db: Session = Depends(get_db), user: User = Depends(require_clinic_workspace)):
    return db.query(Doctor).filter(Doctor.tenant_id == user.tenant_id).order_by(Doctor.name).all()


@router.post("", response_model=DoctorResponse, status_code=201)
def create_doctor(body: DoctorCreate, db: Session = Depends(get_db), user: User = Depends(require_clinic_workspace)):
    doc = Doctor(tenant_id=user.tenant_id, **body.model_dump())
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.get("/{doctor_id}", response_model=DoctorResponse)
def get_doctor(doctor_id: str, db: Session = Depends(get_db), user: User = Depends(require_clinic_workspace)):
    doc = db.query(Doctor).filter(Doctor.id == doctor_id, Doctor.tenant_id == user.tenant_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doc


@router.patch("/{doctor_id}", response_model=DoctorResponse)
def update_doctor(
    doctor_id: str, body: DoctorUpdate, db: Session = Depends(get_db), user: User = Depends(require_clinic_workspace)
):
    doc = db.query(Doctor).filter(Doctor.id == doctor_id, Doctor.tenant_id == user.tenant_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(doc, field, value)
    db.commit()
    db.refresh(doc)
    return doc


@router.delete("/{doctor_id}", status_code=204)
def delete_doctor(doctor_id: str, db: Session = Depends(get_db), user: User = Depends(require_clinic_workspace)):
    doc = db.query(Doctor).filter(Doctor.id == doctor_id, Doctor.tenant_id == user.tenant_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    db.delete(doc)
    db.commit()
