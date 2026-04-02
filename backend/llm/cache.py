import hashlib
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from backend.database.models import LLMCache

TTL_RISK_EXPLAIN = 24
TTL_PREMIUM = 24
TTL_REPORT = 1
TTL_CLAIM = 0
TTL_IRDAI = 168


def make_cache_key(policy_id: str, endpoint: str, model: str) -> str:
    raw = f"{policy_id}:{endpoint}:{model}"
    return hashlib.sha256(raw.encode()).hexdigest()


def get_cached(cache_key: str, db: Session) -> str | None:
    record = db.query(LLMCache).filter(LLMCache.cache_key == cache_key).first()
    if record and record.expires_at > datetime.utcnow():
        return record.response_json
    return None


def set_cached(
    cache_key: str,
    response: str,
    model: str,
    ttl_hours: int,
    db: Session,
    token_count: int | None = None,
) -> None:
    if ttl_hours <= 0:
        return
    expires_at = datetime.utcnow() + timedelta(hours=ttl_hours)
    record = db.query(LLMCache).filter(LLMCache.cache_key == cache_key).first()
    if record:
        record.response_json = response
        record.expires_at = expires_at
        record.model_used = model
        record.token_count = token_count
        record.created_at = datetime.utcnow()
    else:
        record = LLMCache(
            cache_key=cache_key,
            response_json=response,
            model_used=model,
            token_count=token_count,
            expires_at=expires_at,
        )
        db.add(record)
    db.commit()


check_cache = get_cached
store_cache = set_cached
