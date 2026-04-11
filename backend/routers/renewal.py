from __future__ import annotations

from datetime import datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.auth.dependencies import get_current_user
from backend.database.db import get_db
from backend.database.models import Policy, RiskPrediction, User
from backend.llm.cache import make_cache_key, get_cached, set_cached
from backend.llm.groq_client import invoke_llm
from backend.ml.renewal_scorer import renewal_risk_score

router = APIRouter(prefix="/renewal", tags=["renewal"], dependencies=[Depends(get_current_user)])


RENEWAL_ADVISORY_PROMPT = """You are a senior insurance renewal advisor.
For the following policy due for renewal, provide a concise renewal advisory in 3-4 sentences:
- Current risk assessment and premium situation
- Key retention risks and opportunities
- Specific recommended action with justification

Policy Details:
- Policy Number: {policy_number}
- Holder: {holder_name}
- Vehicle: {vehicle_make} {vehicle_model} ({vehicle_year})
- Current Premium: ₹{premium:,.0f}
- Risk Band: {risk_band}
- Claim Probability: {claim_prob}%
- Policy Duration: {duration} months
- NCB%: {ncb}%
- Prior Claims: {prior_claims}
- Expires in: {days_to_expiry} days
- Lapse Probability: {lapse_prob}%
- Recommended Premium Change: {premium_change}%
- Renewal Recommendation: {renewal_rec}

Generate a clear, actionable advisory."""


