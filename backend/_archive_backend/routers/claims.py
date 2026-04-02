from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.ml import policy_to_vector
from app.models import Policy, User

router = APIRouter(prefix="/claims", tags=["claims"], dependencies=[Depends(get_current_user)])


def _predict_probability(model, vector) -> float:
    try:
        if hasattr(model, "predict_proba"):
            return float(model.predict_proba(vector)[0][1])
    except Exception:
        pass
    try:
        import xgboost as xgb

        if model.__class__.__name__ == "Booster":
            return float(model.predict(xgb.DMatrix(vector))[0])
    except Exception:
        pass

    raw = float(model.predict(vector)[0])
    return raw / 100.0 if raw > 1 else raw


@router.post("/predict")
def predict_claim(
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

    vector = policy_to_vector(policy)
    prob = max(0.0, min(1.0, _predict_probability(request.app.state.model, vector)))
    predicted_claim_amount = round(policy.insured_value * prob * 0.3, 2)

    return {
        "policy_id": policy.id,
        "claim_probability": round(prob, 6),
        "predicted_claim_amount": predicted_claim_amount,
        "model_version": "xgb_v1",
    }


@router.post("/eligibility")
def claim_eligibility(
    payload: dict,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Lightweight ReAct pattern: reason over available fields and ask for missing information.
    coverage_type = str(payload.get("coverage_type", "")).lower()
    incident_type = str(payload.get("incident_type", "")).lower()
    policy_active = bool(payload.get("policy_active", True))
    fir_filed = payload.get("police_fir_filed")

    missing = []
    if not coverage_type:
        missing.append("coverage_type")
    if not incident_type:
        missing.append("incident_type")
    if fir_filed is None:
        missing.append("police_fir_filed")

    if missing:
        return {
            "eligible": None,
            "status": "NEED_MORE_INFO",
            "missing_fields": missing,
            "next_steps": "Provide missing claim details for final eligibility decision.",
        }

    eligible = policy_active and coverage_type in {"comprehensive", "own_damage", "third_party_only"}
    reasons = []
    if not policy_active:
        reasons.append("Policy is not active.")
    if incident_type == "theft" and fir_filed is False:
        eligible = False
        reasons.append("FIR is required for theft claims.")

    return {
        "eligible": eligible,
        "status": "ELIGIBLE" if eligible else "NOT_ELIGIBLE",
        "reasons": reasons,
        "documents_required": [
            "Policy copy",
            "RC copy",
            "Claim form",
            "FIR copy (if applicable)",
        ],
        "ncb_impact": "NCB may reduce at renewal if claim is paid.",
        "next_steps": "Submit required documents and schedule vehicle survey.",
    }
