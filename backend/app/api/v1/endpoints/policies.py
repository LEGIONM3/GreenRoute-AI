from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_admin_user
from app.models.policy import Policy
from app.schemas.policy import PolicyOut, PolicyCreate
from app.services.rag_service import rag_service

router = APIRouter()


@router.get("", response_model=List[PolicyOut])
def list_policies(
    category: Optional[str] = Query(None, description="Solid Waste, E-Waste, Plastic Waste, Biomedical Waste, Hazardous Waste"),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
) -> Any:
    query = db.query(Policy).filter(Policy.is_active == True)

    if category:
        query = query.filter(Policy.category.ilike(category))

    if search:
        p = f"%{search.lower()}%"
        query = query.filter(
            (Policy.title.ilike(p)) |
            (Policy.summary.ilike(p)) |
            (Policy.authority.ilike(p)) |
            (Policy.document_number.ilike(p))
        )

    return query.order_by(Policy.created_at.desc()).all()


@router.get("/{policy_id}", response_model=PolicyOut)
def get_policy(policy_id: str, db: Session = Depends(get_db)) -> Any:
    policy = db.query(Policy).filter(Policy.id == policy_id, Policy.is_active == True).first()
    if not policy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy document not found")
    return policy


@router.post("", response_model=PolicyOut, status_code=status.HTTP_201_CREATED)
def create_policy(
    payload: PolicyCreate,
    current_user = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
) -> Any:
    policy = Policy(**payload.model_dump())
    db.add(policy)
    db.commit()
    db.refresh(policy)

    # Ingest into RAG store for conversational retrieval
    rag_service.ingest_policy(db, policy)

    return policy
