from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Policy, User
from app.agents.graph import insureiq_graph
from app.agents.state import InsureIQState

router = APIRouter(prefix="/premium", tags=["premium"], dependencies=[Depends(get_current_user)])


def _policy_to_dict(policy: Policy) -> dict:
    return {
        "policy_number": policy.policy_number,
        "policyholder_name": policy.policyholder_name,
        "vehicle_make": policy.vehicle_make,
        "vehicle_model": policy.vehicle_model,
        "vehicle_year": policy.vehicle_year,
        "engine_cc": policy.engine_cc,
        "insured_value": policy.insured_value,
        "premium_amount": policy.premium_amount,
        "prior_claims_count": policy.prior_claims_count,
        "city": policy.city,
    }


@router.post("/advise")
def premium_advise(
    payload: dict,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    policy_id = str(payload.get("policy_id", "")).strip()
    if not policy_id:
        raise HTTPException(status_code=400, detail={"error": "FIELD_VALIDATION_ERROR", "field": "policy_id", "detail": "policy_id is required"})

    policy = (
        db.query(Policy)
        .filter(Policy.id == policy_id, Policy.user_id == user.id, Policy.is_active.is_(True))
        .first()
    )
    if not policy:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "detail": "Policy not found"})

    state: InsureIQState = {
        "policy_id": policy.id,
        "policy_data": _policy_to_dict(policy),
        "user_query": "premium",
        "messages": [],
        "session_id": f"premium-{policy.id}",
        "_app": request.app,
        "_db": db,
        "_user_id": user.id,
        "_policy": policy,
    }
    out = insureiq_graph.invoke(state)
    return {
        "policy_id": policy.id,
        "risk_score": out.get("risk_score"),
        "risk_band": out.get("risk_band"),
        "claim_probability": out.get("claim_probability"),
        "premium_min": out.get("premium_min"),
        "premium_max": out.get("premium_max"),
        "premium_narrative": out.get("premium_narrative"),
        "adjustment_factors": out.get("adjustment_factors", []),
    }


@router.post("/what-if")
def premium_what_if(
    payload: dict,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    policy_id = str(payload.get("policy_id", "")).strip()
    adjustments = payload.get("adjustments", {}) or {}

    policy = (
        db.query(Policy)
        .filter(Policy.id == policy_id, Policy.user_id == user.id, Policy.is_active.is_(True))
        .first()
    )
    if not policy:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "detail": "Policy not found"})

    policy_data = _policy_to_dict(policy)
    for k, v in adjustments.items():
        if k in policy_data:
            policy_data[k] = v

    state: InsureIQState = {
        "policy_id": policy.id,
        "policy_data": policy_data,
        "user_query": "premium",
        "messages": [],
        "session_id": f"what-if-{policy.id}",
        "_app": request.app,
        "_db": db,
        "_user_id": user.id,
        "_policy": policy,
    }
    out = insureiq_graph.invoke(state)
    return {
        "policy_id": policy.id,
        "applied_adjustments": adjustments,
        "premium_min": out.get("premium_min"),
        "premium_max": out.get("premium_max"),
        "premium_narrative": out.get("premium_narrative"),
    }
