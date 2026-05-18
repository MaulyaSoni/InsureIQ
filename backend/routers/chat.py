
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import AsyncGenerator
import asyncio, json
from backend.database.db import get_db
from backend.database.repository import get_policy
from backend.auth.dependencies import get_current_user
from backend.database.models import User
from backend.config import get_settings

router = APIRouter()

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    policy_id: str | None = None
    message: str
    history: list[ChatMessage] = []

CHAT_SYSTEM_PROMPT = """You are InsureIQ AI - an expert insurance analytics assistant 
embedded in an insurance underwriting platform.

You assist underwriters, risk analysts, and insurance brokers with:
- Explaining risk scores and SHAP feature attributions in plain language
- Answering questions about specific policies
- Explaining claim eligibility and premium recommendations  
- Providing guidance on Indian motor insurance regulations (IRDAI)
- Helping interpret XGBoost model outputs and explainability results

{policy_context}

Rules:
- Reference specific policy data when available ("your policy's vehicle age of X years...")
- For regulatory questions, cite IRDAI guidelines
- Never speculate on exact premium amounts - use ranges
- Always add disclaimer for high-stakes decisions
- Use INR and Indian number format (lakhs/crores)
- Be concise - underwriters are busy professionals
- If you don't know something, say so rather than guess"""

async def stream_chat_response(
    message: str,
    history: list,
    policy_context: str,
) -> AsyncGenerator[str, None]:
    from groq import AsyncGroq
    settings = get_settings()

    if not settings.groq_api_key:
        yield f"data: {json.dumps({'error': 'Groq API key not configured.'})}\n\n"
        return

    system = CHAT_SYSTEM_PROMPT.format(policy_context=policy_context)

    messages = [{"role": "system", "content": system}]
    for h in history[-6:]:
        messages.append({"role": h.role, "content": h.content})
    messages.append({"role": "user", "content": message})

    client = AsyncGroq(api_key=settings.groq_api_key)

    try:
        stream = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            stream=True,
            max_tokens=1024,
            temperature=0.2,
        )

        async for chunk in stream:
            delta = chunk.choices[0].delta
            if delta and delta.content:
                data = json.dumps({"token": delta.content})
                yield f"data: {data}\n\n"

        yield f"data: {json.dumps({'done': True})}\n\n"

    except Exception as e:
        err = str(e).lower()
        if "429" in err or "rate_limit" in err:
            yield f"data: {json.dumps({'error': 'Rate limit reached. Please wait 60 seconds and try again.'})}\n\n"
        else:
            print(f"Chat stream error: {e}")
            yield f"data: {json.dumps({'error': f'Chat error: {str(e)[:200]}'})}\n\n"
    finally:
        await client.close()


@router.post("/stream")
async def chat_stream(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    policy_context = ""
    if request.policy_id:
        policy = get_policy(db, request.policy_id, str(current_user.id))
        if policy:
            try:
                from backend.database.repository import get_latest_prediction
                pred = get_latest_prediction(db, str(policy.id))
            except:
                pred = None
            policy_context = f"""
CURRENT POLICY CONTEXT:
Policy: {policy.policy_number} - {policy.policyholder_name}
Vehicle: {policy.vehicle_year} {policy.vehicle_make} {policy.vehicle_model}
Engine: {policy.engine_cc}cc | Use: {policy.vehicle_use} | City: {policy.city}
IDV: INR {policy.insured_value:,.0f} | Premium: INR {policy.premium_amount:,.0f}
Prior Claims: {policy.prior_claims_count} | NCB: {policy.ncb_percentage}%
Parking: {policy.parking_type} | Anti-theft: {'Yes' if policy.anti_theft_device else 'No'}
Annual Mileage: {policy.annual_mileage_km:,} km
{f'Risk Score: {pred.risk_score}/100 | Band: {pred.risk_band} | Claim Probability: {round(pred.claim_probability * 100, 1)}%' if pred else 'Risk: Not yet assessed'}
"""

    return StreamingResponse(
        stream_chat_response(request.message, request.history, policy_context),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
