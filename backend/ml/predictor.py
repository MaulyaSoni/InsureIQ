from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import numpy as np
from xgboost import XGBClassifier


def load_model(path: str | Path) -> XGBClassifier:
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"Model file not found: {p}")
    obj: Any = joblib.load(p)
    if not isinstance(obj, XGBClassifier):
        raise TypeError(f"Expected XGBClassifier at {p}, got {type(obj)}")
    return obj


def validate_features(features: np.ndarray, expected_cols: int | None = None) -> bool:
    if features.ndim != 2 or features.shape[0] != 1:
        return False
    if expected_cols is not None and features.shape[1] != expected_cols:
        return False
    if np.any(~np.isfinite(features)):
        return False
    return True


def predict_claim_probability(features: np.ndarray, model: XGBClassifier) -> float:
    proba = model.predict_proba(features)
    if proba.shape[1] >= 2:
        return float(proba[0, 1])
    return float(proba[0, 0])
