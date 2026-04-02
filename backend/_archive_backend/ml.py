from dataclasses import dataclass
from pathlib import Path

import numpy as np

from app.models import VehicleUse


@dataclass
class DummyModel:
    def predict(self, x: np.ndarray) -> np.ndarray:
        vehicle_year = x[:, 0]
        years_old = np.maximum(0, 2026 - vehicle_year)
        prior = x[:, 1]
        usage_com = x[:, 2]
        engine = x[:, 3]
        idv = x[:, 4]
        score = 30 + (prior * 15) + (years_old * 3) + np.where(usage_com > 0, 20, 0)
        score += np.where(engine > 2000, 10, 0)
        score += np.where(idv > 2_000_000, 10, 0)
        return np.clip(score, 0, 100)


@dataclass
class DummyExplainer:
    feature_names: tuple[str, ...] = (
        "vehicle_year",
        "prior_claims_count",
        "usage_commercial",
        "engine_cc",
        "insured_value",
    )

    def explain(self, vector: np.ndarray) -> list[dict]:
        values = vector[0]
        shap_like = [
            ("prior_claims", float(values[1]) * 0.15),
            ("vehicle_age", float(2026 - values[0]) * 0.08),
            ("engine_cc", 0.12 if values[3] > 1500 else -0.05),
            ("usage_type", 0.2 if values[2] > 0 else -0.1),
            ("insured_value", 0.1 if values[4] > 1_000_000 else -0.05),
        ]
        out = []
        for feature, impact in shap_like:
            fv = float(2026 - values[0]) if feature == "vehicle_age" else float(values[1] if feature == "prior_claims" else values[3])
            out.append(
                {
                    "feature_name": feature,
                    "shap_value": round(impact, 3),
                    "feature_value": fv if feature != "insured_value" else float(values[4]),
                    "direction": "positive" if impact > 0 else "negative",
                }
            )
        return out


def load_model_and_explainer(model_path: str):
    path = Path(model_path)
    if path.exists():
        try:
            import xgboost as xgb

            model = xgb.Booster()
            model.load_model(str(path))
            return model, DummyExplainer()
        except Exception:
            return DummyModel(), DummyExplainer()
    return DummyModel(), DummyExplainer()


def policy_to_vector(policy) -> np.ndarray:
    vu = policy.vehicle_use.value if isinstance(policy.vehicle_use, VehicleUse) else str(policy.vehicle_use)
    usage_commercial = 1.0 if vu == "commercial" else 0.0
    if vu == "rideshare":
        usage_commercial = 1.0
    return np.array(
        [
            [
                float(policy.vehicle_year),
                float(policy.prior_claims_count),
                usage_commercial,
                float(policy.engine_cc),
                float(policy.insured_value),
            ]
        ],
        dtype=float,
    )


def score_to_band(score: float) -> str:
    s = int(round(score))
    if s <= 30:
        return "low"
    if s <= 60:
        return "medium"
    if s <= 80:
        return "high"
    return "critical"


def score_to_risk_band_enum(score: float):
    from app.models import RiskBandEnum

    s = int(round(score))
    if s <= 30:
        return RiskBandEnum.LOW
    if s <= 60:
        return RiskBandEnum.MEDIUM
    if s <= 80:
        return RiskBandEnum.HIGH
    return RiskBandEnum.CRITICAL
