from __future__ import annotations

from typing import Any, TypedDict

import numpy as np
import shap

PLAIN_NAME_MAP: dict[str, str] = {
    "vehicle_age_years": "Vehicle age",
    "engine_cc_normalised": "Engine capacity",
    "idv_normalised": "Insured declared value",
    "premium_to_idv_ratio": "Premium-to-value ratio",
    "prior_claims_binary": "Prior claim history",
    "prior_claim_severity": "Prior claim severity",
    "anti_theft": "Anti-theft device",
    "is_commercial": "Commercial use",
    "is_rideshare": "Rideshare / taxi use",
    "parking_risk": "Parking exposure",
    "ncb_discount": "No-claim bonus",
    "mileage_risk": "Annual mileage",
    "city_tier": "City risk tier",
    "seating_norm": "Seating capacity",
    "duration_months_norm": "Policy duration",
}


class SHAPFeatureDict(TypedDict, total=False):
    feature_name: str
    plain_name: str
    shap_value: float
    feature_value: float | int | str
    direction: str


def get_top_shap_features(
    features: np.ndarray,
    explainer: shap.TreeExplainer,
    feature_names: list[str],
    top_n: int = 5,
) -> list[dict[str, Any]]:
    shap_raw = explainer.shap_values(features)
    if isinstance(shap_raw, list):
        shap_vals = np.asarray(shap_raw[1])
    else:
        shap_vals = np.asarray(shap_raw)
    if shap_vals.ndim == 1:
        shap_vals = shap_vals.reshape(1, -1)
    row = shap_vals[0]
    order = np.argsort(np.abs(row))[::-1][:top_n]

    out: list[SHAPFeatureDict] = []
    for i in order:
        name = feature_names[i] if i < len(feature_names) else f"f{i}"
        val = float(row[i])
        plain = PLAIN_NAME_MAP.get(name, name.replace("_", " ").title())
        fv = float(features[0, i]) if i < features.shape[1] else 0.0
        direction = "increases_risk" if val > 0 else "decreases_risk"
        out.append(
            {
                "feature_name": name,
                "plain_name": plain,
                "shap_value": val,
                "feature_value": fv,
                "direction": direction,
            }
        )
    return [dict(x) for x in out]


def shap_rows_to_api_features(rows: list[dict]) -> list[dict]:
    """Map explainer output to frontend SHAPFeature (positive/negative)."""
    api = []
    for r in rows:
        inc = r.get("direction") == "increases_risk"
        api.append(
            {
                "feature_name": r.get("plain_name") or r.get("feature_name", ""),
                "shap_value": float(r.get("shap_value", 0.0)),
                "feature_value": r.get("feature_value", 0.0),
                "direction": "positive" if inc else "negative",
            }
        )
    return api
