import io
import time
import uuid
from datetime import datetime
from typing import Optional

import pandas as pd
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import BatchJob, BatchJobStatus, Policy, RiskPrediction, User
from app.ml import policy_to_vector, score_to_band, score_to_risk_band_enum

router = APIRouter(prefix="/batch", tags=["batch"], dependencies=[Depends(get_current_user)])


def _predict_score(model, vector) -> float:
    try:
        import xgboost as xgb

        if model.__class__.__name__ == "Booster":
            return float(model.predict(xgb.DMatrix(vector))[0])
    except Exception:
        pass
    try:
        if hasattr(model, "predict_proba"):
            return float(model.predict_proba(vector)[0][1])
    except Exception:
        pass
    raw = float(model.predict(vector)[0])
    return raw / 100.0 if raw > 1 else raw


def _run_batch_job(job_id: str, policy_ids: list[str], user_id: str) -> None:
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        job = db.query(BatchJob).filter(BatchJob.id == job_id).first()
        if not job:
            return

        job.status = BatchJobStatus.running
        db.commit()

        from app.main import app as fastapi_app
        model = fastapi_app.state.model

        summary: dict = {
            "avg_risk_score": 0.0,
            "risk_distribution": {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0},
            "avg_claim_probability": 0.0,
            "flagged_critical": [],
            "processing_time_seconds": 0.0,
        }

        start_time = time.time()
        processed = 0
        failed = 0

        for policy_id in policy_ids:
            policy = (
                db.query(Policy)
                .filter(Policy.id == policy_id, Policy.user_id == user_id, Policy.is_active.is_(True))
                .first()
            )
            if not policy:
                failed += 1
                job.processed_count = processed
                job.failed_count = failed
                db.commit()
                continue

            try:
                vector = policy_to_vector(policy)
                score = _predict_score(model, vector)
                band_str = score_to_band(score)
                prob = (score / 100) * 0.7

                if band_str == "critical":
                    summary["flagged_critical"].append(policy_id)

                summary["avg_risk_score"] += score
                summary["risk_distribution"][band_str.upper()] += 1
                summary["avg_claim_probability"] += prob

                now = datetime.utcnow()
                rp = RiskPrediction(
                    id=str(uuid.uuid4()),
                    policy_id=policy.id,
                    user_id=user_id,
                    claim_probability=round(prob, 6),
                    risk_score=int(round(score)),
                    risk_band=score_to_risk_band_enum(score),
                    shap_features=[],
                    llm_explanation="",
                    model_version="xgb_v1_batch",
                    created_at=now,
                )
                db.add(rp)
                processed += 1
            except Exception:
                failed += 1

            job.processed_count = processed
            job.failed_count = failed
            db.commit()

        elapsed = time.time() - start_time
        divisor = processed if processed > 0 else 1
        summary["avg_risk_score"] = round(summary["avg_risk_score"] / divisor, 1)
        summary["avg_claim_probability"] = round(summary["avg_claim_probability"] / divisor, 6)
        summary["processing_time_seconds"] = round(elapsed, 2)

        job.status = BatchJobStatus.completed
        job.processed_count = processed
        job.failed_count = failed
        job.result_summary = summary
        job.completed_at = datetime.utcnow()
        db.commit()

    finally:
        db.close()


@router.post("/run")
async def batch_run(
    background_tasks: BackgroundTasks,
    policy_ids: Optional[list[str]] = None,
    file: UploadFile = File(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ids: list[str] = []

    if file:
        if not file.filename.endswith(".csv"):
            raise HTTPException(status_code=400, detail={"error": "FIELD_VALIDATION_ERROR", "detail": "Only CSV files are supported"})
        try:
            contents = await file.read()
            df = pd.read_csv(io.BytesIO(contents))
            col_options = ["policy_id", "id", "policyid", "policy_id_column"]
            used_col = next((c for c in df.columns if c.lower() in col_options), None)
            if used_col:
                ids = df[used_col].dropna().astype(str).tolist()
            else:
                ids = df.iloc[:, 0].dropna().astype(str).tolist()
        except Exception as exc:
            raise HTTPException(status_code=400, detail={"error": "PARSE_ERROR", "detail": f"Could not parse CSV: {exc}"}) from exc
    elif policy_ids:
        ids = [str(i).strip() for i in policy_ids if str(i).strip()]
    else:
        raise HTTPException(status_code=400, detail={"error": "FIELD_VALIDATION_ERROR", "detail": "Provide policy_ids list or CSV file"})

    if not ids:
        raise HTTPException(status_code=400, detail={"error": "FIELD_VALIDATION_ERROR", "detail": "No policy IDs found"})

    now = datetime.utcnow()
    job = BatchJob(
        id=str(uuid.uuid4()),
        user_id=user.id,
        status=BatchJobStatus.pending,
        total_policies=len(ids),
        processed_count=0,
        failed_count=0,
        result_summary=None,
        created_at=now,
        completed_at=None,
    )
    db.add(job)
    db.commit()

    background_tasks.add_task(_run_batch_job, job.id, ids, user.id)

    return JSONResponse({
        "job_id": job.id,
        "status": "pending",
        "total_policies": len(ids),
        "message": "Batch job started. Poll /batch/{job_id}/status for progress.",
    })


@router.get("/{job_id}/status")
def batch_status(job_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    job = db.query(BatchJob).filter(BatchJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "detail": "Batch job not found"})

    pct = 0.0
    eta_seconds: Optional[float] = None

    if job.status == BatchJobStatus.pending:
        pct = 0.0
    elif job.status == BatchJobStatus.running and job.total_policies > 0:
        pct = round((job.processed_count / job.total_policies) * 100, 1)
        if job.processed_count > 0 and job.created_at:
            elapsed = (datetime.utcnow() - job.created_at).total_seconds()
            per_item = elapsed / job.processed_count
            remaining = job.total_policies - job.processed_count
            eta_seconds = round(per_item * remaining, 1)
    elif job.status == BatchJobStatus.completed:
        pct = 100.0

    status_map = {
        BatchJobStatus.pending: "queued",
        BatchJobStatus.running: "processing",
        BatchJobStatus.completed: "completed",
        BatchJobStatus.failed: "failed",
    }

    return {
        "job_id": job.id,
        "status": status_map[job.status],
        "processed_count": job.processed_count,
        "failed_count": job.failed_count,
        "total_policies": job.total_policies,
        "percentage_complete": pct,
        "estimated_seconds_remaining": eta_seconds,
        "created_at": job.created_at,
        "completed_at": job.completed_at,
    }


@router.get("/{job_id}/results")
def batch_results(job_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    job = db.query(BatchJob).filter(BatchJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "detail": "Batch job not found"})

    status_map = {
        BatchJobStatus.pending: "queued",
        BatchJobStatus.running: "processing",
        BatchJobStatus.completed: "completed",
        BatchJobStatus.failed: "failed",
    }

    return {
        "job_id": job.id,
        "status": status_map[job.status],
        "total_policies": job.total_policies,
        "processed_count": job.processed_count,
        "failed_count": job.failed_count,
        "result_summary": job.result_summary or {},
        "created_at": job.created_at,
        "completed_at": job.completed_at,
    }
