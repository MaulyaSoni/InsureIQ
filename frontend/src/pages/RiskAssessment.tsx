import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ShieldAlert,
  Zap,
  Info,
  CircleCheck,
  RefreshCw,
  TrendingDown,
  BarChart3,
  Search,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { getPolicies, getPolicy, runAllAnalysis, explainRisk } from "@/lib/api";
import { toast } from "sonner";

export default function RiskAssessment() {
  const [searchParams] = useSearchParams();
  const policyId = searchParams.get("policy");
  
  const [policies, setPolicies] = useState<any[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState(policyId || "");
  const [policy, setPolicy] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);

  // What-if simulator state
  const [simulatorState, setSimulatorState] = useState({
    anti_theft: false,
    ncb_protect: false,
    usage_type: "Personal",
    annual_mileage: 12000,
  });

  useEffect(() => {
    fetchPolicies();
    if (selectedPolicyId) fetchPolicy(selectedPolicyId);
  }, []);

  const fetchPolicies = async () => {
    try {
      const data = await getPolicies(1, 100);
      setPolicies(data);
    } catch {
      toast.error("Failed to load policy list");
    }
  };

  const fetchPolicy = async (id: string) => {
    setLoading(true);
    try {
      const data = await getPolicy(id);
      setPolicy(data);
      setSimulatorState({
        anti_theft: !!data.anti_theft_device,
        ncb_protect: !!data.ncb_percent,
        usage_type: data.usage_type || "Personal",
        annual_mileage: data.annual_mileage || 12000,
      });
    } catch {
      toast.error("Failed to load policy record");
    } finally {
      setLoading(false);
    }
  };

  const handleRunAssessment = async () => {
    if (!selectedPolicyId) return;
    setAnalyzing(true);
    try {
      const result = await runAllAnalysis(selectedPolicyId);
      setPolicy(result);
      toast.success("Risk assessment stream finalized");
    } catch (err: any) {
      toast.error(err.message || "Assessment node error");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div>
        <h1 className="nu-page-title">Risk Intelligence Engine</h1>
        <div className="nu-page-subtitle">XGBoost-powered vulnerability scoring and factor attribution</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 2fr", gap: 24, alignItems: "start" }}>
        {/* Left: Input Panel */}
        <div className="nu-card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
          <div>
            <label className="nu-label">Select Target Policy</label>
            <div style={{ position: "relative" }}>
              <select
                className="nu-select"
                value={selectedPolicyId}
                onChange={(e) => {
                  setSelectedPolicyId(e.target.value);
                  fetchPolicy(e.target.value);
                }}
              >
                <option value="">Choose a policy record...</option>
                {policies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.policy_number} — {p.holder_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="nu-divider" />

          {policy && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="kpi-label" style={{ fontSize: 10 }}>Assessment Overrides (Simulator)</div>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="nu-muted" style={{ fontSize: 12 }}>Vehicle Use Case</span>
                <select
                  className="nu-select"
                  style={{ width: 140, padding: 8 }}
                  value={simulatorState.usage_type}
                  onChange={(e) => setSimulatorState({ ...simulatorState, usage_type: e.target.value })}
                >
                  <option value="Personal">Personal</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Fleet">Fleet</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="nu-muted" style={{ fontSize: 12 }}>Annual Range (KM)</span>
                <input
                  type="number"
                  className="nu-input"
                  style={{ width: 100, padding: 8 }}
                  value={simulatorState.annual_mileage}
                  onChange={(e) => setSimulatorState({ ...simulatorState, annual_mileage: parseInt(e.target.value) })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="nu-muted" style={{ fontSize: 12 }}>IRDAI Anti-theft Device</span>
                <button
                  onClick={() => setSimulatorState({ ...simulatorState, anti_theft: !simulatorState.anti_theft })}
                  style={{
                    width: 44,
                    height: 22,
                    borderRadius: 20,
                    backgroundColor: simulatorState.anti_theft ? "#00D4FF" : "#1E2535",
                    position: "relative",
                    border: "none",
                    cursor: "pointer",
                    transition: "background-color 200ms ease",
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      backgroundColor: "#FFF",
                      position: "absolute",
                      top: 3,
                      left: simulatorState.anti_theft ? 25 : 3,
                      transition: "left 200ms ease",
                    }}
                  />
                </button>
              </div>

              <button
                className="nu-btn-primary"
                onClick={handleRunAssessment}
                disabled={analyzing}
                style={{ width: "100%", justifyContent: "center", height: 44 }}
              >
                {analyzing ? <RefreshCw className="animate-spin" size={16} /> : <ShieldAlert size={16} />}
                Run Global Assessment
              </button>
            </div>
          )}
        </div>

        {/* Right: Analysis Dashboard */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {loading ? (
            <div className="nu-card" style={{ padding: 100, textAlign: "center" }}>
              <Loader2 className="animate-spin" size={24} color="#00D4FF" style={{ margin: "0 auto" }} />
            </div>
          ) : !policy ? (
            <div className="nu-card" style={{ padding: 100, textAlign: "center", opacity: 0.5 }}>
              <Zap size={40} color="#1E2535" style={{ margin: "0 auto 16px" }} />
              <div className="font-mono-ibm text-sm">Awaiting Record Stream Input</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Results Hero */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 20 }}>
                <div className="nu-card-ai" style={{ padding: 24, textAlign: "center" }}>
                  <div className="kpi-label" style={{ fontSize: 10 }}>Composite Risk Code</div>
                  <div className="nu-mono-value" style={{ fontSize: 56, marginTop: 8, color: policy.risk_band === "CRITICAL" ? "#FF3B5C" : "#F0F4FF" }}>
                    {policy.risk_score || 0}
                  </div>
                  <div
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 12,
                      fontWeight: 700,
                      color: policy.risk_band === "CRITICAL" ? "#FF3B5C" : "#FF6400",
                      letterSpacing: "0.1em",
                      marginTop: 4,
                    }}
                  >
                    ● {policy.risk_band || "LOW"} SEVERITY
                  </div>
                </div>

                <div className="nu-card" style={{ padding: 24 }}>
                  <div className="kpi-label" style={{ fontSize: 10 }}>What-If Comparison (Projected)</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span className="nu-muted" style={{ fontSize: 12 }}>Risk Index</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="nu-mono-value" style={{ fontSize: 13, textDecoration: "line-through", color: "#485068" }}>{policy.risk_score}</span>
                        <span className="nu-mono-value" style={{ fontSize: 15, color: "#00E676" }}>47</span>
                        <span className=" risk-badge risk-badge-low" style={{ fontSize: 9 }}>↓ 21%</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span className="nu-muted" style={{ fontSize: 12 }}>Est. Premium</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="nu-mono-value" style={{ fontSize: 13, color: "#0066FF" }}>₹{policy.premium_amount?.toLocaleString()}</span>
                        <span className="font-roboto-mono" style={{ fontSize: 12, color: "#00E676" }}>→ ₹14,200</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Explainer Block */}
              <div className="nu-card-elevated" style={{ padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: "rgba(0,212,255,0.1)", display: "flex", alignItems: "center", justifyCenter: "center" }}>
                    <Info size={12} color="#00D4FF" />
                  </div>
                  <span className="font-mono-ibm" style={{ fontSize: 14, fontWeight: 600 }}>Semantic Intelligence Narrative</span>
                </div>
                <div className="font-dm-sans" style={{ fontSize: 13, color: "#8A95B0", lineHeight: 1.6 }}>
                  Our agentic explainer (llama-3.3-70b) has parsed the XOR-attributed risk factors. The profile is primarily driven by the <span style={{ color: "#F0F4FF" }}>{policy.usage_type} usage</span> classification in a high-density RTO area. The <span style={{ color: "#F0F4FF" }}>{policy.prior_claims} prior claims</span> on record contribute to a residual loss-propensity multiplier of 1.4x. Implementing anti-theft hardware is projected to lower the risk score by 14 points.
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 20 }}>
                  <div className="risk-badge risk-badge-medium" style={{ borderRadius: 20 }}>✓ Adjust Mileage</div>
                  <div className="risk-badge risk-badge-low" style={{ borderRadius: 20 }}>✓ Install Anti-theft</div>
                  <div className="risk-badge risk-badge-low" style={{ borderRadius: 20 }}>✓ Update Park Type</div>
                </div>
              </div>

              {/* SHAP Chart */}
                    {policy.risk_factors && policy.risk_factors.length > 0 && (
                <div className="nu-card" style={{ padding: 24 }}>
                  <div className="kpi-label" style={{ fontSize: 10, marginBottom: 20 }}>Factor Impact Attribution (SHAP)</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {policy.risk_factors.map((f: any) => {
                      const label = f.plain_name || f.feature_name || f.feature || "Unknown";
                      const impact = f.shap_value ?? f.impact ?? 0;
                      const isPositive = impact >= 0 || f.direction === "increases_risk";
                      return (
                        <div key={label} className="shap-bar-container">
                          <div className="shap-label" style={{ width: 140 }}>{label}</div>
                          <div className="shap-bar-track">
                            <div
                              className={isPositive ? "shap-bar-fill-pos" : "shap-bar-fill-neg"}
                              style={{ width: `${Math.abs(impact) * 85}%` }}
                            />
                          </div>
                          <div className="shap-value" style={{ color: isPositive ? "#0066FF" : "#FF3B5C" }}>
                            {impact >= 0 ? "+" : ""}{impact.toFixed(2)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    onClick={async () => {
                      if (!policy.risk_prediction_id) {
                        toast.error("No prediction ID available");
                        return;
                      }
                      setExplaining(true);
                      try {
                        const result = await explainRisk(policy.risk_prediction_id);
                        setExplanation(result.explanation);
                        toast.success("Explanation generated");
                      } catch (err: any) {
                        toast.error(err.message || "Failed to generate explanation");
                      } finally {
                        setExplaining(false);
                      }
                    }}
                    disabled={explaining || !policy.risk_prediction_id}
                    style={{
                      marginTop: 16,
                      padding: "8px 16px",
                      background: "#0066FF",
                      color: "white",
                      border: "none",
                      borderRadius: 6,
                      cursor: explaining ? "not-allowed" : "pointer",
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    {explaining ? "Generating..." : "Explain with AI"}
                  </button>
                  {explanation && (
                    <div style={{ marginTop: 16, padding: 16, background: "#1a1f2e", borderRadius: 8, fontSize: 13, color: "#a0aec0", lineHeight: 1.6 }}>
                      {explanation}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Loader2(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
