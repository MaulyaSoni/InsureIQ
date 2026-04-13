from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel


class SHAPFeature(BaseModel):
    feature_name: str
    plain_name: str
    shap_value: float
    feature_value: Any
    direction: Literal["increases_risk", "decreases_risk"]


class RiskAssessRequest(BaseModel):
    policy_id: str  # assess from DB record


class RiskOutput(BaseModel):
    prediction_id: str
    policy_id: str
    claim_probability: float
    risk_score: int  # 0-100
    risk_band: str  # LOW/MEDIUM/HIGH/CRITICAL
    shap_features: list[SHAPFeature]
    model_version: str
    created_at: datetime


class RiskExplainRequest(BaseModel):
    prediction_id: str  # explain an existing prediction


class RiskExplainResponse(BaseModel):
    prediction_id: str
    explanation: str
    model_used: str
    cached: bool
