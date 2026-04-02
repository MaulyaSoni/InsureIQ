from app.agents.state import InsureIQState
from app.ml import policy_to_vector, score_to_risk_band_enum


def _predict_probability(model, vector) -> float:
    # Supports sklearn-like models, xgboost Booster, and existing dummy model.
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
    # Existing dummy model returns 0-100 score; convert to probability.
    if raw_score > 1:
        raw_score = raw_score / 100.0
    return max(0.0, min(1.0, raw_score))


def _extract_shap(explainer, vector) -> list[dict]:
    if hasattr(explainer, "explain"):
        rows = explainer.explain(vector)
    else:
        rows = []

    plain_name_map = {
        "vehicle_age": "Vehicle age",
        "prior_claims": "Prior claim history",
        "usage_type": "Commercial vehicle use",
        "engine_cc": "Engine capacity",
        "insured_value": "Insured declared value",
    }

    out: list[dict] = []
    for item in rows[:5]:
        shap_val = float(item.get("shap_value", 0.0))
        name = str(item.get("feature_name", "unknown"))
        out.append(
            {
                "feature_name": name,
                "plain_name": plain_name_map.get(name, name.replace("_", " ").title()),
                "shap_value": shap_val,
                "feature_value": item.get("feature_value"),
                "direction": "increases_risk" if shap_val >= 0 else "decreases_risk",
            }
        )
    out.sort(key=lambda x: abs(float(x["shap_value"])), reverse=True)
    return out

def risk_node(state: InsureIQState) -> InsureIQState:
    app = state.get("_app")
    policy = state.get("_policy")
    if app is None or policy is None:
        state["error"] = "Missing app or policy context for risk node"
        return state

    vector = policy_to_vector(policy)
    prob = _predict_probability(app.state.model, vector)
    score = int(round(prob * 100))
    band = score_to_risk_band_enum(score).value
    shap_features = _extract_shap(app.state.explainer, vector)

    state["claim_probability"] = float(round(prob, 6))
    state["risk_score"] = score
    state["risk_band"] = band
    state["shap_features"] = shap_features
    return state
