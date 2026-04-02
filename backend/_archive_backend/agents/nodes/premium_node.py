from app.agents.state import InsureIQState
from app.config import get_settings
from app.llm.cache import check_cache, make_cache_key, store_cache
from app.llm.groq_client import invoke_with_retry
from app.llm.prompts import PREMIUM_ADVISOR_PROMPT, format_policy_summary
import re


def _extract_inr_values(text: str) -> list[float]:
    nums = re.findall(r"\b\d{2,7}(?:,\d{2,3})*(?:\.\d+)?\b", text.replace("₹", ""))
    out: list[float] = []
    for n in nums:
        try:
            out.append(float(n.replace(",", "")))
        except Exception:
            continue
    return out

def premium_node(state: InsureIQState) -> InsureIQState:
    db = state.get("_db")
    policy_id = state.get("policy_id", "unknown")
    model_name = "mixtral-8x7b-32768"
    cache_key = make_cache_key(policy_id, "premium_advisory", model_name)
    if db is not None:
        cached = check_cache(cache_key, db)
        if cached:
            state["premium_narrative"] = cached
            vals = _extract_inr_values(cached)
            if len(vals) >= 2:
                state["premium_min"] = float(min(vals[0], vals[1]))
                state["premium_max"] = float(max(vals[0], vals[1]))
            return state

    prompt = PREMIUM_ADVISOR_PROMPT.format(
        policy_summary=format_policy_summary(state.get("policy_data", {})),
        risk_score=state.get("risk_score"),
        risk_band=state.get("risk_band"),
        claim_probability_pct=round(float(state.get("claim_probability", 0.0)) * 100, 2),
        irdai_context=state.get("retrieved_context") or "No external context provided.",
    )
    res = invoke_with_retry("extractor", [{"role": "user", "content": prompt}])
    state["premium_narrative"] = res

    values = _extract_inr_values(res)
    if len(values) >= 2:
        state["premium_min"] = float(min(values[0], values[1]))
        state["premium_max"] = float(max(values[0], values[1]))
    else:
        base = float(state.get("policy_data", {}).get("premium_amount", 15000))
        state["premium_min"] = round(base * 0.9, 2)
        state["premium_max"] = round(base * 1.25, 2)

    state["adjustment_factors"] = [
        {"name": "Risk band", "value": state.get("risk_band")},
        {"name": "Claim probability", "value": state.get("claim_probability")},
    ]
    if db is not None:
        store_cache(cache_key, res, ttl_hours=get_settings().cache_ttl_hours, model=model_name, db=db)
    return state
