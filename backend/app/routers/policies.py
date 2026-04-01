from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Policy, User
from app.schemas import PolicyCreate, PolicyOut

router = APIRouter(prefix="/policies", tags=["policies"], dependencies=[Depends(get_current_user)])


def to_policy_out(policy: Policy) -> PolicyOut:
    return PolicyOut(
        id=policy.id,
        policy_number=policy.policy_number,
        holder_name=policy.holder_name,
        vehicle_type=policy.vehicle_type,
        vehicle_make=policy.vehicle_make,
        vehicle_model=policy.vehicle_model,
        production_year=policy.production_year,
        engine_cc=policy.engine_cc,
        seats=policy.seats,
        insured_value=policy.insured_value,
        premium_amount=policy.premium_amount,
        usage_type=policy.usage_type,
        prior_claims=policy.prior_claims,
        region=policy.region,
        created_at=policy.created_at,
        updated_at=policy.updated_at,
    )


@router.get("", response_model=list[PolicyOut])
def get_policies(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    rows = db.query(Policy).order_by(Policy.created_at.desc()).all()
    return [to_policy_out(row) for row in rows]


@router.get("/{policy_id}", response_model=PolicyOut)
def get_policy(policy_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    row = db.query(Policy).filter(Policy.id == policy_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found")
    return to_policy_out(row)


@router.post("", response_model=PolicyOut, status_code=status.HTTP_201_CREATED)
def create_policy(payload: PolicyCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    exists = db.query(Policy).filter(Policy.policy_number == payload.policy_number).first()
    if exists:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Policy number already exists")

    now = datetime.utcnow()
    row = Policy(
        id=f"pol-{uuid4().hex[:10]}",
        policy_number=payload.policy_number,
        holder_name=payload.holder_name,
        vehicle_type=payload.vehicle_type,
        vehicle_make=payload.vehicle_make,
        vehicle_model=payload.vehicle_model,
        production_year=payload.production_year,
        engine_cc=payload.engine_cc,
        seats=payload.seats,
        insured_value=payload.insured_value,
        premium_amount=payload.premium_amount,
        usage_type=payload.usage_type,
        prior_claims=payload.prior_claims,
        region=payload.region,
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return to_policy_out(row)
