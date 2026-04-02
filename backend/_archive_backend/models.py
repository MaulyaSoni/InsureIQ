import enum
import uuid
from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _uuid_str() -> str:
    return str(uuid.uuid4())


class VehicleUse(str, enum.Enum):
    personal = "personal"
    commercial = "commercial"
    rideshare = "rideshare"


class ParkingType(str, enum.Enum):
    garage = "garage"
    street = "street"
    covered = "covered"


class RiskBandEnum(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class BatchJobStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"


class ReportType(str, enum.Enum):
    underwriting = "underwriting"
    claim = "claim"
    premium_advisory = "premium_advisory"


class AuditStatus(str, enum.Enum):
    success = "success"
    failure = "failure"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid_str)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_login: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    policies: Mapped[list["Policy"]] = relationship(back_populates="user")


class Policy(Base):
    __tablename__ = "policies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid_str)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True, nullable=False)
    policy_number: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    policyholder_name: Mapped[str] = mapped_column(String(255), nullable=False)
    vehicle_make: Mapped[str] = mapped_column(String(128), nullable=False)
    vehicle_model: Mapped[str] = mapped_column(String(128), nullable=False)
    vehicle_year: Mapped[int] = mapped_column(Integer, nullable=False)
    engine_cc: Mapped[int] = mapped_column(Integer, nullable=False)
    seating_capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    vehicle_use: Mapped[VehicleUse] = mapped_column(
        Enum(VehicleUse, values_callable=lambda x: [e.value for e in x], native_enum=False),
        nullable=False,
    )
    insured_value: Mapped[float] = mapped_column(Float, nullable=False)
    premium_amount: Mapped[float] = mapped_column(Float, nullable=False)
    prior_claims_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    prior_claim_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    anti_theft_device: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    parking_type: Mapped[ParkingType] = mapped_column(
        Enum(ParkingType, values_callable=lambda x: [e.value for e in x], native_enum=False),
        nullable=False,
    )
    city: Mapped[str] = mapped_column(String(128), nullable=False)
    annual_mileage_km: Mapped[int] = mapped_column(Integer, nullable=False)
    ncb_percentage: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    policy_start_date: Mapped[date] = mapped_column(Date, nullable=False)
    policy_duration_months: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="policies")
    risk_predictions: Mapped[list["RiskPrediction"]] = relationship(back_populates="policy")


class RiskPrediction(Base):
    __tablename__ = "risk_predictions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid_str)
    policy_id: Mapped[str] = mapped_column(String(36), ForeignKey("policies.id"), index=True, nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True, nullable=False)
    claim_probability: Mapped[float] = mapped_column(Float, nullable=False)
    risk_score: Mapped[int] = mapped_column(Integer, nullable=False)
    risk_band: Mapped[RiskBandEnum] = mapped_column(
        Enum(RiskBandEnum, values_callable=lambda x: [e.value for e in x], native_enum=False),
        nullable=False,
    )
    shap_features: Mapped[list] = mapped_column(JSON, nullable=False)
    llm_explanation: Mapped[str] = mapped_column(Text, default="", nullable=False)
    model_version: Mapped[str] = mapped_column(String(64), default="xgb_v1", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    policy: Mapped["Policy"] = relationship(back_populates="risk_predictions")


class BatchJob(Base):
    __tablename__ = "batch_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid_str)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True, nullable=False)
    status: Mapped[BatchJobStatus] = mapped_column(
        Enum(BatchJobStatus, values_callable=lambda x: [e.value for e in x], native_enum=False),
        default=BatchJobStatus.pending,
        nullable=False,
    )
    total_policies: Mapped[int] = mapped_column(Integer, nullable=False)
    processed_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failed_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    result_summary: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid_str)
    policy_id: Mapped[str] = mapped_column(String(36), ForeignKey("policies.id"), index=True, nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True, nullable=False)
    report_type: Mapped[ReportType] = mapped_column(
        Enum(ReportType, values_callable=lambda x: [e.value for e in x], native_enum=False),
        nullable=False,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    pdf_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid_str)
    user_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    action: Mapped[str] = mapped_column(String(128), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(64), nullable=False)
    resource_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    payload_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[AuditStatus] = mapped_column(
        Enum(AuditStatus, values_callable=lambda x: [e.value for e in x], native_enum=False),
        default=AuditStatus.success,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class LLMCache(Base):
    __tablename__ = "llm_cache"

    cache_key: Mapped[str] = mapped_column(String(64), primary_key=True)
    response_json: Mapped[str] = mapped_column(Text, nullable=False)
    model_used: Mapped[str] = mapped_column(String(128), nullable=False)
    token_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
