import csv
import io
from datetime import datetime

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, Response, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.auth.dependencies import get_current_user
from backend.database.db import get_db
from backend.database.models import ParkingType, Policy, RiskPrediction, User, VehicleUse
from backend.database.repository import (
    PolicyRepository,
    RiskPredictionRepository,
)
from backend.ml import policy_to_vector, score_to_risk_band_enum
from backend.schemas.policy import (
    CSVImportResponse,
    PolicyCreate,
    PolicyListResponse,
    PolicyResponse,
    PolicyUpdate,
)
from backend.utils.errors import error_response

router = APIRouter(prefix="/policies", tags=["policies"], dependencies=[Depends(get_current_user)])

_SAMPLE_COLUMNS = [
    "policy_number",
    "policyholder_name",
    "vehicle_make",
    "vehicle_model",
    "vehicle_year",
    "engine_cc",
    "seating_capacity",
    "vehicle_use",
    "insured_value",
    "premium_amount",
    "prior_claims_count",
    "prior_claim_amount",
    "anti_theft_device",
    "parking_type",
    "city",
    "annual_mileage_km",
    "ncb_percentage",
    "policy_start_date",
    "policy_duration_months",
]


# --- Sample CSV ---


def _policy_to_create_dict(row: dict) -> dict:
    out = {k: row.get(k) for k in _SAMPLE_COLUMNS if k in row}
    if "holder_name" in row and "policyholder_name" not in out:
        out["policyholder_name"] = row["holder_name"]
    if "production_year" in row and "vehicle_year" not in out:
        out["vehicle_year"] = row["production_year"]
    if "seats" in row and "seating_capacity" not in out:
        out["seating_capacity"] = row["seats"]
    if "prior_claims" in row and "prior_claims_count" not in out:
        out["prior_claims_count"] = row["prior_claims"]
    if "region" in row and "city" not in out:
        out["city"] = row["region"]
    return {k: v for k, v in out.items() if v is not None and str(v).strip() != ""}


@router.get("/sample-csv")
def download_sample_csv(_: User = Depends(get_current_user)):
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(_SAMPLE_COLUMNS)
    w.writerow(
        [
            "DEMO-10001",
            "Sample Holder",
            "Maruti",
            "Swift",
            "2022",
            "1200",
            "5",
            "personal",
            "650000",
            "18500",
            "0",
            "0",
            "false",
            "garage",
            "Mumbai",
            "12000",
            "20",
            "2026-01-01",
            "12",
        ]
    )
    data = buf.getvalue().encode("utf-8")
    return StreamingResponse(
        io.BytesIO(data),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="insureiq_policies_sample.csv"'},
    )


@router.post("/import-csv", response_model=CSVImportResponse)
async def import_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    raw = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(raw))
    except Exception as exc:
        error_response(status.HTTP_400_BAD_REQUEST, "INVALID_CSV", f"Invalid CSV: {exc}")

    imported = 0
    errors: list[dict] = []
    for idx, row in df.iterrows():
        row_index = int(idx) + 2
        try:
            payload_dict = _policy_to_create_dict(row.to_dict())
            payload = PolicyCreate.model_validate(payload_dict)
        except Exception as exc:
            errors.append({"row": row_index, "error": str(exc)})
            continue
        exists = db.query(Policy).filter(Policy.policy_number == payload.policy_number).first()
        if exists:
            errors.append({"row": row_index, "field": "policy_number", "error": "Duplicate policy_number"})
            continue
        now = datetime.utcnow()
        p = Policy(
            user_id=user.id,
            policy_number=payload.policy_number.strip(),
            policyholder_name=payload.policyholder_name,
            vehicle_make=payload.vehicle_make,
            vehicle_model=payload.vehicle_model,
            vehicle_year=payload.vehicle_year,
            engine_cc=payload.engine_cc,
            seating_capacity=payload.seating_capacity,
            vehicle_use=VehicleUse(payload.vehicle_use),
            insured_value=float(payload.insured_value),
            premium_amount=float(payload.premium_amount),
            prior_claims_count=payload.prior_claims_count or 0,
            prior_claim_amount=float(payload.prior_claim_amount),
            anti_theft_device=bool(payload.anti_theft_device),
            parking_type=ParkingType(payload.parking_type),
            city=payload.city,
            annual_mileage_km=payload.annual_mileage_km or 12_000,
            ncb_percentage=float(payload.ncb_percentage),
            policy_start_date=payload.policy_start_date or datetime.utcnow().date(),
            policy_duration_months=payload.policy_duration_months or 12,
            is_active=True,
            created_at=now,
            updated_at=now,
        )
        db.add(p)
        imported += 1
    db.commit()
    return CSVImportResponse(imported=imported, failed=len(errors), errors=errors[:200])


