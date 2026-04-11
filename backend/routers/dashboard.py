from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.auth import get_current_user
from backend.database.db import get_db
from backend.database.models import Policy, RiskPrediction, Report, User

router = APIRouter(prefix="/dashboard", tags=["dashboard"], dependencies=[Depends(get_current_user)])


@router.get("/kpis")
def dashboard_kpis(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        total_policies = db.query(func.count(Policy.id)).filter(
            Policy.user_id == user.id,
            Policy.is_active.is_(True),
        ).scalar() or 0

        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        policy_ids_sub = db.query(Policy.id).filter(
            Policy.user_id == user.id,
            Policy.is_active.is_(True),
        )

        all_preds = db.query(RiskPrediction).filter(
            RiskPrediction.user_id == user.id,
            RiskPrediction.policy_id.in_(policy_ids_sub),
        ).all()

        total_assessed = len(all_preds)
        if all_preds:
            avg_risk_score = round(sum(float(p.risk_score) for p in all_preds) / len(all_preds), 1)
            avg_claim_probability = round(sum(float(p.claim_probability) for p in all_preds) / len(all_preds), 6)
            high_risk_count = 0
            critical_count = 0
            for p in all_preds:
                band_raw = getattr(p.risk_band, "value", p.risk_band)
                band_upper = str(band_raw or "").upper()
                if band_upper in ("HIGH", "CRITICAL"):
                    high_risk_count += 1
                if band_upper == "CRITICAL":
                    critical_count += 1
        else:
            avg_risk_score = 0.0
            avg_claim_probability = 0.0
            high_risk_count = 0
            critical_count = 0

        predictions_today = db.query(func.count(RiskPrediction.id)).filter(
            RiskPrediction.user_id == user.id,
            RiskPrediction.created_at >= today_start,
        ).scalar() or 0

        reports_this_month = db.query(func.count(Report.id)).filter(
            Report.user_id == user.id,
            Report.created_at >= month_start,
        ).scalar() or 0

        policies_this_week = db.query(func.count(Policy.id)).filter(
            Policy.user_id == user.id,
            Policy.is_active.is_(True),
            Policy.created_at >= datetime.utcnow() - timedelta(days=7),
        ).scalar() or 0

        return {
            "total_policies": total_policies,
            "total_assessed": total_assessed,
            "avg_risk_score": avg_risk_score,
            "avg_claim_probability": avg_claim_probability,
            "high_risk_count": high_risk_count,
            "critical_count": critical_count,
            "high_risk_percentage": round((high_risk_count / total_assessed * 100), 1) if total_assessed > 0 else 0.0,
            "total_predictions_today": predictions_today,
            "claims_predicted_this_month": reports_this_month,
            "policies_added_this_week": policies_this_week,
            "total_insured_value": 0.0,
            "total_premium": 0.0,
        }
    except Exception:
        return {
            "total_policies": 0,
            "total_assessed": 0,
            "avg_risk_score": 0.0,
            "avg_claim_probability": 0.0,
            "high_risk_count": 0,
            "critical_count": 0,
            "high_risk_percentage": 0.0,
            "total_predictions_today": 0,
            "claims_predicted_this_month": 0,
            "policies_added_this_week": 0,
            "total_insured_value": 0.0,
            "total_premium": 0.0,
        }


@router.get("/stats")
def dashboard_stats_alias(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return dashboard_kpis(db=db, user=user)


@router.get("/risk-trend")
def risk_trend(
    months: int = Query(default=12, ge=1, le=24),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    cutoff = datetime.utcnow() - timedelta(days=months * 31)

    preds = (
        db.query(RiskPrediction)
        .join(Policy, RiskPrediction.policy_id == Policy.id)
        .filter(
            RiskPrediction.user_id == user.id,
            Policy.is_active.is_(True),
            RiskPrediction.created_at >= cutoff,
        )
        .all()
    )

    monthly: dict[str, dict[str, int]] = {}
    for pred in preds:
        key = pred.created_at.strftime("%Y-%m")
        if key not in monthly:
            monthly[key] = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
        band = pred.risk_band.value.upper()
        if band in monthly[key]:
            monthly[key][band] += 1

    return [
        {"month": month_key, "LOW": m["LOW"], "MEDIUM": m["MEDIUM"], "HIGH": m["HIGH"], "CRITICAL": m["CRITICAL"]}
        for month_key, m in sorted(monthly.items())
    ]


@router.get("/risk-split")
def risk_split(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    policy_ids_sub = db.query(Policy.id).filter(
        Policy.user_id == user.id,
        Policy.is_active.is_(True),
    )

    latest_sub = (
        db.query(
            RiskPrediction.policy_id,
            func.max(RiskPrediction.created_at).label("max_created"),
        )
        .filter(RiskPrediction.policy_id.in_(policy_ids_sub))
        .group_by(RiskPrediction.policy_id)
        .subquery()
    )

    latest_preds = (
        db.query(RiskPrediction)
        .join(
            latest_sub,
            (RiskPrediction.policy_id == latest_sub.c.policy_id)
            & (RiskPrediction.created_at == latest_sub.c.max_created),
        )
        .all()
    )

    distribution: dict[str, int] = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    for pred in latest_preds:
        band = pred.risk_band.value.upper()
        if band in distribution:
            distribution[band] += 1

    total = len(latest_preds) or 1
    return {
        "distribution": distribution,
        "percentages": {
            band: round((count / total) * 100, 1)
            for band, count in distribution.items()
        },
        "total_policies_with_predictions": len(latest_preds),
    }
