// ============================================================
// InsureIQ Core Types
// All types are designed to match Vishleshak AI's data contracts
// ============================================================

export type RiskBand = "low" | "medium" | "high" | "critical";

export type VehicleType = "sedan" | "suv" | "hatchback" | "truck" | "two_wheeler" | "commercial";

export type UsageType = "personal" | "commercial" | "taxi" | "fleet";

export type ClaimStatus = "pending" | "approved" | "rejected" | "under_review";

export type AgentType = "risk_scoring" | "explainer" | "premium_advisor" | "report_writer";

// --- Policy ---
export interface Policy {
  id: string;
  policy_number: string;
  holder_name: string;
  vehicle_type: VehicleType;
  vehicle_make: string;
  vehicle_model: string;
  production_year: number;
  engine_cc: number;
  seats: number;
  insured_value: number;
  premium_amount: number;
  usage_type: UsageType;
  prior_claims: number;
  region: string;
  created_at: string;
  updated_at: string;
}

// --- Risk Assessment ---
export interface RiskAssessment {
  id: string;
  policy_id: string;
  risk_score: number; // 0-100
  risk_band: RiskBand;
  claim_probability: number; // 0-1
  top_features: SHAPFeature[];
  explanation: string; // LLM-generated
  agent_type: AgentType;
  created_at: string;
}

export interface SHAPFeature {
  feature_name: string;
  shap_value: number;
  feature_value: number | string;
  direction: "positive" | "negative";
}

// --- Claim Prediction ---
export interface ClaimPrediction {
  id: string;
  policy_id: string;
  claim_probability: number;
  predicted_claim_amount: number;
  confidence_interval: { lower: number; upper: number };
  risk_factors: string[];
  model_version: string;
  created_at: string;
}

// --- Premium Advisory ---
export interface PremiumAdvisory {
  id: string;
  policy_id: string;
  current_premium: number;
  recommended_premium: number;
  premium_range: { min: number; max: number };
  adjustment_factors: PremiumFactor[];
  justification: string; // LLM-generated
  created_at: string;
}

export interface PremiumFactor {
  factor_name: string;
  impact: number; // percentage impact
  direction: "increase" | "decrease";
  description: string;
}

// --- Reports ---
export interface UnderwritingReport {
  id: string;
  policy_id: string;
  risk_assessment: RiskAssessment;
  claim_prediction: ClaimPrediction;
  premium_advisory: PremiumAdvisory;
  summary: string;
  recommendation: "approve" | "review" | "reject";
  generated_at: string;
}

// --- Audit Log ---
export interface AuditLogEntry {
  id: string;
  action: string;
  entity_type: "policy" | "risk_assessment" | "claim_prediction" | "premium_advisory" | "report";
  entity_id: string;
  user_id: string;
  details: string;
  timestamp: string;
}

// --- Batch Analysis ---
export interface BatchJob {
  id: string;
  name: string;
  total_policies: number;
  processed: number;
  status: "queued" | "processing" | "completed" | "failed";
  results_summary?: BatchSummary;
  created_at: string;
  completed_at?: string;
}

export interface BatchSummary {
  avg_risk_score: number;
  risk_distribution: Record<RiskBand, number>;
  avg_claim_probability: number;
  total_insured_value: number;
  total_premium: number;
  high_risk_count: number;
}

// --- API Integration (Vishleshak AI) ---
export interface VishleshakAPIConfig {
  base_url: string;
  api_key?: string;
  timeout_ms: number;
  retry_count: number;
}

export interface VishleshakRequest {
  agent_type: AgentType;
  policy_data: Partial<Policy>;
  options?: {
    include_shap?: boolean;
    include_explanation?: boolean;
    model_version?: string;
  };
}

export interface VishleshakResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    retry_after?: number;
  };
  metadata?: {
    processing_time_ms: number;
    model_version: string;
    agent_type: AgentType;
  };
}

// --- Dashboard Stats ---
export interface DashboardStats {
  total_policies: number;
  total_assessed: number;
  avg_risk_score: number;
  high_risk_percentage: number;
  total_insured_value: number;
  total_premium: number;
  claims_predicted: number;
  reports_generated: number;
}
