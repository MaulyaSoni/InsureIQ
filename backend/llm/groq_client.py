from __future__ import annotations

import json
from typing import Any

from backend.config import get_settings

try:
    from langchain_groq import ChatGroq
except Exception:  # pragma: no cover - optional dependency fallback
    ChatGroq = None

from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

GROQ_MODELS = {
    "router": "llama-3.1-8b-instant",
    "extractor": "mixtral-8x7b-32768",
    "reasoner": "llama-3.3-70b-versatile",
}


def _build_messages(system_prompt: str, user_content: str) -> list[dict[str, str]]:
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": user_content})
    return messages


def _fallback_text(model_key: str, user_content: str) -> str:
    if model_key == "router":
        return "full_report"
    return f"[LLM fallback] Groq unavailable. Input: {user_content[:100]}"


class RateLimitError(Exception):
    pass


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((RateLimitError, Exception)),
)
def invoke_llm(
    model_key: str,
    system_prompt: str,
    user_content: str,
    expect_json: bool = False,
) -> str:
    settings = get_settings()

    if not settings.groq_api_key or ChatGroq is None:
        return _fallback_text(model_key, user_content)

    model_name = GROQ_MODELS.get(model_key, GROQ_MODELS["router"])
    messages = _build_messages(system_prompt, user_content)

    try:
        llm = ChatGroq(
            groq_api_key=settings.groq_api_key,
            model=model_name,
            temperature=0.1,
        )

        if expect_json:
            parsed = llm.with_structured_output(dict).invoke(messages)
            if isinstance(parsed, str):
                return parsed
            if hasattr(parsed, "model_dump_json"):
                return parsed.model_dump_json()
            return json.dumps(parsed)

        response = llm.invoke(messages)
        content = getattr(response, "content", "") or ""
        return content

    except Exception as exc:
        error_str = str(exc).lower()
        if "429" in error_str or "rate_limit" in error_str or "rate limit" in error_str:
            raise RateLimitError(f"Groq rate limit hit: {exc}") from exc
        raise


def invoke_with_retry(model_key: str, messages: list[dict[str, str]], response_format: Any = None) -> str:
    settings = get_settings()

    if not settings.groq_api_key or ChatGroq is None:
        return _fallback_text(model_key, messages[-1].get("content", "") if messages else "")

    model_name = GROQ_MODELS.get(model_key, GROQ_MODELS["router"])

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(
            (Exception,)
        ),
    )
    def _call():
        llm = ChatGroq(
            groq_api_key=settings.groq_api_key,
            model=model_name,
            temperature=0.1,
        )
        if response_format:
            parsed = llm.with_structured_output(response_format).invoke(messages)
            if isinstance(parsed, str):
                return parsed
            if hasattr(parsed, "model_dump_json"):
                return parsed.model_dump_json()
            return json.dumps(parsed)
        response = llm.invoke(messages)
        return getattr(response, "content", "") or ""

    return _call()
