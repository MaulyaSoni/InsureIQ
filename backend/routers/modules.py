import re
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends

from backend.auth.dependencies import get_current_user
from backend.database.models import User
from backend.schemas.analytics import (
    ApplicationFormTurnRequest,
    ClaimEligibilityTurnRequest,
    PolicyQARequest,
    RiskExplainerRequest,
)

router = APIRouter(prefix="/modules", tags=["modules"], dependencies=[Depends(get_current_user)])

FORM_SESSIONS: dict[str, dict[str, Any]] = {}
CLAIM_SESSIONS: dict[str, dict[str, Any]] = {}

REQUIRED_FORM_FIELDS = ["age", "vehicle_make", "vehicle_model", "vehicle_year", "city", "vehicle_use"]
IMPORTANT_FORM_FIELDS = [
    "engine_cc",
    "prior_claims",
    "ncb_percentage",
    "anti_theft_device",
    "parking_type",
]
OPTIONAL_FORM_FIELDS = ["occupation", "annual_mileage_km", "existing_policy", "idv_value"]
FORM_FIELD_ORDER = REQUIRED_FORM_FIELDS + IMPORTANT_FORM_FIELDS + OPTIONAL_FORM_FIELDS

CLAIM_FIELD_ORDER = [
    "incident_type",
    "coverage_type",
    "date_of_incident",
    "hours_since_incident",
    "at_fault",
    "third_party_involved",
    "police_fir_filed",
    "prior_claims_this_year",
]


def _normalize_bool(value: str) -> bool | None:
    text = value.strip().lower()
    if text in {"yes", "y", "true", "1", "filed", "done"}:
        return True
    if text in {"no", "n", "false", "0", "not filed", "not done"}:
        return False
    return None


def _extract_int(message: str) -> int | None:
    match = re.search(r"(-?\d+)", message)
    return int(match.group(1)) if match else None


def _extract_date(message: str) -> str | None:
    match = re.search(r"\b(\d{4}-\d{2}-\d{2})\b", message)
    return match.group(1) if match else None


def _extract_field_values(message: str) -> dict[str, Any]:
    text = message.strip()
    lower = text.lower()
    out: dict[str, Any] = {}

    age_match = re.search(r"\bage\s*(?:is|:)?\s*(\d{1,2})\b", lower)
    if age_match:
        out["age"] = int(age_match.group(1))

    year_match = re.search(r"\b(19\d{2}|20\d{2})\b", lower)
    if year_match:
        year = int(year_match.group(1))
        if 1995 <= year <= datetime.utcnow().year:
            out["vehicle_year"] = year

    if "engine" in lower and "cc" in lower:
        cc = _extract_int(lower)
        if cc is not None:
            out["engine_cc"] = cc

    if "prior claim" in lower or "claims" in lower:
        claims = _extract_int(lower)
        if claims is not None:
            out["prior_claims"] = max(0, claims)
            out["prior_claims_this_year"] = max(0, claims)

    ncb_match = re.search(r"\bncb\s*(?:is|:)?\s*(\d{1,3})\s*%?", lower)
    if ncb_match:
        out["ncb_percentage"] = max(0, min(100, int(ncb_match.group(1))))

    if "anti theft" in lower or "anti-theft" in lower:
        bool_val = _normalize_bool(lower.replace("anti-theft", "").replace("anti theft", ""))
        if bool_val is not None:
            out["anti_theft_device"] = bool_val

    if "parking" in lower:
        if "street" in lower or "road" in lower:
            out["parking_type"] = "street"
        elif "covered" in lower or "garage" in lower or "basement" in lower:
            out["parking_type"] = "covered"
        elif "open" in lower:
            out["parking_type"] = "open"

    if "city" in lower:
        m = re.search(r"city\s*(?:is|:)?\s*([a-zA-Z ]+)", text, re.IGNORECASE)
        if m:
            out["city"] = m.group(1).strip().title()

    if "vehicle use" in lower or "use" in lower:
        if "commercial" in lower or "taxi" in lower or "cab" in lower:
            out["vehicle_use"] = "commercial"
        elif "personal" in lower:
            out["vehicle_use"] = "personal"

    if "incident" in lower or "accident" in lower or "theft" in lower or "flood" in lower or "fire" in lower:
        if "accident" in lower:
            out["incident_type"] = "accident"
        elif "theft" in lower:
            out["incident_type"] = "theft"
        elif "vandal" in lower:
            out["incident_type"] = "vandalism"
        elif "natural" in lower:
            out["incident_type"] = "natural_disaster"
        elif "flood" in lower:
            out["incident_type"] = "flood"
        elif "fire" in lower:
            out["incident_type"] = "fire"

    if "coverage" in lower or "policy" in lower:
        if "third party" in lower:
            out["coverage_type"] = "third_party_only"
        elif "own damage" in lower:
            out["coverage_type"] = "own_damage"
        elif "comprehensive" in lower:
            out["coverage_type"] = "comprehensive"

    date_val = _extract_date(text)
    if date_val:
        out["date_of_incident"] = date_val

    if "hour" in lower:
        hours = _extract_int(lower)
        if hours is not None:
            out["hours_since_incident"] = max(0, hours)

    if "at fault" in lower:
        bool_val = _normalize_bool(lower.replace("at fault", ""))
        if bool_val is not None:
            out["at_fault"] = bool_val

    if "third party" in lower and ("involved" in lower or "present" in lower):
        bool_val = _normalize_bool(lower.replace("third party", "").replace("involved", ""))
        if bool_val is not None:
            out["third_party_involved"] = bool_val

    if "fir" in lower:
        bool_val = _normalize_bool(lower.replace("fir", ""))
        if bool_val is not None:
            out["police_fir_filed"] = bool_val

    for key, pattern in [
        ("vehicle_make", r"make\s*(?:is|:)?\s*([a-zA-Z0-9 -]+)"),
        ("vehicle_model", r"model\s*(?:is|:)?\s*([a-zA-Z0-9 -]+)"),
        ("occupation", r"occupation\s*(?:is|:)?\s*([a-zA-Z ]+)"),
        ("annual_mileage_km", r"mileage\s*(?:is|:)?\s*(\d{2,7})"),
        ("existing_policy", r"existing policy\s*(?:is|:)?\s*([a-zA-Z0-9 -]+)"),
        ("idv_value", r"idv\s*(?:is|:)?\s*(\d{2,10})"),
    ]:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            out[key] = m.group(1).strip()

    return out


