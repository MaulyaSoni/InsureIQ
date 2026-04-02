import hashlib
import json
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from backend.database.models import LLMCache


def build_cache_key(policy_id: str, endpoint: str, model: str) -> str:
    raw = f"{policy_id}:{endpoint}:{model}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()[:64]


def get_cached_response(db: Session, cache_key: str) -> dict | None:
    row = db.query(LLMCache).filter(LLMCache.cache_key == cache_key).first()
    if not row:
        return None
    if datetime.utcnow() > row.expires_at:
        return None
    try:
        return json.loads(row.response_json)
    except json.JSONDecodeError:
        return None


def set_cached_response(
    db: Session,
    cache_key: str,
    response: dict,
    model_used: str,
    ttl_seconds: int,
    token_count: int | None = None,
) -> None:
    expires = datetime.utcnow() + timedelta(seconds=ttl_seconds)
    payload = json.dumps(response)
    row = db.query(LLMCache).filter(LLMCache.cache_key == cache_key).first()
    if row:
        row.response_json = payload
        row.created_at = datetime.utcnow()
        row.expires_at = expires
        row.model_used = model_used
        row.token_count = token_count
    else:
        row = LLMCache(
            cache_key=cache_key,
            response_json=payload,
            model_used=model_used,
            token_count=token_count,
            created_at=datetime.utcnow(),
            expires_at=expires,
        )
        db.add(row)
    db.commit()
