import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.auth import get_current_user
from backend.database.db import get_db
from backend.database.models import FraudReview, Policy, RiskPrediction, User
from backend.llm.cache import make_cache_key, get_cached, set_cached
from backend.llm.groq_client import invoke_llm
from backend.ml.fraud_detector import FraudSignal, detect_fraud_signals

router = APIRouter(prefix="/fraud", tags=["fraud"], dependencies=[Depends(get_current_user)])


FRAUD_NARRATIVE_PROMPT = """You are a senior fraud detection specialist at an insurance company.
Given these anomaly signals for a policy, write 3-4 sentences explaining what the combined
signals suggest and what additional documentation to verify before approving or escalating.

Policy summary: {policy_summary}

Anomaly signals:
{signals}

Focus on: why these patterns together are suspicious, what corroborating evidence is needed,
and what questions the underwriter should ask the policyholder."""


@router.post("/{policy_id}/explain")
def explain_fraud_signals(
    policy_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    policy = (
        db.query(Policy)
        .filter(Policy.id == policy_id, Policy.user_id == user.id)
        .first()
    )
    if not policy:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "detail": "Policy not found"})

    prediction = (
        db.query(RiskPrediction)
        .filter(RiskPrediction.policy_id == policy_id)
        .order_by(RiskPrediction.created_at.desc())
        .first()
    )

    signals = prediction.fraud_signals if prediction and prediction.fraud_signals else []
    if not signals:
        raise HTTPException(status_code=422, detail={"error": "NO_SIGNALS", "detail": "No fraud signals on this policy"})

    cache_key = make_cache_key(policy_id, "fraud_explain", "llama-3.3-70b-versatile")
    cached = get_cached(cache_key, db)
    if cached:
        return {"narrative": cached}

    policy_summary = (
        f"Vehicle: {policy.vehicle_make} {policy.vehicle_model} ({policy.vehicle_year}), "
        f"Use: {policy.vehicle_use.value}, City: {policy.city}, "
        f"IDV: ₹{policy.insured_value:,.0f}, Annual Mileage: {policy.annual_mileage_km} km"
    )

    signals_text = "\n".join(
        f"- [{s['severity']}] {s['rule_id']}: {s['description']} | Evidence: {s['evidence']}"
        for s in signals
    )

    narrative = invoke_llm(
        "reasoner",
        FRAUD_NARRATIVE_PROMPT.format(policy_summary=policy_summary, signals=signals_text),
        "",
    )

    set_cached(cache_key, narrative, "llama-3.3-70b-versatile", 24, db)
    return {"narrative": narrative}


@router.get("/flagged")
def get_flagged_policies(
    severity: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = (
        db.query(RiskPrediction)
        .join(Policy, RiskPrediction.policy_id == Policy.id)
        .filter(
            RiskPrediction.user_id == user.id,
            RiskPrediction.fraud_flagged.is_(True),
        )
    )

    flagged = query.all()
    results = []
    for pred in flagged:
        signals = pred.fraud_signals or []
        if severity and severity.upper() not in [s.get("severity", "").upper() for s in signals]:
            continue
        results.append({
            "policy_id": pred.policy_id,
            "risk_prediction_id": pred.id,
            "risk_score": pred.risk_score,
            "risk_band": pred.risk_band.value if pred.risk_band else None,
            "fraud_signals": signals,
            "has_review": db.query(FraudReview).filter(FraudReview.risk_prediction_id == pred.id).first() is not None,
            "created_at": pred.created_at.isoformat() if pred.created_at else None,
        })

    results.sort(key=lambda x: sum(1 for s in x["fraud_signals"] if s.get("severity") == "HIGH"), reverse=True)
    return results


@router.post("/{policy_id}/review")
def review_fraud(
    policy_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    resolution = str(payload.get("resolution", "")).strip().upper()
    if resolution not in ("CONFIRMED_FRAUD", "FALSE_POSITIVE", "NEEDS_INVESTIGATION"):
        raise HTTPException(status_code=400, detail={"error": "FIELD_VALIDATION_ERROR", "detail": f"Invalid resolution: {resolution}"})

    policy = (
        db.query(Policy)
        .filter(Policy.id == policy_id, Policy.user_id == user.id)
        .first()
    )
    if not policy:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "detail": "Policy not found"})

    prediction = (
        db.query(RiskPrediction)
        .filter(RiskPrediction.policy_id == policy_id)
        .order_by(RiskPrediction.created_at.desc())
        .first()
    )
    if not prediction:
        raise HTTPException(status_code=422, detail={"error": "NO_PREDICTION", "detail": "Run risk assessment first"})

    review = FraudReview(
        id=str(uuid.uuid4()),
        risk_prediction_id=prediction.id,
        policy_id=policy_id,
        user_id=user.id,
        resolution=resolution,
        notes=payload.get("notes"),
        reviewed_at=datetime.utcnow(),
    )
    db.add(review)

    if resolution == "CONFIRMED_FRAUD":
        prediction.fraud_flagged = True
    elif resolution == "FALSE_POSITIVE":
        prediction.fraud_flagged = False

    db.commit()
    return {"message": "Fraud review recorded", "resolution": resolution, "review_id": review.id}


@router.get("/stats")
def fraud_stats(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    flagged = (
        db.query(RiskPrediction)
        .filter(RiskPrediction.user_id == user.id, RiskPrediction.fraud_flagged.is_(True))
        .all()
    )

    high_severity = 0
    confirmed = 0
    false_positives = 0
    rule_counts: dict[str, int] = {}

    for pred in flagged:
        has_high = any(s.get("severity") == "HIGH" for s in pred.fraud_signals)
        if has_high:
            high_severity += 1
        for s in pred.fraud_signals:
            rule_id = s.get("rule_id", "UNKNOWN")
            rule_counts[rule_id] = rule_counts.get(rule_id, 0) + 1

    reviews = db.query(FraudReview).filter(FraudReview.user_id == user.id).all()
    confirmed = sum(1 for r in reviews if r.resolution == "CONFIRMED_FRAUD")
    false_positives = sum(1 for r in reviews if r.resolution == "FALSE_POSITIVE")

    top_rule = max(rule_counts, key=rule_counts.get) if rule_counts else None
    total_reviews = len(reviews) or 1

    return {
        "total_flagged": len(flagged),
        "high_severity_count": high_severity,
        "confirmed_fraud_count": confirmed,
        "false_positive_count": false_positives,
        "false_positive_rate_pct": round(false_positives / total_reviews * 100, 1),
        "top_triggered_rule": top_rule,
        "rule_distribution": rule_counts,
    }
