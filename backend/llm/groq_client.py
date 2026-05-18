from __future__ import annotations

import json
import os
import time
from typing import Any

from backend.config import get_settings

try:
    from langchain_groq import ChatGroq
except Exception:
    ChatGroq = None

from groq import Groq

groq_client = Groq(api_key=get_settings().groq_api_key)

from langchain_core.messages import HumanMessage, SystemMessage

GROQ_MODELS = {
    "router": "llama-3.1-8b-instant",
    "extractor": "openai/gpt-oss-120b",
    "reasoner": "llama-3.3-70b-versatile",
}


def _is_rate_limit(exc: Exception) -> bool:
    msg = str(exc).lower()
    return "429" in msg or "rate limit" in msg or "too many requests" in msg


def _build_messages(system_prompt: str, user_content: str) -> list[dict[str, str]]:
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": user_content})
    return messages


def _fallback_text(model_key: str, user_content: str) -> str:
    if model_key == "router":
        return "full_report"
    raise Exception(f"Groq unavailable for {model_key}")


class RateLimitError(Exception):
    pass


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

    for attempt in range(3):
        try:
            llm = ChatGroq(
                groq_api_key=settings.groq_api_key,
                model=model_name,
                temperature=0.1,
            )

            if expect_json:
                response = llm.invoke(messages)
                content = getattr(response, "content", "") or ""
                if not content:
                    return "{}"
                # Prefer valid JSON output; fallback to wrapping raw text.
                try:
                    parsed = json.loads(content)
                    return json.dumps(parsed)
                except Exception:
                    return json.dumps({"raw": content})

            response = llm.invoke(messages)
            content = getattr(response, "content", "") or ""
            return content

        except Exception as exc:
            if _is_rate_limit(exc):
                if attempt < 2:
                    print(f"Groq rate limit hit. Waiting 60s... (attempt {attempt+1}/3)")
                    time.sleep(60)
                    continue
            elif attempt < 2:
                wait_time = 2 ** (attempt + 1)
                print(f"Groq error: {exc}. Retrying in {wait_time}s...")
                time.sleep(wait_time)
                continue
            return _fallback_text(model_key, user_content)

    return _fallback_text(model_key, user_content)


def invoke_with_retry(model_key: str, messages: list[dict[str, str]], response_format: Any = None) -> str:
    settings = get_settings()

    if not settings.groq_api_key or ChatGroq is None:
        return _fallback_text(model_key, messages[-1].get("content", "") if messages else "")

    model_name = GROQ_MODELS.get(model_key, GROQ_MODELS["router"])

    for attempt in range(3):
        try:
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

        except Exception as exc:
            if _is_rate_limit(exc):
                if attempt < 2:
                    print(f"Groq rate limit hit. Waiting 60s... (attempt {attempt+1}/3)")
                    time.sleep(60)
                    continue
            elif attempt < 2:
                wait_time = 2 ** (attempt + 1)
                print(f"Groq error: {exc}. Retrying in {wait_time}s...")
                time.sleep(wait_time)
                continue
            return _fallback_text(model_key, messages[-1].get("content", "") if messages else "")

    return _fallback_text(model_key, messages[-1].get("content", "") if messages else "")

from typing import Generator

def invoke_llm_streaming(
    model_key: str,
    system_prompt: str,
    user_content: str,
) -> Generator[str, None, None]:
    model = GROQ_MODELS[model_key]
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": user_content})

    try:
        stream = groq_client.chat.completions.create(
            model=model,
            messages=messages,
            stream=True,
            max_tokens=2048,
            temperature=0.1,
        )
        for chunk in stream:
            delta = chunk.choices[0].delta
            if delta and delta.content:
                yield delta.content
    except Exception as e:
        err_str = str(e).lower()
        if "429" in err_str or "rate_limit" in err_str:
            import time
            time.sleep(60)
            stream = groq_client.chat.completions.create(
                model=model,
                messages=messages,
                stream=True,
                max_tokens=2048,
                temperature=0.1,
            )
            for chunk in stream:
                delta = chunk.choices[0].delta
                if delta and delta.content:
                    yield delta.content
        else:
            raise
