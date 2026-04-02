from __future__ import annotations

from datetime import date

import numpy as np

# Order must match trainer / model_store/feature_names.json
FEATURE_NAMES: list[str] = [
    "vehicle_age_years",
    "engine_cc_normalised",
    "idv_normalised",
    "premium_to_idv_ratio",
    "prior_claims_binary",
    "prior_claim_severity",
    "anti_theft",
    "is_commercial",
    "is_rideshare",
    "parking_risk",
    "ncb_discount",
    "mileage_risk",
    "city_tier",
    "seating_norm",
    "duration_months_norm",
]

# Major Indian metros → 1.0, tier-2 → 0.6, tier-3 / other → 0.3
CITY_TIER_MAP: dict[str, float] = {
    # Tier 1 / metro
    "mumbai": 1.0,
    "delhi": 1.0,
    "bengaluru": 1.0,
    "bangalore": 1.0,
    "chennai": 1.0,
    "hyderabad": 1.0,
    "kolkata": 1.0,
    "pune": 1.0,
    "ahmedabad": 1.0,
    # Tier 2
    "jaipur": 0.6,
    "lucknow": 0.6,
    "kanpur": 0.6,
    "nagpur": 0.6,
    "indore": 0.6,
    "thane": 0.6,
    "bhopal": 0.6,
    "visakhapatnam": 0.6,
    "vadodara": 0.6,
    "ghaziabad": 0.6,
    "ludhiana": 0.6,
    "coimbatore": 0.6,
    "kochi": 0.6,
    "surat": 0.6,
}


def _float(d: dict, key: str, default: float = 0.0) -> float:
    v = d.get(key)
    if v is None or v == "":
        return default
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def _int(d: dict, key: str, default: int = 0) -> int:
    v = d.get(key)
    if v is None or v == "":
        return default
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return default


def _bool(d: dict, key: str, default: bool = False) -> bool:
    v = d.get(key)
    if v is None:
        return default
    if isinstance(v, bool):
        return v
    s = str(v).strip().lower()
    return s in {"1", "true", "yes", "y"}


def _city_tier(city: str) -> float:
    c = (city or "").strip().lower()
    if not c:
        return 0.3
    return CITY_TIER_MAP.get(c, 0.3)


def policy_to_feature_vector(policy_data: dict) -> tuple[np.ndarray, list[str]]:
    """
    Map InsureIQ policy fields to a numeric vector for XGBoost.
    Returns shape (1, n_features) and the ordered feature names.
    """
    current_year = date.today().year
    vehicle_year = _int(policy_data, "vehicle_year", current_year - 5)
    vehicle_age_years = max(0, current_year - vehicle_year)

    engine_cc = max(500, min(8000, _int(policy_data, "engine_cc", 1200)))
    engine_cc_normalised = engine_cc / 4000.0

    insured_value = max(1.0, _float(policy_data, "insured_value", 500_000.0))
    idv_normalised = insured_value / 5_000_000.0

    premium_amount = max(0.0, _float(policy_data, "premium_amount", 10_000.0))
    premium_to_idv_ratio = premium_amount / insured_value

    prior_claims_count = max(0, _int(policy_data, "prior_claims_count", 0))
    prior_claim_amount = max(0.0, _float(policy_data, "prior_claim_amount", 0.0))
    prior_claims_binary = 1.0 if prior_claims_count > 0 else 0.0
    prior_claim_severity = prior_claim_amount / max(insured_value, 1.0)

    anti_theft = 1.0 if _bool(policy_data, "anti_theft_device", False) else 0.0

    vu = str(policy_data.get("vehicle_use") or "personal").lower().strip()
    is_commercial = 1.0 if vu == "commercial" else 0.0
    is_rideshare = 1.0 if vu == "rideshare" else 0.0

    pt = str(policy_data.get("parking_type") or "street").lower().strip()
    if pt == "garage":
        parking_risk = 0.0
    elif pt == "covered":
        parking_risk = 0.5
    else:
        parking_risk = 1.0

    ncb_pct = max(0.0, min(100.0, _float(policy_data, "ncb_percentage", 0.0)))
    ncb_discount = ncb_pct / 100.0

    mileage = max(0, _int(policy_data, "annual_mileage_km", 12_000))
    mileage_risk = mileage / 50_000.0

    city = str(policy_data.get("city") or policy_data.get("region") or "")
    city_tier = _city_tier(city)

    seats = max(1, min(60, _int(policy_data, "seating_capacity", 5)))
    seating_norm = seats / 7.0

    dur = max(1, min(120, _int(policy_data, "policy_duration_months", 12)))
    duration_months_norm = dur / 12.0

    vec = np.array(
        [
            [
                float(vehicle_age_years),
                engine_cc_normalised,
                idv_normalised,
                premium_to_idv_ratio,
                prior_claims_binary,
                prior_claim_severity,
                anti_theft,
                is_commercial,
                is_rideshare,
                parking_risk,
                ncb_discount,
                mileage_risk,
                city_tier,
                seating_norm,
                duration_months_norm,
            ]
        ],
        dtype=np.float64,
    )
    return vec, list(FEATURE_NAMES)


def policy_orm_to_dict(policy) -> dict:
    """SQLAlchemy Policy ORM → dict for feature_engineer."""
    vu = policy.vehicle_use.value if hasattr(policy.vehicle_use, "value") else str(policy.vehicle_use)
    pt = policy.parking_type.value if hasattr(policy.parking_type, "value") else str(policy.parking_type)
    return {
        "vehicle_year": policy.vehicle_year,
        "engine_cc": policy.engine_cc,
        "insured_value": policy.insured_value,
        "premium_amount": policy.premium_amount,
        "prior_claims_count": policy.prior_claims_count,
        "prior_claim_amount": policy.prior_claim_amount,
        "anti_theft_device": policy.anti_theft_device,
        "vehicle_use": vu,
        "parking_type": pt,
        "ncb_percentage": policy.ncb_percentage,
        "annual_mileage_km": policy.annual_mileage_km,
        "city": policy.city,
        "seating_capacity": policy.seating_capacity,
        "policy_duration_months": policy.policy_duration_months,
    }
