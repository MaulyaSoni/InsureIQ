// ============================================================
// InsureIQ API Service Layer
// This module provides the integration interface for Vishleshak AI.
// Currently uses mock data. Replace function bodies with real API calls.
//
// INTEGRATION GUIDE:
// 1. Set VISHLESHAK_BASE_URL to your Vishleshak AI endpoint
// 2. Each function maps to a Vishleshak agent endpoint
// 3. Request/Response types match Vishleshak's Pydantic schemas
// ============================================================

import type {
  Policy,
  RiskAssessment,
  ClaimPrediction,
  PremiumAdvisory,
  UnderwritingReport,
  AuditLogEntry,
  BatchJob,
  DashboardStats,
  VishleshakAPIConfig,
  VishleshakRequest,
  VishleshakResponse,
  RiskBand,
  SHAPFeature,
} from "@/types/insurance";
import { notifyRiskComplete, notifyReportReady, notifyBatchComplete } from "@/lib/notifications";

// --- Configuration ---
// TODO: Move to environment variable or Supabase secrets
const DEFAULT_CONFIG: VishleshakAPIConfig = {
  base_url: "https://vishleshak-ai.streamlit.app/api", // Replace with actual endpoint
  timeout_ms: 30000,
  retry_count: 3,
};

let config: VishleshakAPIConfig = { ...DEFAULT_CONFIG };

export function setVishleshakConfig(newConfig: Partial<VishleshakAPIConfig>) {
  config = { ...config, ...newConfig };
}

export function getVishleshakConfig(): VishleshakAPIConfig {
  return { ...config };
}

// --- Generic API caller (ready for Vishleshak integration) ---
async function callVishleshakAPI<T>(
  endpoint: string,
  request: VishleshakRequest
): Promise<VishleshakResponse<T>> {
  // TODO: Replace with actual fetch call to Vishleshak AI
  // Example implementation:
  // const response = await fetch(`${config.base_url}${endpoint}`, {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json",
  //     ...(config.api_key ? { Authorization: `Bearer ${config.api_key}` } : {}),
  //   },
  //   body: JSON.stringify(request),
  //   signal: AbortSignal.timeout(config.timeout_ms),
  // });
  // return response.json();

  console.log(`[InsureIQ] API call to ${endpoint}`, request);
  throw new Error("Vishleshak AI not connected. Configure base_url.");
}

// ============================================================
// POLICY MANAGEMENT
// ============================================================

const MOCK_POLICIES: Policy[] = [
  {
    id: "pol-001", policy_number: "INS-2024-001", holder_name: "Rajesh Kumar",
    vehicle_type: "sedan", vehicle_make: "Maruti", vehicle_model: "Ciaz",
    production_year: 2021, engine_cc: 1462, seats: 5, insured_value: 850000,
    premium_amount: 12500, usage_type: "personal", prior_claims: 0,
    region: "Maharashtra", created_at: "2024-01-15", updated_at: "2024-01-15",
  },
  {
    id: "pol-002", policy_number: "INS-2024-002", holder_name: "Priya Sharma",
    vehicle_type: "suv", vehicle_make: "Hyundai", vehicle_model: "Creta",
    production_year: 2022, engine_cc: 1497, seats: 5, insured_value: 1200000,
    premium_amount: 18000, usage_type: "personal", prior_claims: 1,
    region: "Delhi", created_at: "2024-02-10", updated_at: "2024-02-10",
  },
  {
    id: "pol-003", policy_number: "INS-2024-003", holder_name: "Amit Patel",
    vehicle_type: "truck", vehicle_make: "Tata", vehicle_model: "Ace",
    production_year: 2019, engine_cc: 798, seats: 2, insured_value: 550000,
    premium_amount: 22000, usage_type: "commercial", prior_claims: 3,
    region: "Gujarat", created_at: "2024-03-05", updated_at: "2024-03-05",
  },
  {
    id: "pol-004", policy_number: "INS-2024-004", holder_name: "Sneha Reddy",
    vehicle_type: "hatchback", vehicle_make: "Maruti", vehicle_model: "Swift",
    production_year: 2023, engine_cc: 1197, seats: 5, insured_value: 750000,
    premium_amount: 9500, usage_type: "personal", prior_claims: 0,
    region: "Karnataka", created_at: "2024-03-20", updated_at: "2024-03-20",
  },
  {
    id: "pol-005", policy_number: "INS-2024-005", holder_name: "Mohammed Ali",
    vehicle_type: "two_wheeler", vehicle_make: "Royal Enfield", vehicle_model: "Classic 350",
    production_year: 2022, engine_cc: 349, seats: 2, insured_value: 210000,
    premium_amount: 4500, usage_type: "personal", prior_claims: 1,
    region: "Tamil Nadu", created_at: "2024-04-12", updated_at: "2024-04-12",
  },
  {
    id: "pol-006", policy_number: "INS-2024-006", holder_name: "Kavita Singh",
    vehicle_type: "suv", vehicle_make: "Toyota", vehicle_model: "Fortuner",
    production_year: 2020, engine_cc: 2755, seats: 7, insured_value: 3200000,
    premium_amount: 45000, usage_type: "personal", prior_claims: 2,
    region: "Uttar Pradesh", created_at: "2024-05-01", updated_at: "2024-05-01",
  },
];

