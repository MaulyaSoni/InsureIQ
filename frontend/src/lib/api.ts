const API_BASE = "/api";
const VISHLESHAK_CONFIG_KEY = "insureiq_vishleshak_config";

function getToken() {
  return localStorage.getItem("insureiq_token") || "";
}

export function persistAuthToken(token: string) {
  localStorage.setItem("insureiq_token", token);
}

export function clearAuthToken() {
  localStorage.removeItem("insureiq_token");
}

export function getVishleshakConfig() {
  const fallback = {
    base_url: `${window.location.origin}/api`,
    api_key: "",
    timeout_ms: 30000,
    retry_count: 1,
  };

  const raw = localStorage.getItem(VISHLESHAK_CONFIG_KEY);
  if (!raw) return fallback;

  try {
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

export function setVishleshakConfig(config: Record<string, unknown>) {
  const merged = { ...getVishleshakConfig(), ...config };
  localStorage.setItem(VISHLESHAK_CONFIG_KEY, JSON.stringify(merged));
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail?.detail || err.detail || "Request failed");
  }

  if (res.status === 204) return null;
  return res.json();
}

// --- Auth ---
export const login = (email: string, password: string) =>
  request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });

export const register = (data: { email: string; full_name: string; password: string }) =>
  request("/auth/signup", { method: "POST", body: JSON.stringify(data) });

export const loginApi = login;

export const signupApi = (email: string, password: string, name?: string) =>
  register({ email, password, full_name: name || email.split("@")[0] });

// --- Policies ---
export const getPolicies = async (page = 1, limit = 20) => {
  const res = await request(`/policies?page=${page}&limit=${limit}`);
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.items)) return res.items;
  return [];
};

export const getPolicy = (id: string) =>
  request(`/policies/${id}`);

export const createPolicy = (data: Record<string, unknown>) =>
  request("/policies", { method: "POST", body: JSON.stringify(data) });

export const updatePolicy = (id: string, data: Record<string, unknown>) =>
  request(`/policies/${id}`, { method: "PUT", body: JSON.stringify(data) });

export const deletePolicy = (id: string) =>
  request(`/policies/${id}`, { method: "DELETE" });

export const runAllAnalysis = (id: string) =>
  request(`/policies/${id}/run-all`, { method: "POST" });

// --- Risk Assessment ---
export const assessRisk = (policyId: string) =>
  request("/risk-scoring", { method: "POST", body: JSON.stringify({ policy_id: policyId }) });

// --- Claim Prediction ---
export const predictClaim = async (policyId: string) => {
  const res = await request("/claim-prediction", {
    method: "POST",
    body: JSON.stringify({ policy_id: policyId }),
  });

  return {
    id: res.id || `cp-${Date.now()}`,
    policy_id: res.policy_id || policyId,
    claim_probability: Number(res.claim_probability || 0),
    predicted_claim_amount: Number(res.predicted_claim_amount || 0),
    confidence_interval: {
      lower: Number(res.confidence_interval?.lower || 0),
      upper: Number(res.confidence_interval?.upper || 0),
    },
    risk_factors: Array.isArray(res.risk_factors) ? res.risk_factors : [],
    model_version: res.model_version || "unknown",
    created_at: res.created_at || new Date().toISOString(),
  };
};

export const checkClaimEligibility = (data: Record<string, unknown>) =>
  request("/claims/eligibility", { method: "POST", body: JSON.stringify(data) });

// --- Premium Advisory ---
export const advisePremium = async (policyId: string) => {
  const res = await request("/premium-advisory", {
    method: "POST",
    body: JSON.stringify({ policy_id: policyId }),
  });

  const currentPremium = Number(res.current_premium ?? res.premium_amount ?? 0);
  const recommendedPremium = Number(res.recommended_premium ?? res.premium_max ?? currentPremium);
  const minPremium = Number(res.premium_range?.min ?? res.premium_min ?? currentPremium);
  const maxPremium = Number(res.premium_range?.max ?? res.premium_max ?? recommendedPremium);

  return {
    id: res.id || `pa-${Date.now()}`,
    policy_id: res.policy_id || policyId,
    current_premium: currentPremium,
    recommended_premium: recommendedPremium,
    premium_range: {
      min: minPremium,
      max: maxPremium,
    },
    adjustment_factors: Array.isArray(res.adjustment_factors) ? res.adjustment_factors : [],
    justification: res.justification || res.premium_narrative || "No justification available.",
    created_at: res.created_at || new Date().toISOString(),
  };
};

export const whatIfPremium = (policyId: string, adjustments: Record<string, unknown>) =>
  request("/premium/what-if", { method: "POST", body: JSON.stringify({ policy_id: policyId, adjustments }) });

// --- Reports ---
export const generateReport = async (policyId: string) => {
  const res = await request("/report", {
    method: "POST",
    body: JSON.stringify({ policy_id: policyId }),
  });

  return {
    id: res.id || res.report_id || `rpt-${Date.now()}`,
    policy_id: res.policy_id || policyId,
    risk_assessment: res.risk_assessment,
    claim_prediction: res.claim_prediction,
    premium_advisory: res.premium_advisory,
    summary: res.summary || res.content || "No summary available.",
    recommendation: (res.recommendation || "review").toLowerCase(),
    generated_at: res.generated_at || new Date().toISOString(),
  };
};

export const downloadReportPDF = (reportId: string) => {
  const token = getToken();
  return fetch(`${API_BASE}/reports/${reportId}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

// --- Batch ---
export const submitBatchAnalysis = (data: Record<string, unknown>) =>
  request("/batch", { method: "POST", body: JSON.stringify(data) });

export const getBatchStatus = (jobId: string) =>
  request(`/batch/${jobId}/status`);

export const runBatchAnalysis = async (policyIds: string[]) => {
  const result = await request("/batch", {
    method: "POST",
    body: JSON.stringify({ policy_ids: policyIds }),
  });

  return {
    id: result.id,
    name: result.name || "Portfolio Batch Analysis",
    total_policies: result.total_policies,
    processed: result.processed,
    status: result.status,
    created_at: result.created_at || new Date().toISOString(),
    completed_at: result.completed_at,
    results_summary: result.results_summary,
  };
};

export const getDashboardStats = async () => {
  const kpis = await request("/dashboard/stats");
  const totalPolicies = Number(kpis.total_policies || 0);

  return {
    total_policies: totalPolicies,
    total_assessed: Number(kpis.total_assessed || 0),
    avg_risk_score: Number(kpis.avg_risk_score || 0),
    high_risk_percentage: Number(kpis.high_risk_percentage || 0),
    total_insured_value: Number(kpis.total_insured_value || 0),
    total_premium: Number(kpis.total_premium || 0),
    claims_predicted: Number(kpis.claims_predicted || 0),
    reports_generated: Number(kpis.reports_generated || 0),
  };
};

// --- Audit ---
export const getAuditLog = (page = 1, limit = 50) =>
  request("/audit-log").then((rows) =>
    (Array.isArray(rows) ? rows : []).slice((page - 1) * limit, page * limit).map((row) => ({
      id: row.id,
      action: row.action || "unknown",
      entity_type: row.resource_type || "policy",
      entity_id: row.resource_id || "",
      user_id: row.user_id || "",
      details: row.payload_hash || "",
      timestamp: row.timestamp,
    }))
  );
