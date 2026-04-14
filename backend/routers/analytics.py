from datetime import datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.auth import get_current_user
from backend.database.db import get_db
from backend.database.models import Policy, RiskPrediction, User
from backend.llm.cache import make_cache_key, get_cached, set_cached
from backend.llm.groq_client import invoke_llm

router = APIRouter(prefix="/analytics", tags=["analytics"], dependencies=[Depends(get_current_user)])

CITY_COORDS: dict[str, tuple[float, float]] = {
    "mumbai": (19.076, 72.877),
    "delhi": (28.704, 77.102),
    "bengaluru": (12.972, 77.594),
    "chennai": (13.083, 80.270),
    "hyderabad": (17.385, 78.487),
    "pune": (18.520, 73.855),
    "kolkata": (22.573, 88.363),
    "ahmedabad": (23.021, 72.579),
    "jaipur": (26.912, 75.787),
    "lucknow": (26.846, 80.946),
    "chandigarh": (30.733, 76.779),
    "kochi": (9.931, 76.267),
    "indore": (22.720, 75.858),
    "nagpur": (21.146, 79.083),
    "bhopal": (23.259, 77.412),
    "patna": (25.594, 85.138),
    "ranchi": (23.344, 85.310),
    "guwahati": (26.144, 91.736),
    "srinagar": (34.083, 74.797),
    "mysore": (12.295, 76.639),
}

METRO_CITIES = {"mumbai", "delhi", "bengaluru", "chennai", "hyderabad", "pune", "kolkata"}
TIER2_CITIES = {"ahmedabad", "jaipur", "lucknow", "chandigarh", "kochi", "indore"}


def _get_latest_predictions(db: Session, user: User) -> list[RiskPrediction]:
    policy_ids_sub = db.query(Policy.id).filter(
        Policy.user_id == user.id, Policy.is_active.is_(True)
    )
    latest_sub = (
        db.query(
            RiskPrediction.policy_id,
            func.max(RiskPrediction.created_at).label("max_created"),
        )
        .filter(RiskPrediction.policy_id.in_(policy_ids_sub))
        .group_by(RiskPrediction.policy_id)
        .subquery()
    )
    return (
        db.query(RiskPrediction)
        .join(
            latest_sub,
            (RiskPrediction.policy_id == latest_sub.c.policy_id)
            & (RiskPrediction.created_at == latest_sub.c.max_created),
        )
        .join(Policy, RiskPrediction.policy_id == Policy.id)
        .filter(RiskPrediction.policy_id.in_(policy_ids_sub))
        .all()
    )


def _compute_segment_key(policy: Policy, segment_by: str) -> str:
    if segment_by == "vehicle_type":
        return f"{policy.vehicle_make} {policy.vehicle_model}"
    if segment_by == "vehicle_use":
        return policy.vehicle_use.value.title()
    if segment_by == "city_tier":
        city_l = policy.city.lower()
        if city_l in METRO_CITIES:
            return "Metro"
        if city_l in TIER2_CITIES:
            return "Tier-2"
        return "Tier-3"
    if segment_by == "vehicle_year_range":
        year = policy.vehicle_year
        if year >= 2023:
            return "2023-2025"
        if year >= 2018:
            return "2018-2022"
        if year >= 2013:
            return "2013-2017"
        return "Pre-2013"
    if segment_by == "engine_cc_range":
        cc = policy.engine_cc
        if cc >= 2000:
            return "2000cc+"
        if cc >= 1500:
            return "1500-1999cc"
        if cc >= 1000:
            return "1000-1499cc"
        return "<1000cc"
    if segment_by == "parking_type":
        return policy.parking_type.value.title()
    if segment_by == "ncb_band":
        ncb = policy.ncb_percentage
        if ncb >= 50:
            return "NCB 50%+"
        if ncb >= 25:
            return "NCB 25-49%"
        return "NCB 0-24%"
    return "Other"


def compute_segment_breakdown(db: Session, user: User, segment_by: str = "vehicle_type") -> list[dict]:
    latest_preds = _get_latest_predictions(db, user)

    segments: dict[str, dict] = {}
    for pred in latest_preds:
        key = _compute_segment_key(pred.policy, segment_by)
        if key not in segments:
            segments[key] = {
                "segment_label": key,
                "policy_count": 0,
                "total_risk_score": 0.0,
                "total_claim_prob": 0.0,
                "total_premium": 0.0,
                "shap_counter": {},
            }
        s = segments[key]
        s["policy_count"] += 1
        s["total_risk_score"] += float(pred.risk_score)
        s["total_claim_prob"] += float(pred.claim_probability)
        s["total_premium"] += float(pred.policy.premium_amount)
        if pred.shap_features:
            top = pred.shap_features[0]
            fname = top.get("feature_name", "unknown")
            s["shap_counter"][fname] = s["shap_counter"].get(fname, 0) + 1

    result = []
    for key, s in segments.items():
        count = s["policy_count"]
        top_shap = max(s["shap_counter"], key=s["shap_counter"].get) if s["shap_counter"] else None
        result.append({
            "segment_label": s["segment_label"],
            "policy_count": count,
            "avg_risk_score": round(s["total_risk_score"] / count, 1),
            "claim_rate": round(s["total_claim_prob"] / count * 100, 1),
            "avg_premium": round(s["total_premium"] / count, 0),
            "top_shap_factor": top_shap,
        })

    result.sort(key=lambda x: x["avg_risk_score"], reverse=True)
    return result


