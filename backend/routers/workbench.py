from __future__ import annotations

from datetime import datetime, timedelta
from enum import Enum
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.auth.dependencies import get_current_user
from backend.database.db import get_db
from backend.database.models import (
    AuditLog,
    Policy,
    ReportType,
    ReviewQueue,
    RiskBandEnum,
    RiskPrediction,
    UnderwritingDecision,
    User,
)
from backend.llm.cache import make_cache_key, get_cached, set_cached
from backend.llm.groq_client import invoke_llm

router = APIRouter(prefix="/workbench", tags=["workbench"], dependencies=[Depends(get_current_user)])


class DecisionEnum(str, Enum):
    APPROVE = "APPROVE"
    LOAD_PREMIUM = "LOAD_PREMIUM"
    DECLINE = "DECLINE"
    REFER = "REFER"


class PriorityEnum(str, Enum):
    URGENT = "URGENT"
    NORMAL = "NORMAL"
    LOW = "LOW"


class QueueStatusEnum(str, Enum):
    PENDING = "PENDING"
    IN_REVIEW = "IN_REVIEW"
    DECIDED = "DECIDED"
    ESCALATED = "ESCALATED"


class WorkbenchDecisionRequest(BaseModel):
    decision: DecisionEnum
    premium_loading_pct: float | None = None
    decline_reason: str | None = None
    conditions: str | None = None
    notes: str | None = None


class AssignRequest(BaseModel):
    user_id: str


AI_RECOMMENDATION_PROMPT = """You are a senior insurance underwriter with 20 years of experience.
Given the following risk assessment data for a vehicle insurance policy, provide your recommendation
in exactly this format:

RECOMMENDATION: APPROVE | LOAD_PREMIUM [with %] | DECLINE | REFER
REASON: [2 sentences maximum explaining your reasoning]

Risk Assessment Data:
- Risk Score: {risk_score}/100 (Band: {risk_band})
- Claim Probability: {claim_probability}%
- Top Risk Factors: {top_factors}
- Vehicle: {vehicle_make} {vehicle_model} ({vehicle_year})
- Vehicle Use: {vehicle_use}
- City: {city}
- Annual Mileage: {annual_mileage} km
- Prior Claims: {prior_claims}
- NCB%: {ncb}%

Consider: Claim history, vehicle characteristics, usage patterns, and risk score together.
Be decisive. If loading premium, specify a reasonable percentage (5-50%)."""


