import json
from datetime import datetime
from uuid import uuid4

import numpy as np
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.auth import get_current_user
from backend.cache import build_cache_key, get_cached_response, set_cached_response
from backend.config import get_settings
from backend.database.db import get_db
from backend.ml import policy_to_vector, score_to_band, score_to_risk_band_enum
from backend.database.models import BatchJob, BatchJobStatus, Policy, Report, ReportType, RiskPrediction, User
from backend.schemas import (
    BatchJobOut,
    BatchRequest,
    ClaimPredictionOut,
    DashboardStatsOut,
    PolicyActionRequest,
    PremiumAdvisoryOut,
    RiskAssessmentOut,
    SHAPFeature,
    UnderwritingReportOut,
)

router = APIRouter(tags=["analytics"], dependencies=[Depends(get_current_user)])


def _predict_score(model, vector: np.ndarray) -> float:
    try:
        import xgboost as xgb

        if model.__class__.__name__ == "Booster":
            return float(model.predict(xgb.DMatrix(vector))[0])
    except Exception:
        pass
    pred = model.predict(vector)
    return float(pred[0])


def _extract_shap(explainer, vector: np.ndarray) -> list[dict]:
    if hasattr(explainer, "explain"):
        return explainer.explain(vector)
    return []


def _groq_or_cache(db: Session, policy_id: str, endpoint: str, prompt: str) -> str:
    settings = get_settings()
    key = build_cache_key(policy_id, endpoint, settings.groq_model)
    cached = get_cached_response(db, key)
    if cached:
        cached_text = str(cached.get("text", ""))
        if "deterministic fallback explanation" not in cached_text.lower():
            return cached_text

    text = ""
    used_fallback = False
    if settings.groq_api_key:
        try:
            from groq import Groq

            client = Groq(api_key=settings.groq_api_key)
            completion = client.chat.completions.create(
                model=settings.groq_model,
                messages=[
                    {"role": "system", "content": "You are an insurance underwriting assistant. Keep responses concise."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.2,
            )
            text = completion.choices[0].message.content or ""
        except Exception:
            text = "LLM unavailable. Generated deterministic fallback explanation."
            used_fallback = True
    else:
        text = "LLM key not configured. Generated deterministic fallback explanation."
        used_fallback = True

    if not used_fallback:
        ttl_sec = int(max(1, settings.cache_ttl_hours) * 3600)
        set_cached_response(db, key, {"text": text}, settings.groq_model, ttl_sec)
    return text


def _get_policy_or_404(db: Session, policy_id: str, user_id: str) -> Policy:
    policy = (
        db.query(Policy)
        .filter(Policy.id == policy_id, Policy.user_id == user_id, Policy.is_active.is_(True))
        .first()
    )
    if not policy:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "detail": "Policy not found"})
    return policy