def _next_missing(collected: dict[str, Any], fields: list[str]) -> str | None:
    for field in fields:
        if field not in collected:
            return field
    return None


def _question_for_field(field: str) -> str:
    prompts = {
        "age": "What is your age?",
        "vehicle_make": "What is your vehicle make?",
        "vehicle_model": "What is your vehicle model?",
        "vehicle_year": "What is your vehicle year of manufacture?",
        "city": "Which city is the vehicle registered in?",
        "vehicle_use": "Is the vehicle use personal or commercial?",
        "engine_cc": "What is the engine capacity in cc?",
        "prior_claims": "How many prior claims have you made in the last 3 years?",
        "ncb_percentage": "What is your current NCB percentage?",
        "anti_theft_device": "Do you have an anti-theft device installed? (yes/no)",
        "parking_type": "Where is the vehicle usually parked? (covered/open/street)",
        "occupation": "What is your occupation?",
        "annual_mileage_km": "What is your annual mileage in km?",
        "existing_policy": "Do you have an existing policy number?",
        "idv_value": "What IDV value do you want to declare?",
        "incident_type": "What is the incident type? (accident/theft/vandalism/natural_disaster/fire/flood)",
        "coverage_type": "What is your coverage type? (third_party_only/own_damage/comprehensive)",
        "date_of_incident": "What is the date of incident? (YYYY-MM-DD)",
        "hours_since_incident": "How many hours since the incident occurred?",
        "at_fault": "Were you at fault? (yes/no)",
        "third_party_involved": "Was a third party involved? (yes/no)",
        "police_fir_filed": "Was a police FIR filed? (yes/no)",
        "prior_claims_this_year": "How many prior claims this year?",
    }
    return prompts.get(field, f"Please provide {field}.")


def _validate_form(collected: dict[str, Any]) -> dict[str, str]:
    errors = {}
    if "age" in collected:
        try:
            age = int(collected["age"])
            if age < 18 or age > 80:
                errors["age"] = "Age must be between 18 and 80."
        except Exception:
            errors["age"] = "Age must be a valid number."

    if "vehicle_year" in collected:
        try:
            year = int(collected["vehicle_year"])
            current = datetime.utcnow().year
            if year < 1995 or year > current:
                errors["vehicle_year"] = f"Vehicle year must be between 1995 and {current}."
        except Exception:
            errors["vehicle_year"] = "Vehicle year must be a valid year."

    return errors


