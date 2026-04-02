from __future__ import annotations

from pathlib import Path

import shap

from backend.database.models import RiskBandEnum
from backend.ml.feature_engineer import policy_orm_to_dict, policy_to_feature_vector
from backend.ml.predictor import load_model
from backend.ml.risk_scorer import risk_score_to_band


def policy_to_vector(policy):
    data = policy_orm_to_dict(policy)
    vector, _ = policy_to_feature_vector(data)
    return vector


def score_to_band(score: float) -> str:
    return risk_score_to_band(int(round(score))).lower()


def score_to_risk_band_enum(score: float) -> RiskBandEnum:
    return RiskBandEnum[risk_score_to_band(int(round(score)))]


def load_model_and_explainer(model_path: str):
    model = load_model(Path(model_path))
    explainer = shap.TreeExplainer(model)
    return model, explainer
