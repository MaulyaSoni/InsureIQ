from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.auth.dependencies import get_current_user
from backend.database.db import get_db
from backend.database.models import Policy, RiskBandEnum, RiskPrediction, User
from backend.ml.service import build_risk_assessment_out, evaluate_policy_ml
from backend.schemas.analytics import RiskAssessmentOut


class RiskAssessRequest(BaseModel):
    policy_id: str


router = APIRouter(prefix="/risk", tags=["risk"], dependencies=[Depends(get_current_user)])


def _band_to_enum(band_upper: str) -> RiskBandEnum:
    return RiskBandEnum[band_upper.upper()]


@router.post("/assess", response_model=RiskAssessmentOut)
def assess_risk(
    payload: RiskAssessRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    model = getattr(request.app.state, "model", None)
    explainer = getattr(request.app.state, "explainer", None)
    if model is None or explainer is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error": "ML_UNAVAILABLE", "detail": "Model not loaded. Run backend/ml/trainer.py first."},
        )

    policy = (
        db.query(Policy)
        .filter(Policy.id == payload.policy_id, Policy.user_id == user.id, Policy.is_active.is_(True))
        .first()
    )
    if not policy:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "detail": "Policy not found"})

    try:
        result = evaluate_policy_ml(policy, model, explainer)
    except Exception as exc:
        raise HTTPException(status_code=422, detail={"error": "ML_ERROR", "detail": str(exc)}) from exc

    now = datetime.utcnow()
    pred_id = str(uuid4())
    rp = RiskPrediction(
        id=pred_id,
        policy_id=policy.id,
        user_id=user.id,
        claim_probability=result["claim_probability"],
        risk_score=result["risk_score"],
        risk_band=_band_to_enum(result["risk_band_upper"]),
        shap_features=result["shap_raw"],
        llm_explanation=result["explanation"],
        model_version="xgb_v1",
        created_at=now,
    )
    db.add(rp)
    db.commit()

    return build_risk_assessment_out(
        pred_id=pred_id,
        policy_id=policy.id,
        result=result,
        created_at=now,
    )


@router.get("/{prediction_id}")
def get_prediction(
    prediction_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = db.query(RiskPrediction).filter(RiskPrediction.id == prediction_id).first()
    if not row:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "detail": "Prediction not found"})
    pol = db.query(Policy).filter(Policy.id == row.policy_id).first()
    if not pol or pol.user_id != user.id:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "detail": "Prediction not found"})
    return {
        "id": row.id,
        "policy_id": row.policy_id,
        "claim_probability": row.claim_probability,
        "risk_score": row.risk_score,
        "risk_band": row.risk_band.value,
        "shap_features": row.shap_features,
        "llm_explanation": row.llm_explanation,
        "model_version": row.model_version,
        "created_at": row.created_at.isoformat(),
    }


@router.get("/policies/{policy_id}/predictions")
def get_policy_prediction_history(
    policy_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    policy = (
        db.query(Policy)
        .filter(Policy.id == policy_id, Policy.user_id == user.id, Policy.is_active.is_(True))
        .first()
    )
    if not policy:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "detail": "Policy not found"})

    rows = (
        db.query(RiskPrediction)
        .filter(RiskPrediction.policy_id == policy_id, RiskPrediction.user_id == user.id)
        .order_by(RiskPrediction.created_at.desc())
        .all()
    )

    return {
        "policy_id": policy_id,
        "count": len(rows),
        "items": [
            {
                "id": r.id,
                "claim_probability": r.claim_probability,
                "risk_score": r.risk_score,
                "risk_band": r.risk_band.value,
                "shap_features": r.shap_features,
                "model_version": r.model_version,
                "created_at": r.created_at.isoformat(),
            }
            for r in rows
        ],
    }