@router.get("/queue")
def get_queue(
    status: QueueStatusEnum | None = None,
    priority: PriorityEnum | None = None,
    assigned_to: str | None = None,
    risk_band: RiskBandEnum | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = (
        db.query(ReviewQueue)
        .join(Policy, ReviewQueue.policy_id == Policy.id)
        .join(RiskPrediction, ReviewQueue.risk_prediction_id == RiskPrediction.id)
        .filter(Policy.user_id == user.id, Policy.is_active.is_(True))
    )

    if status:
        query = query.filter(ReviewQueue.status == status.value)
    if priority:
        query = query.filter(ReviewQueue.priority == priority.value)
    if assigned_to:
        query = query.filter(ReviewQueue.assigned_to == assigned_to)
    if risk_band:
        query = query.filter(RiskPrediction.risk_band == risk_band)

    total = query.count()
    items = (
        query.order_by(
            ReviewQueue.priority.desc(),
            ReviewQueue.created_at.asc(),
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    results = []
    for item in items:
        pol = db.query(Policy).filter(Policy.id == item.policy_id).first()
        pred = db.query(RiskPrediction).filter(RiskPrediction.id == item.risk_prediction_id).first()
        assigned_user = db.query(User).filter(User.id == item.assigned_to).first() if item.assigned_to else None

        top_shap = pred.shap_features[0] if pred and pred.shap_features else None

        results.append({
            "queue_id": item.id,
            "status": item.status,
            "priority": item.priority,
            "due_by": item.due_by.isoformat() if item.due_by else None,
            "created_at": item.created_at.isoformat() if item.created_at else None,
            "policy_id": pol.id if pol else None,
            "policy_number": pol.policy_number if pol else None,
            "policyholder_name": pol.policyholder_name if pol else None,
            "vehicle": f"{pol.vehicle_make} {pol.vehicle_model}" if pol else None,
            "vehicle_year": pol.vehicle_year if pol else None,
            "risk_score": pred.risk_score if pred else None,
            "risk_band": pred.risk_band.value if pred else None,
            "claim_probability": pred.claim_probability if pred else None,
            "top_shap_factor": top_shap.get("feature_name") if top_shap else None,
            "assigned_to": assigned_user.full_name if assigned_user else None,
            "assigned_to_id": item.assigned_to,
        })

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": results,
    }


@router.get("/my-queue")
def get_my_queue(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = (
        db.query(ReviewQueue)
        .join(Policy, ReviewQueue.policy_id == Policy.id)
        .join(RiskPrediction, ReviewQueue.risk_prediction_id == RiskPrediction.id)
        .filter(
            ReviewQueue.assigned_to == user.id,
            Policy.user_id == user.id,
            Policy.is_active.is_(True),
        )
    )

    total = query.count()
    items = (
        query.order_by(ReviewQueue.priority.desc(), ReviewQueue.created_at.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    results = []
    for item in items:
        pol = db.query(Policy).filter(Policy.id == item.policy_id).first()
        pred = db.query(RiskPrediction).filter(RiskPrediction.id == item.risk_prediction_id).first()
        top_shap = pred.shap_features[0] if pred and pred.shap_features else None

        results.append({
            "queue_id": item.id,
            "status": item.status,
            "priority": item.priority,
            "due_by": item.due_by.isoformat() if item.due_by else None,
            "policy_id": pol.id if pol else None,
            "policy_number": pol.policy_number if pol else None,
            "policyholder_name": pol.policyholder_name if pol else None,
            "vehicle": f"{pol.vehicle_make} {pol.vehicle_model}" if pol else None,
            "risk_score": pred.risk_score if pred else None,
            "risk_band": pred.risk_band.value if pred else None,
            "claim_probability": pred.claim_probability if pred else None,
            "top_shap_factor": top_shap.get("feature_name") if top_shap else None,
        })

    return {"total": total, "page": page, "page_size": page_size, "items": results}


@router.get("/stats")
def get_workbench_stats(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    base_query = (
        db.query(ReviewQueue)
        .join(Policy, ReviewQueue.policy_id == Policy.id)
        .filter(Policy.user_id == user.id)
    )

    pending = base_query.filter(ReviewQueue.status.in_(["PENDING", "IN_REVIEW"])).count()
    overdue = base_query.filter(
        ReviewQueue.status.in_(["PENDING", "IN_REVIEW"]),
        ReviewQueue.due_by < now,
    ).count()

    decided_today = (
        db.query(UnderwritingDecision)
        .filter(
            UnderwritingDecision.user_id == user.id,
            UnderwritingDecision.created_at >= today_start,
        )
        .count()
    )

    decisions = (
        db.query(UnderwritingDecision)
        .filter(UnderwritingDecision.user_id == user.id)
        .all()
    )
    ai_agreement = 0
    total_with_ai = 0
    for d in decisions:
        if d.ai_recommendation:
            total_with_ai += 1
            if d.followed_ai:
                ai_agreement += 1

    ai_agreement_rate = round(ai_agreement / total_with_ai * 100, 1) if total_with_ai > 0 else 0.0

    return {
        "pending_count": pending,
        "overdue_count": overdue,
        "decided_today": decided_today,
        "ai_agreement_rate_pct": ai_agreement_rate,
    }


@router.post("/{policy_id}/decide")
def submit_decision(
    policy_id: str,
    payload: WorkbenchDecisionRequest,
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

    latest_pred = (
        db.query(RiskPrediction)
        .filter(RiskPrediction.policy_id == policy_id)
        .order_by(RiskPrediction.created_at.desc())
        .first()
    )
    if not latest_pred:
        raise HTTPException(status_code=422, detail={"error": "NO_PREDICTION", "detail": "Run risk assessment first"})

    queue_item = (
        db.query(ReviewQueue)
        .filter(ReviewQueue.policy_id == policy_id, ReviewQueue.status.in_(["PENDING", "IN_REVIEW"]))
        .first()
    )

    if payload.decision == DecisionEnum.DECLINE and not payload.decline_reason:
        raise HTTPException(status_code=400, detail={"error": "FIELD_VALIDATION_ERROR", "detail": "Decline reason required"})

    ai_rec_text = None
    followed_ai = None
    if latest_pred.risk_band in [RiskBandEnum.CRITICAL, RiskBandEnum.HIGH]:
        ai_cache_key = make_cache_key(policy_id, "workbench_ai_rec", "mixtral-8x7b-32768")
        cached_ai = get_cached(ai_cache_key, db)
        if cached_ai:
            try:
                import json
                ai_data = json.loads(cached_ai)
                ai_rec_text = f"{ai_data.get('recommendation')} - {ai_data.get('reason', '')}"
                followed_ai = payload.decision.value == ai_data.get("recommendation")
            except Exception:
                pass

    decision = UnderwritingDecision(
        id=str(uuid4()),
        policy_id=policy_id,
        user_id=user.id,
        decision=payload.decision.value,
        premium_loading_pct=payload.premium_loading_pct,
        decline_reason=payload.decline_reason,
        conditions=payload.conditions,
        notes=payload.notes,
        ai_recommendation=ai_rec_text,
        followed_ai=followed_ai,
        created_at=datetime.utcnow(),
    )
    db.add(decision)

    if queue_item:
        queue_item.status = "DECIDED"

    audit = AuditLog(
        id=str(uuid4()),
        user_id=user.id,
        action="underwriting_decision",
        resource_type="underwriting_decision",
        resource_id=decision.id,
        created_at=datetime.utcnow(),
    )
    db.add(audit)

    db.commit()
    db.refresh(decision)

    return {
        "message": "Decision recorded",
        "decision_id": decision.id,
        "decision": decision.decision,
        "followed_ai": followed_ai,
    }


@router.post("/{policy_id}/assign")
def assign_queue_item(
    policy_id: str,
    payload: AssignRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    pol = (
        db.query(Policy)
        .filter(Policy.id == policy_id, Policy.user_id == user.id)
        .first()
    )
    if not pol:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "detail": "Policy not found"})

    assignee = db.query(User).filter(User.id == payload.user_id, User.is_active.is_(True)).first()
    if not assignee:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "detail": "Assignee user not found"})

    queue_item = (
        db.query(ReviewQueue)
        .filter(ReviewQueue.policy_id == policy_id, ReviewQueue.status.in_(["PENDING", "IN_REVIEW"]))
        .first()
    )

    if not queue_item:
        latest_pred = (
            db.query(RiskPrediction)
            .filter(RiskPrediction.policy_id == policy_id)
            .order_by(RiskPrediction.created_at.desc())
            .first()
        )
        if not latest_pred:
            raise HTTPException(status_code=422, detail={"error": "NO_PREDICTION", "detail": "Run risk assessment first"})

        priority = "URGENT" if latest_pred.risk_band in [RiskBandEnum.CRITICAL, RiskBandEnum.HIGH] else "NORMAL"
        due_by = datetime.utcnow() + timedelta(hours=24 if priority == "URGENT" else 72)

        queue_item = ReviewQueue(
            id=str(uuid4()),
            policy_id=policy_id,
            risk_prediction_id=latest_pred.id,
            status="PENDING",
            priority=priority,
            assigned_to=payload.user_id,
            due_by=due_by,
            created_at=datetime.utcnow(),
        )
        db.add(queue_item)
    else:
        queue_item.assigned_to = payload.user_id

    db.commit()
    db.refresh(queue_item)

    return {"message": "Queue item assigned", "queue_id": queue_item.id, "assigned_to": assignee.full_name}


@router.post("/{policy_id}/ai-recommendation")
def get_ai_recommendation(
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

    latest_pred = (
        db.query(RiskPrediction)
        .filter(RiskPrediction.policy_id == policy_id)
        .order_by(RiskPrediction.created_at.desc())
        .first()
    )
    if not latest_pred:
        raise HTTPException(status_code=422, detail={"error": "NO_PREDICTION", "detail": "Run risk assessment first"})

    cache_key = make_cache_key(policy_id, "workbench_ai_rec", "mixtral-8x7b-32768")
    cached = get_cached(cache_key, db)
    if cached:
        import json
        return json.loads(cached)

    top_factors = []
    if latest_pred.shap_features:
        for f in latest_pred.shap_features[:3]:
            top_factors.append(f"{f.get('feature_name', 'unknown')}: {f.get('feature_value', 'N/A')}")

    prompt = AI_RECOMMENDATION_PROMPT.format(
        risk_score=latest_pred.risk_score,
        risk_band=latest_pred.risk_band.value,
        claim_probability=round(latest_pred.claim_probability * 100, 1),
        top_factors=", ".join(top_factors) or "Standard risk profile",
        vehicle_make=pol.vehicle_make,
        vehicle_model=pol.vehicle_model,
        vehicle_year=pol.vehicle_year,
        vehicle_use=pol.vehicle_use.value if pol.vehicle_use else "unknown",
        city=pol.city,
        annual_mileage=pol.annual_mileage_km,
        prior_claims=pol.prior_claims_count,
        ncb=pol.ncb_percentage,
    )

    response = invoke_llm("reasoner", prompt, "", expect_json=False)

    recommendation = "REFER"
    loading_pct = None
    reason = response

    lines = response.upper().split("\n")
    for line in lines:
        if line.startswith("RECOMMENDATION:"):
            parts = line.split(":", 1)[1].strip()
            if "LOAD_PREMIUM" in parts:
                recommendation = "LOAD_PREMIUM"
                import re
                nums = re.findall(r"\d+", parts)
                if nums:
                    loading_pct = float(nums[0])
            elif "APPROVE" in parts:
                recommendation = "APPROVE"
            elif "DECLINE" in parts:
                recommendation = "DECLINE"
            elif "REFER" in parts:
                recommendation = "REFER"

    result = {
        "recommendation": recommendation,
        "loading_pct": loading_pct,
        "reason": reason,
    }

    set_cached(cache_key, result, "mixtral-8x7b-32768", 24, db)
    return result
