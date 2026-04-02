from backend.agents.state import InsureIQState
from backend.llm.groq_client import invoke_with_retry
from backend.llm.prompts import SUPERVISOR_PROMPT

def supervisor_node(state: InsureIQState) -> InsureIQState:
    query = state.get("user_query") or "full_report"
    has_ml = bool(state.get("risk_score"))
    prompt = SUPERVISOR_PROMPT.format(query=query, has_ml_output=has_ml)

    try:
        route = invoke_with_retry("router", [{"role": "user", "content": prompt}])
        route = route.strip().lower()
        if route not in ["risk_only", "risk_and_explain", "premium", "full_report", "explain_only"]:
            route = "full_report"
    except Exception:
        route = "full_report"

    state["route"] = route
    return state

