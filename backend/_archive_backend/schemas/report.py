from pydantic import BaseModel, Field


class ReportRequest(BaseModel):
    policy_id: str = Field(min_length=1)


class ReportOutput(BaseModel):
    report_id: str
    policy_id: str
    content: str
