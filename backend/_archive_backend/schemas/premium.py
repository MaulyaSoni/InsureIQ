from pydantic import BaseModel, Field


class PremiumInput(BaseModel):
    policy_id: str = Field(min_length=1)


class WhatIfRequest(BaseModel):
    policy_id: str = Field(min_length=1)
    adjustments: dict = {}


class PremiumOutput(BaseModel):
    policy_id: str
    premium_min: float
    premium_max: float
    premium_narrative: str | None = None
    adjustment_factors: list[dict] = []