def _form_risk_flags(collected: dict[str, Any], raw_message: str) -> list[dict[str, str]]:
    flags: list[dict[str, str]] = []
    lower = raw_message.lower()

    if collected.get("vehicle_use") == "personal" and any(k in lower for k in ["commercial", "taxi", "cab", "delivery", "goods"]):
        flags.append({
            "field": "vehicle_use",
            "reason": "Commercial use indicators detected while vehicle_use is declared personal.",
        })

    prior_claims = collected.get("prior_claims")
    if prior_claims is not None:
        try:
            if int(prior_claims) > 2:
                flags.append({
                    "field": "prior_claims",
                    "reason": "More than 2 prior claims in last 3 years indicates higher underwriting risk.",
                })
        except Exception:
            pass

    year = collected.get("vehicle_year")
    if year is not None:
        try:
            if int(year) < 2005:
                flags.append({
                    "field": "vehicle_year",
                    "reason": "Older vehicle (pre-2005) increases risk exposure.",
                })
        except Exception:
            pass

    unique = []
    seen = set()
    for flag in flags:
        key = (flag["field"], flag["reason"])
        if key not in seen:
            seen.add(key)
            unique.append(flag)
    return unique


@router.post("/application-form/turn")
def module2_application_form_turn(payload: ApplicationFormTurnRequest, _: User = Depends(get_current_user)):
    session = FORM_SESSIONS.setdefault(payload.session_id, {"collected": {}, "flags": []})
    extracted = _extract_field_values(payload.user_message)

    for k, v in extracted.items():
        if k in FORM_FIELD_ORDER:
            session["collected"][k] = v

    validation_errors = _validate_form(session["collected"])
    if validation_errors:
        field = next(iter(validation_errors.keys()))
        if field in session["collected"]:
            del session["collected"][field]
        return {
            "session_id": payload.session_id,
            "status": "INCOMPLETE",
            "message": validation_errors[field],
            "next_question": _question_for_field(field),
        }

    new_flags = _form_risk_flags(session["collected"], payload.user_message)
    existing = {(f["field"], f["reason"]) for f in session["flags"]}
    for flag in new_flags:
        key = (flag["field"], flag["reason"])
        if key not in existing:
            session["flags"].append(flag)
            existing.add(key)

    required_important = REQUIRED_FORM_FIELDS + IMPORTANT_FORM_FIELDS
    missing_required_important = [f for f in required_important if f not in session["collected"]]

    if not missing_required_important:
        missing_optional = [f for f in OPTIONAL_FORM_FIELDS if f not in session["collected"]]
        readiness = "FLAGGED" if session["flags"] else "COMPLETE"
        return {
            "application_summary": session["collected"],
            "missing_fields": missing_optional,
            "risk_flags": session["flags"],
            "readiness": readiness,
        }

    next_field = missing_required_important[0]
    return {
        "session_id": payload.session_id,
        "status": "INCOMPLETE",
        "collected_fields": session["collected"],
        "next_question": _question_for_field(next_field),
    }


def _indian_number(n: float | int) -> str:
    s = str(int(round(float(n))))
    if len(s) <= 3:
        return s
    head = s[:-3]
    tail = s[-3:]
    parts = []
    while len(head) > 2:
        parts.insert(0, head[-2:])
        head = head[:-2]
    if head:
        parts.insert(0, head)
    return ",".join(parts + [tail])


def _feature_title(name: str) -> str:
    return name.replace("_", " ").strip().title()


def _feature_value_to_text(feature_name: str, value: Any) -> str:
    if isinstance(value, (int, float)):
        if any(k in feature_name.lower() for k in ["premium", "idv", "amount", "value"]):
            return f"₹{_indian_number(value)}"
        return str(value)
    return str(value)


def _format_shap_for_grok(features: list) -> str:
    if not features:
        return "No feature data available"
    lines = []
    for f in features[:5]:
        name = f.get("plain_name", f.get("feature_name", "unknown"))
        direction = "increases risk" if f.get("direction") == "increases_risk" else "reduces risk"
        value = f.get("feature_value", "N/A")
        lines.append(f"- {name}: value={value}, impact={direction}")
    return "\n".join(lines) if lines else "No feature data available"