export async function getPolicies(): Promise<Policy[]> {
  // TODO: Replace with Supabase query: supabase.from('policies').select('*')
  return MOCK_POLICIES;
}

export async function getPolicy(id: string): Promise<Policy | undefined> {
  return MOCK_POLICIES.find((p) => p.id === id);
}

export async function createPolicy(policy: Omit<Policy, "id" | "created_at" | "updated_at">): Promise<Policy> {
  const newPolicy: Policy = {
    ...policy,
    id: `pol-${Date.now()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  MOCK_POLICIES.push(newPolicy);
  return newPolicy;
}

// ============================================================
// RISK ASSESSMENT — Vishleshak AI: /api/risk-scoring
// ============================================================

function generateMockSHAP(policy: Policy): SHAPFeature[] {
  return [
    { feature_name: "prior_claims", shap_value: policy.prior_claims * 0.15, feature_value: policy.prior_claims, direction: policy.prior_claims > 1 ? "positive" : "negative" },
    { feature_name: "vehicle_age", shap_value: (2024 - policy.production_year) * 0.08, feature_value: 2024 - policy.production_year, direction: (2024 - policy.production_year) > 3 ? "positive" : "negative" },
    { feature_name: "engine_cc", shap_value: policy.engine_cc > 1500 ? 0.12 : -0.05, feature_value: policy.engine_cc, direction: policy.engine_cc > 1500 ? "positive" : "negative" },
    { feature_name: "usage_type", shap_value: policy.usage_type === "commercial" ? 0.2 : -0.1, feature_value: policy.usage_type, direction: policy.usage_type === "commercial" ? "positive" : "negative" },
    { feature_name: "insured_value", shap_value: policy.insured_value > 1000000 ? 0.1 : -0.05, feature_value: policy.insured_value, direction: policy.insured_value > 1000000 ? "positive" : "negative" },
  ];
}

function computeMockRiskScore(policy: Policy): number {
  let score = 30;
  score += policy.prior_claims * 15;
  score += (2024 - policy.production_year) * 3;
  if (policy.usage_type === "commercial") score += 20;
  if (policy.engine_cc > 2000) score += 10;
  if (policy.insured_value > 2000000) score += 10;
  return Math.min(100, Math.max(0, score));
}

function getRiskBand(score: number): RiskBand {
  if (score <= 30) return "low";
  if (score <= 55) return "medium";
  if (score <= 75) return "high";
  return "critical";
}

export async function assessRisk(policyId: string): Promise<RiskAssessment> {
  // TODO: Replace with Vishleshak API call:
  // return callVishleshakAPI<RiskAssessment>("/risk-scoring", {
  //   agent_type: "risk_scoring",
  //   policy_data: policy,
  //   options: { include_shap: true, include_explanation: true },
  // });

  const policy = MOCK_POLICIES.find((p) => p.id === policyId);
  if (!policy) throw new Error(`Policy ${policyId} not found`);

  const riskScore = computeMockRiskScore(policy);
  const riskBand = getRiskBand(riskScore);
  const features = generateMockSHAP(policy);

  const explanations: Record<RiskBand, string> = {
    low: `Policy ${policy.policy_number} shows low risk. The ${policy.vehicle_make} ${policy.vehicle_model} is a ${2024 - policy.production_year}-year-old vehicle with no significant risk factors. Personal usage and clean claims history contribute to the favorable assessment.`,
    medium: `Policy ${policy.policy_number} presents moderate risk. Key factors include ${policy.prior_claims} prior claim(s) and vehicle age of ${2024 - policy.production_year} years. The ${policy.usage_type} usage pattern is noted. Standard underwriting terms recommended.`,
    high: `Policy ${policy.policy_number} is flagged as high risk. ${policy.prior_claims} prior claims, ${policy.usage_type} usage, and a ${2024 - policy.production_year}-year-old ${policy.vehicle_type} with ${policy.engine_cc}cc engine contribute to elevated risk. Enhanced premium or additional conditions recommended.`,
    critical: `ALERT: Policy ${policy.policy_number} scores critically high risk. Multiple compounding factors: ${policy.prior_claims} prior claims, ${policy.usage_type} usage of a high-value ${policy.vehicle_type}. Manual review strongly recommended before underwriting.`,
  };

  const result: RiskAssessment = {
    id: `ra-${Date.now()}`,
    policy_id: policyId,
    risk_score: riskScore,
    risk_band: riskBand,
    claim_probability: riskScore / 100 * 0.7,
    top_features: features,
    explanation: explanations[riskBand],
    agent_type: "risk_scoring",
    created_at: new Date().toISOString(),
  };

  // Fire real-time notification
  notifyRiskComplete(policy.policy_number, riskBand, riskScore, policyId);

  return result;
}

// ============================================================
// CLAIM PREDICTION — Vishleshak AI: /api/claim-prediction
// ============================================================

export async function predictClaim(policyId: string): Promise<ClaimPrediction> {
  // TODO: Replace with Vishleshak API call:
  // return callVishleshakAPI<ClaimPrediction>("/claim-prediction", { ... });

  const policy = MOCK_POLICIES.find((p) => p.id === policyId);
  if (!policy) throw new Error(`Policy ${policyId} not found`);

  const riskScore = computeMockRiskScore(policy);
  const probability = riskScore / 100 * 0.7;
  const predictedAmount = policy.insured_value * probability * 0.3;

  return {
    id: `cp-${Date.now()}`,
    policy_id: policyId,
    claim_probability: probability,
    predicted_claim_amount: Math.round(predictedAmount),
    confidence_interval: {
      lower: Math.round(predictedAmount * 0.7),
      upper: Math.round(predictedAmount * 1.4),
    },
    risk_factors: [
      ...(policy.prior_claims > 0 ? [`${policy.prior_claims} prior claim(s)`] : []),
      ...(policy.usage_type === "commercial" ? ["Commercial usage"] : []),
      ...((2024 - policy.production_year) > 4 ? ["Vehicle age > 4 years"] : []),
      ...(policy.engine_cc > 2000 ? ["High engine capacity"] : []),
    ],
    model_version: "xgboost-v2.0-mock",
    created_at: new Date().toISOString(),
  };
}

// ============================================================
// PREMIUM ADVISORY — Vishleshak AI: /api/premium-advisory
// ============================================================

export async function advisePremium(policyId: string): Promise<PremiumAdvisory> {
  // TODO: Replace with Vishleshak API call:
  // return callVishleshakAPI<PremiumAdvisory>("/premium-advisory", { ... });

  const policy = MOCK_POLICIES.find((p) => p.id === policyId);
  if (!policy) throw new Error(`Policy ${policyId} not found`);

  const riskScore = computeMockRiskScore(policy);
  const multiplier = 1 + (riskScore - 50) / 100;
  const recommended = Math.round(policy.premium_amount * multiplier);

  return {
    id: `pa-${Date.now()}`,
    policy_id: policyId,
    current_premium: policy.premium_amount,
    recommended_premium: recommended,
    premium_range: {
      min: Math.round(recommended * 0.85),
      max: Math.round(recommended * 1.2),
    },
    adjustment_factors: [
      {
        factor_name: "Claims History",
        impact: policy.prior_claims * 8,
        direction: policy.prior_claims > 0 ? "increase" : "decrease",
        description: `${policy.prior_claims} prior claims affect premium by ${policy.prior_claims * 8}%`,
      },
      {
        factor_name: "Vehicle Age",
        impact: (2024 - policy.production_year) * 2,
        direction: "increase",
        description: `Vehicle is ${2024 - policy.production_year} years old`,
      },
      {
        factor_name: "Usage Type",
        impact: policy.usage_type === "commercial" ? 15 : 0,
        direction: policy.usage_type === "commercial" ? "increase" : "decrease",
        description: `${policy.usage_type} usage pattern`,
      },
    ],
    justification: `Based on risk score of ${riskScore}/100 (${getRiskBand(riskScore)} band), the recommended premium for ${policy.holder_name}'s ${policy.vehicle_make} ${policy.vehicle_model} is ₹${recommended.toLocaleString("en-IN")}. This factors in ${policy.prior_claims} prior claims, ${policy.usage_type} usage, and current market benchmarks for the ${policy.region} region.`,
    created_at: new Date().toISOString(),
  };
}

