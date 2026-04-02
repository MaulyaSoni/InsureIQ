import hashlib
import logging
from datetime import datetime

from starlette.middleware.base import BaseHTTPMiddleware

from app.auth import try_get_user_id_from_auth_header
from app.database import SessionLocal
from app.models import AuditLog, AuditStatus

logger = logging.getLogger("insureiq.audit")


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        body_bytes = await request.body()

        async def receive():
            return {"type": "http.request", "body": body_bytes, "more_body": False}

        request._receive = receive
        response = await call_next(request)

        if request.method not in {"POST", "PUT", "DELETE"}:
            return response

        try:
            payload_hash = hashlib.sha256(body_bytes or b"").hexdigest() if body_bytes else None
            parts = [p for p in request.url.path.split("/") if p]
            if parts and parts[0] == "api":
                parts = parts[1:]
            resource_type = parts[0] if parts else "root"
            resource_id = parts[1] if len(parts) > 1 else None
            if resource_id and resource_id in {"import-csv", "sample-csv"}:
                resource_type = "policies"
                resource_id = None
            uid = try_get_user_id_from_auth_header(request.headers.get("Authorization"))
            client = request.client
            ip_address = client.host if client else None
            audit_status = AuditStatus.success if response.status_code < 400 else AuditStatus.failure
            action = f"{request.method} /{resource_type}" + (f"/{resource_id}" if resource_id else "")

            db = SessionLocal()
            try:
                db.add(
                    AuditLog(
                        user_id=uid,
                        action=action,
                        resource_type=resource_type,
                        resource_id=resource_id,
                        ip_address=ip_address,
                        payload_hash=payload_hash,
                        status=audit_status,
                        created_at=datetime.utcnow(),
                    )
                )
                db.commit()
            finally:
                db.close()
        except Exception as exc:
            logger.warning("audit log skipped: %s", exc)

        return response