@router.post("/risk-score-explainer")
def module3_risk_explainer(payload: RiskExplainerRequest, _: User = Depends(get_current_user)):
    from backend.llm.groq_client import invoke_llm
    from backend.llm.prompts import RISK_EXPLAINER_PROMPT

    shap_formatted = _format_shap_for_grok(payload.shap_features)

    prompt = RISK_EXPLAINER_PROMPT.format(
        risk_score=payload.risk_score,
        risk_band=payload.risk_band,
        claim_probability_pct=round(payload.claim_probability * 100, 2),
        shap_features_formatted=shap_formatted,
    )

    explanation = invoke_llm("reasoner", "", prompt)
    return {"explanation": explanation}



def _extract_topic(question: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9 ]", "", question.lower()).strip()
    return cleaned if cleaned else "the requested topic"


def _find_best_clause(chunks: str, question: str) -> tuple[str | None, str | None, str | None]:
    lines = [l.strip() for l in chunks.splitlines() if l.strip()]
    if not lines:
        return None, None, None

    q_terms = [t for t in re.findall(r"[a-zA-Z]+", question.lower()) if len(t) > 2]
    best_line = None
    best_score = -1

    for line in lines:
        l = line.lower()
        score = sum(1 for t in q_terms if t in l)
        if score > best_score:
            best_score = score
            best_line = line

    if best_score <= 0:
        return None, None, None

    section = "Section not specified"
    page = "Page not specified"

    section_match = re.search(r"(section\s+[a-zA-Z0-9. -]+)", best_line, re.IGNORECASE)
    if section_match:
        section = section_match.group(1).strip()

    page_match = re.search(r"(page\s+\d+)", best_line, re.IGNORECASE)
    if page_match:
        page = page_match.group(1).strip()

    quote = best_line[:60]
    return quote, section, page


@router.post("/policy-pdf-qa")
def module5_policy_pdf_qa(payload: PolicyQARequest, _: User = Depends(get_current_user)):
    quote, section, page = _find_best_clause(payload.retrieved_chunks, payload.user_question)

    if not quote:
        topic = _extract_topic(payload.user_question)
        exact = (
            f"This policy document does not explicitly address {topic}. "
            "Please contact your insurer's customer care or refer to the "
            "policy schedule attached to your policy bond."
        )
        return {
            "response": exact,
            "formatted": (
                f"ANSWER: {exact}\n"
                'SOURCE CLAUSE: "Not available in retrieved context." — Section not specified, Page not specified\n'
                "NOTE: No matching clause found in retrieved chunks."
            ),
        }

    answer = "Based on the retrieved policy clause, this item is addressed as stated below."
    note = "Please review nearby exclusions and conditions in the same section before finalizing claim decisions."
    formatted = (
        f"ANSWER: {answer}\n"
        f'SOURCE CLAUSE: "{quote}" — {section}, {page}\n'
        f"NOTE: {note}"
    )
    return {"response": formatted}


def _normalize_claim_values(collected: dict[str, Any], expected_field: str, message: str) -> dict[str, Any]:
    out = _extract_field_values(message)
    if expected_field in {"at_fault", "third_party_involved", "police_fir_filed"} and expected_field not in out:
        parsed = _normalize_bool(message)
        if parsed is not None:
            out[expected_field] = parsed

    if expected_field in {"hours_since_incident", "prior_claims_this_year"} and expected_field not in out:
        val = _extract_int(message)
        if val is not None:
            out[expected_field] = max(0, val)

    if expected_field == "date_of_incident" and expected_field not in out:
        dt = _extract_date(message)
        if dt:
            out[expected_field] = dt

    if expected_field in {"incident_type", "coverage_type"} and expected_field not in out:
        out[expected_field] = message.strip().lower().replace(" ", "_")

    return out


