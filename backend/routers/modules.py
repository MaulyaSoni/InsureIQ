"""
InsureIQ Modules - Legacy compatibility layer.
All actual AI logic now lives in:
  backend/agents/nodes/   (LangGraph nodes)
  backend/llm/            (Groq client + prompts)
  backend/routers/        (individual endpoint routers)

Functions here redirect to the real implementations.
"""

import logging
import warnings
from typing import Optional

from fastapi import APIRouter

from backend.llm.groq_client import invoke_llm
from backend.llm.prompts import (
    RISK_EXPLAINER_PROMPT,
    PREMIUM_ADVISOR_PROMPT,
    REPORT_WRITER_PROMPT,
)
from backend.llm.cache import make_cache_key, get_cached, set_cached
from backend.llm.groq_client import GROQ_MODELS

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/modules", tags=["modules"])


def generate_risk_explanation(
    risk_score: int,
    risk_band: str,
    shap_features: list,
    claim_probability: float,
    db=None,
) -> str:
    """
    Generate plain-language explanation via Groq llama-3.3-70b.
    Replaces the old hardcoded if/elif templates.
    """
    from backend.llm.prompts import format_shap_features, format_policy_summary

    cache_key = make_cache_key(
        f"explain:{risk_score}:{risk_band}:{round(claim_probability,2)}",
        "modules_explain",
        GROQ_MODELS["reasoner"],
    )
    if db:
        cached = get_cached(cache_key, db)
        if cached:
            return cached

    formatted = format_shap_features(shap_features) if shap_features else "No SHAP data available."
    user_content = (
        f"Risk Score: {risk_score}/100\n"
        f"Risk Band: {risk_band}\n"
        f"Claim Probability: {round(claim_probability * 100, 1)}%\n"
        f"SHAP Features:\n{formatted}"
    )

    try:
        result = invoke_llm(
            model_key="reasoner",
            system_prompt=RISK_EXPLAINER_PROMPT,
            user_content=user_content,
        )
    except Exception as e:
        logger.error(f"generate_risk_explanation failed: {e}")
        result = (
            f"Risk Score: {risk_score}/100 � Band: {risk_band}. "
            f"Claim probability: {round(claim_probability * 100, 1)}%. "
            f"(Detailed explanation temporarily unavailable.)"
        )

    if db:
        set_cached(cache_key, result, GROQ_MODELS["reasoner"], 24, db)
    return result


def generate_premium_advisory(
    risk_score: int,
    risk_band: str,
    claim_probability: float,
    policy_summary: str,
    db=None,
) -> dict:
    """
    Generate premium advisory via Groq mixtral-8x7b.
    Returns dict with: narrative, premium_min, premium_max, adjustment_factors
    """
    import re

    cache_key = make_cache_key(
        f"premium:{risk_score}:{risk_band}",
        "modules_premium",
        GROQ_MODELS["extractor"],
    )
    if db:
        cached = get_cached(cache_key, db)
        if cached:
            import json
            try:
                return json.loads(cached)
            except Exception:
                pass

    user_content = (
        f"Risk Score: {risk_score}/100\n"
        f"Band: {risk_band}\n"
        f"Claim Probability: {round(claim_probability * 100, 1)}%\n"
        f"Policy Summary: {policy_summary}"
    )

    try:
        response = invoke_llm(
            model_key="extractor",
            system_prompt=PREMIUM_ADVISOR_PROMPT,
            user_content=user_content,
        )
        pattern = r'?\s*([\d,]+)\s*(?:to|�|-|and)\s*?\s*([\d,]+)'
        match = re.search(pattern, response)
        if match:
            pmin = int(match.group(1).replace(',', ''))
            pmax = int(match.group(2).replace(',', ''))
        else:
            fallback = {"LOW":(8000,15000),"MEDIUM":(15000,25000),
                       "HIGH":(25000,40000),"CRITICAL":(40000,70000)}
            pmin, pmax = fallback.get(risk_band, (15000, 25000))

        result = {
            "narrative": response,
            "premium_min": pmin,
            "premium_max": pmax,
            "adjustment_factors": [],
        }
    except Exception as e:
        logger.error(f"generate_premium_advisory failed: {e}")
        fallback = {"LOW":(8000,15000),"MEDIUM":(15000,25000),
                   "HIGH":(25000,40000),"CRITICAL":(40000,70000)}
        pmin, pmax = fallback.get(risk_band, (15000, 25000))
        result = {
            "narrative": f"Estimated premium range ?{pmin:,}�?{pmax:,} based on {risk_band} risk band.",
            "premium_min": pmin,
            "premium_max": pmax,
            "adjustment_factors": [],
        }

    if db:
        import json
        set_cached(cache_key, json.dumps(result), GROQ_MODELS["extractor"], 24, db)
    return result


def generate_underwriting_report(
    policy_summary: str,
    risk_score: int,
    risk_band: str,
    claim_probability: float,
    risk_explanation: str,
    premium_narrative: str,
    db=None,
) -> str:
    """Generate full underwriting report via Groq llama-3.3-70b."""
    user_content = (
        f"Policy Summary: {policy_summary}\n"
        f"Risk Score: {risk_score}/100 ({risk_band})\n"
        f"Claim Probability: {round(claim_probability * 100, 1)}%\n"
        f"Risk Explanation: {risk_explanation}\n"
        f"Premium Advisory: {premium_narrative}"
    )
    try:
        return invoke_llm(
            model_key="reasoner",
            system_prompt=REPORT_WRITER_PROMPT,
            user_content=user_content,
        )
    except Exception as e:
        logger.error(f"generate_underwriting_report failed: {e}")
        from datetime import datetime
        return (
            f"# InsureIQ Underwriting Report\n\n"
            f"**Policy Risk Assessment**\n"
            f"- Risk Score: {risk_score}/100\n"
            f"- Risk Band: {risk_band}\n"
            f"- Claim Probability: {round(claim_probability * 100, 1)}%\n\n"
            f"## Risk Explanation\n"
            f"{risk_explanation}\n\n"
            f"## Premium Recommendation\n"
            f"{premium_narrative}\n\n"
            f"---\n"
            f"*AI narrative temporarily unavailable — data sourced directly from XGBoost risk model.*"
        )
