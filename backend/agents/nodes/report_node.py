import uuid
from datetime import datetime

from backend.agents.state import InsureIQState
from backend.database.models import Report, ReportType
from backend.llm.cache import TTL_REPORT, make_cache_key, get_cached, set_cached
from backend.llm.groq_client import invoke_with_retry
from backend.llm.prompts import REPORT_WRITER_PROMPT, format_policy_summary


def report_node(state: InsureIQState) -> InsureIQState:
    db = state.get("_db")
    policy_id = state.get("policy_id", "unknown")
    model_name = "llama-3.3-70b-versatile"
    cache_key = make_cache_key(policy_id, "underwriting_report", model_name)

    if db is not None:
        cached = get_cached(cache_key, db)
        if cached:
            state["final_report"] = cached
            state["report_id"] = f"cached-{policy_id[:8]}"
            return state

    prompt = REPORT_WRITER_PROMPT.format(
        policy_summary=format_policy_summary(state.get("policy_data", {})),
        risk_score=state.get("risk_score"),
        risk_band=state.get("risk_band"),
        risk_explanation=state.get("risk_explanation") or "No explanation available.",
        premium_narrative=state.get("premium_narrative") or "No premium advisory available.",
        claim_probability_pct=round(float(state.get("claim_probability", 0.0)) * 100, 2),
    )

    res = invoke_with_retry("reasoner", [{"role": "user", "content": prompt}])
    report_id = str(uuid.uuid4())
    state["final_report"] = res
    state["report_id"] = report_id

    if db is not None and policy_id:
        user_id = state.get("_user_id")
        db.add(
            Report(
                id=report_id,
                policy_id=policy_id,
                user_id=user_id or "",
                report_type=ReportType.underwriting,
                content=res,
                pdf_path=None,
                created_at=datetime.utcnow(),
            )
        )
        db.commit()
        set_cached(cache_key, res, model_name, TTL_REPORT, db)

    return state
