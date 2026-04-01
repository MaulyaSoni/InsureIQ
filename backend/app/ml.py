from dataclasses import dataclass
from pathlib import Path

import numpy as np


@dataclass
class DummyModel:
    def predict(self, x: np.ndarray) -> np.ndarray:
        years_old = np.maximum(0, 2026 - x[:, 0])
        score = 30 + (x[:, 1] * 15) + (years_old * 3) + np.where(x[:, 2] > 0, 20, 0)
        score += np.where(x[:, 3] > 2000, 10, 0)
        score += np.where(x[:, 4] > 2000000, 10, 0)
        return np.clip(score, 0, 100)


@dataclass
class DummyExplainer:
    feature_names: tuple[str, ...] = ("production_year", "prior_claims", "usage_commercial", "engine_cc", "insured_value")

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
            out.append(
                {
                    "feature_name": feature,
                    "shap_value": round(impact, 3),
                    "feature_value": float(values[0]) if feature == "vehicle_age" else "derived",
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
    usage_commercial = 1 if policy.usage_type == "commercial" else 0
    return np.array([
        [
            policy.production_year,
            policy.prior_claims,
            usage_commercial,
            policy.engine_cc,
            policy.insured_value,
        ]
    ], dtype=float)


def score_to_band(score: float) -> str:
    if score <= 30:
        return "low"
    if score <= 55:
        return "medium"
    if score <= 75:
        return "high"
    return "critical"