def _assess_claim(collected: dict[str, Any]) -> dict[str, Any]:
    incident = collected["incident_type"]
    coverage = collected["coverage_type"]
    hours = int(collected["hours_since_incident"])
    at_fault = bool(collected["at_fault"])
    third_party = bool(collected["third_party_involved"])
    fir = bool(collected["police_fir_filed"])

    rejection_risks: list[str] = []
    documents_required = ["Duly filled claim form", "RC copy", "Driving license", "Policy copy", "Photographs of damage"]
    ncb_impact = "Not applicable"

    claim_type = "own_damage"
    eligible = True
    reason = "Claim appears eligible subject to policy terms and surveyor assessment."

    if coverage == "third_party_only" and incident in {"accident", "fire", "flood", "vandalism", "natural_disaster"}:
        if third_party:
            claim_type = "third_party"
            reason = "Third-party-only cover applies to damage/injury caused to others, not own vehicle damage."
            ncb_impact = "NCB protected" if not at_fault else "NCB lost"
        else:
            claim_type = "not_eligible"
            eligible = False
            reason = "Third-party-only cover does not pay for own vehicle damage without third-party liability."

    if incident == "theft":
        claim_type = "theft"
        documents_required.extend(["Original FIR copy", "Final police report", "All keys submission"])
        if not fir:
            rejection_risks.append("FIR not filed for theft claim")
        if hours > 24:
            rejection_risks.append("Delayed intimation beyond 24 hours for theft")
        reason = "Theft claims require FIR and timely insurer intimation to remain admissible."

    if incident in {"flood", "natural_disaster"}:
        if coverage != "comprehensive":
            claim_type = "not_eligible"
            eligible = False
            reason = "Flood/natural disaster damage generally needs comprehensive cover with RSMD add-on."
        else:
            rejection_risks.append("Coverage may depend on RSMD add-on availability")

    if hours > 48:
        rejection_risks.append("Delayed intimation beyond 48 hours may trigger rejection risk")

    if at_fault and eligible and claim_type in {"own_damage", "third_party"}:
        ncb_impact = "NCB lost"
    elif not at_fault and claim_type == "third_party":
        ncb_impact = "NCB protected"

    if claim_type == "theft":
        ncb_impact = "NCB lost"

    if any("RSMD" in r or "Delayed" in r or "FIR" in r for r in rejection_risks):
        risk_level = "HIGH" if len(rejection_risks) >= 2 else "MEDIUM"
    else:
        risk_level = "LOW"

    if not eligible and risk_level == "LOW":
        risk_level = "HIGH"

    estimated_map = {
        "own_damage": "₹15,000 – ₹2,50,000 (subject to surveyor assessment)",
        "third_party": "₹25,000 – ₹5,00,000 (subject to tribunal/surveyor assessment)",
        "theft": "₹1,00,000 – ₹10,00,000 (subject to IDV and depreciation terms)",
        "total_loss": "₹1,50,000 – ₹15,00,000 (subject to IDV and salvage terms)",
        "not_eligible": "₹0 – ₹0 (subject to surveyor assessment)",
    }

    next_steps = [
        "Step 1: Notify insurer and register claim immediately.",
        "Step 2: Submit required documents and incident evidence.",
        "Step 3: Coordinate survey and follow claim tracking updates.",
    ]

    return {
        "claim_type": claim_type,
        "eligible": eligible,
        "eligibility_reason": reason,
        "risk_of_rejection": risk_level,
        "rejection_risks": rejection_risks,
        "documents_required": documents_required,
        "ncb_impact": ncb_impact,
        "estimated_claim_range": estimated_map[claim_type],
        "next_steps": next_steps,
    }


@router.post("/claim-eligibility/turn")
def module6_claim_eligibility_turn(payload: ClaimEligibilityTurnRequest, _: User = Depends(get_current_user)):
    session = CLAIM_SESSIONS.setdefault(payload.session_id, {"collected": {}, "phase": "GATHER"})
    collected = session["collected"]

    expected = _next_missing(collected, CLAIM_FIELD_ORDER)
    extracted = _normalize_claim_values(collected, expected or "", payload.user_message)

    for field in CLAIM_FIELD_ORDER:
        if field in extracted:
            collected[field] = extracted[field]

    missing = [f for f in CLAIM_FIELD_ORDER if f not in collected]
    if missing:
        next_field = missing[0]
        return {
            "session_id": payload.session_id,
            "phase": "GATHER",
            "next_question": _question_for_field(next_field),
            "collected": collected,
        }

    session["phase"] = "ASSESS"
    return _assess_claim(collected)
