from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class VehicleUse(str, Enum):
    personal = "personal"
    commercial = "commercial"
    rideshare = "rideshare"


class ParkingType(str, Enum):
    garage = "garage"
    street = "street"
    covered = "covered"


CURRENT_YEAR = 2026


def _engine_cc_bounds(v: int) -> int:
    if v < 500 or v > 8000:
        raise ValueError("engine_cc must be between 500 and 8000")
    return v


class PolicyCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    policy_number: str = Field(min_length=1, max_length=128)
    policyholder_name: str | None = Field(default=None, max_length=255)
    holder_name: str | None = Field(default=None, max_length=255)
    vehicle_make: str = Field(min_length=1, max_length=128)
    vehicle_model: str = Field(min_length=1, max_length=128)
    vehicle_year: int | None = Field(default=None, ge=1995, le=CURRENT_YEAR)
    production_year: int | None = Field(default=None, ge=1995, le=CURRENT_YEAR)
    engine_cc: int
    seating_capacity: int | None = Field(default=None, ge=1, le=60)
    seats: int | None = Field(default=None, ge=1, le=60)
    vehicle_use: VehicleUse | None = None
    usage_type: str | None = Field(default=None)
    insured_value: float = Field(gt=0)
    premium_amount: float = Field(ge=0)
    prior_claims_count: int | None = Field(default=None, ge=0)
    prior_claims: int | None = Field(default=None, ge=0)
    prior_claim_amount: float = Field(default=0.0, ge=0)
    anti_theft_device: bool = False
    parking_type: ParkingType | None = None
    city: str | None = Field(default=None, min_length=1, max_length=128)
    region: str | None = Field(default=None, max_length=128)
    annual_mileage_km: int | None = Field(default=None, ge=0, le=500_000)
    ncb_percentage: float = Field(default=0.0, ge=0, le=100)
    policy_start_date: date | None = None
    policy_duration_months: int | None = Field(default=None, ge=1, le=120)

    @model_validator(mode="after")
    def resolve_aliases(self):
        if self.policyholder_name is None and self.holder_name is not None:
            self.policyholder_name = self.holder_name
        if self.policyholder_name is None:
            raise ValueError("policyholder_name or holder_name is required")
        vy = self.vehicle_year if self.vehicle_year is not None else self.production_year
        if vy is None:
            raise ValueError("vehicle_year or production_year is required")
        object.__setattr__(self, "vehicle_year", vy)
        sc = self.seating_capacity if self.seating_capacity is not None else self.seats
        if sc is None:
            raise ValueError("seating_capacity or seats is required")
        object.__setattr__(self, "seating_capacity", sc)
        pc = self.prior_claims_count if self.prior_claims_count is not None else self.prior_claims
        if pc is None:
            pc = 0
        object.__setattr__(self, "prior_claims_count", pc)
        if self.city is None and self.region is not None:
            object.__setattr__(self, "city", self.region)
        if self.city is None:
            raise ValueError("city or region is required")
        if self.vehicle_use is None and self.usage_type:
            ut = self.usage_type.lower().strip()
            if ut in ("taxi", "fleet"):
                object.__setattr__(self, "vehicle_use", VehicleUse.rideshare)
            elif ut == "commercial":
                object.__setattr__(self, "vehicle_use", VehicleUse.commercial)
            else:
                object.__setattr__(self, "vehicle_use", VehicleUse.personal)
        if self.vehicle_use is None:
            object.__setattr__(self, "vehicle_use", VehicleUse.personal)
        if self.parking_type is None:
            object.__setattr__(self, "parking_type", ParkingType.street)
        if self.annual_mileage_km is None:
            object.__setattr__(self, "annual_mileage_km", 12_000)
        if self.policy_start_date is None:
            object.__setattr__(self, "policy_start_date", date.today())
        if self.policy_duration_months is None:
            object.__setattr__(self, "policy_duration_months", 12)
        _engine_cc_bounds(self.engine_cc)
        return self

    @field_validator("policy_number")
    @classmethod
    def sanitize_policy_number(cls, v: str) -> str:
        return v.strip()


class PolicyUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    policyholder_name: str | None = Field(default=None, max_length=255)
    holder_name: str | None = None
    vehicle_make: str | None = None
    vehicle_model: str | None = None
    vehicle_year: int | None = Field(default=None, ge=1995, le=CURRENT_YEAR)
    production_year: int | None = None
    engine_cc: int | None = None
    seating_capacity: int | None = None
    seats: int | None = None
    vehicle_use: VehicleUse | None = None
    usage_type: str | None = None
    insured_value: float | None = None
    premium_amount: float | None = None
    prior_claims_count: int | None = None
    prior_claims: int | None = None
    prior_claim_amount: float | None = None
    anti_theft_device: bool | None = None
    parking_type: ParkingType | None = None
    city: str | None = None
    region: str | None = None
    annual_mileage_km: int | None = None
    ncb_percentage: float | None = None
    policy_start_date: date | None = None
    policy_duration_months: int | None = None

    @model_validator(mode="after")
    def coalesce(self):
        if self.holder_name and not self.policyholder_name:
            object.__setattr__(self, "policyholder_name", self.holder_name)
        if self.production_year is not None and self.vehicle_year is None:
            object.__setattr__(self, "vehicle_year", self.production_year)
        if self.seats is not None and self.seating_capacity is None:
            object.__setattr__(self, "seating_capacity", self.seats)
        if self.prior_claims is not None and self.prior_claims_count is None:
            object.__setattr__(self, "prior_claims_count", self.prior_claims)
        if self.region and not self.city:
            object.__setattr__(self, "city", self.region)
        if self.usage_type and not self.vehicle_use:
            ut = self.usage_type.lower().strip()
            if ut in ("taxi", "fleet"):
                object.__setattr__(self, "vehicle_use", VehicleUse.rideshare)
            elif ut == "commercial":
                object.__setattr__(self, "vehicle_use", VehicleUse.commercial)
            else:
                object.__setattr__(self, "vehicle_use", VehicleUse.personal)
        if self.engine_cc is not None:
            _engine_cc_bounds(self.engine_cc)
        return self


class RiskPredictionSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    claim_probability: float
    risk_score: int
    risk_band: str
    model_version: str
    created_at: datetime


class PolicyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    policy_number: str
    holder_name: str
    vehicle_type: Literal["sedan", "suv", "hatchback", "truck", "two_wheeler", "commercial"] = "sedan"
    vehicle_make: str
    vehicle_model: str
    production_year: int
    engine_cc: int
    seats: int
    insured_value: float
    premium_amount: float
    usage_type: Literal["personal", "commercial", "taxi", "fleet"]
    prior_claims: int
    region: str
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_orm_policy(cls, p: Any) -> PolicyOut:
        vu = p.vehicle_use.value if hasattr(p.vehicle_use, "value") else str(p.vehicle_use)
        if vu == "rideshare":
            ut: Literal["personal", "commercial", "taxi", "fleet"] = "taxi"
        elif vu == "commercial":
            ut = "commercial"
        else:
            ut = "personal"
        return cls(
            id=str(p.id),
            policy_number=p.policy_number,
            holder_name=p.policyholder_name,
            vehicle_make=p.vehicle_make,
            vehicle_model=p.vehicle_model,
            production_year=p.vehicle_year,
            engine_cc=p.engine_cc,
            seats=p.seating_capacity,
            insured_value=p.insured_value,
            premium_amount=p.premium_amount,
            usage_type=ut,
            prior_claims=p.prior_claims_count,
            region=p.city,
            created_at=p.created_at,
            updated_at=p.updated_at,
        )


class PolicyDetailOut(PolicyOut):
    latest_risk_prediction: RiskPredictionSummary | None = None


class PolicyListOut(BaseModel):
    items: list[PolicyOut]
    page: int
    limit: int
    total: int


class CSVImportRowError(BaseModel):
    row_index: int
    message: str
    field: str | None = None


class CSVImportResponse(BaseModel):
    imported: int
    failed: int
    errors: list[CSVImportRowError]
