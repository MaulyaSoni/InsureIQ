from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class ReportGenerateRequest(BaseModel):
    policy_id: str
    report_type: Literal["underwriting", "claim", "premium_advisory"] = "underwriting"


class ReportResponse(BaseModel):
    report_id: str
    policy_id: str
    report_type: str
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