def compute_risk_concentration(db: Session, user: User) -> list[dict]:
    latest_preds = _get_latest_predictions(db, user)

    concentration: dict[tuple[str, str], dict] = {}
    for pred in latest_preds:
        city = pred.policy.city.lower()
        use = pred.policy.vehicle_use.value
        key = (city, use)
        if key not in concentration:
            concentration[key] = {"city": pred.policy.city.title(), "use": pred.policy.vehicle_use.value.title(), "total_prob": 0.0, "count": 0}
        concentration[key]["total_prob"] += float(pred.claim_probability)
        concentration[key]["count"] += 1

    result = []
    for (city, use), data in concentration.items():
        avg_prob = data["total_prob"] / data["count"]
        result.append({
            "city": data["city"],
            "vehicle_use": data["use"],
            "policy_count": data["count"],
            "avg_claim_probability": round(avg_prob * 100, 2),
            "alert": "HIGH" if avg_prob > 0.5 else "MEDIUM" if avg_prob > 0.35 else "LOW",
        })

    result.sort(key=lambda x: x["avg_claim_probability"], reverse=True)
    return result[:10]


@router.get("/geo-heatmap")
def geo_heatmap(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        cache_key = make_cache_key(user.id, "geo_heatmap", "v1")
        cached = get_cached(cache_key, db)
        if cached:
            import json
            try:
                return json.loads(cached)
            except Exception:
                pass

        latest_preds = _get_latest_predictions(db, user)

        city_data: dict[str, dict] = {}
        for pred in latest_preds:
            city_key = (pred.policy.city or "unknown").lower()
            if city_key not in city_data:
                lat, lng = CITY_COORDS.get(city_key, (0.0, 0.0))
                city_data[city_key] = {
                    "city": (pred.policy.city or "Unknown").title(),
                    "state": "India",
                    "lat": lat,
                    "lng": lng,
                    "policy_count": 0,
                    "total_risk_score": 0.0,
                    "critical_count": 0,
                    "high_count": 0,
                    "total_claim_prob": 0.0,
                }
            cd = city_data[city_key]
            cd["policy_count"] += 1
            cd["total_risk_score"] += float(pred.risk_score or 0)
            cd["total_claim_prob"] += float(pred.claim_probability or 0)
            band_upper = str(pred.risk_band.value or "LOW").upper()
            if band_upper == "CRITICAL":
                cd["critical_count"] += 1
            if band_upper in ("HIGH", "CRITICAL"):
                cd["high_count"] += 1

        result = []
        for city, cd in city_data.items():
            count = cd["policy_count"] or 1
            result.append({
                "city": cd["city"],
                "state": cd["state"],
                "lat": cd["lat"],
                "lng": cd["lng"],
                "policy_count": count,
                "avg_risk_score": round(cd["total_risk_score"] / count, 1),
                "critical_count": cd["critical_count"],
                "high_rate_pct": round(cd["high_count"] / count * 100, 1),
                "avg_claim_probability": round(cd["total_claim_prob"] / count, 4),
            })

        result.sort(key=lambda x: x["avg_risk_score"], reverse=True)
        try:
            import json
            set_cached(cache_key, json.dumps(result), "analytics", 6, db)
        except Exception:
            pass
        return result
    except Exception as e:
        import logging
        logging.getLogger("insureiq").error("Analytics 500: %s", e)
        return []


@router.get("/segment-breakdown")
def segment_breakdown(
    segment_by: str = Query(default="vehicle_type"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        return compute_segment_breakdown(db, user, segment_by)
    except Exception:
        return []


@router.get("/risk-concentration")
def risk_concentration(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        return compute_risk_concentration(db, user)
    except Exception:
        return []


INSIGHTS_PROMPT = """You are a senior portfolio risk analyst. Given this segment breakdown data for an insurance portfolio,
write a 3-paragraph portfolio intelligence summary for underwriters.

Paragraph 1 — Risk Overview: Identify the highest-risk segments and concentration risks.
Paragraph 2 — Actionable Recommendations: What should the underwriter do differently based on this data?
Paragraph 3 — Early Warning: What emerging trends should they watch in the next 30-60 days?

Data: {segment_data}

Format: Return ONLY the 3 paragraphs. No headers. No bullet points. Plain professional language."""


@router.get("/insights")
def portfolio_insights(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        segments = compute_segment_breakdown(db, user, "vehicle_type")
        concentrations = compute_risk_concentration(db, user)

        cache_key = make_cache_key(user.id, "portfolio_insights_v2", "llama-3.3-70b-versatile")
        cached = get_cached(cache_key, db)
        if cached:
            return {"insights": cached}

        data_summary = f"Top segments by risk score: {', '.join(s['segment_label'] + '(' + str(s['avg_risk_score']) + ')' for s in segments[:5])}."
        if concentrations:
            data_summary += f" Top concentration: {concentrations[0]['city']} + {concentrations[0]['vehicle_use']} at {concentrations[0]['avg_claim_probability']}% claim probability."

        # invoke_llm now returns fallback string on error, but we still wrap just in case
        insights = invoke_llm("reasoner", INSIGHTS_PROMPT.format(segment_data=data_summary), "")
        try:
            set_cached(cache_key, insights, "llama-3.3-70b-versatile", 6, db)
        except Exception:
            pass
        return {"insights": insights}
    except Exception as e:
        return {"insights": f"Portfolio intelligence engine is currently refreshing. Please check back in a few minutes. (Reason: {str(e)})"}


@router.get("/audit-log")
def get_audit_log(
    limit: int = Query(default=50, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from backend.database.models import AuditLog
    logs = (
        db.query(AuditLog)
        .filter(AuditLog.user_id == user.id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": log.id,
            "user_id": log.user_id,
            "action": log.action,
            "entity_type": log.resource_type,
            "entity_id": log.resource_id,
            "details": log.payload_hash,
            "timestamp": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]
