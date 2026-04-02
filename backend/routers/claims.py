import re
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.auth import get_current_user
from backend.database.db import get_db
from backend.database.models import Policy, User
from backend.llm.groq_client import invoke_llm
from backend.ml.feature_engineer import policy_orm_to_dict, policy_to_feature_vector
from backend.ml.risk_scorer import probability_to_risk_score, risk_score_to_band

router = APIRouter(prefix="/claims", tags=["claims"], dependencies=[Depends(get_current_user)])


CLAIM_EXTRACTION_PROMPT = """You are a claims assessment assistant. Extract the following fields from the user message.
Return ONLY a valid JSON object with these exact keys (no other text):
- incident_type: one of ["accident", "theft", "vandalism", "natural_disaster", "fire", "flood", "wind", "other"]
- date_of_incident: ISO date string YYYY-MM-DD or null if not provided
- hours_since_incident: integer (hours since incident occurred) or null
- at_fault: boolean (was the driver at fault)
- third_party_involved: boolean
- police_fir_filed: boolean
- coverage_type: one of ["comprehensive", "own_damage", "third_party_only"] or null
- estimated_damage_amount: integer (INR) or null

User message: {message}

Return ONLY valid JSON. Example: {{"incident_type": "accident", "date_of_incident": "2026-01-15", "hours_since_incident": 12, "at_fault": false, "third_party_involved": true, "police_fir_filed": true, "coverage_type": "comprehensive", "estimated_damage_amount": 50000}}
"""


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

    data = policy_orm_to_dict(policy)
    vector = policy_to_feature_vector(data)
    prob = max(0.0, min(1.0, _predict_probability(request.app.state.model, vector)))
    score = probability_to_risk_score(prob)
    band = risk_score_to_band(score)

    predicted_claim_amount = round(policy.insured_value * prob * 0.3, 2)

    confidence_band: str
    if prob < 0.2:
        confidence_band = "low"
    elif prob < 0.5:
        confidence_band = "medium"
    else:
        confidence_band = "high"

    return {
        "policy_id": policy.id,
        "claim_probability": round(float(prob), 6),
        "risk_score": score,
        "risk_band": band,
        "confidence_band": confidence_band,
        "predicted_claim_amount": predicted_claim_amount,
        "model_version": "xgb_v1",
    }


@router.post("/eligibility")
def claim_eligibility(
    payload: dict,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    policy_id = str(payload.get("policy_id", "")).strip()
    raw_message = str(payload.get("message", "")).strip()

    policy = None
    if policy_id:
        policy = (
            db.query(Policy)
            .filter(Policy.id == policy_id, Policy.user_id == user.id, Policy.is_active.is_(True))
            .first()
        )

    coverage_type = str(payload.get("coverage_type", "")).lower()
    incident_type = str(payload.get("incident_type", "")).lower()
    hours_since = payload.get("hours_since_incident")
    at_fault = payload.get("at_fault")
    third_party = payload.get("third_party_involved")
    fir_filed = payload.get("police_fir_filed")
    damage_amount = payload.get("estimated_damage_amount")

    if raw_message and not incident_type:
        try:
            json_str = invoke_llm(
                "reasoner",
                CLAIM_EXTRACTION_PROMPT.format(message=raw_message),
                "",
                expect_json=True,
            )
            if json_str:
                try:
                    extracted = eval(json_str)
                except Exception:
                    try:
                        import json
                        extracted = json.loads(json_str)
                    except Exception:
                        extracted = {}
                if isinstance(extracted, dict):
                    coverage_type = coverage_type or str(extracted.get("coverage_type") or "")
                    incident_type = incident_type or str(extracted.get("incident_type") or "")
                    hours_since = hours_since if hours_since is not None else extracted.get("hours_since_incident")
                    at_fault = at_fault if at_fault is not None else extracted.get("at_fault")
                    third_party = third_party if third_party is not None else extracted.get("third_party_involved")
                    fir_filed = fir_filed if fir_filed is not None else extracted.get("police_fir_filed")
                    damage_amount = damage_amount or extracted.get("estimated_damage_amount")
        except Exception:
            pass

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

    eligible = True
    reasons: list[str] = []
    risk_flags: list[str] = []
    recommendation: str = "ELIGIBLE"

    if policy and not policy.is_active:
        eligible = False
        reasons.append("Policy is not active.")

    if coverage_type == "third_party_only" and incident_type in {"accident", "vandalism", "fire", "flood", "wind"}:
        eligible = False
        reasons.append("Third-party-only policy does not cover own-damage incidents.")
        recommendation = "NOT_ELIGIBLE"

    if incident_type == "theft":
        if fir_filed is False:
            eligible = False
            reasons.append("FIR is mandatory for theft claims.")
            recommendation = "NOT_ELIGIBLE"
        elif hours_since is not None and hours_since > 72:
            risk_flags.append("Theft reported >72 hours after incident — may require additional verification.")

    if incident_type == "accident" and at_fault is True:
        risk_flags.append("At-fault accident — claim may attract higher depreciation deduction.")

    if damage_amount and policy and damage_amount > policy.insured_value * 0.5:
        risk_flags.append(f"Estimated damage ({damage_amount}) exceeds 50% of IDV — surveyor visit mandatory.")

    if not eligible:
        recommendation = "NOT_ELIGIBLE"
    elif risk_flags:
        recommendation = "REVIEW_REQUIRED"
    else:
        recommendation = "ELIGIBLE"

    return {
        "eligible": eligible,
        "status": recommendation,
        "reasons": reasons,
        "risk_flags": risk_flags,
        "extracted_fields": {
            "incident_type": incident_type,
            "coverage_type": coverage_type,
            "hours_since_incident": hours_since,
            "at_fault": at_fault,
            "third_party_involved": third_party,
            "police_fir_filed": fir_filed,
            "estimated_damage_amount": damage_amount,
        },
        "documents_required": [
            "Policy copy",
            "RC book",
            "Driver license",
            "Claim form",
            "FIR copy (mandatory for theft/natural disaster)",
            "Repair estimates",
        ],
        "ncb_impact": "A paid claim will reset NCB to 0% at next renewal. Protect your NCB by opting for NCB protection rider.",
        "next_steps": "Submit all documents to the nearest cashless garage or our claims portal. Surveyor will assess damage within 24 hours for cashless, 48 hours for reimbursement claims.",
    }
