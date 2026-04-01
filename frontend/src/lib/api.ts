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
} from "@/types/insurance";
import { notifyRiskComplete, notifyReportReady, notifyBatchComplete } from "@/lib/notifications";

const DEFAULT_CONFIG: VishleshakAPIConfig = {
  base_url: "http://localhost:8000/api",
  timeout_ms: 30000,
  retry_count: 3,
};

let config: VishleshakAPIConfig = { ...DEFAULT_CONFIG };
const TOKEN_KEY = "insureiq_token";
const CONFIG_KEY = "insureiq_api_config";

try {
  const stored = localStorage.getItem(CONFIG_KEY);
  if (stored) {
    config = { ...config, ...JSON.parse(stored) };
  }
} catch {
  // Ignore invalid persisted config.
}

export function setVishleshakConfig(newConfig: Partial<VishleshakAPIConfig>) {
  config = { ...config, ...newConfig };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function getVishleshakConfig(): VishleshakAPIConfig {
  return { ...config };
}

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

async function apiFetch<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${config.base_url}${endpoint}`, {
    ...init,
    headers,
    signal: AbortSignal.timeout(config.timeout_ms),
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const errBody = await res.json();
      message = errBody?.detail || errBody?.message || message;
    } catch {
      // Keep default message if body is not JSON.
    }
    throw new Error(message);
  }

  return (await res.json()) as T;
}

export interface AuthUserResponse {
  id: string;
  email: string;
  name?: string;
}

export interface AuthApiResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUserResponse;
}

export async function loginApi(email: string, password: string): Promise<AuthApiResponse> {
  return apiFetch<AuthApiResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function signupApi(email: string, password: string, name?: string): Promise<AuthApiResponse> {
  return apiFetch<AuthApiResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, name: name || email.split("@")[0] }),
  });
}

export function persistAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function getPolicies(): Promise<Policy[]> {
  return apiFetch<Policy[]>("/policies");
}

export async function getPolicy(id: string): Promise<Policy | undefined> {
  try {
    return await apiFetch<Policy>(`/policies/${id}`);
  } catch (err: any) {
    if (String(err?.message || "").toLowerCase().includes("not found")) return undefined;
    throw err;
  }
}

export async function createPolicy(policy: Omit<Policy, "id" | "created_at" | "updated_at">): Promise<Policy> {
  return apiFetch<Policy>("/policies", {
    method: "POST",
    body: JSON.stringify(policy),
  });
}

export async function assessRisk(policyId: string): Promise<RiskAssessment> {
  const result = await apiFetch<RiskAssessment>("/risk-scoring", {
    method: "POST",
    body: JSON.stringify({ policy_id: policyId }),
  });

  const policy = await getPolicy(policyId);
  if (policy) notifyRiskComplete(policy.policy_number, result.risk_band, result.risk_score, policyId);
  return result;
}

export async function predictClaim(policyId: string): Promise<ClaimPrediction> {
  return apiFetch<ClaimPrediction>("/claim-prediction", {
    method: "POST",
    body: JSON.stringify({ policy_id: policyId }),
  });
}

export async function advisePremium(policyId: string): Promise<PremiumAdvisory> {
  return apiFetch<PremiumAdvisory>("/premium-advisory", {
    method: "POST",
    body: JSON.stringify({ policy_id: policyId }),
  });
}

export async function generateReport(policyId: string): Promise<UnderwritingReport> {
  const report = await apiFetch<UnderwritingReport>("/report", {
    method: "POST",
    body: JSON.stringify({ policy_id: policyId }),
  });
  notifyReportReady(policyId, policyId);
  return report;
}

export async function runBatchAnalysis(policyIds: string[]): Promise<BatchJob> {
  const job = await apiFetch<BatchJob>("/batch", {
    method: "POST",
    body: JSON.stringify({ policy_ids: policyIds }),
  });
  notifyBatchComplete(policyIds.length, job.results_summary!.high_risk_count);
  return job;
}

export async function getAuditLog(): Promise<AuditLogEntry[]> {
  const rows = await apiFetch<Array<{
    id: number;
    user_id: string;
    action: string;
    resource_type: string;
    resource_id: string;
    timestamp: string;
    payload_hash: string;
  }>>("/audit-log");

  return rows.map((r) => ({
    id: `al-${r.id}`,
    action: r.action.toLowerCase(),
    entity_type: (r.resource_type || "policy") as AuditLogEntry["entity_type"],
    entity_id: r.resource_id || String(r.id),
    user_id: r.user_id,
    details: `Payload hash: ${r.payload_hash.slice(0, 12)}...`,
    timestamp: r.timestamp,
  }));
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return apiFetch<DashboardStats>("/dashboard/stats");
}

export interface Module2TurnResponse {
  session_id?: string;
  status?: "INCOMPLETE" | "COMPLETE" | "FLAGGED";
  message?: string;
  next_question?: string;
  collected_fields?: Record<string, unknown>;
  application_summary?: Record<string, unknown>;
  missing_fields?: string[];
  risk_flags?: Array<{ field: string; reason: string }>;
  readiness?: "COMPLETE" | "INCOMPLETE" | "FLAGGED";
}

export interface Module6TurnResponse {
  session_id?: string;
  phase?: "GATHER" | "ASSESS";
  next_question?: string;
  collected?: Record<string, unknown>;
  claim_type?: "own_damage" | "third_party" | "theft" | "total_loss" | "not_eligible";
  eligible?: boolean;
  eligibility_reason?: string;
  risk_of_rejection?: "LOW" | "MEDIUM" | "HIGH";
  rejection_risks?: string[];
  documents_required?: string[];
  ncb_impact?: "NCB lost" | "NCB protected" | "Not applicable" | "NCB protect add-on applies";
  estimated_claim_range?: string;
  next_steps?: string[];
}

export async function module2ApplicationFormTurn(sessionId: string, userMessage: string): Promise<Module2TurnResponse> {
  return apiFetch<Module2TurnResponse>("/modules/application-form/turn", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId, user_message: userMessage }),
  });
}

export async function module3RiskExplainer(payload: {
  claim_probability: number;
  risk_score: number;
  risk_band: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  shap_features: Array<{ feature: string; shap_value: number; feature_value: unknown }>;
}): Promise<{ explanation: string }> {
  return apiFetch<{ explanation: string }>("/modules/risk-score-explainer", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function module5PolicyPdfQA(retrievedChunks: string, userQuestion: string): Promise<{ response?: string; formatted?: string }> {
  return apiFetch<{ response?: string; formatted?: string }>("/modules/policy-pdf-qa", {
    method: "POST",
    body: JSON.stringify({ retrieved_chunks: retrievedChunks, user_question: userQuestion }),
  });
}

export async function module6ClaimEligibilityTurn(sessionId: string, userMessage: string): Promise<Module6TurnResponse> {
  return apiFetch<Module6TurnResponse>("/modules/claim-eligibility/turn", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId, user_message: userMessage }),
  });
}