@router.post("/risk-scoring", response_model=RiskAssessmentOut)
def risk_scoring(
    payload: PolicyActionRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    policy = _get_policy_or_404(db, payload.policy_id, user.id)
    vector = policy_to_vector(policy)
    score_raw = _predict_score(request.app.state.model, vector)
    score = int(round(score_raw))
    band = score_to_band(score)
    claim_probability = round((score / 100) * 0.7, 3)

    shap_features = _extract_shap(request.app.state.explainer, vector)
    top_for_api: list[SHAPFeature] = []
    for item in shap_features[:8]:
        try:
            top_for_api.append(SHAPFeature.model_validate(item))
        except Exception:
            continue

    explanation_prompt = (
        f"Policy {policy.policy_number}, holder {policy.policyholder_name}, score {score}, band {band}. "
        "Write a short underwriting explanation."
    )
    explanation = _groq_or_cache(db, policy.id, "/risk-scoring", explanation_prompt)

    now = datetime.utcnow()
    pred_id = str(uuid4())
    rp = RiskPrediction(
        id=pred_id,
        policy_id=policy.id,
        user_id=user.id,
        claim_probability=claim_probability,
        risk_score=score,
        risk_band=score_to_risk_band_enum(score_raw),
        shap_features=shap_features,
        llm_explanation=explanation,
        model_version="xgb_v1",
        created_at=now,
    )
    db.add(rp)
    db.commit()

    return RiskAssessmentOut(
        id=pred_id,
        policy_id=policy.id,
        risk_score=score,
        risk_band=band,  # type: ignore[arg-type]
        claim_probability=claim_probability,
        top_features=top_for_api,
        explanation=explanation,
        agent_type="risk_scoring",
        created_at=now,
    )


@router.post("/claim-prediction", response_model=ClaimPredictionOut)
def claim_prediction(
    payload: PolicyActionRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    policy = _get_policy_or_404(db, payload.policy_id, user.id)
    vector = policy_to_vector(policy)
    score = _predict_score(request.app.state.model, vector)
    probability = round((score / 100) * 0.7, 3)
    predicted = int(round(policy.insured_value * probability * 0.3))

    factors = []
    if policy.prior_claims_count > 0:
        factors.append(f"{policy.prior_claims_count} prior claim(s)")
    vu = policy.vehicle_use.value if hasattr(policy.vehicle_use, "value") else str(policy.vehicle_use)
    if vu in ("commercial", "rideshare"):
        factors.append("Commercial or rideshare usage")
    if 2026 - policy.vehicle_year > 4:
        factors.append("Vehicle age > 4 years")
    if policy.engine_cc > 2000:
        factors.append("High engine capacity")

    now = datetime.utcnow()
    result = ClaimPredictionOut(
        id=f"cp-{uuid4().hex[:10]}",
        policy_id=policy.id,
        claim_probability=probability,
        predicted_claim_amount=predicted,
        confidence_interval={"lower": int(predicted * 0.7), "upper": int(predicted * 1.4)},
        risk_factors=factors,
        model_version="xgboost-v1",
        created_at=now,
    )
    db.add(
        Report(
            id=result.id,
            policy_id=policy.id,
            user_id=user.id,
            report_type=ReportType.claim,
            content=json.dumps(result.model_dump(), default=str),
            pdf_path=None,
            created_at=now,
        )
    )
    db.commit()
    return result


@router.post("/premium-advisory", response_model=PremiumAdvisoryOut)
def premium_advisory(
    payload: PolicyActionRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    policy = _get_policy_or_404(db, payload.policy_id, user.id)
    vector = policy_to_vector(policy)
    score = _predict_score(request.app.state.model, vector)

    multiplier = 1 + ((score - 50) / 100)
    recommended = int(round(policy.premium_amount * multiplier))

    factors = [
        {
            "factor_name": "Claims History",
            "impact": policy.prior_claims_count * 8,
            "direction": "increase" if policy.prior_claims_count > 0 else "decrease",
            "description": f"{policy.prior_claims_count} prior claims",
        },
        {
            "factor_name": "Vehicle Age",
            "impact": max(0, (2026 - policy.vehicle_year) * 2),
            "direction": "increase",
            "description": f"Vehicle age is {2026 - policy.vehicle_year} years",
        },
        {
            "factor_name": "Usage",
            "impact": 0,
            "direction": "decrease",
            "description": str(policy.vehicle_use),
        },
    ]
    vu = policy.vehicle_use.value if hasattr(policy.vehicle_use, "value") else str(policy.vehicle_use)
    factors[2]["impact"] = 15 if vu in ("commercial", "rideshare") else 0
    factors[2]["direction"] = "increase" if vu in ("commercial", "rideshare") else "decrease"

    just_prompt = (
        f"Given policy {policy.policy_number} score {score:.1f}, current premium {policy.premium_amount}, "
        f"recommended premium {recommended}, provide concise rationale."
    )
    justification = _groq_or_cache(db, policy.id, "/premium-advisory", just_prompt)

    now = datetime.utcnow()
    pa_id = f"pa-{uuid4().hex[:10]}"
    result = PremiumAdvisoryOut(
        id=pa_id,
        policy_id=policy.id,
        current_premium=policy.premium_amount,
        recommended_premium=recommended,
        premium_range={"min": int(recommended * 0.85), "max": int(recommended * 1.2)},
        adjustment_factors=factors,
        justification=justification,
        created_at=now,
    )
    db.add(
        Report(
            id=result.id,
            policy_id=policy.id,
            user_id=user.id,
            report_type=ReportType.premium_advisory,
            content=json.dumps(result.model_dump(), default=str),
            pdf_path=None,
            created_at=now,
        )
    )
    db.commit()
    return result


@router.post("/report", response_model=UnderwritingReportOut)
def generate_report(
    payload: PolicyActionRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    risk = risk_scoring(payload, request, db, user)
    claim = claim_prediction(payload, request, db, user)
    premium = premium_advisory(payload, request, db, user)

    recommendation = "approve"
    if risk.risk_band == "critical":
        recommendation = "reject"
    elif risk.risk_band == "high":
        recommendation = "review"

    summary_prompt = (
        f"Create an underwriting summary for {payload.policy_id}. Risk={risk.risk_band}, "
        f"claim_prob={claim.claim_probability}, recommended={premium.recommended_premium}."
    )
    summary = _groq_or_cache(db, payload.policy_id, "/report", summary_prompt)
    now = datetime.utcnow()
    report_id = f"rpt-{uuid4().hex[:10]}"
    out = UnderwritingReportOut(
        id=report_id,
        policy_id=payload.policy_id,
        risk_assessment=risk,
        claim_prediction=claim,
        premium_advisory=premium,
        summary=summary,
        recommendation=recommendation,  # type: ignore[arg-type]
        generated_at=now,
    )

    db.add(
        Report(
            id=report_id,
            policy_id=payload.policy_id,
            user_id=user.id,
            report_type=ReportType.underwriting,
            content=json.dumps(out.model_dump(), default=str),
            pdf_path=None,
            created_at=now,
        )
    )
    db.commit()
    return out


@router.post("/batch", response_model=BatchJobOut)
def batch_analysis(
    payload: BatchRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    now = datetime.utcnow()
    job_id = str(uuid4())
    job = BatchJob(
        id=job_id,
        user_id=user.id,
        status=BatchJobStatus.completed,
        total_policies=len(payload.policy_ids),
        processed_count=0,
        failed_count=0,
        result_summary={},
        created_at=now,
        completed_at=now,
    )
    db.add(job)
    db.flush()

    summary = {
        "avg_risk_score": 0,
        "risk_distribution": {"low": 0, "medium": 0, "high": 0, "critical": 0},
        "avg_claim_probability": 0,
        "total_insured_value": 0,
        "total_premium": 0,
        "high_risk_count": 0,
    }

    processed = 0
    for policy_id in payload.policy_ids:
        policy = (
            db.query(Policy)
            .filter(Policy.id == policy_id, Policy.user_id == user.id, Policy.is_active.is_(True))
            .first()
        )
        if not policy:
            job.failed_count += 1
            continue
        score = _predict_score(request.app.state.model, policy_to_vector(policy))
        band = score_to_band(score)
        processed += 1

        summary["avg_risk_score"] += score
        summary["risk_distribution"][band] += 1
        summary["avg_claim_probability"] += (score / 100) * 0.7
        summary["total_insured_value"] += policy.insured_value
        summary["total_premium"] += policy.premium_amount
        if band in {"high", "critical"}:
            summary["high_risk_count"] += 1

        rp = RiskPrediction(
            id=str(uuid4()),
            policy_id=policy.id,
            user_id=user.id,
            claim_probability=round((score / 100) * 0.7, 3),
            risk_score=int(round(score)),
            risk_band=score_to_risk_band_enum(score),
            shap_features=[],
            llm_explanation="",
            model_version="xgb_v1_batch",
            created_at=now,
        )
        db.add(rp)

    divisor = processed if processed > 0 else 1
    summary["avg_risk_score"] = int(round(summary["avg_risk_score"] / divisor))
    summary["avg_claim_probability"] = round(summary["avg_claim_probability"] / divisor, 3)

    job.processed_count = processed
    job.result_summary = summary
    job.completed_at = datetime.utcnow()
    db.commit()

    status_map = {
        BatchJobStatus.pending: "queued",
        BatchJobStatus.running: "processing",
        BatchJobStatus.completed: "completed",
        BatchJobStatus.failed: "failed",
    }
    return BatchJobOut(
        id=job.id,
        name=f"Batch {now.date().isoformat()}",
        total_policies=job.total_policies,
        processed=job.processed_count,
        status=status_map[job.status],
        results_summary=job.result_summary,
        created_at=job.created_at,
        completed_at=job.completed_at,
    )


@router.get("/audit-log")
def get_audit_log(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    from backend.database.models import AuditLog

    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(200).all()
    return [
        {
            "id": row.id,
            "user_id": row.user_id or "",
            "action": row.action,
            "resource_type": row.resource_type,
            "resource_id": row.resource_id or "",
            "timestamp": row.created_at,
            "payload_hash": row.payload_hash or "",
        }
        for row in logs
    ]


@router.get("/dashboard/stats", response_model=DashboardStatsOut)
def dashboard_stats(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    policies = db.query(Policy).filter(Policy.user_id == user.id, Policy.is_active.is_(True)).all()
    if not policies:
        return DashboardStatsOut(
            total_policies=0,
            total_assessed=0,
            avg_risk_score=0,
            high_risk_percentage=0,
            total_insured_value=0,
            total_premium=0,
            claims_predicted=0,
            reports_generated=0,
        )

    scores = []
    insured_total = 0.0
    premium_total = 0.0
    for p in policies:
        score = 30 + p.prior_claims_count * 15 + max(0, (2026 - p.vehicle_year) * 3)
        vu = p.vehicle_use.value if hasattr(p.vehicle_use, "value") else str(p.vehicle_use)
        if vu in ("commercial", "rideshare"):
            score += 20
        if p.engine_cc > 2000:
            score += 10
        if p.insured_value > 2_000_000:
            score += 10
        scores.append(min(100, score))
        insured_total += p.insured_value
        premium_total += p.premium_amount

    high_count = len([s for s in scores if s > 55])
    claims_count = db.query(Report).filter(Report.user_id == user.id, Report.report_type == ReportType.claim).count()
    reports_count = db.query(Report).filter(Report.user_id == user.id, Report.report_type == ReportType.underwriting).count()

    return DashboardStatsOut(
        total_policies=len(policies),
        total_assessed=len(scores),
        avg_risk_score=int(round(sum(scores) / len(scores))),
        high_risk_percentage=int(round((high_count / len(scores)) * 100)),
        total_insured_value=insured_total,
        total_premium=premium_total,
        claims_predicted=claims_count,
        reports_generated=reports_count,
    )