// ============================================================
// REPORT GENERATION — Vishleshak AI: /api/report
// ============================================================

export async function generateReport(policyId: string): Promise<UnderwritingReport> {
  const [risk, claim, premium] = await Promise.all([
    assessRisk(policyId),
    predictClaim(policyId),
    advisePremium(policyId),
  ]);

  const recommendation = risk.risk_band === "critical"
    ? "reject"
    : risk.risk_band === "high"
    ? "review"
    : "approve";

  const report: UnderwritingReport = {
    id: `rpt-${Date.now()}`,
    policy_id: policyId,
    risk_assessment: risk,
    claim_prediction: claim,
    premium_advisory: premium,
    summary: `Underwriting report for policy ${policyId}. Risk band: ${risk.risk_band.toUpperCase()}. Claim probability: ${(claim.claim_probability * 100).toFixed(1)}%. Recommended premium: ₹${premium.recommended_premium.toLocaleString("en-IN")}. Recommendation: ${recommendation.toUpperCase()}.`,
    recommendation,
    generated_at: new Date().toISOString(),
  };

  notifyReportReady(policyId, policyId);

  return report;
}

// ============================================================
// BATCH ANALYSIS — Vishleshak AI: /api/batch
// ============================================================

export async function runBatchAnalysis(policyIds: string[]): Promise<BatchJob> {
  const job: BatchJob = {
    id: `batch-${Date.now()}`,
    name: `Batch ${new Date().toLocaleDateString()}`,
    total_policies: policyIds.length,
    processed: policyIds.length,
    status: "completed",
    results_summary: {
      avg_risk_score: 0,
      risk_distribution: { low: 0, medium: 0, high: 0, critical: 0 },
      avg_claim_probability: 0,
      total_insured_value: 0,
      total_premium: 0,
      high_risk_count: 0,
    },
    created_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  };

  for (const id of policyIds) {
    const policy = MOCK_POLICIES.find((p) => p.id === id);
    if (!policy) continue;
    const score = computeMockRiskScore(policy);
    const band = getRiskBand(score);
    job.results_summary!.avg_risk_score += score;
    job.results_summary!.risk_distribution[band]++;
    job.results_summary!.avg_claim_probability += score / 100 * 0.7;
    job.results_summary!.total_insured_value += policy.insured_value;
    job.results_summary!.total_premium += policy.premium_amount;
    if (band === "high" || band === "critical") job.results_summary!.high_risk_count++;
  }

  const count = policyIds.length || 1;
  job.results_summary!.avg_risk_score = Math.round(job.results_summary!.avg_risk_score / count);
  job.results_summary!.avg_claim_probability = +(job.results_summary!.avg_claim_probability / count).toFixed(3);

  notifyBatchComplete(policyIds.length, job.results_summary!.high_risk_count);

  return job;
}

