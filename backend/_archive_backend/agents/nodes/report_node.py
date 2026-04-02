from app.agents.state import InsureIQState
from app.llm.groq_client import invoke_with_retry
from app.llm.prompts import REPORT_WRITER_PROMPT, format_policy_summary
import uuid
from datetime import datetime

from app.models import Report, ReportType

def report_node(state: InsureIQState) -> InsureIQState:
    prompt = REPORT_WRITER_PROMPT.format(
        policy_summary=format_policy_summary(state.get("policy_data", {})),
        risk_score=state.get("risk_score"),
        risk_band=state.get("risk_band"),
        risk_explanation=state.get("risk_explanation"),
        premium_narrative=state.get("premium_narrative"),
        claim_probability_pct=round(float(state.get("claim_probability", 0.0)) * 100, 2),
    )
    res = invoke_with_retry("reasoner", [{"role": "user", "content": prompt}])
    report_id = str(uuid.uuid4())
    state["final_report"] = res
    state["report_id"] = report_id

    db = state.get("_db")
    user_id = state.get("_user_id")
    policy_id = state.get("policy_id")
    if db is not None and user_id and policy_id:
        db.add(
            Report(
                id=report_id,
                policy_id=policy_id,
                user_id=user_id,
                report_type=ReportType.underwriting,
                content=res,
                pdf_path=None,
                created_at=datetime.utcnow(),
            )
        )
        db.commit()

    return state
