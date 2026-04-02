from backend.database.models import RiskBandEnum

def probability_to_risk_score(prob: float) -> int:
    p = max(0.0, min(1.0, prob))
    return int(round(p * 100))


def risk_score_to_band(score: int) -> str:
    s = max(0, min(100, score))
    if s <= 30:
        return "LOW"
    if s <= 60:
        return "MEDIUM"
    if s <= 80:
        return "HIGH"
    return "CRITICAL"


def risk_score_to_band_enum(score: int) -> RiskBandEnum:
    mapping = {
        "LOW": RiskBandEnum.LOW,
        "MEDIUM": RiskBandEnum.MEDIUM,
        "HIGH": RiskBandEnum.HIGH,
        "CRITICAL": RiskBandEnum.CRITICAL,
    }
    return mapping[risk_score_to_band(score)]


def band_to_frontend_lowercase(band: str) -> str:
    return band.lower()


def get_risk_context(band: str) -> str:
    b = band.upper()
    return {
        "LOW": "Risk is relatively low; claims likelihood below typical portfolio average.",
        "MEDIUM": "Moderate risk profile; underwriting may apply standard loadings.",
        "HIGH": "Elevated risk; detailed review and possible premium loading recommended.",
        "CRITICAL": "Very high risk; referral or restricted coverage may be required.",
    }.get(b, "Risk band could not be classified.")
