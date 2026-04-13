from datetime import date
from typing import Literal

from pydantic import BaseModel


class ClaimPredictRequest(BaseModel):
    policy_id: str


class ClaimPredictResponse(BaseModel):
    policy_id: str
    claim_probability: float
    risk_score: int
    risk_band: str


class ClaimEligibilityRequest(BaseModel):
    policy_id: str
    incident_type: Literal["accident", "theft", "vandalism", "flood", "fire"]
    date_of_incident: date
    at_fault: bool
    fir_filed: bool
    third_party_involved: bool
    hours_since_incident: int
    damage_estimate_inr: float = 0.0


class ClaimAssessment(BaseModel):
    policy_id: str
    claim_type: str
    eligible: bool
    eligibility_reason: str
    risk_of_rejection: Literal["LOW", "MEDIUM", "HIGH"]
    rejection_risks: list[str]
    documents_required: list[str]
    ncb_impact: str
    estimated_claim_range: str
    next_steps: list[str]
