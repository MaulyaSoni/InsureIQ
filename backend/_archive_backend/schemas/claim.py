from pydantic import BaseModel, Field


class ClaimInput(BaseModel):
    policy_id: str = Field(min_length=1)
    incident_type: str | None = None
    coverage_type: str | None = None
    police_fir_filed: bool | None = None


class ClaimAssessment(BaseModel):
    eligible: bool | None
    status: str
    reasons: list[str] = []
    documents_required: list[str] = []
    ncb_impact: str | None = None
    next_steps: str | None = None
