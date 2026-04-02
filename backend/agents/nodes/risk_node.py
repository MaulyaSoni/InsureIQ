from backend.agents.state import InsureIQState
from backend.ml.feature_engineer import policy_orm_to_dict, policy_to_feature_vector
from backend.ml.risk_scorer import probability_to_risk_score, risk_score_to_band, risk_score_to_band_enum


def _predict_probability(model, vector) -> float:
    try:
        if hasattr(model, "predict_proba"):
            return float(model.predict_proba(vector)[0][1])
    except Exception:
        pass
    try:
        import xgboost as xgb
        if model.__class__.__name__ == "Booster":
            raw = float(model.predict(xgb.DMatrix(vector))[0])
            return max(0.0, min(1.0, raw))
    except Exception:
        pass
    raw_score = float(model.predict(vector)[0])
    if raw_score > 1:
        raw_score = raw_score / 100.0
    return max(0.0, min(1.0, raw_score))


def _extract_shap(explainer, vector) -> list[dict]:
    try:
        if hasattr(explainer, "explain"):
            rows = explainer.explain(vector)
        else:
            rows = []
    except Exception:
        rows = []

    plain_name_map = {
        "vehicle_age_years": "Vehicle age",
        "engine_cc_normalised": "Engine capacity",
        "idv_normalised": "Insured declared value",
        "premium_to_idv_ratio": "Premium-to-value ratio",
        "prior_claims_binary": "Prior claim history",
        "prior_claim_severity": "Prior claim severity",
        "anti_theft": "Anti-theft device",
        "is_commercial": "Commercial vehicle use",
        "is_rideshare": "Rideshare use",
        "parking_risk": "Parking type",
        "ncb_discount": "No-claim bonus",
        "mileage_risk": "Annual mileage",
        "city_tier": "City risk tier",
        "seating_norm": "Seating capacity",
        "duration_months_norm": "Policy duration",
    }

    shap_values: list[dict] = []
    if rows and isinstance(rows, (list, tuple)):
        for item in rows[:5] if len(rows) >= 5 else rows:
            if isinstance(item, dict):
                shap_val = float(item.get("shap_value", 0.0))
                name = str(item.get("feature_name", "unknown"))
                shap_values.append({
                    "feature_name": name,
                    "plain_name": plain_name_map.get(name, name.replace("_", " ").title()),
                    "shap_value": shap_val,
                    "feature_value": item.get("feature_value"),
                    "direction": "increases_risk" if shap_val >= 0 else "decreases_risk",
                })
    elif rows and hasattr(rows, "values") and hasattr(rows, "feature_names"):
        pass

    shap_values.sort(key=lambda x: abs(float(x["shap_value"])), reverse=True)
    return shap_values


def risk_node(state: InsureIQState) -> InsureIQState:
    app = state.get("_app")
    policy = state.get("_policy")
    if app is None or policy is None:
        state["error"] = "Missing app or policy context for risk node"
        return state

    try:
        data = policy_orm_to_dict(policy)
        vector, _ = policy_to_feature_vector(data)
        prob = _predict_probability(app.state.model, vector)
        score = probability_to_risk_score(prob)
        band = risk_score_to_band(score)
        band_enum = risk_score_to_band_enum(score)

        shap_features = _extract_shap(app.state.explainer, vector)

        state["claim_probability"] = float(round(prob, 6))
        state["risk_score"] = score
        state["risk_band"] = band
        state["shap_features"] = shap_features

    except Exception as exc:
        state["error"] = f"Risk node failed: {exc}"
        state["claim_probability"] = 0.5
        state["risk_score"] = 50
        state["risk_band"] = "MEDIUM"
        state["shap_features"] = []

    return state
