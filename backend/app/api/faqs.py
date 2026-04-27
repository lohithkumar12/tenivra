from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import FAQ, User
from app.schemas import FAQCreate, FAQUpdate, FAQResponse
from app.deps import require_clinic_workspace

router = APIRouter(prefix="/api/clinic/faqs", tags=["faqs"])


@router.get("", response_model=list[FAQResponse])
def list_faqs(db: Session = Depends(get_db), user: User = Depends(require_clinic_workspace)):
    return db.query(FAQ).filter(FAQ.tenant_id == user.tenant_id).order_by(FAQ.sort_order).all()


@router.post("", response_model=FAQResponse, status_code=201)
def create_faq(body: FAQCreate, db: Session = Depends(get_db), user: User = Depends(require_clinic_workspace)):
    faq = FAQ(tenant_id=user.tenant_id, **body.model_dump())
    db.add(faq)
    db.commit()
    db.refresh(faq)
    return faq


@router.patch("/{faq_id}", response_model=FAQResponse)
def update_faq(
    faq_id: str, body: FAQUpdate, db: Session = Depends(get_db), user: User = Depends(require_clinic_workspace)
):
    faq = db.query(FAQ).filter(FAQ.id == faq_id, FAQ.tenant_id == user.tenant_id).first()
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(faq, field, value)
    db.commit()
    db.refresh(faq)
    return faq


@router.delete("/{faq_id}", status_code=204)
def delete_faq(faq_id: str, db: Session = Depends(get_db), user: User = Depends(require_clinic_workspace)):
    faq = db.query(FAQ).filter(FAQ.id == faq_id, FAQ.tenant_id == user.tenant_id).first()
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")
    db.delete(faq)
    db.commit()
