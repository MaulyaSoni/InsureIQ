const API_BASE = "/api";

function getToken() {
  return localStorage.getItem("insureiq_token") || "";
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as any) || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let detail = "Request failed";
    try {
      const err = await res.json();
      detail = err.detail?.detail || err.detail || detail;
    } catch (e) {}
    throw new Error(detail);
  }

  if (res.status === 204) return null;
  return res.json();
}

// Analytics (Feature 1)
export const getGeoHeatmap = () => request("/analytics/geo-heatmap");
export const getSegmentBreakdown = (segmentBy = "vehicle_type") => 
  request(`/analytics/segment-breakdown?segment_by=${segmentBy}`);
export const getPortfolioInsights = () => request("/analytics/insights");

// Workbench (Feature 2)
export const getWorkbenchQueue = () => request("/workbench/queue");
export const getWorkbenchStats = () => request("/workbench/stats");
export const getAiRecommendation = (policyId: string) => request(`/workbench/${policyId}/ai-recommendation`, { method: "POST" });
export const submitUnderwritingDecision = (policyId: string, data: any) => 
  request(`/workbench/${policyId}/decide`, { method: "POST", body: JSON.stringify(data) });

// Fraud (Feature 3)
export const getFraudReviews = () => request("/fraud/flagged");
export const getFraudExplain = (id: string) => request(`/fraud/${id}/explain`);

// Renewal (Feature 5)
export const getRenewalUpcoming = async () => {
  const res = await request("/renewal/upcoming");
  return res?.items || [];
};
export const getRenewalAdvisory = (id: string) => 
  request(`/renewal/${id}/advisory`, { method: "POST" });

// Teams (Feature 4)
export const getTeams = () => request("/teams");
export const inviteMember = (data: { email: string; full_name: string; role: string }) => 
  request("/teams/invite", { method: "POST", body: JSON.stringify(data) });
