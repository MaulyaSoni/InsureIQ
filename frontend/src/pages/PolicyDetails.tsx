import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Zap,
  TrendingUp,
  FileText,
  AlertTriangle,
  History as HistoryIcon,
  MessageSquare,
  Loader2,
  RefreshCw,
  Download,
  Info as InfoIcon,
  CircleCheck,
} from "lucide-react";
import { getPolicy, runAllAnalysis } from "@/lib/api";
import { toast } from "sonner";

const RISK_COLORS: Record<string, string> = {
  LOW: "#00E676",
  MEDIUM: "#FFB300",
  HIGH: "#FF6400",
  CRITICAL: "#FF3B5C",
};

function RiskBadge({ band }: { band: string }) {
  const b = (band || "LOW").toUpperCase();
  const cls =
    b === "CRITICAL"
      ? "risk-badge risk-badge-critical"
      : b === "HIGH"
      ? "risk-badge risk-badge-high"
      : b === "MEDIUM"
      ? "risk-badge risk-badge-medium"
      : "risk-badge risk-badge-low";
  return <span className={cls}>● {b}</span>;
}

export default function PolicyDetails() {
  const { id } = useParams<{ id: string }>();
  const [policy, setPolicy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "history" | "chat">("details");

  useEffect(() => {
    if (id) fetchPolicy(id);
  }, [id]);

  const fetchPolicy = async (policyId: string) => {
    setLoading(true);
    try {
      const data = await getPolicy(policyId);
      setPolicy(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load policy details");
    } finally {
      setLoading(false);
    }
  };

  const handleRunAnalysis = async () => {
    if (!id) return;
    setAnalyzing(true);
    toast.promise(runAllAnalysis(id), {
      loading: "Initializing LangGraph agent pipeline...",
      success: (data) => {
        setPolicy(data);
        setAnalyzing(false);
        return "Intelligence analysis complete!";
      },
      error: (err) => {
        setAnalyzing(false);
        return err.message || "Analysis failed";
      },
    });
  };

  if (loading) {
    return (
      <div style={{ padding: 100, textAlign: "center" }}>
        <Loader2 className="animate-spin" size={32} color="#00D4FF" style={{ margin: "0 auto 16px" }} />
        <div className="font-mono-ibm text-sm text-muted-foreground">Initializing policy data stream...</div>
      </div>
    );
  }

  if (!policy) return <div>Policy not found</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link to="/policies" className="nu-btn-ghost" style={{ padding: 6, borderRadius: 30 }}>
            <ChevronLeft size={16} />
          </Link>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 className="nu-page-title" style={{ fontSize: 24 }}>Policy #{policy.policy_number || `IQ-00${String(policy.id).slice(-3)}`}</h1>
              <RiskBadge band={policy.risk_band || "LOW"} />
            </div>
            <div className="nu-page-subtitle">Holder: {policy.policyholder_name} · Vehicle: {policy.vehicle_make} {policy.vehicle_model}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="nu-btn-ghost" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Download size={14} />
            Export
          </button>
          <button
            onClick={handleRunAnalysis}
            className="nu-btn-primary"
            style={{ display: "flex", alignItems: "center", gap: 8, backgroundColor: analyzing ? "#0E1118" : "#0066FF" }}
            disabled={analyzing}
          >
            {analyzing ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Zap size={15} fill="#00D4FF" color="#00D4FF" />
            )}
            {analyzing ? "Running Agent Pipeline..." : "Assess Policy"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 24, alignItems: "start" }}>
        {/* Left Column: Details & Tabbed Content */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 24, borderBottom: "1px solid #1E2535", padding: "0 4px" }}>
            {[
              { id: "details", label: "Details", icon: FileText },
              { id: "history", label: "History", icon: HistoryIcon },
              { id: "chat", label: "Policy Chat", icon: MessageSquare },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 10px",
                  fontSize: 13,
                  fontWeight: activeTab === t.id ? 600 : 400,
                  color: activeTab === t.id ? "#00D4FF" : "#8A95B0",
                  borderBottom: `2px solid ${activeTab === t.id ? "#00D4FF" : "transparent"}`,
                  background: "none",
                  cursor: "pointer",
                  transition: "all 150ms ease",
                }}
              >
                <t.icon size={14} />
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="nu-card" style={{ padding: 24 }}>
            {activeTab === "details" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span className="nu-label">Vehicle Info</span>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 4 }}>
                      <div>
                        <div style={{ fontSize: 11, color: "#485068", textTransform: "uppercase" }}>Make / Model</div>
                        <div className="nu-mono-value" style={{ fontSize: 13 }}>{policy.vehicle_make} {policy.vehicle_model}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "#485068", textTransform: "uppercase" }}>Year</div>
                        <div className="nu-mono-value" style={{ fontSize: 13 }}>{policy.vehicle_year || "2020"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "#485068", textTransform: "uppercase" }}>Engine (CC)</div>
                        <div className="nu-mono-value" style={{ fontSize: 13 }}>{policy.engine_cc || "1497cc"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "#485068", textTransform: "uppercase" }}>Fuel Type</div>
                        <div className="nu-mono-value" style={{ fontSize: 13 }}>{policy.fuel_type || "Petrol"}</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span className="nu-label">Registration</span>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 4 }}>
                      <div>
                        <div style={{ fontSize: 11, color: "#485068", textTransform: "uppercase" }}>City</div>
                        <div className="nu-mono-value" style={{ fontSize: 13 }}>{policy.city || "Mumbai"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "#485068", textTransform: "uppercase" }}>RTO Code</div>
                        <div className="nu-mono-value" style={{ fontSize: 13 }}>MH-01</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span className="nu-label">Policy & Commercials</span>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 4 }}>
                      <div>
                        <div style={{ fontSize: 11, color: "#485068", textTransform: "uppercase" }}>Usage Type</div>
                        <div className={`nu-mono-value`} style={{ fontSize: 13, color: policy.usage_type === "Commercial" ? "#FFB300" : "#F0F4FF" }}>
                          {policy.usage_type || "Personal"}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "#485068", textTransform: "uppercase" }}>Annual Mileage</div>
                        <div className="nu-mono-value" style={{ fontSize: 13 }}>{policy.annual_mileage?.toLocaleString() || "12,000"} KM</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "#485068", textTransform: "uppercase" }}>IDV (Insured Value)</div>
                        <div className="nu-mono-value" style={{ fontSize: 13 }}>₹{policy.idv_value?.toLocaleString() || "0"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "#485068", textTransform: "uppercase" }}>Current Premium</div>
                        <div className="nu-mono-value" style={{ fontSize: 13, color: "#0066FF" }}>₹{policy.premium_amount?.toLocaleString() || "0"}</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span className="nu-label">History & Safety</span>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 4 }}>
                      <div>
                        <div style={{ fontSize: 11, color: "#485068", textTransform: "uppercase" }}>Prior Claims</div>
                        <div className={`nu-mono-value ${policy.prior_claims > 0 ? "text-danger" : ""}`} style={{ fontSize: 13 }}>{policy.prior_claims ?? 0}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "#485068", textTransform: "uppercase" }}>NCB %</div>
                        <div className="nu-mono-value" style={{ fontSize: 13, color: "#00E676" }}>{policy.ncb_percent || "0"}%</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "#485068", textTransform: "uppercase" }}>Anti-Theft</div>
                        <div className="nu-mono-value" style={{ fontSize: 13 }}>{policy.anti_theft_device ? "Yes" : "No"}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === "history" && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#485068" }}>
                <HistoryIcon size={32} style={{ margin: "0 auto 12px", opacity: 0.2 }} />
                <div style={{ fontStyle: "italic", fontSize: 13 }}>No historical risk assessments recorded for this profile yet.</div>
              </div>
            )}
            {activeTab === "chat" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ backgroundColor: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: 8, padding: 12, display: "flex", gap: 10 }}>
                  <Bot size={18} color="#00D4FF" />
                  <div style={{ fontSize: 13, color: "#8A95B0", lineHeight: 1.5 }}>
                    Hello! I'm your AI analyst. I have full context of this policy. You can ask things like <span style={{ color: "#00D4FF" }}>"Why is the risk score high?"</span> or <span style={{ color: "#00D4FF" }}>"Compare this quote with Digit"</span>.
                  </div>
                </div>
                <div style={{ height: 100 }} />
                <div style={{ display: "flex", gap: 10 }}>
                  <input type="text" className="nu-input" placeholder="Ask about this policy..." />
                  <button className="nu-btn-primary" style={{ padding: "0 16px" }}>Send</button>
                </div>
              </div>
            )}
          </div>

          {/* Section: Agent Execution Trace */}
          {policy.last_analysis_trace && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 4px" }}>
                <TrendingUp size={14} color="#00D4FF" />
                <span className="font-mono-ibm" style={{ fontSize: 14, fontWeight: 600, color: "#F0F4FF" }}>Agent Executive Trace</span>
                <span className="font-roboto-mono" style={{ fontSize: 10, color: "#485068", marginLeft: "auto" }}>llama-3.3-70b · 2.8s total</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {[
                  { name: "Supervisor", icon: Zap, status: "complete" },
                  { name: "Risk Assessment", icon: ShieldAlert, status: "complete" },
                  { name: "SHAP Explainer", icon: AlertTriangle, status: "complete" },
                  { name: "Report Node", icon: CircleCheck, status: "complete" },
                ].map((node, i, arr) => (
                  <div key={node.name} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                    <div className="agent-trace-node complete">
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <node.icon size={13} color="#00D4FF" />
                        <span className="font-roboto-mono" style={{ fontSize: 8, color: "#00E676" }}>READY</span>
                      </div>
                      <div className="font-mono-ibm" style={{ fontSize: 11, fontWeight: 600, color: "#F0F4FF", marginTop: 4 }}>{node.name}</div>
                    </div>
                    {i < arr.length - 1 && <ChevronRight className="agent-trace-arrow" size={14} />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Intelligence Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Risk Score Card */}
          <div className="nu-card-ai" style={{ padding: 24, textAlign: "center" }}>
            <div className="kpi-label" style={{ marginBottom: 16 }}>Intelligence Profile</div>
            <div style={{ position: "relative", display: "inline-block" }}>
              <svg width="140" height="80">
                <path d="M 10 70 A 60 60 0 0 1 130 70" fill="none" stroke="#1E2535" strokeWidth="12" strokeLinecap="round" />
                <path
                  d="M 10 70 A 60 60 0 0 1 130 70"
                  fill="none"
                  stroke={RISK_COLORS[String(policy.risk_band || "LOW").toUpperCase()] || "#00E676"}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray="188.5"
                  strokeDashoffset={188.5 - (188.5 * (policy.risk_score || 0)) / 100}
                  style={{ transition: "stroke-dashoffset 800ms ease" }}
                />
              </svg>
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                }}
              >
                <div className="nu-mono-value" style={{ fontSize: 44, fontWeight: 700, lineHeight: 1 }}>{policy.risk_score || "—"}</div>
                <div className="kpi-label" style={{ marginTop: 2, fontSize: 9 }}>Risk Index</div>
              </div>
            </div>
            <div style={{ marginTop: 20 }}>
              <RiskBadge band={policy.risk_band || "LOW"} />
            </div>
            <div className="nu-divider" style={{ margin: "20px 0" }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ textAlign: "left" }}>
                <div className="kpi-label" style={{ fontSize: 9 }}>Claim Prob</div>
                <div className="font-roboto-mono" style={{ fontSize: 13, color: "#F0F4FF", marginTop: 4 }}>{(policy.claim_probability || 0).toFixed(1)}%</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="kpi-label" style={{ fontSize: 9 }}>Confidence</div>
                <div className="font-roboto-mono" style={{ fontSize: 13, color: "#22C55E", marginTop: 4 }}>94%</div>
              </div>
            </div>
          </div>

          {/* SHAP Attribution Card */}
          {policy.risk_factors && policy.risk_factors.length > 0 && (
            <div className="nu-card" style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <InfoIcon size={13} color="#0066FF" />
                <span className="font-mono-ibm" style={{ fontSize: 13, fontWeight: 600, color: "#F0F4FF" }}>Attribution Analysis (SHAP)</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {policy.risk_factors.map((factor: any) => (
                  <div key={factor.feature} className="shap-bar-container">
                    <div className="shap-label">{factor.feature}</div>
                    <div className="shap-bar-track">
                      <div
                        className={factor.impact >= 0 ? "shap-bar-fill-pos" : "shap-bar-fill-neg"}
                        style={{ width: `${Math.abs(factor.impact) * 80}%` }}
                      />
                    </div>
                    <div className="shap-value" style={{ color: factor.impact >= 0 ? "#0066FF" : "#FF3B5C" }}>
                      {factor.impact >= 0 ? "+" : ""}{factor.impact.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, fontSize: 10, color: "#485068", fontStyle: "italic", textAlign: "right" }}>
                *XGBoost feature importance coefficients
              </div>
            </div>
          )}

          {/* Premium Advisory Card */}
          <div className="nu-card-elevated" style={{ padding: 24 }}>
            <div className="kpi-label" style={{ marginBottom: 12 }}>Premium Advisory</div>
            <div className="nu-mono-value" style={{ fontSize: 28, color: "#0066FF" }}>₹{policy.premium_amount?.toLocaleString() || "—"}</div>
            <div style={{ fontSize: 12, color: "#F0F4FF", fontWeight: 500, marginTop: 4 }}>Expected Annual Premium</div>
            <div className="nu-divider" style={{ margin: "16px 0" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#8A95B0", fontSize: 11 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: policy.usage_type === "Commercial" ? "#FFB300" : "#00E676" }} />
                <span>Impact: {policy.usage_type || "Personal"} Use</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#8A95B0", fontSize: 11 }}>
                <CircleCheck size={12} color="#00E676" />
                <span>Optimized for {policy.registration_city || "Mumbai"} RTO</span>
              </div>
            </div>
            <Link
              to={`/premium-advisory?policy=${id}`}
              className="nu-btn-ghost"
              style={{ width: "100%", textAlign: "center", display: "inline-block", marginTop: 20, fontSize: 11 }}
            >
              Simulate Scenarios →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bot({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  );
}
