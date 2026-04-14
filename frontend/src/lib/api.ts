const BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api`;
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
    base_url: `${BASE_URL}`,
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

  const res = await fetch(`${BASE_URL}${path}`, {
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

export const runAllAnalysis = async (id: string) => {
  const analysis = await request(`/policies/${id}/run-all`, { method: "POST" });
  let base: any = null;
  try {
    base = await getPolicy(id);
  } catch {
    base = { id };
  }

  const risk = analysis?.risk || {};
  const premium = analysis?.premium || {};

  return {
    ...base,
    ...analysis,
    risk_prediction_id: analysis.risk_prediction_id || null,
    risk_score: Number(risk.risk_score ?? base?.risk_score ?? 0),
    risk_band: String(risk.risk_band ?? base?.risk_band ?? "LOW"),
    claim_probability: Number(risk.claim_probability ?? base?.claim_probability ?? 0) * 100,
    risk_factors: Array.isArray(risk.shap_features) ? risk.shap_features : (base?.risk_factors || []),
    premium_amount: Number(premium.premium_max ?? base?.premium_amount ?? 0),
  };
};

// --- Risk Assessment ---
export const assessRisk = (policyId: string) =>
  request("/risk/assess", { method: "POST", body: JSON.stringify({ policy_id: policyId }) });

export const explainRisk = async (predictionId: string) => {
  const res = await fetch(`${BASE_URL}/risk/explain`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ prediction_id: predictionId }),
  });
  if (!res.ok) throw new Error("Explanation failed");
  return res.json();
};

// --- Claim Prediction ---
export const predictClaim = async (policyId: string) => {
  const res = await request("/claims/predict", {
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
  const res = await request("/premium/advise", {
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
  const res = await request("/reports/generate", {
    method: "POST",
    body: JSON.stringify({ policy_id: policyId }),
  });

  const riskScore = Number(res.risk_score ?? 0);
  const claimProbability = Number(res.claim_probability ?? 0);
  const currentPremium = Number(res.current_premium ?? 0);
  const premiumMin = Number(res.premium_min ?? currentPremium);
  const premiumMax = Number(res.premium_max ?? premiumMin);

  return {
    id: res.id || res.report_id || `rpt-${Date.now()}`,
    policy_id: res.policy_id || policyId,
    risk_assessment: res.risk_assessment || {
      id: `ra-${Date.now()}`,
      policy_id: res.policy_id || policyId,
      risk_score: riskScore,
      risk_band: String(res.risk_band || "medium").toLowerCase(),
      claim_probability: claimProbability,
      top_features: [],
      explanation: String(res.content || "No explanation available."),
      agent_type: "report_writer",
      created_at: new Date().toISOString(),
    },
    claim_prediction: res.claim_prediction || {
      id: `cp-${Date.now()}`,
      policy_id: res.policy_id || policyId,
      claim_probability: claimProbability,
      predicted_claim_amount: Number(res.predicted_claim_amount || 0),
      confidence_interval: {
        lower: Number(res.confidence_interval?.lower || 0),
        upper: Number(res.confidence_interval?.upper || 0),
      },
      risk_factors: Array.isArray(res.risk_factors) ? res.risk_factors : [],
      model_version: res.model_version || "xgb_v1",
      created_at: new Date().toISOString(),
    },
    premium_advisory: res.premium_advisory || {
      id: `pa-${Date.now()}`,
      policy_id: res.policy_id || policyId,
      current_premium: currentPremium,
      recommended_premium: premiumMax,
      premium_range: { min: premiumMin, max: premiumMax },
      adjustment_factors: Array.isArray(res.adjustment_factors) ? res.adjustment_factors : [],
      justification: String(res.premium_narrative || "No premium justification available."),
      created_at: new Date().toISOString(),
    },
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
  request("/batch/run", { method: "POST", body: JSON.stringify(data) });

export const getBatchStatus = (jobId: string) =>
  request(`/batch/${jobId}/status`);

export const runBatchAnalysis = async (policyIds: string[]) => {
  const result = await request("/batch/run", {
    method: "POST",
    body: JSON.stringify({ policy_ids: policyIds }),
  });

  let status = await getBatchStatus(result.id);
  let attempts = 0;
  while (status?.status !== "completed" && status?.status !== "failed" && attempts < 20) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    status = await getBatchStatus(result.id);
    attempts += 1;
  }

  const finalResult = await request(`/batch/${result.id}/results`);

  return {
    id: finalResult.id || result.id,
    name: finalResult.name || result.name || "Portfolio Batch Analysis",
    total_policies: Number(finalResult.total_policies || result.total_policies || policyIds.length),
    processed: Number(finalResult.processed_count || status?.processed_count || 0),
    status: finalResult.status || status?.status || result.status,
    created_at: finalResult.created_at || result.created_at || new Date().toISOString(),
    completed_at: finalResult.completed_at,
    results_summary: finalResult.results_summary || {},
  };
};

export const getDashboardStats = async () => {
  const kpis = await request("/dashboard/kpis");
  const totalPolicies = Number(kpis.total_policies || 0);

  return {
    total_policies: totalPolicies,
    total_assessed: Number(kpis.total_assessed || 0),
    avg_risk_score: Number(kpis.avg_risk_score || 0),
    high_risk_percentage: Number(kpis.high_risk_percentage || 0),
    total_insured_value: Number(kpis.total_insured_value || 0),
    total_premium: Number(kpis.total_premium || 0),
    claims_predicted: Number(kpis.claims_predicted || kpis.claims_predicted_this_month || 0),
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
