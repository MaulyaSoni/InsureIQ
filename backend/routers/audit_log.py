import csv
import io
from datetime import date, datetime, time

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.auth import get_current_user
from backend.database.db import get_db
from backend.database.models import AuditLog, User

router = APIRouter(prefix="/audit", tags=["audit"])


def _serialize_log(log: AuditLog) -> dict:
    return {
        "id": log.id,
        "user_id": log.user_id,
        "action": log.action,
        "resource_type": log.resource_type,
        "resource_id": log.resource_id,
        "payload_hash": log.payload_hash,
        "ip_address": log.ip_address,
        "status": log.status.value if hasattr(log.status, "value") else str(log.status),
        "created_at": log.created_at.isoformat() if log.created_at else None,
    }


def _get_filtered_logs(
    db: Session,
    user: User,
    limit: int,
    start_date: date | None = None,
    end_date: date | None = None,
    action_filter: str | None = None,
):
    q = db.query(AuditLog).filter(AuditLog.user_id == user.id)
    if action_filter:
        q = q.filter(AuditLog.action.ilike(f"%{action_filter.strip()}%"))
    if start_date:
        q = q.filter(AuditLog.created_at >= datetime.combine(start_date, time.min))
    if end_date:
        q = q.filter(AuditLog.created_at <= datetime.combine(end_date, time.max))
    return q.order_by(AuditLog.created_at.desc()).limit(limit).all()


@router.get("/logs")
def get_audit_logs(
    limit: int = Query(default=50, le=200),
    start_date: date | None = None,
    end_date: date | None = None,
    action_filter: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    logs = _get_filtered_logs(
        db=db,
        user=user,
        limit=limit,
        start_date=start_date,
        end_date=end_date,
        action_filter=action_filter,
    )
    return [_serialize_log(log) for log in logs]


@router.get("/logs/export")
def export_audit_logs(
    format: str = "csv",
    start_date: date | None = None,
    end_date: date | None = None,
    action_filter: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if format.lower() != "csv":
        return {"detail": "Only csv format is supported"}

    logs = _get_filtered_logs(
        db=db,
        user=user,
        limit=5000,
        start_date=start_date,
        end_date=end_date,
        action_filter=action_filter,
    )

    output = io.StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=["id", "created_at", "user_id", "action", "resource_type", "resource_id", "status", "ip_address", "payload_hash"],
    )
    writer.writeheader()
    for log in logs:
        writer.writerow(_serialize_log(log))
    output.seek(0)

    file_name = f"audit-log-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{file_name}"'},
    )


# Backward-compatible endpoint
@router.get("-log")
def get_audit_log_legacy(
    limit: int = Query(default=50, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    logs = _get_filtered_logs(db=db, user=user, limit=limit)
    return [_serialize_log(log) for log in logs]
