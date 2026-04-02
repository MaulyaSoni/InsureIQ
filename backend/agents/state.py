from typing import TypedDict, Optional, List, Dict, Any, Literal

RiskBand = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
RouteType = Literal["risk_only", "risk_and_explain", "premium", "full_report", "explain_only"]

class SHAPFeature(TypedDict):
    feature_name: str
    plain_name: str
    shap_value: float
    feature_value: Any
    direction: str

class InsureIQState(TypedDict, total=False):
    policy_id: str
    policy_data: Dict[str, Any]
    user_query: Optional[str]
    route: Optional[RouteType]
    claim_probability: Optional[float]
    risk_score: Optional[int]
    risk_band: Optional[RiskBand]
    shap_features: Optional[List[SHAPFeature]]
    risk_explanation: Optional[str]
    premium_min: Optional[float]
    premium_max: Optional[float]
    premium_narrative: Optional[str]
    adjustment_factors: Optional[List[Dict]]
    final_report: Optional[str]
    report_id: Optional[str]
    retrieved_context: Optional[str]
    error: Optional[str]
    messages: List[Dict]
    session_id: str

