from __future__ import annotations

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from backend.database.models import Policy, RiskBandEnum, RiskPrediction


def latest_prediction_subquery(db: Session):
    return (
        select(RiskPrediction.policy_id, func.max(RiskPrediction.created_at).label("mx"))
        .group_by(RiskPrediction.policy_id)
        .subquery()
    )


def get_latest_risk_prediction_for_policies(
    db: Session, policy_ids: list[str]
) -> dict[str, RiskPrediction]:
    if not policy_ids:
        return {}
    sub = latest_prediction_subquery(db)
    rows = (
        db.query(RiskPrediction)
        .join(
            sub,
            and_(
                RiskPrediction.policy_id == sub.c.policy_id,
                RiskPrediction.created_at == sub.c.mx,
            ),
        )
        .filter(RiskPrediction.policy_id.in_(policy_ids))
        .all()
    )
    return {r.policy_id: r for r in rows}


def normalize_risk_band_filter(band: str | None) -> RiskBandEnum | None:
    if not band:
        return None
    u = band.strip().upper()
    try:
        return RiskBandEnum(u)
    except ValueError:
        return None


def list_policies_paginated(
    db: Session,
    user_id: str,
    *,
    page: int,
    limit: int,
    risk_band: str | None = None,
) -> tuple[list[Policy], int]:
    band_enum = normalize_risk_band_filter(risk_band)
    if band_enum:
        sub = latest_prediction_subquery(db)
        q = (
            db.query(Policy)
            .join(sub, Policy.id == sub.c.policy_id)
            .join(
                RiskPrediction,
                and_(
                    RiskPrediction.policy_id == sub.c.policy_id,
                    RiskPrediction.created_at == sub.c.mx,
                ),
            )
            .filter(
                Policy.user_id == user_id,
                Policy.is_active.is_(True),
                RiskPrediction.risk_band == band_enum,
            )
        )
    else:
        q = db.query(Policy).filter(Policy.user_id == user_id, Policy.is_active.is_(True))
    total = q.count()
    rows = (
        q.order_by(Policy.created_at.desc())
        .offset(max(0, (page - 1) * limit))
        .limit(min(limit, 1000))
        .all()
    )
    return rows, total


def invalidate_risk_predictions(db: Session, policy_id: str) -> None:
    db.query(RiskPrediction).filter(RiskPrediction.policy_id == policy_id).delete(synchronize_session=False)
