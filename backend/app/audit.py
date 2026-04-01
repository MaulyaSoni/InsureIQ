import hashlib
import json
from datetime import datetime

from starlette.middleware.base import BaseHTTPMiddleware

from app.auth import try_get_user_id_from_auth_header
from app.database import SessionLocal
from app.models import AuditLog


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        body_bytes = await request.body()

        async def receive():
            return {"type": "http.request", "body": body_bytes, "more_body": False}

        request._receive = receive
        response = await call_next(request)

        if request.method in {"POST", "PUT", "DELETE"}:
            payload_hash = hashlib.sha256(body_bytes or b"").hexdigest()
            resource_parts = [part for part in request.url.path.split("/") if part]
            resource_type = resource_parts[0] if resource_parts else "unknown"
            resource_id = resource_parts[1] if len(resource_parts) > 1 else ""
            user_id = try_get_user_id_from_auth_header(request.headers.get("Authorization"))

            db = SessionLocal()
            try:
                db.add(
                    AuditLog(
                        user_id=user_id,
                        action=request.method,
                        resource_type=resource_type,
                        resource_id=resource_id,
                        timestamp=datetime.utcnow(),
                        payload_hash=payload_hash,
                    )
                )
                db.commit()
            finally:
                db.close()

        return response
