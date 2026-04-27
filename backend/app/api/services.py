from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Service, User
from app.schemas import ServiceCreate, ServiceUpdate, ServiceResponse
from app.deps import require_clinic_workspace

router = APIRouter(prefix="/api/clinic/services", tags=["services"])


@router.get("", response_model=list[ServiceResponse])
def list_services(db: Session = Depends(get_db), user: User = Depends(require_clinic_workspace)):
    return db.query(Service).filter(Service.tenant_id == user.tenant_id).order_by(Service.name).all()


@router.post("", response_model=ServiceResponse, status_code=201)
def create_service(body: ServiceCreate, db: Session = Depends(get_db), user: User = Depends(require_clinic_workspace)):
    svc = Service(tenant_id=user.tenant_id, **body.model_dump())
    db.add(svc)
    db.commit()
    db.refresh(svc)
    return svc


@router.get("/{service_id}", response_model=ServiceResponse)
def get_service(service_id: str, db: Session = Depends(get_db), user: User = Depends(require_clinic_workspace)):
    svc = db.query(Service).filter(Service.id == service_id, Service.tenant_id == user.tenant_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    return svc


@router.patch("/{service_id}", response_model=ServiceResponse)
def update_service(
    service_id: str, body: ServiceUpdate, db: Session = Depends(get_db), user: User = Depends(require_clinic_workspace)
):
    svc = db.query(Service).filter(Service.id == service_id, Service.tenant_id == user.tenant_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(svc, field, value)
    db.commit()
    db.refresh(svc)
    return svc


@router.delete("/{service_id}", status_code=204)
def delete_service(service_id: str, db: Session = Depends(get_db), user: User = Depends(require_clinic_workspace)):
    svc = db.query(Service).filter(Service.id == service_id, Service.tenant_id == user.tenant_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    db.delete(svc)
    db.commit()
