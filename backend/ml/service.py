from __future__ import annotations

from typing import Any

import numpy as np
from xgboost import XGBClassifier

from backend.ml.explainer import get_top_shap_features, shap_rows_to_api_features
from backend.ml.feature_engineer import FEATURE_NAMES, policy_orm_to_dict, policy_to_feature_vector
from backend.ml.predictor import predict_claim_probability, validate_features
from backend.ml.risk_scorer import band_to_frontend_lowercase, probability_to_risk_score, risk_score_to_band
from backend.schemas.analytics import RiskAssessmentOut, SHAPFeature


def evaluate_policy_ml(
    policy,
    model: XGBClassifier | None,
    explainer: Any | None,
) -> dict[str, Any]:
    if model is None or explainer is None:
        raise RuntimeError("Model or explainer not loaded")
    data = policy_orm_to_dict(policy)
    features, names = policy_to_feature_vector(data)
    if not validate_features(features, expected_cols=len(FEATURE_NAMES)):
        raise ValueError("Invalid features")
    prob = float(np.clip(predict_claim_probability(features, model), 0.0, 1.0))
    score = probability_to_risk_score(prob)
    band_upper = risk_score_to_band(score)
    band_ui = band_to_frontend_lowercase(band_upper)
    shap_raw = get_top_shap_features(features, explainer, names, top_n=5)
    api_rows = shap_rows_to_api_features(shap_raw)
    top_features: list[SHAPFeature] = []
    for row in api_rows:
        try:
            top_features.append(SHAPFeature.model_validate(row))
        except Exception:
            continue
    explanation = (
        f"Claim probability estimate {prob*100:.1f}% with risk score {score}/100 ({band_upper}). "
        "Factors ranked by SHAP contribution."
    )
    return {
        "claim_probability": prob,
        "risk_score": score,
        "risk_band_upper": band_upper,
        "risk_band_ui": band_ui,
        "shap_raw": shap_raw,
        "top_features": top_features,
        "explanation": explanation,
    }


def build_risk_assessment_out(
    *,
    pred_id: str,
    policy_id: str,
    result: dict[str, Any],
    created_at,
) -> RiskAssessmentOut:
    return RiskAssessmentOut(
        id=pred_id,
        policy_id=policy_id,
        risk_score=result["risk_score"],
        risk_band=result["risk_band_ui"],
        claim_probability=result["claim_probability"],
        top_features=result["top_features"],
        explanation=result["explanation"],
        agent_type="risk_scoring",
        created_at=created_at,
    )


def score_scalar_from_policy(policy, model: XGBClassifier | None) -> float:
    """0–100 style score for legacy analytics helpers."""
    if model is None:
        return 50.0
    data = policy_orm_to_dict(policy)
    features, _ = policy_to_feature_vector(data)
    prob = float(np.clip(predict_claim_probability(features, model), 0.0, 1.0))
    return float(probability_to_risk_score(prob))
