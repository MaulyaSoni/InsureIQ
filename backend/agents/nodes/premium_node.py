from backend.agents.state import InsureIQState
from backend.config import get_settings
from backend.llm.cache import check_cache, make_cache_key, store_cache
from backend.llm.groq_client import invoke_with_retry
from backend.llm.prompts import PREMIUM_ADVISOR_PROMPT, format_policy_summary
import re


def _extract_inr_values(text: str) -> list[float]:
    # Look for explicit min/max range formats first
    ranges = re.findall(r"([\d,]{4,})\s*(?:to|-|–|—|and)\s*(?:Rs\.?|INR|₹|â‚¹)?\s*([\d,]{4,})", text)
    if ranges:
        for r_min, r_max in ranges:
            try:
                mn = float(r_min.replace(",", ""))
                mx = float(r_max.replace(",", ""))
                if 1000 <= mn <= mx:
                    return [mn, mx]
            except Exception:
                continue

    # Fallback: extract all large numbers (likely INR values, ignoring percentages and UI/score metrics)
    nums = re.findall(r"\b(\d{1,7}(?:,\d{2,3})*(?:\.\d+)?)\b", text.replace("₹", "").replace("Rs", "").replace("â‚¹", ""))
    out: list[float] = []
    for n in nums:
        try:
            val = float(n.replace(",", ""))
            if val >= 1000:
                out.append(val)
        except Exception:
            continue
    out.sort()
    return out


def premium_node(state: InsureIQState) -> InsureIQState:
    try:
        db = state.get("_db")
        policy_id = state.get("policy_id", "unknown")
        model_name = "openai/gpt-oss-120b"
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
    except Exception as e:
        print(f"[premium_node] Error: {e}")
        state["error"] = f"premium_node failed: {str(e)}"
        band = state.get("risk_band", "MEDIUM")
        fallbacks = {
            "LOW": (8000, 15000),
            "MEDIUM": (15000, 25000),
            "HIGH": (25000, 40000),
            "CRITICAL": (40000, 70000),
        }
        lo, hi = fallbacks.get(band, (15000, 25000))
        state["premium_min"] = lo
        state["premium_max"] = hi
        state["premium_narrative"] = (
            f"Advisory unavailable (LLM error). Based on risk band {band}, "
            f"estimated premium range is ₹{lo:,} – ₹{hi:,} per year."
        )
        return state
