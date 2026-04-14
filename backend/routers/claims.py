import json
import re
from datetime import datetime

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from backend.auth import get_current_user
from backend.database.db import get_db
from backend.database.models import Policy, User
from backend.llm.groq_client import invoke_llm
from backend.ml.feature_engineer import policy_orm_to_dict, policy_to_feature_vector
from backend.ml.risk_scorer import probability_to_risk_score, risk_score_to_band
from backend.schemas.claim import ClaimAssessment, ClaimEligibilityRequest
from backend.utils.errors import error_response

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
    if isinstance(vector, tuple):
        vector = vector[0]
    if model is None:
        return 0.35

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
        error_response(400, "FIELD_VALIDATION_ERROR", "policy_id is required", "policy_id")

    policy = (
        db.query(Policy)
        .filter(Policy.id == policy_id, Policy.user_id == user.id, Policy.is_active.is_(True))
        .first()
    )
    if not policy:
        error_response(404, "POLICY_NOT_FOUND", "Policy not found")

    data = policy_orm_to_dict(policy)
    vector, _ = policy_to_feature_vector(data)
    model = getattr(request.app.state, "model", None)
    prob = max(0.0, min(1.0, _predict_probability(model, vector)))
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


@router.post("/eligibility", response_model=ClaimAssessment)
def claim_eligibility(
    payload: ClaimEligibilityRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    policy = (
        db.query(Policy)
        .filter(Policy.id == payload.policy_id, Policy.user_id == user.id, Policy.is_active.is_(True))
        .first()
    )
    if not policy:
        error_response(404, "POLICY_NOT_FOUND", "Policy not found")

    rejection_risks = []
    if payload.hours_since_incident > 48 and payload.incident_type == "theft":
        rejection_risks.append("Theft intimation beyond 24-hour IRDAI requirement")
    if payload.hours_since_incident > 72:
        rejection_risks.append("Late intimation may reduce claim settlement amount")
    if not payload.fir_filed and payload.incident_type in ["theft", "accident"]:
        rejection_risks.append("FIR not filed — required for this incident type")

    coverage_note = ""
    if payload.third_party_involved:
        coverage_note = "Third-party policy — own damage NOT covered. "

    system_prompt = """You are a claim eligibility specialist for Indian motor insurance.
Return ONLY valid JSON matching this exact structure — no other text:
{
  "claim_type": "own_damage|third_party|theft|total_loss|not_eligible",
  "eligible": true|false,
  "eligibility_reason": "string",
  "risk_of_rejection": "LOW|MEDIUM|HIGH",
  "documents_required": ["list", "of", "documents"],
  "ncb_impact": "NCB will be lost|NCB protected|Not applicable|NCB protect add-on applies",
  "estimated_claim_range": "₹X – ₹Y (subject to surveyor assessment)",
  "next_steps": ["Step 1", "Step 2", "Step 3"]
}"""

    user_prompt = f"""Assess claim eligibility:
Policy: {policy.vehicle_make} {policy.vehicle_model} {policy.vehicle_year}
Vehicle use: {policy.vehicle_use}
Prior claims: {policy.prior_claims_count}
Incident: {payload.incident_type}
Date: {payload.date_of_incident}
At fault: {payload.at_fault}
FIR filed: {payload.fir_filed}
Third party involved: {payload.third_party_involved}
Hours since incident: {payload.hours_since_incident}
Damage estimate: ₹{payload.damage_estimate_inr:,.0f}
{coverage_note}
Known rejection risks: {', '.join(rejection_risks) if rejection_risks else 'None'}

Return JSON assessment only."""

    raw = invoke_llm("extractor", system_prompt, user_prompt, expect_json=True)

    try:
        data = json.loads(raw)
        existing = data.get("rejection_risks", [])
        data["rejection_risks"] = list(set(existing + rejection_risks))
        return ClaimAssessment(policy_id=payload.policy_id, **data)
    except (json.JSONDecodeError, Exception):
        return ClaimAssessment(
            policy_id=payload.policy_id,
            claim_type="own_damage",
            eligible=len(rejection_risks) == 0,
            eligibility_reason=f"Assessment based on policy rules. {coverage_note}",
            risk_of_rejection="HIGH" if len(rejection_risks) > 1 else "MEDIUM",
            rejection_risks=rejection_risks,
            documents_required=["Completed claim form", "RC copy", "Driving licence", "FIR copy (if applicable)", "Repair estimate"],
            ncb_impact="NCB will be lost" if payload.at_fault else "NCB protected",
            estimated_claim_range=f"₹{min(payload.damage_estimate_inr, policy.insured_value * 0.8):,.0f} (subject to surveyor assessment)",
            next_steps=[
                "Step 1: Intimate insurer within 24 hours",
                "Step 2: File FIR if not done",
                "Step 3: Get repair estimate from authorised garage",
                "Step 4: Submit claim form with documents",
            ],
        )