@router.get("/upcoming")
def get_upcoming_renewals(
    days_ahead: int = Query(60, ge=30, le=90),
    lapse_risk: Literal["high", "medium", "low"] | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    cutoff_date = datetime.utcnow().date() + timedelta(days=days_ahead)
    start_date = datetime.utcnow().date()

    policy_ids = [p.id for p in db.query(Policy.id).filter(Policy.user_id == user.id, Policy.is_active.is_(True)).all()]

    if not policy_ids:
        return {"total": 0, "items": []}

    query = (
        db.query(Policy)
        .filter(
            Policy.user_id == user.id,
            Policy.is_active.is_(True),
            Policy.policy_end_date >= start_date,
            Policy.policy_end_date <= cutoff_date,
        )
    )

    if lapse_risk:
        all_policies = query.all()
        filtered_ids = []
        for pol in all_policies:
            latest_pred = (
                db.query(RiskPrediction)
                .filter(RiskPrediction.policy_id == pol.id)
                .order_by(RiskPrediction.created_at.desc())
                .first()
            )
            score = renewal_risk_score(pol, latest_pred)
            if lapse_risk == "high" and score.lapse_probability > 0.5:
                filtered_ids.append(pol.id)
            elif lapse_risk == "medium" and 0.3 < score.lapse_probability <= 0.5:
                filtered_ids.append(pol.id)
            elif lapse_risk == "low" and score.lapse_probability <= 0.3:
                filtered_ids.append(pol.id)
        query = query.filter(Policy.id.in_(filtered_ids)) if filtered_ids else query.filter(Policy.id.in_([]))

    total = query.count()
    policies = (
        query.order_by(Policy.policy_end_date.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    results = []
    for pol in policies:
        latest_pred = (
            db.query(RiskPrediction)
            .filter(RiskPrediction.policy_id == pol.id)
            .order_by(RiskPrediction.created_at.desc())
            .first()
        )

        score = renewal_risk_score(pol, latest_pred)
        days_to_expiry = (pol.policy_end_date - datetime.utcnow().date()).days if pol.policy_end_date else 0

        results.append({
            "policy_id": pol.id,
            "policy_number": pol.policy_number,
            "policyholder_name": pol.policyholder_name,
            "vehicle": f"{pol.vehicle_make} {pol.vehicle_model}",
            "vehicle_year": pol.vehicle_year,
            "city": pol.city,
            "premium_amount": pol.premium_amount,
            "insured_value": pol.insured_value,
            "policy_end_date": pol.policy_end_date.isoformat() if pol.policy_end_date else None,
            "days_to_expiry": max(0, days_to_expiry),
            "risk_score": latest_pred.risk_score if latest_pred else None,
            "risk_band": (latest_pred.risk_band.value if hasattr(latest_pred.risk_band, "value") else str(latest_pred.risk_band)) if latest_pred and latest_pred.risk_band else None,
            "claim_probability": round(latest_pred.claim_probability * 100, 1) if latest_pred and latest_pred.claim_probability is not None else None,
            "lapse_probability": round(score.lapse_probability * 100, 1),
            "risk_change_flag": score.risk_change_flag,
            "renewal_recommendation": score.renewal_recommendation,
            "recommended_premium_change_pct": score.recommended_premium_change_pct,
            "renewal_reasons": score.reasons,
        })

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "days_ahead": days_ahead,
        "items": results,
    }


@router.get("/at-risk")
def get_at_risk_renewals(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    policies = (
        db.query(Policy)
        .filter(Policy.user_id == user.id, Policy.is_active.is_(True))
        .all()
    )

    at_risk = []
    for pol in policies:
        latest_pred = (
            db.query(RiskPrediction)
            .filter(RiskPrediction.policy_id == pol.id)
            .order_by(RiskPrediction.created_at.desc())
            .first()
        )
        score = renewal_risk_score(pol, latest_pred)
        if score.lapse_probability > 0.5:
            days_to_expiry = (pol.policy_end_date - datetime.utcnow().date()).days if pol.policy_end_date else 0
            at_risk.append({
                "policy_id": pol.id,
                "policy_number": pol.policy_number,
                "policyholder_name": pol.policyholder_name,
                "vehicle": f"{pol.vehicle_make} {pol.vehicle_model}",
                "premium_amount": pol.premium_amount,
                "days_to_expiry": max(0, days_to_expiry),
                "risk_band": (latest_pred.risk_band.value if hasattr(latest_pred.risk_band, "value") else str(latest_pred.risk_band)) if latest_pred and latest_pred.risk_band else None,
                "lapse_probability": round(score.lapse_probability * 100, 1),
                "renewal_recommendation": score.renewal_recommendation,
                "top_reason": score.reasons[0] if score.reasons else "High lapse probability",
            })

    at_risk.sort(key=lambda x: x["lapse_probability"], reverse=True)
    total = len(at_risk)
    paginated = at_risk[(page - 1) * page_size: page * page_size]

    return {"total": total, "page": page, "page_size": page_size, "items": paginated}


@router.get("/stats")
def get_renewal_stats(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    cutoff_30 = datetime.utcnow().date() + timedelta(days=30)
    cutoff_60 = datetime.utcnow().date() + timedelta(days=60)
    cutoff_90 = datetime.utcnow().date() + timedelta(days=90)

    expiring_30 = (
        db.query(Policy)
        .filter(
            Policy.user_id == user.id,
            Policy.is_active.is_(True),
            Policy.policy_end_date >= datetime.utcnow().date(),
            Policy.policy_end_date <= cutoff_30,
        )
        .count()
    )

    expiring_60 = (
        db.query(Policy)
        .filter(
            Policy.user_id == user.id,
            Policy.is_active.is_(True),
            Policy.policy_end_date >= datetime.utcnow().date(),
            Policy.policy_end_date <= cutoff_60,
        )
        .count()
    )

    expiring_90 = (
        db.query(Policy)
        .filter(
            Policy.user_id == user.id,
            Policy.is_active.is_(True),
            Policy.policy_end_date >= datetime.utcnow().date(),
            Policy.policy_end_date <= cutoff_90,
        )
        .count()
    )

    policies = db.query(Policy).filter(Policy.user_id == user.id, Policy.is_active.is_(True)).all()
    at_risk_count = 0
    reprice_count = 0
    retain_count = 0

    for pol in policies:
        latest_pred = (
            db.query(RiskPrediction)
            .filter(RiskPrediction.policy_id == pol.id)
            .order_by(RiskPrediction.created_at.desc())
            .first()
        )
        score = renewal_risk_score(pol, latest_pred)
        if score.lapse_probability > 0.5:
            at_risk_count += 1
        if score.renewal_recommendation == "REPRICE":
            reprice_count += 1
        elif score.renewal_recommendation == "RETAIN":
            retain_count += 1

    return {
        "expiring_in_30_days": expiring_30,
        "expiring_in_60_days": expiring_60,
        "expiring_in_90_days": expiring_90,
        "high_lapse_risk_count": at_risk_count,
        "reprice_count": reprice_count,
        "retain_count": retain_count,
    }


@router.post("/{policy_id}/advisory")
def generate_renewal_advisory(
    policy_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    pol = (
        db.query(Policy)
        .filter(Policy.id == policy_id, Policy.user_id == user.id, Policy.is_active.is_(True))
        .first()
    )
    if not pol:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "detail": "Policy not found"})

    cache_key = make_cache_key(policy_id, "renewal_advisory", "mixtral-8x7b-32768")
    cached = get_cached(cache_key, db)
    if cached:
        return {"advisory": cached, "cached": True}

    latest_pred = (
        db.query(RiskPrediction)
        .filter(RiskPrediction.policy_id == policy_id)
        .order_by(RiskPrediction.created_at.desc())
        .first()
    )

    score = renewal_risk_score(pol, latest_pred)
    days_to_expiry = (pol.policy_end_date - datetime.utcnow().date()).days if pol.policy_end_date else 0

    prompt = RENEWAL_ADVISORY_PROMPT.format(
        policy_number=pol.policy_number,
        holder_name=pol.policyholder_name,
        vehicle_make=pol.vehicle_make,
        vehicle_model=pol.vehicle_model,
        vehicle_year=pol.vehicle_year,
        premium=pol.premium_amount,
        risk_band=(latest_pred.risk_band.value if hasattr(latest_pred.risk_band, "value") else str(latest_pred.risk_band)) if latest_pred and latest_pred.risk_band else "UNKNOWN",
        claim_prob=round(latest_pred.claim_probability * 100, 1) if latest_pred and latest_pred.claim_probability is not None else 0,
        duration=pol.policy_duration_months,
        ncb=pol.ncb_percentage,
        prior_claims=pol.prior_claims_count,
        days_to_expiry=max(0, days_to_expiry),
        lapse_prob=round(score.lapse_probability * 100, 1),
        premium_change=score.recommended_premium_change_pct,
        renewal_rec=score.renewal_recommendation,
    )

    advisory = invoke_llm("reasoner", prompt, "", expect_json=False)
    set_cached(cache_key, advisory, "mixtral-8x7b-32768", 24, db)

    return {
        "advisory": advisory,
        "cached": False,
        "renewal_score": {
            "lapse_probability": round(score.lapse_probability * 100, 1),
            "risk_change_flag": score.risk_change_flag,
            "renewal_recommendation": score.renewal_recommendation,
            "recommended_premium_change_pct": score.recommended_premium_change_pct,
            "reasons": score.reasons,
        },
    }
