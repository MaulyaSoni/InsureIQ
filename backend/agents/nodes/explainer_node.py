from backend.agents.state import InsureIQState
from backend.config import get_settings
from backend.llm.cache import check_cache, make_cache_key, store_cache
from backend.llm.groq_client import invoke_with_retry
from backend.llm.prompts import RISK_EXPLAINER_PROMPT, format_shap_features

def explainer_node(state: InsureIQState) -> InsureIQState:
    db = state.get("_db")
    policy_id = state.get("policy_id", "unknown")
    model_name = "llama-3.3-70b-versatile"
    cache_key = make_cache_key(policy_id, "risk_explanation", model_name)
    if db is not None:
        cached = check_cache(cache_key, db)
        if cached:
            state["risk_explanation"] = cached
            return state

    prompt = RISK_EXPLAINER_PROMPT.format(
        risk_score=state.get("risk_score"),
        risk_band=state.get("risk_band"),
        claim_probability_pct=round(float(state.get("claim_probability", 0.0)) * 100, 2),
        shap_features_formatted=format_shap_features(state.get("shap_features") or []),
    )

    res = invoke_with_retry("reasoner", [{"role": "user", "content": prompt}])
    state["risk_explanation"] = res
    if db is not None:
        store_cache(cache_key, res, ttl_hours=get_settings().cache_ttl_hours, model=model_name, db=db)
    return state

