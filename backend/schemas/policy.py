from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class PolicyCreate(BaseModel):
    policy_number: str = Field(..., min_length=1, max_length=128)
    policyholder_name: str = Field(..., min_length=1, max_length=255)
    vehicle_make: str = Field(..., min_length=1, max_length=128)
    vehicle_model: str = Field(..., min_length=1, max_length=128)
    vehicle_year: int = Field(...)
    engine_cc: int = Field(...)
    seating_capacity: int = Field(..., ge=1, le=60)
    vehicle_use: Literal["personal", "commercial", "rideshare"] = Field(...)
    insured_value: float = Field(..., gt=0)
    premium_amount: float = Field(..., gt=0)
    prior_claims_count: int = Field(default=0, ge=0)
    prior_claim_amount: float = Field(default=0.0, ge=0)
    anti_theft_device: bool = Field(default=False)
    parking_type: Literal["garage", "covered", "street"] = Field(...)
    city: str = Field(..., min_length=1, max_length=128)
    annual_mileage_km: int = Field(..., ge=0)
    ncb_percentage: float = Field(default=0.0, ge=0, le=50)
    policy_start_date: date = Field(...)
    policy_duration_months: int = Field(..., ge=1, le=120)

    @field_validator("vehicle_year")
    @classmethod
    def validate_vehicle_year(cls, v: int) -> int:
        current_year = datetime.now().year
        if not (1995 <= v <= current_year):
            raise ValueError(f"Vehicle year must be between 1995 and {current_year}")
        return v

    @field_validator("engine_cc")
    @classmethod
    def validate_engine_cc(cls, v: int) -> int:
        if not (500 <= v <= 8000):
            raise ValueError("Engine CC must be between 500 and 8000")
        return v


class PolicyUpdate(BaseModel):
    policy_number: Optional[str] = Field(None, min_length=1, max_length=128)
    policyholder_name: Optional[str] = Field(None, min_length=1, max_length=255)
    vehicle_make: Optional[str] = Field(None, min_length=1, max_length=128)
    vehicle_model: Optional[str] = Field(None, min_length=1, max_length=128)
    vehicle_year: Optional[int] = Field(None)
    engine_cc: Optional[int] = Field(None)
    seating_capacity: Optional[int] = Field(None, ge=1, le=60)
    vehicle_use: Optional[Literal["personal", "commercial", "rideshare"]] = None
    insured_value: Optional[float] = Field(None, gt=0)
    premium_amount: Optional[float] = Field(None, gt=0)
    prior_claims_count: Optional[int] = Field(None, ge=0)
    prior_claim_amount: Optional[float] = Field(None, ge=0)
    anti_theft_device: Optional[bool] = None
    parking_type: Optional[Literal["garage", "covered", "street"]] = None
    city: Optional[str] = Field(None, min_length=1, max_length=128)
    annual_mileage_km: Optional[int] = Field(None, ge=0)
    ncb_percentage: Optional[float] = Field(None, ge=0, le=50)
    policy_start_date: Optional[date] = None
    policy_duration_months: Optional[int] = Field(None, ge=1, le=120)

    @field_validator("vehicle_year")
    @classmethod
    def validate_vehicle_year(cls, v: Optional[int]) -> Optional[int]:
        if v is None:
            return v
        current_year = datetime.now().year
        if not (1995 <= v <= current_year):
            raise ValueError(f"Vehicle year must be between 1995 and {current_year}")
        return v

    @field_validator("engine_cc")
    @classmethod
    def validate_engine_cc(cls, v: Optional[int]) -> Optional[int]:
        if v is None:
            return v
        if not (500 <= v <= 8000):
            raise ValueError("Engine CC must be between 500 and 8000")
        return v


class PolicyResponse(BaseModel):
    id: str
    user_id: str
    policy_number: str
    policyholder_name: str
    vehicle_make: str
    vehicle_model: str
    vehicle_year: int
    engine_cc: int
    seating_capacity: int
    vehicle_use: str
    insured_value: float
    premium_amount: float
    prior_claims_count: int
    prior_claim_amount: float
    anti_theft_device: bool
    parking_type: str
    city: str
    annual_mileage_km: int
    ncb_percentage: float
    policy_start_date: date
    policy_end_date: Optional[date]
    policy_duration_months: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    latest_risk_prediction: Optional[dict] = None

    model_config = ConfigDict(from_attributes=True)


class PolicyListResponse(BaseModel):
    policies: list[PolicyResponse]
    total: int
    page: int
    limit: int


class CSVImportResponse(BaseModel):
    imported: int
    failed: int
    errors: list[dict]  # [{row: int, field: str, error: str}]
