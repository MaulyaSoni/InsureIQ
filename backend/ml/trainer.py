"""
Train XGBoost classifier for claim probability (binary).
Run:  python -m backend.ml.trainer
(from repository root:  python -m backend.ml.trainer)
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

from backend.ml.feature_engineer import FEATURE_NAMES

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
MODEL_DIR = Path(__file__).resolve().parent / "model_store"
PORTO_PATH = DATA_DIR / "porto_seguro_train.csv"


def _synthetic_xy(n_features: int, n_samples: int = 100_000, seed: int = 42) -> tuple[np.ndarray, np.ndarray, float]:
    rng = np.random.default_rng(seed)
    X = rng.uniform(0.0, 1.0, size=(n_samples, n_features))
    z = (
        2.2 * X[:, 0]
        + 1.4 * X[:, 1]
        - 1.1 * X[:, 2]
        + 0.8 * X[:, 3]
        + 0.3 * rng.normal(size=n_samples)
    )
    p = 1.0 / (1.0 + np.exp(-z))
    y = (p > rng.uniform(0.0, 1.0, size=n_samples)).astype(np.int32)
    pos = max(1, int(y.sum()))
    neg = max(1, int(len(y) - pos))
    scale_pos_weight = neg / pos
    return X, y, scale_pos_weight


def _load_porto_matrix(n_features: int) -> tuple[np.ndarray, np.ndarray, float] | None:
    if not PORTO_PATH.exists():
        return None
    df = pd.read_csv(PORTO_PATH)
    if "target" not in df.columns:
        return None
    df = df.loc[df["target"] >= 0].copy()
    y = df["target"].astype(int).values
    drop_cols = [c for c in ("id", "target") if c in df.columns]
    num = df.drop(columns=drop_cols, errors="ignore")
    num = num.select_dtypes(include=[np.number])
    if num.shape[1] == 0:
        return None
    X = num.values.astype(np.float64)
    if X.shape[1] < n_features:
        pad = np.zeros((X.shape[0], n_features - X.shape[1]), dtype=np.float64)
        X = np.hstack([X, pad])
    elif X.shape[1] > n_features:
        X = X[:, :n_features]
    pos = max(1, int((y == 1).sum()))
    neg = max(1, int((y == 0).sum()))
    scale_pos_weight = neg / pos
    return X, y, scale_pos_weight


def main() -> int:
    n_features = len(FEATURE_NAMES)
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    model_path = MODEL_DIR / "xgb_v1.pkl"
    names_path = MODEL_DIR / "feature_names.json"

    loaded = _load_porto_matrix(n_features)
    if loaded is None:
        print("Porto Seguro CSV not found or unusable; training on synthetic data (100K rows).")
        X, y, spw = _synthetic_xy(n_features)
    else:
        X, y, spw = loaded
        print(f"Loaded Porto-style matrix: X={X.shape}, positives={int(y.sum())}, scale_pos_weight={spw:.2f}")

    try:
        X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    except ValueError:
        X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)

    model = XGBClassifier(
        n_estimators=500,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric="auc",
        random_state=42,
        scale_pos_weight=spw,
    )
    try:
        model.fit(
            X_train,
            y_train,
            eval_set=[(X_val, y_val)],
            verbose=False,
            early_stopping_rounds=50,
        )
    except TypeError:
        model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)

    val_proba = model.predict_proba(X_val)[:, 1]
    auc = roc_auc_score(y_val, val_proba)
    best_it = getattr(model, "best_iteration", None)
    if best_it is None:
        best_it = getattr(model, "n_estimators", 500)

    print(f"best_iteration: {best_it}")
    print(f"validation AUC: {auc:.4f} (target > 0.70 for sanity)")

    importances = model.feature_importances_.tolist()
    imp_payload = {FEATURE_NAMES[i]: float(importances[i]) for i in range(min(len(FEATURE_NAMES), len(importances)))}

    joblib.dump(model, model_path)
    with open(names_path, "w", encoding="utf-8") as f:
        json.dump(FEATURE_NAMES, f, indent=2)
    with open(MODEL_DIR / "feature_importance.json", "w", encoding="utf-8") as f:
        json.dump(imp_payload, f, indent=2)

    print(f"Saved model to {model_path}")
    print(f"Saved feature names to {names_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
