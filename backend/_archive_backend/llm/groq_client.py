from __future__ import annotations

import json

from app.config import get_settings

try:
    from langchain_groq import ChatGroq
except Exception:  # pragma: no cover - optional dependency fallback
    ChatGroq = None

from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

GROQ_MODELS = {
    "router": "llama-3.1-8b-instant",
    "extractor": "openai/gpt-oss-120b",
    "reasoner": "llama-3.3-70b-versatile",
}


def _fallback_text(model_key: str, messages: list) -> str:
    if model_key == "router":
        return "full_report"
    content = ""
    if messages:
        content = getattr(messages[-1], "content", "") or ""
    return f"LLM fallback response (Groq unavailable). Input length={len(content)}"


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(Exception),
)
def invoke_with_retry(model_key: str, messages: list, response_format=None) -> str:
    settings = get_settings()
    if not settings.groq_api_key or ChatGroq is None:
        return _fallback_text(model_key, messages)

    llm = ChatGroq(
        groq_api_key=settings.groq_api_key,
        model=GROQ_MODELS.get(model_key, GROQ_MODELS["router"]),
        temperature=0.1,
    )

    if response_format:
        parsed = llm.with_structured_output(response_format).invoke(messages)
        if isinstance(parsed, str):
            return parsed
        if hasattr(parsed, "model_dump_json"):
            return parsed.model_dump_json()
        return json.dumps(parsed)

    out = llm.invoke(messages)
    return getattr(out, "content", "") or ""