// ============================================================
// AUDIT LOG
// ============================================================

const MOCK_AUDIT_LOG: AuditLogEntry[] = [
  { id: "al-1", action: "risk_assessed", entity_type: "risk_assessment", entity_id: "ra-001", user_id: "system", details: "Risk assessment completed for INS-2024-001", timestamp: "2024-06-01T10:30:00Z" },
  { id: "al-2", action: "claim_predicted", entity_type: "claim_prediction", entity_id: "cp-001", user_id: "system", details: "Claim prediction generated for INS-2024-003", timestamp: "2024-06-01T11:00:00Z" },
  { id: "al-3", action: "report_generated", entity_type: "report", entity_id: "rpt-001", user_id: "system", details: "Underwriting report generated for INS-2024-002", timestamp: "2024-06-02T09:15:00Z" },
  { id: "al-4", action: "policy_created", entity_type: "policy", entity_id: "pol-006", user_id: "admin", details: "New policy created for Kavita Singh", timestamp: "2024-06-03T14:20:00Z" },
  { id: "al-5", action: "batch_analysis", entity_type: "risk_assessment", entity_id: "batch-001", user_id: "system", details: "Batch analysis completed for 6 policies", timestamp: "2024-06-04T16:45:00Z" },
];

export async function getAuditLog(): Promise<AuditLogEntry[]> {
  return MOCK_AUDIT_LOG;
}

// ============================================================
// DASHBOARD STATS
// ============================================================

export async function getDashboardStats(): Promise<DashboardStats> {
  const policies = await getPolicies();
  let totalInsured = 0;
  let totalPremium = 0;
  let totalRisk = 0;
  let highRisk = 0;

  for (const p of policies) {
    totalInsured += p.insured_value;
    totalPremium += p.premium_amount;
    const score = computeMockRiskScore(p);
    totalRisk += score;
    if (score > 55) highRisk++;
  }

  return {
    total_policies: policies.length,
    total_assessed: policies.length,
    avg_risk_score: Math.round(totalRisk / policies.length),
    high_risk_percentage: Math.round((highRisk / policies.length) * 100),
    total_insured_value: totalInsured,
    total_premium: totalPremium,
    claims_predicted: 4,
    reports_generated: 3,
  };
}
