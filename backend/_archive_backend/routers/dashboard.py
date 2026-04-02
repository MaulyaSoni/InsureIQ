from datetime import datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, extract
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Policy, RiskPrediction, Report, ReportType, User

router = APIRouter(prefix="/dashboard", tags=["dashboard"], dependencies=[Depends(get_current_user)])


@router.get("/kpis")
def dashboard_kpis(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    today = datetime.utcnow().date()
    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    total_policies = db.query(func.count(Policy.id)).filter(
        Policy.user_id == user.id,
        Policy.is_active.is_(True),
    ).scalar() or 0

    policy_ids_sub = db.query(Policy.id).filter(
        Policy.user_id == user.id,
        Policy.is_active.is_(True),
    )

    predictions_q = db.query(RiskPrediction).filter(
        RiskPrediction.user_id == user.id,
        RiskPrediction.policy_id.in_(policy_ids_sub),
    )

    all_predictions = predictions_q.all()
    total_predictions = len(all_predictions)

    if all_predictions:
        avg_risk_score = round(sum(float(p.risk_score) for p in all_predictions) / len(all_predictions), 1)
        high_risk_count = sum(1 for p in all_predictions if p.risk_band.value in ("HIGH", "CRITICAL"))
    else:
        avg_risk_score = 0.0
        high_risk_count = 0

    predictions_today = db.query(func.count(RiskPrediction.id)).filter(
        RiskPrediction.user_id == user.id,
        RiskPrediction.created_at >= datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0),
    ).scalar() or 0

    reports_this_month = db.query(func.count(Report.id)).filter(
        Report.user_id == user.id,
        Report.created_at >= month_start,
    ).scalar() or 0

    return {
        "total_policies": total_policies,
        "avg_risk_score": avg_risk_score,
        "high_risk_count": high_risk_count,
        "total_predictions_today": predictions_today,
        "claims_predicted_this_month": reports_this_month,
    }


@router.get("/risk-trend")
def risk_trend(
    months: int = Query(default=12, ge=1, le=24),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    cutoff = datetime.utcnow() - timedelta(days=months * 31)

    predictions = db.query(RiskPrediction).join(
        Policy, RiskPrediction.policy_id == Policy.id
    ).filter(
        RiskPrediction.user_id == user.id,
        Policy.is_active.is_(True),
        RiskPrediction.created_at >= cutoff,
    ).all()

    monthly: dict[str, dict[str, int]] = {}
    for pred in predictions:
        key = pred.created_at.strftime("%Y-%m")
        if key not in monthly:
            monthly[key] = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
        band = pred.risk_band.value.upper()
        if band in monthly[key]:
            monthly[key][band] += 1

    result = []
    for month_key in sorted(monthly.keys()):
        m = monthly[month_key]
        result.append({
            "month": month_key,
            "LOW": m["LOW"],
            "MEDIUM": m["MEDIUM"],
            "HIGH": m["HIGH"],
            "CRITICAL": m["CRITICAL"],
        })

    return result


@router.get("/risk-split")
def risk_split(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    policy_ids_sub = db.query(Policy.id).filter(
        Policy.user_id == user.id,
        Policy.is_active.is_(True),
    )

    latest_preds_sub = (
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
            latest_preds_sub,
            (RiskPrediction.policy_id == latest_preds_sub.c.policy_id)
            & (RiskPrediction.created_at == latest_preds_sub.c.max_created),
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
