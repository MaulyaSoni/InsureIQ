from datetime import datetime
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from backend.auth import get_current_user
from backend.database.db import get_db
from backend.database.models import Policy, RiskPrediction, User
from backend.agents.graph import insureiq_graph
from backend.agents.state import InsureIQState
from backend.llm.groq_client import invoke_llm
from backend.ml.feature_engineer import policy_orm_to_dict, policy_to_feature_vector
from backend.ml.risk_scorer import probability_to_risk_score, risk_score_to_band
from backend.schemas.premium import WhatIfRequest
from backend.utils.errors import error_response

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


def _estimate_premium_range(band: str) -> tuple[int, int]:
    return {
        "LOW": (8000, 15000),
        "MEDIUM": (15000, 25000),
        "HIGH": (25000, 40000),
        "CRITICAL": (40000, 70000),
    }.get(band, (15000, 25000))


@router.post("/advise")
def premium_advise(
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
    base_premium = float(policy.premium_amount or 15000)
    try:
        out = insureiq_graph.invoke(state)
        rec_premium = out.get("premium_max") or round(base_premium * 1.1, 2)
        return {
            "id": f"pa-{policy.id}-{int(datetime.utcnow().timestamp())}",
            "policy_id": policy.id,
            "current_premium": base_premium,
            "recommended_premium": rec_premium,
            "risk_score": out.get("risk_score"),
            "risk_band": out.get("risk_band"),
            "claim_probability": out.get("claim_probability"),
            "premium_range": {
                "min": out.get("premium_min") or round(base_premium * 0.9, 2),
                "max": out.get("premium_max") or rec_premium,
            },
            "premium_narrative": out.get("premium_narrative"),
            "justification": out.get("premium_narrative") or "AI pricing node executed successfully.",
            "adjustment_factors": out.get("adjustment_factors", []),
            "created_at": datetime.utcnow().isoformat(),
        }
    except Exception:
        return {
            "id": f"pa-{policy.id}-fallback-{int(datetime.utcnow().timestamp())}",
            "policy_id": policy.id,
            "current_premium": base_premium,
            "recommended_premium": round(base_premium * 1.1, 2),
            "premium_range": {
                "min": round(base_premium * 0.9, 2),
                "max": round(base_premium * 1.25, 2),
            },
            "justification": "[Graph Fallback] Logic node offline.",
            "adjustment_factors": [],
            "created_at": datetime.utcnow().isoformat(),
        }


@router.post("/what-if")
def premium_what_if(
    payload: WhatIfRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    policy_id = payload.policy_id
    modifications = payload.modifications or {}

    policy = (
        db.query(Policy)
        .filter(Policy.id == policy_id, Policy.user_id == user.id, Policy.is_active.is_(True))
        .first()
    )
    if not policy:
        error_response(404, "POLICY_NOT_FOUND", "Policy not found")

    baseline_pred = (
        db.query(RiskPrediction)
        .filter(RiskPrediction.policy_id == policy.id)
        .order_by(RiskPrediction.created_at.desc())
        .first()
    )

    if baseline_pred:
        baseline_prob = baseline_pred.claim_probability
        baseline_score = baseline_pred.risk_score
        baseline_band = str(baseline_pred.risk_band.value)
    else:
        data = policy_orm_to_dict(policy)
        vector, _ = policy_to_feature_vector(data)
        model = getattr(request.app, "model", None)
        if model is None:
            try:
                from backend.ml.predictor import load_model
                model = load_model()
            except Exception:
                model = None
        prob = 0.35 if model is None else float(model.predict(vector.reshape(1, -1))[0])
        baseline_prob = max(0.0, min(1.0, prob))
        baseline_score = probability_to_risk_score(baseline_prob)
        baseline_band = risk_score_to_band(baseline_score)

    baseline_premium_lo, baseline_premium_hi = _estimate_premium_range(baseline_band)

    policy_dict = {c.name: getattr(policy, c.name) for c in policy.__table__.columns}
    if modifications.get("add_anti_theft"):
        policy_dict["anti_theft_device"] = True
    if modifications.get("change_parking"):
        policy_dict["parking_type"] = modifications["change_parking"]
    if modifications.get("reduce_mileage_km"):
        policy_dict["annual_mileage_km"] = modifications["reduce_mileage_km"]
    if modifications.get("increase_ncb_pct"):
        policy_dict["ncb_percentage"] = min(50.0, modifications["increase_ncb_pct"])

    data = policy_orm_to_dict(policy_dict)
    vector, _ = policy_to_feature_vector(data)
    model = getattr(request.app, "model", None)
    if model is None:
        try:
            from backend.ml.predictor import load_model
            model = load_model()
        except Exception:
            model = None
    modified_prob = 0.35 if model is None else float(model.predict(vector.reshape(1, -1))[0])
    modified_prob = max(0.0, min(1.0, modified_prob))
    modified_score = probability_to_risk_score(modified_prob)
    modified_band = risk_score_to_band(modified_score)
    modified_premium_lo, modified_premium_hi = _estimate_premium_range(modified_band)

    score_delta = modified_score - baseline_score
    premium_delta = ((modified_premium_lo + modified_premium_hi) / 2) - ((baseline_premium_lo + baseline_premium_hi) / 2)

    mods_summary = ", ".join([f"{k}={v}" for k, v in modifications.items()])
    narrative_prompt = f"""You are an insurance premium advisor. A policyholder modified their risk profile.
Baseline: Risk score {baseline_score} ({baseline_band}), premium ₹{baseline_premium_lo:,}–₹{baseline_premium_hi:,}/year
Modified ({mods_summary}): Risk score {modified_score} ({modified_band}), premium ₹{modified_premium_lo:,}–₹{modified_premium_hi:,}/year
Explain in 2-3 sentences: what changed, why, and what this means for the policyholder.
Use ₹ Indian format. Be specific about the modification applied."""

    narrative = invoke_llm("reasoner", "", narrative_prompt)

    return {
        "baseline": {
            "risk_score": baseline_score,
            "risk_band": baseline_band,
            "claim_probability": round(baseline_prob, 4),
            "premium_min": baseline_premium_lo,
            "premium_max": baseline_premium_hi,
        },
        "modified": {
            "risk_score": modified_score,
            "risk_band": modified_band,
            "claim_probability": round(modified_prob, 4),
            "premium_min": modified_premium_lo,
            "premium_max": modified_premium_hi,
            "modifications_applied": modifications,
        },
        "delta": {
            "risk_score_change": score_delta,
            "premium_change_inr": round(premium_delta),
            "direction": "improvement" if score_delta < 0 else "worsening",
        },
        "narrative": narrative,
    }
