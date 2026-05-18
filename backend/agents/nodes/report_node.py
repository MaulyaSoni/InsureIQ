import uuid
from datetime import datetime
import logging

import time
from backend.routers.policies import emit_trace_event
from backend.agents.state import InsureIQState
from backend.database.models import Report, ReportType
from backend.llm.cache import TTL_REPORT, make_cache_key, get_cached, set_cached
from backend.llm.groq_client import invoke_with_retry
from backend.llm.prompts import REPORT_WRITER_PROMPT, format_policy_summary

logger = logging.getLogger(__name__)


def report_node(state: InsureIQState) -> InsureIQState:
    session_id = state.get("_trace_session_id", "")
    start_time = time.time()
    emit_trace_event(session_id, "node_start", {"node": "report_node", "description": "Processing report_node"})
    try:
        db = state.get("_db")
        policy_id = state.get("policy_id", "unknown")
        model_name = "llama-3.3-70b-versatile"
        cache_key = make_cache_key(policy_id, "underwriting_report", model_name)

        if db is not None:
            cached = get_cached(cache_key, db)
            if cached:
                report_id = str(uuid.uuid4())
                state["final_report"] = cached
                state["report_id"] = report_id
                user_id = state.get("_user_id")
                db.add(
                    Report(
                        id=report_id,
                        policy_id=policy_id,
                        user_id=user_id or "",
                        report_type=ReportType.underwriting,
                        content=cached,
                        pdf_path=None,
                        created_at=datetime.utcnow(),
                    )
                )
                db.commit()
                duration_ms = int((time.time() - start_time) * 1000)
                emit_trace_event(session_id, "node_complete", {"node": "report_node", "duration_ms": duration_ms})
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

        duration_ms = int((time.time() - start_time) * 1000)
        emit_trace_event(session_id, "node_complete", {"node": "report_node", "duration_ms": duration_ms})
        return state
    except Exception as e:
        logger.error(f"report_node Groq call failed: {e}")
        
        # Structured fallback for PDF/UI
        risk_score = state.get("risk_score", "N/A")
        risk_band = state.get("risk_band", "N/A")
        prob = round(float(state.get("claim_probability", 0) or 0) * 100, 1)
        explanation = state.get("risk_explanation", "Risk explanation unavailable.")
        premium_min = state.get("premium_min", 0)
        premium_max = state.get("premium_max", 0)
        
        fallback_content = f"""# InsureIQ Underwriting Report 

**Policy:** {state.get('policy_data', {}).get('policy_number', 'N/A')}  
**Holder:** {state.get('policy_data', {}).get('policyholder_name', 'N/A')}  
**Generated:** {datetime.now().strftime('%d %B %Y, %H:%M')} 

--- 

## Risk Assessment 
- Risk Score: {risk_score} /100 
- Risk Band: {risk_band} 
- Claim Probability: {prob} % 

## Risk Explanation 
{explanation} 

## Premium Recommendation 
Estimated annual premium range: ₹{premium_min:,} – ₹{premium_max:,} 

## Underwriting Decision 
Based on the risk profile, this policy is classified as **{risk_band}**. 
{'Standard approval recommended.' if risk_band in ('LOW', 'MEDIUM') else 'Manual review recommended before binding.'} 

--- 
*This report was generated using InsureIQ v1.0. AI narrative temporarily unavailable — data sourced directly from XGBoost risk model. Verify with licensed insurance professionals before making underwriting decisions.* 
"""
        report_id = str(uuid.uuid4())
        state["final_report"] = fallback_content
        state["report_id"] = report_id
        
        if db is not None:
            policy_id = state.get("policy_id")
            user_id = state.get("_user_id")
            db.add(
                Report(
                    id=report_id,
                    policy_id=policy_id,
                    user_id=user_id or "",
                    report_type=ReportType.underwriting,
                    content=fallback_content,
                    pdf_path=None,
                    created_at=datetime.utcnow(),
                )
            )
            db.commit()

        state["error"] = f"report_node failed: {str(e)}"
        duration_ms = int((time.time() - start_time) * 1000)
        emit_trace_event(session_id, "node_complete", {"node": "report_node", "duration_ms": duration_ms})
        return state
