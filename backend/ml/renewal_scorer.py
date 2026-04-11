from dataclasses import dataclass
from datetime import date
from typing import Literal


@dataclass
class RenewalScore:
    lapse_probability: float
    risk_change_flag: bool
    renewal_recommendation: Literal["RETAIN", "REPRICE", "LET_LAPSE", "REVIEW"]
    recommended_premium_change_pct: float
    reasons: list[str]


def renewal_risk_score(
    policy,
    risk_prediction=None,
) -> RenewalScore:
    reasons: list[str] = []
    lapse_prob = 0.3
    risk_change_flag = False
    current_year = date.today().year

    vehicle_age_at_renewal = current_year - policy.vehicle_year + 1

    if vehicle_age_at_renewal > 10:
        risk_change_flag = True
        reasons.append(f"Vehicle age ({vehicle_age_at_renewal} years at renewal) increases risk")

    if policy.annual_mileage_km > 35000:
        risk_change_flag = True
        reasons.append(f"High annual mileage ({policy.annual_mileage_km} km) increases risk at renewal")

    if risk_prediction:
        risk_band = risk_prediction.risk_band.value if hasattr(risk_prediction.risk_band, 'value') else str(risk_prediction.risk_band)
        risk_score = risk_prediction.risk_score

        if risk_band == "CRITICAL" and policy.prior_claims_count > 1:
            lapse_prob = 0.85
            reasons.append("CRITICAL band + multiple prior claims = likely non-renewal due to premium increase")
        elif risk_band == "CRITICAL":
            lapse_prob = 0.65
            reasons.append("CRITICAL risk band may trigger significant premium increase at renewal")

        if risk_band == "HIGH" and policy.prior_claims_count > 1:
            lapse_prob = 0.70
            reasons.append("HIGH band + prior claims = moderate non-renewal risk")

        if risk_band == "LOW" and policy.prior_claims_count == 0 and policy.policy_duration_months > 12:
            lapse_prob = 0.15
            reasons.append("LOW risk + clean record + long tenure = high retention likelihood")
    else:
        if policy.prior_claims_count == 0:
            lapse_prob = 0.25
        else:
            lapse_prob = 0.55

    if policy.ncb_percentage > 40:
        reasons.append(f"High NCB ({policy.ncb_percentage}%) — customer may shop around for better deals")

    if policy.ncb_percentage > 40 and (not risk_prediction or (hasattr(risk_prediction.risk_band, 'value') and risk_prediction.risk_band.value == "LOW")):
        lapse_prob = max(lapse_prob, 0.40)
        reasons.append("Good NCB + LOW risk = retention opportunity, consider loyalty discount")

    if policy.annual_mileage_km > 40000:
        lapse_prob = min(lapse_prob + 0.10, 0.95)
        reasons.append("Very high mileage may indicate commercial use misdeclaration risk")

    risk_band_for_premium = "MEDIUM"
    if risk_prediction:
        risk_band_for_premium = risk_prediction.risk_band.value if hasattr(risk_prediction.risk_band, 'value') else str(risk_prediction.risk_band)

    if risk_band_for_premium == "CRITICAL":
        premium_change_pct = 25.0
        renewal_rec = "REPRICE"
        reasons.append("CRITICAL band: recommend repricing at +25-50%")
    elif risk_band_for_premium == "HIGH":
        premium_change_pct = 15.0
        renewal_rec = "REPRICE"
        reasons.append("HIGH band: recommend repricing at +10-25%")
    elif risk_band_for_premium == "MEDIUM":
        premium_change_pct = 5.0
        renewal_rec = "RETAIN"
        reasons.append("MEDIUM band: minor adjustment recommended")
    else:
        if policy.ncb_percentage > 40:
            premium_change_pct = -5.0
            renewal_rec = "RETAIN"
            reasons.append("LOW risk with good NCB: consider -5% loyalty discount")
        else:
            premium_change_pct = 0.0
            renewal_rec = "RETAIN"

    if lapse_prob > 0.7:
        renewal_rec = "LET_LAPSE"
        reasons.append("High lapse probability — consider letting policy lapse or aggressive retention offer")
    elif lapse_prob > 0.5 and renewal_rec == "RETAIN":
        renewal_rec = "REVIEW"
        reasons.append("Moderate lapse risk — review and potentially proactively contact policyholder")

    return RenewalScore(
        lapse_probability=round(lapse_prob, 3),
        risk_change_flag=risk_change_flag,
        renewal_recommendation=renewal_rec,
        recommended_premium_change_pct=premium_change_pct,
        reasons=reasons,
    )
