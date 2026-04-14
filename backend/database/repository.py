from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session, selectinload

from backend.database.models import (
    AuditLog,
    AuditStatus,
    BatchJob,
    BatchJobStatus,
    LLMCache,
    Policy,
    Report,
    RiskBandEnum,
    RiskPrediction,
    User,
)


class UserRepository:
    @staticmethod
    def create(db: Session, email: str, full_name: str, hashed_password: str) -> User:
        user = User(email=email, full_name=full_name, hashed_password=hashed_password)
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def get_by_id(db: Session, user_id: str) -> User | None:
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def get_by_email(db: Session, email: str) -> User | None:
        return db.query(User).filter(User.email == email).first()

    @staticmethod
    def update_last_login(db: Session, user_id: str):
        db.query(User).filter(User.id == user_id).update({"last_login": datetime.utcnow()})
        db.commit()

    @staticmethod
    def deactivate(db: Session, user_id: str):
        db.query(User).filter(User.id == user_id).update({"is_active": False})
        db.commit()


class PolicyRepository:
    @staticmethod
    def create(db: Session, user_id: str, **fields) -> Policy:
        policy = Policy(user_id=user_id, **fields)
        db.add(policy)
        db.commit()
        db.refresh(policy)
        return policy

    @staticmethod
    def get_by_id(db: Session, policy_id: str, user_id: str | None = None) -> Policy | None:
        query = db.query(Policy).filter(Policy.id == policy_id)
        if user_id:
            query = query.filter(Policy.user_id == user_id)
        return query.first()

    @staticmethod
    def get_all(
        db: Session,
        user_id: str,
        skip: int = 0,
        limit: int = 20,
        risk_band: str | None = None,
        is_active: bool = True,
    ) -> list[Policy]:
        query = db.query(Policy).filter(Policy.user_id == user_id, Policy.is_active == is_active).options(selectinload(Policy.risk_predictions))

        if risk_band:
            # Subquery to get latest risk prediction for each policy
            sub = (
                select(RiskPrediction.policy_id, func.max(RiskPrediction.created_at).label("mx"))
                .group_by(RiskPrediction.policy_id)
                .subquery()
            )
            query = query.join(sub, Policy.id == sub.c.policy_id).join(
                RiskPrediction,
                and_(
                    RiskPrediction.policy_id == sub.c.policy_id,
                    RiskPrediction.created_at == sub.c.mx,
                ),
            ).filter(RiskPrediction.risk_band == risk_band)

        return query.order_by(Policy.created_at.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def count(db: Session, user_id: str, is_active: bool = True) -> int:
        return db.query(Policy).filter(Policy.user_id == user_id, Policy.is_active == is_active).count()

    @staticmethod
    def update(db: Session, policy_id: str, user_id: str, **fields) -> Policy | None:
        db.query(Policy).filter(Policy.id == policy_id, Policy.user_id == user_id).update(
            fields, synchronize_session=False
        )
        db.commit()
        return PolicyRepository.get_by_id(db, policy_id, user_id)

    @staticmethod
    def soft_delete(db: Session, policy_id: str, user_id: str) -> bool:
        result = (
            db.query(Policy)
            .filter(Policy.id == policy_id, Policy.user_id == user_id)
            .update({"is_active": False}, synchronize_session=False)
        )
        db.commit()
        return result > 0

    @staticmethod
    def bulk_create(db: Session, user_id: str, policies: list[dict]) -> tuple[int, int]:
        created = 0
        failed = 0
        for p_data in policies:
            try:
                policy = Policy(user_id=user_id, **p_data)
                db.add(policy)
                created += 1
            except Exception:
                failed += 1
        db.commit()
        return created, failed


class RiskPredictionRepository:
    @staticmethod
    def create(db: Session, policy_id: str, user_id: str, **fields) -> RiskPrediction:
        prediction = RiskPrediction(policy_id=policy_id, user_id=user_id, **fields)
        db.add(prediction)
        db.commit()
        db.refresh(prediction)
        return prediction

    @staticmethod
    def get_latest_for_policy(db: Session, policy_id: str) -> RiskPrediction | None:
        return (
            db.query(RiskPrediction)
            .filter(RiskPrediction.policy_id == policy_id)
            .order_by(RiskPrediction.created_at.desc())
            .first()
        )

    @staticmethod
    def get_all_for_policy(db: Session, policy_id: str) -> list[RiskPrediction]:
        return (
            db.query(RiskPrediction)
            .filter(RiskPrediction.policy_id == policy_id)
            .order_by(RiskPrediction.created_at.desc())
            .all()
        )

    @staticmethod
    def get_by_id(db: Session, prediction_id: str) -> RiskPrediction | None:
        return db.query(RiskPrediction).filter(RiskPrediction.id == prediction_id).first()


class BatchJobRepository:
    @staticmethod
    def create(db: Session, user_id: str, total_policies: int) -> BatchJob:
        job = BatchJob(user_id=user_id, total_policies=total_policies, status=BatchJobStatus.pending)
        db.add(job)
        db.commit()
        db.refresh(job)
        return job

    @staticmethod
    def get_by_id(db: Session, job_id: str, user_id: str | None = None) -> BatchJob | None:
        query = db.query(BatchJob).filter(BatchJob.id == job_id)
        if user_id:
            query = query.filter(BatchJob.user_id == user_id)
        return query.first()

    @staticmethod
    def update_progress(db: Session, job_id: str, processed_count: int, failed_count: int):
        db.query(BatchJob).filter(BatchJob.id == job_id).update(
            {
                "processed_count": processed_count,
                "failed_count": failed_count,
                "status": BatchJobStatus.running,
            }
        )
        db.commit()

    @staticmethod
    def complete(db: Session, job_id: str, result_summary: dict):
        db.query(BatchJob).filter(BatchJob.id == job_id).update(
            {
                "status": BatchJobStatus.completed,
                "result_summary": result_summary,
                "completed_at": datetime.utcnow(),
            }
        )
        db.commit()

    @staticmethod
    def fail(db: Session, job_id: str, error: str):
        db.query(BatchJob).filter(BatchJob.id == job_id).update(
            {"status": BatchJobStatus.failed, "result_summary": {"error": error}, "completed_at": datetime.utcnow()}
        )
        db.commit()


class ReportRepository:
    @staticmethod
    def create(db: Session, policy_id: str, user_id: str, report_type: Any, content: str) -> Report:
        report = Report(policy_id=policy_id, user_id=user_id, report_type=report_type, content=content)
        db.add(report)
        db.commit()
        db.refresh(report)
        return report

    @staticmethod
    def get_by_id(db: Session, report_id: str, user_id: str | None = None) -> Report | None:
        query = db.query(Report).filter(Report.id == report_id)
        if user_id:
            query = query.filter(Report.user_id == user_id)
        return query.first()

    @staticmethod
    def get_all_for_user(db: Session, user_id: str, skip: int = 0, limit: int = 20) -> list[Report]:
        return (
            db.query(Report)
            .filter(Report.user_id == user_id)
            .order_by(Report.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def update_pdf_path(db: Session, report_id: str, path: str):
        db.query(Report).filter(Report.id == report_id).update({"pdf_path": path})
        db.commit()


class AuditLogRepository:
    @staticmethod
    def create(
        db: Session,
        action: str,
        resource_type: str,
        user_id: str | None = None,
        resource_id: str | None = None,
        ip_address: str | None = None,
        payload_hash: str | None = None,
        status: str = "success",
    ):
        # Map string status to enum if necessary
        audit_status = AuditStatus.success if status == "success" else AuditStatus.failure
        log = AuditLog(
            action=action,
            resource_type=resource_type,
            user_id=user_id,
            resource_id=resource_id,
            ip_address=ip_address,
            payload_hash=payload_hash,
            status=audit_status,
        )
        db.add(log)
        db.commit()
        return log

    @staticmethod
    def get_all(
        db: Session, skip: int = 0, limit: int = 50, action: str | None = None, user_id: str | None = None
    ) -> list[AuditLog]:
        query = db.query(AuditLog)
        if action:
            query = query.filter(AuditLog.action == action)
        if user_id:
            query = query.filter(AuditLog.user_id == user_id)
        return query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()


class LLMCacheRepository:
    @staticmethod
    def get(db: Session, cache_key: str) -> str | None:
        cache_entry = db.query(LLMCache).filter(LLMCache.cache_key == cache_key).first()
        if cache_entry and cache_entry.expires_at > datetime.utcnow():
            return cache_entry.response_json
        return None

    @staticmethod
    def set(db: Session, cache_key: str, response_json: str, model_used: str, ttl_hours: int):
        expires_at = datetime.utcnow() + timedelta(hours=ttl_hours)
        cache_entry = db.query(LLMCache).filter(LLMCache.cache_key == cache_key).first()
        if cache_entry:
            cache_entry.response_json = response_json
            cache_entry.model_used = model_used
            cache_entry.expires_at = expires_at
        else:
            cache_entry = LLMCache(
                cache_key=cache_key,
                response_json=response_json,
                model_used=model_used,
                expires_at=expires_at,
            )
            db.add(cache_entry)
        db.commit()

    @staticmethod
    def invalidate(db: Session, cache_key: str):
        db.query(LLMCache).filter(LLMCache.cache_key == cache_key).delete()
        db.commit()
