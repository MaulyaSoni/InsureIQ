from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


RiskBand = Literal["low", "medium", "high", "critical"]


class UserSignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=255)


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class UserOut(BaseModel):
    id: int
    email: str
    name: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserOut


class PolicyBase(BaseModel):
    policy_number: str
    holder_name: str
    vehicle_type: str
    vehicle_make: str
    vehicle_model: str
    production_year: int
    engine_cc: int
    seats: int
    insured_value: float
    premium_amount: float
    usage_type: str
    prior_claims: int = 0
    region: str


class PolicyCreate(PolicyBase):
    pass


class PolicyOut(PolicyBase):
    id: str
    created_at: datetime
    updated_at: datetime


class SHAPFeature(BaseModel):
    feature_name: str
    shap_value: float
    feature_value: str | float | int
    direction: Literal["positive", "negative"]


class RiskAssessmentOut(BaseModel):
    id: str
    policy_id: str
    risk_score: int
    risk_band: RiskBand
    claim_probability: float
    top_features: list[SHAPFeature]
    explanation: str
    agent_type: Literal["risk_scoring"] = "risk_scoring"
    created_at: datetime


class ClaimPredictionOut(BaseModel):
    id: str
    policy_id: str
    claim_probability: float
    predicted_claim_amount: int
    confidence_interval: dict
    risk_factors: list[str]
    model_version: str
    created_at: datetime


class PremiumAdvisoryOut(BaseModel):
    id: str
    policy_id: str
    current_premium: float
    recommended_premium: int
    premium_range: dict
    adjustment_factors: list[dict]
    justification: str
    created_at: datetime


class UnderwritingReportOut(BaseModel):
    id: str
    policy_id: str
    risk_assessment: RiskAssessmentOut
    claim_prediction: ClaimPredictionOut
    premium_advisory: PremiumAdvisoryOut
    summary: str
    recommendation: Literal["approve", "review", "reject"]
    generated_at: datetime


class PolicyActionRequest(BaseModel):
    policy_id: str


class BatchRequest(BaseModel):
    policy_ids: list[str]


class BatchJobOut(BaseModel):
    id: str
    name: str
    total_policies: int
    processed: int
    status: Literal["queued", "processing", "completed", "failed"]
    results_summary: dict | None = None
    created_at: datetime
    completed_at: datetime | None = None


class AuditLogOut(BaseModel):
    id: int
    user_id: str
    action: str
    resource_type: str
    resource_id: str
    timestamp: datetime
    payload_hash: str


class DashboardStatsOut(BaseModel):
    total_policies: int
    total_assessed: int
    avg_risk_score: int
    high_risk_percentage: int
    total_insured_value: float
    total_premium: float
    claims_predicted: int
    reports_generated: int


class ApplicationFormTurnRequest(BaseModel):
    session_id: str
    user_message: str


class RiskExplainerRequest(BaseModel):
    claim_probability: float
    risk_score: int
    risk_band: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    shap_features: list[dict]


class PolicyQARequest(BaseModel):
    retrieved_chunks: str
    user_question: str


class ClaimEligibilityTurnRequest(BaseModel):
    session_id: str
    user_message: str