@router.get("", response_model=PolicyListResponse)
def list_policies(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=1000),
    risk_band: str | None = Query(None, description="Filter by latest prediction band (e.g. HIGH)"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    skip = (page - 1) * limit
    rows = PolicyRepository.get_all(db, user.id, skip=skip, limit=limit, risk_band=risk_band)
    total = PolicyRepository.count(db, user.id)
    return PolicyListResponse(
        policies=[PolicyResponse.model_validate(p) for p in rows],
        page=page,
        limit=limit,
        total=total,
    )


@router.post("", response_model=PolicyResponse, status_code=status.HTTP_201_CREATED)
def create_policy(payload: PolicyCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if db.query(Policy).filter(Policy.policy_number == payload.policy_number).first():
        error_response(status.HTTP_400_BAD_REQUEST, "POLICY_ALREADY_EXISTS", "Policy number already exists", "policy_number")
    now = datetime.utcnow()
    row = Policy(
        user_id=user.id,
        policy_number=payload.policy_number.strip(),
        policyholder_name=payload.policyholder_name,
        vehicle_make=payload.vehicle_make,
        vehicle_model=payload.vehicle_model,
        vehicle_year=payload.vehicle_year,
        engine_cc=payload.engine_cc,
        seating_capacity=payload.seating_capacity,
        vehicle_use=VehicleUse(payload.vehicle_use),
        insured_value=float(payload.insured_value),
        premium_amount=float(payload.premium_amount),
        prior_claims_count=payload.prior_claims_count or 0,
        prior_claim_amount=float(payload.prior_claim_amount),
        anti_theft_device=bool(payload.anti_theft_device),
        parking_type=ParkingType(payload.parking_type),
        city=payload.city,
        annual_mileage_km=payload.annual_mileage_km or 12_000,
        ncb_percentage=float(payload.ncb_percentage),
        policy_start_date=payload.policy_start_date or now.date(),
        policy_duration_months=payload.policy_duration_months or 12,
        is_active=True,
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return PolicyResponse.model_validate(row)


@router.get("/{policy_id}/predictions")
def list_policy_predictions(
    policy_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    pol = (
        db.query(Policy)
        .filter(Policy.id == policy_id, Policy.user_id == user.id, Policy.is_active.is_(True))
        .first()
    )
    if not pol:
        error_response(status.HTTP_404_NOT_FOUND, "POLICY_NOT_FOUND", "Policy not found")
    rows = (
        db.query(RiskPrediction)
        .filter(RiskPrediction.policy_id == policy_id)
        .order_by(RiskPrediction.created_at.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "policy_id": r.policy_id,
            "claim_probability": r.claim_probability,
            "risk_score": r.risk_score,
            "risk_band": r.risk_band.value,
            "shap_features": r.shap_features,
            "llm_explanation": r.llm_explanation,
            "model_version": r.model_version,
            "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]


@router.get("/{policy_id}", response_model=PolicyResponse)
def get_policy(policy_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    row = PolicyRepository.get_by_id(db, policy_id, user.id)
    if not row or not row.is_active:
        error_response(status.HTTP_404_NOT_FOUND, "POLICY_NOT_FOUND", "Policy not found")
    
    latest = RiskPredictionRepository.get_latest_for_policy(db, policy_id)
    summary = None
    if latest:
        summary = {
            "id": latest.id,
            "claim_probability": latest.claim_probability,
            "risk_score": latest.risk_score,
            "risk_band": latest.risk_band.value,
            "model_version": latest.model_version,
            "created_at": latest.created_at.isoformat(),
        }
    res = PolicyResponse.model_validate(row)
    res.latest_risk_prediction = summary
    return res


@router.put("/{policy_id}", response_model=PolicyResponse)
def update_policy(
    policy_id: str,
    payload: PolicyUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = PolicyRepository.get_by_id(db, policy_id, user.id)
    if not row or not row.is_active:
        error_response(status.HTTP_404_NOT_FOUND, "POLICY_NOT_FOUND", "Policy not found")

    data = payload.model_dump(exclude_unset=True)
    
    for key, value in data.items():
        if key == "vehicle_use" and value is not None:
            value = VehicleUse(value)
        if key == "parking_type" and value is not None:
            value = ParkingType(value)
        setattr(row, key, value)
    
    row.updated_at = datetime.utcnow()
    # Manual invalidation since we don't have a standalone function anymore
    db.query(RiskPrediction).filter(RiskPrediction.policy_id == policy_id).delete(synchronize_session=False)
    db.commit()
    db.refresh(row)
    return PolicyResponse.model_validate(row)


@router.delete("/{policy_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_policy(
    policy_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    success = PolicyRepository.soft_delete(db, policy_id, user.id)
    if not success:
        error_response(status.HTTP_404_NOT_FOUND, "POLICY_NOT_FOUND", "Policy not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _predict_probability(model, vector) -> float:
    if isinstance(vector, tuple):
        vector = vector[0]
    if model is None:
        return 0.35

    try:
        if hasattr(model, "predict_proba"):
            return float(model.predict_proba(vector)[0][1])
    except Exception:
        pass
    try:
        import xgboost as xgb

        if model.__class__.__name__ == "Booster":
            return float(model.predict(xgb.DMatrix(vector))[0])
    except Exception:
        pass
    raw = float(model.predict(vector)[0])
    return raw / 100.0 if raw > 1 else raw


@router.post("/{policy_id}/run-all")
def run_all_analysis(
    policy_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from backend.agents.graph import insureiq_graph

    row = PolicyRepository.get_by_id(db, policy_id, user.id)
    if not row or not row.is_active:
        error_response(status.HTTP_404_NOT_FOUND, "POLICY_NOT_FOUND", "Policy not found")

    state = {
        "policy_id": row.id,
        "policy_data": {
            "policy_number": row.policy_number,
            "policyholder_name": row.policyholder_name,
            "vehicle_make": row.vehicle_make,
            "vehicle_model": row.vehicle_model,
            "vehicle_year": row.vehicle_year,
            "engine_cc": row.engine_cc,
            "insured_value": row.insured_value,
            "premium_amount": row.premium_amount,
            "prior_claims_count": row.prior_claims_count,
            "city": row.city,
        },
        "user_query": "full_report",
        "messages": [],
        "session_id": f"run-all-{row.id}",
        "_app": request.app,
        "_db": db,
        "_user_id": user.id,
        "_policy": row,
    }

    try:
        final_state = insureiq_graph.invoke(state)
    except Exception:
        final_state = {
            "claim_probability": None,
            "risk_score": None,
            "risk_band": None,
            "shap_features": [],
            "risk_explanation": "Full agent pipeline unavailable. Generated deterministic fallback explanation.",
            "premium_min": None,
            "premium_max": None,
            "premium_narrative": "Premium advisory unavailable. Generated deterministic fallback narrative.",
            "adjustment_factors": [],
            "report_id": None,
            "final_report": "Report generation unavailable. Generated deterministic fallback report.",
        }

    probability = final_state.get("claim_probability")
    if probability is None:
        vector = policy_to_vector(row)
        model = getattr(request.app.state, "model", None)
        probability = max(0.0, min(1.0, _predict_probability(model, vector)))
    risk_score = int(round(float(final_state.get("risk_score") or (probability * 100))))
    risk_band = str(final_state.get("risk_band") or score_to_risk_band_enum(risk_score).value)

    premium_min = final_state.get("premium_min")
    premium_max = final_state.get("premium_max")
    if premium_min is None or premium_max is None:
        base_premium = float(row.premium_amount)
        premium_min = round(base_premium * 0.9, 2)
        premium_max = round(base_premium * 1.2, 2)

    risk_row = RiskPrediction(
        policy_id=row.id,
        user_id=user.id,
        claim_probability=float(probability),
        risk_score=risk_score,
        risk_band=score_to_risk_band_enum(risk_score),
        shap_features=final_state.get("shap_features") or [],
        llm_explanation=final_state.get("risk_explanation") or "",
        model_version="xgb_v1",
        created_at=datetime.utcnow(),
    )
    db.add(risk_row)
    db.commit()

    return {
        "policy_id": row.id,
        "risk": {
            "claim_probability": float(probability),
            "risk_score": risk_score,
            "risk_band": risk_band,
            "shap_features": final_state.get("shap_features") or [],
            "model_version": "xgb_v1",
        },
        "risk_explanation": final_state.get("risk_explanation"),
        "premium": {
            "premium_min": premium_min,
            "premium_max": premium_max,
            "premium_narrative": final_state.get("premium_narrative"),
            "adjustment_factors": final_state.get("adjustment_factors") or [],
        },
        "report": {
            "report_id": final_state.get("report_id"),
            "content": final_state.get("final_report"),
        },
    }
