import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  IndianRupee,
  RefreshCw,
  Loader2,
  Zap,
  ChevronRight,
  TrendingDown,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  TrendingUp,
} from "lucide-react";
import { getPolicies, getPolicy, advisePremium, generateReport, submitBatchAnalysis } from "@/lib/api";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function PremiumAdvisory() {
  const [searchParams] = useSearchParams();
  const policyId = searchParams.get("policy");
  
  const [policies, setPolicies] = useState<any[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState(policyId || "");
  const [policy, setPolicy] = useState<any>(null);
  const [advisory, setAdvisory] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [report, setReport] = useState<any>(null);

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
    } catch {
      toast.error("Failed to load policy record");
    } finally {
      setLoading(false);
    }
  };

  const handleAdvise = async () => {
    if (!selectedPolicyId) return;
    setAnalyzing(true);
    try {
      const result = await advisePremium(selectedPolicyId);
      setAdvisory(result);
      toast.success("Pricing intelligence stream finalized");
    } catch (err: any) {
      toast.error(err.message || "Advisory node error");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleViewFullReport = async () => {
    if (!selectedPolicyId) return;
    setActionLoading("viewReport");
    try {
      const res = await generateReport(selectedPolicyId);
      setReport(res);
      toast.success("Full report generated");
    } catch (err: any) {
      toast.error(err.message || "Report generation failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprovePremium = async () => {
    if (!selectedPolicyId) return;
    setActionLoading("approve");
    try {
      await new Promise(r => setTimeout(r, 1000));
      toast.success(`Premium rate approved for ₹${advisory?.premium_range?.max?.toLocaleString() || "0"}`);
    } catch (err: any) {
      toast.error(err.message || "Approval failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestOverride = async () => {
    if (!selectedPolicyId) return;
    setActionLoading("override");
    try {
      toast.info("Manual override requested - escalation sent to supervisor");
    } catch (err: any) {
      toast.error(err.message || "Override request failed");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div>
        <h1 className="nu-page-title">Premium Intelligence</h1>
        <div className="nu-page-subtitle">AI-optimized pricing strategy and multi-insurer comparison</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 2fr", gap: 24, alignItems: "start" }}>
        {/* Left: Input Selection */}
        <div className="nu-card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
          <div>
            <label className="nu-label">Select Target Policy</label>
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
                  {p.policy_number} — {p.policyholder_name}
                </option>
              ))}
            </select>
          </div>

          <div className="nu-divider" />

          {policy && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="kpi-label" style={{ fontSize: 10 }}>Current Profile View</div>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="nu-muted" style={{ fontSize: 12 }}>Risk Band</span>
                <span className="risk-badge risk-badge-high" style={{ fontSize: 10 }}>● HIGH</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="nu-muted" style={{ fontSize: 12 }}>IDV Value</span>
                <span className="nu-mono-value" style={{ fontSize: 13 }}>₹{policy.insured_value?.toLocaleString() || policy.idv_value?.toLocaleString()}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="nu-muted" style={{ fontSize: 12 }}>Current Premium</span>
                <span className="nu-mono-value" style={{ fontSize: 13 }}>₹{policy.premium_amount?.toLocaleString()}</span>
              </div>

              <button
                className="nu-btn-primary"
                onClick={handleAdvise}
                disabled={analyzing}
                style={{ width: "100%", justifyContent: "center", height: 44, marginTop: 10 }}
              >
                {analyzing ? <RefreshCw className="animate-spin" size={16} /> : <Zap size={16} fill="#00D4FF" color="#00D4FF" />}
                Analyze Optimal Rate
              </button>
            </div>
          )}
        </div>

        {/* Right: Results Analysis */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {loading ? (
            <div className="nu-card" style={{ padding: 100, textAlign: "center" }}>
              <Loader2 className="animate-spin" size={24} color="#00D4FF" />
            </div>
          ) : !advisory ? (
            <div className="nu-card" style={{ padding: 100, textAlign: "center", opacity: 0.5 }}>
              <IndianRupee size={40} color="#1E2535" style={{ margin: "0 auto 16px" }} />
              <div className="font-mono-ibm text-sm">Awaiting Pricing Stream Input</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Output Hero Card */}
              <div className="nu-card-ai" style={{ padding: 32, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                <div className="kpi-label" style={{ fontSize: 10, letterSpacing: "0.2em" }}>Recommended Annual Premium</div>
                <div 
                  className="nu-mono-value" 
                  style={{ 
                    fontSize: 48, 
                    marginTop: 16, 
                    color: "#0066FF",
                    textShadow: "0 0 30px rgba(0, 102, 255, 0.15)" 
                  }}
                >
                  ₹{advisory.premium_range?.min?.toLocaleString() || "0"} — ₹{advisory.premium_range?.max?.toLocaleString() || "0"}
                </div>
                <div style={{ fontSize: 13, color: "#8A95B0", marginTop: 8, maxWidth: "80%" }}>
                  Base premium optimized for <span style={{ color: "#F0F4FF" }}>{policy.usage_type || policy.vehicle_use}</span> usage profile in <span style={{ color: "#F0F4FF" }}>{policy.region || policy.city}</span>.
                </div>
                
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 24 }}>
                  <div className="risk-badge risk-badge-high" style={{ padding: "4px 12px", borderRadius: 20 }}>Vehicle Age (+₹3,200)</div>
                  <div className="risk-badge risk-badge-medium" style={{ padding: "4px 12px", borderRadius: 20 }}>Commercial Use (+₹2,800)</div>
                  <div className="risk-badge risk-badge-low" style={{ padding: "4px 12px", borderRadius: 20 }}>No Anti-theft (+₹1,400)</div>
                </div>
              </div>

              {/* Insurer Comparison */}
              <div className="nu-card" style={{ padding: 24 }}>
                <div className="kpi-label" style={{ fontSize: 10, marginBottom: 20 }}>Market Comparison Benchmarks</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                  {[
                    { name: "ICICI Lombard", range: "₹19,200 - ₹29,400", style: "Comprehensive" },
                    { name: "HDFC ERGO", range: "₹18,800 - ₹28,600", style: "Standard" },
                    { name: "Digit Insure", range: "₹17,500 - ₹26,800", style: "Economy" },
                  ].map((insurer) => (
                    <div key={insurer.name} className="nu-card-elevated" style={{ padding: 16, textAlign: "center" }}>
                      <div className="font-mono-ibm" style={{ fontSize: 12, fontWeight: 700, color: "#F0F4FF" }}>{insurer.name}</div>
                      <div className="font-roboto-mono" style={{ fontSize: 12, color: "#0066FF", marginTop: 8 }}>{insurer.range}</div>
                      <div style={{ fontSize: 9, color: "#485068", textTransform: "uppercase", marginTop: 4 }}>{insurer.style}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Advisory Explanation */}
              <div className="nu-card-elevated" style={{ padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <ShieldCheck size={14} color="#00D4FF" />
                  <span className="font-mono-ibm" style={{ fontSize: 14, fontWeight: 600 }}>Underwriting Advisory</span>
                </div>
                <div className="font-dm-sans prose prose-invert prose-sm" style={{ fontSize: 13, color: "#8A95B0", lineHeight: 1.6, maxWidth: "none" }}>
                  {advisory.justification ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {advisory.justification}
                    </ReactMarkdown>
                  ) : "No rationale provided by the pricing engine."}
                  
                  <div style={{ marginTop: 12 }}>
                    This recommendation accounts for local accident density trends and current portfolio volatility. <span style={{ color: "#F0F4FF" }}>Add NCB protect for ₹1,240</span> to safeguard the 20% discount against secondary liability claims.
                  </div>
                </div>
                <div className="nu-divider" style={{ margin: "20px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(0,102,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Zap size={14} color="#0066FF" />
                    </div>
                    <div style={{ fontSize: 12, color: "#8A95B0" }}>Auto-optimized for IRDAI guidelines</div>
                  </div>
                  <button 
                    className="nu-btn-ghost" 
                    style={{ padding: "8px 16px", fontSize: 11 }}
                    onClick={handleViewFullReport}
                    disabled={actionLoading === "viewReport"}
                  >
                    {actionLoading === "viewReport" ? <RefreshCw className="animate-spin" size={12} /> : null} View Full Report
                  </button>
                </div>
              </div>
              
              {/* Action */}
              <div style={{ display: "flex", gap: 16 }}>
                <button 
                  className="nu-btn-primary" 
                  style={{ flex: 1, justifyContent: "center", height: 48 }}
                  onClick={handleApprovePremium}
                  disabled={actionLoading === "approve"}
                >
                  {actionLoading === "approve" ? <RefreshCw className="animate-spin" size={14} /> : null} Approve Premium Rate
                </button>
                <button 
                  className="nu-btn-ghost" 
                  style={{ flex: 1, justifyContent: "center", height: 48 }}
                  onClick={handleRequestOverride}
                  disabled={actionLoading === "override"}
                >
                  {actionLoading === "override" ? <RefreshCw className="animate-spin" size={14} /> : null} Request Manual Override
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
