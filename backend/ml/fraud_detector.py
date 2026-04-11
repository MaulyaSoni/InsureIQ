from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

from sqlalchemy.orm import Session

from backend.database.models import Policy, RiskPrediction, VehicleUse


@dataclass
class FraudSignal:
    rule_id: str
    severity: Literal["LOW", "MEDIUM", "HIGH"]
    description: str
    evidence: dict[str, Any]


def detect_fraud_signals(policy: Policy, prediction: RiskPrediction | None, db: Session) -> list[FraudSignal]:
    signals: list[FraudSignal] = []
    age_days = None
    if policy.policy_start_date:
        age_days = (policy.policy_start_date.today() - policy.policy_start_date).days if hasattr(policy.policy_start_date, 'today') else None

    sig1 = _rule_duplicate_vehicle_cluster(policy, db)
    if sig1:
        signals.append(sig1)

    sig2 = _rule_claim_spike_new_policy(age_days, prediction)
    if sig2:
        signals.append(sig2)

    sig3 = _rule_idv_premium_outlier(policy, db)
    if sig3:
        signals.append(sig3)

    sig4 = _rule_commercial_declared_personal(policy)
    if sig4:
        signals.append(sig4)

    sig5 = _rule_prior_claim_concentration(policy)
    if sig5:
        signals.append(sig5)

    sig6 = _rule_idv_inflated_for_age(policy)
    if sig6:
        signals.append(sig6)

    sig7 = _rule_identical_cluster(policy, db)
    if sig7:
        signals.append(sig7)

    return signals


def _rule_duplicate_vehicle_cluster(policy: Policy, db: Session) -> FraudSignal | None:
    same_vehicle = (
        db.query(Policy)
        .filter(
            Policy.vehicle_make == policy.vehicle_make,
            Policy.vehicle_model == policy.vehicle_model,
            Policy.vehicle_year == policy.vehicle_year,
            Policy.engine_cc == policy.engine_cc,
            Policy.id != policy.id,
        )
        .count()
    )
    if same_vehicle >= 1:
        return FraudSignal(
            rule_id="DUPLICATE_VEHICLE",
            severity="MEDIUM",
            description="Multiple policies found for identical vehicle (same make/model/year/engine).",
            evidence={"vehicle": f"{policy.vehicle_make} {policy.vehicle_model} {policy.vehicle_year}", "matching_policies": same_vehicle + 1},
        )
    return None


def _rule_claim_spike_new_policy(age_days: int | None, prediction: RiskPrediction | None) -> FraudSignal | None:
    if age_days is not None and age_days < 30 and prediction and prediction.claim_probability > 0.6:
        return FraudSignal(
            rule_id="CLAIM_SPIKE_NEW_POLICY",
            severity="HIGH",
            description="High claim probability on a newly issued policy (<30 days old).",
            evidence={"policy_age_days": age_days, "claim_probability": round(prediction.claim_probability, 4)},
        )
    return None


def _rule_idv_premium_outlier(policy: Policy, db: Session) -> FraudSignal | None:
    if policy.insured_value <= 0:
        return None
    ratio = policy.premium_amount / policy.insured_value
    avg_ratio = db.query(Policy.premium_amount / Policy.insured_value).filter(Policy.insured_value > 0).all()
    if not avg_ratio:
        return None
    vals = [float(r[0]) for r in avg_ratio]
    mean_ratio = sum(vals) / len(vals)
    variance = sum((v - mean_ratio) ** 2 for v in vals) / len(vals)
    std_dev = variance**0.5
    if std_dev > 0 and abs(ratio - mean_ratio) > 3 * std_dev:
        return FraudSignal(
            rule_id="IDV_PREMIUM_OUTLIER",
            severity="MEDIUM",
            description="Premium-to-IDV ratio is significantly outside the portfolio normal range.",
            evidence={"ratio": round(ratio, 4), "portfolio_mean": round(mean_ratio, 4), "portfolio_std": round(std_dev, 4)},
        )
    return None


def _rule_commercial_declared_personal(policy: Policy) -> FraudSignal | None:
    if policy.vehicle_use == VehicleUse.personal and policy.annual_mileage_km > 40000:
        return FraudSignal(
            rule_id="COMMERCIAL_AS_PERSONAL",
            severity="HIGH",
            description="Annual mileage exceeds 40,000 km despite 'personal use' declaration — possible commercial usage.",
            evidence={"annual_mileage_km": policy.annual_mileage_km, "declared_use": policy.vehicle_use.value},
        )
    return None


def _rule_prior_claim_concentration(policy: Policy) -> FraudSignal | None:
    if policy.prior_claims_count > 3:
        return FraudSignal(
            rule_id="PRIOR_CLAIM_CONCENTRATION",
            severity="HIGH",
            description="Policyholder has an unusually high number of prior claims (4+).",
            evidence={"prior_claims_count": policy.prior_claims_count, "prior_claim_amount": policy.prior_claim_amount},
        )
    return None


def _rule_idv_inflated_for_age(policy: Policy) -> FraudSignal | None:
    vehicle_age = 2026 - policy.vehicle_year
    if vehicle_age > 20 and policy.insured_value > 1_500_000:
        return FraudSignal(
            rule_id="IDV_INFLATED_FOR_AGE",
            severity="HIGH",
            description=f"Declared IDV appears inflated for vehicle age ({vehicle_age} years). Old high-value vehicles may indicate over-insurance.",
            evidence={"vehicle_age": vehicle_age, "insured_value": policy.insured_value},
        )
    return None


def _rule_identical_cluster(policy: Policy, db: Session) -> FraudSignal | None:
    cluster_count = (
        db.query(Policy)
        .filter(
            Policy.vehicle_make == policy.vehicle_make,
            Policy.vehicle_year == policy.vehicle_year,
            Policy.city == policy.city,
            Policy.vehicle_use == policy.vehicle_use,
            Policy.engine_cc == policy.engine_cc,
        )
        .count()
    )
    if cluster_count >= 5:
        return FraudSignal(
            rule_id="IDENTICAL_POLICY_CLUSTER",
            severity="LOW",
            description=f"Policy cluster detected: 5+ policies with identical vehicle and location profile. Possible bulk submission.",
            evidence={"cluster_size": cluster_count, "make": policy.vehicle_make, "city": policy.city},
        )
    return None
