import hashlib
import json
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models import LLMCache


def build_cache_key(policy_id: str, endpoint: str, model: str) -> str:
    raw = f"{policy_id}:{endpoint}:{model}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def get_cached_response(db: Session, cache_key: str) -> dict | None:
    row = db.query(LLMCache).filter(LLMCache.cache_key == cache_key).first()
    if not row:
        return None

    expiry = row.created_at + timedelta(hours=row.ttl_hours)
    if datetime.utcnow() > expiry:
        return None

    return json.loads(row.response)


def set_cached_response(db: Session, cache_key: str, response: dict, ttl_hours: int) -> None:
    row = db.query(LLMCache).filter(LLMCache.cache_key == cache_key).first()
    payload = json.dumps(response)
    if row:
        row.response = payload
        row.created_at = datetime.utcnow()
        row.ttl_hours = ttl_hours
    else:
        row = LLMCache(
            cache_key=cache_key,
            response=payload,
            created_at=datetime.utcnow(),
            ttl_hours=ttl_hours,
        )
        db.add(row)
    db.commit()
