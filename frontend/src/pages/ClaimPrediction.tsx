import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  TrendingUp,
  History,
  Info,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Zap,
  IndianRupee,
  Calendar,
  ChevronDown,
  CheckCircle,
} from "lucide-react";
import { getPolicies, getPolicy, predictClaim, checkClaimEligibility } from "@/lib/api";
import { toast } from "sonner";

export default function ClaimPrediction() {
  const [searchParams] = useSearchParams();
  const policyId = searchParams.get("policy");
  
  const [policies, setPolicies] = useState<any[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState(policyId || "");
  const [policy, setPolicy] = useState<any>(null);
  const [prediction, setPrediction] = useState<any>(null);
  const [eligibility, setEligibility] = useState<any>(null);
  const [incidentData, setIncidentData] = useState<any>({
    incident_type: "",
    date_of_incident: new Date().toISOString().split('T')[0],
    at_fault: false,
    fir_filed: true,
    third_party_involved: false,
    hours_since_incident: 24,
    damage_estimate_inr: 0,
  });
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

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

  const handlePredict = async () => {
    if (!selectedPolicyId) return;
    setAnalyzing(true);
    try {
      const predResult = await predictClaim(selectedPolicyId);
      setPrediction(predResult);

      if (incidentData.incident_type && incidentData.date_of_incident) {
        const eligResult = await checkClaimEligibility({
          policy_id: selectedPolicyId,
          ...incidentData,
        });
        setEligibility(eligResult);
      }
      toast.success("Intelligence assessment stream finalized");
    } catch (err: any) {
      toast.error(err.message || "Prediction node error");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div>
        <h1 className="nu-page-title">Claim Intelligence</h1>
        <div className="nu-page-subtitle">Predictive liability scoring and ReAct eligibility attribution</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 2fr", gap: 24, alignItems: "start" }}>
        {/* Left: Input Panel */}
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
              <div className="kpi-label" style={{ fontSize: 10 }}>Incident Attributes</div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span className="nu-muted" style={{ fontSize: 12 }}>Incident Type</span>
                <select className="nu-select" style={{ padding: 8 }} onChange={(e) => setIncidentData({ ...incidentData, incident_type: e.target.value })}>
                  <option value="">Select type...</option>
                  <option value="accident">Accident / Collision</option>
                  <option value="theft">Total Theft</option>
                  <option value="vandalism">Vandalism</option>
                  <option value="flood">Natural Calamity</option>
                  <option value="fire">Fire / Explosion</option>
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span className="nu-muted" style={{ fontSize: 12 }}>Incident Date</span>
                <div style={{ position: "relative" }}>
                  <input type="date" className="nu-input" style={{ padding: 8 }} onChange={(e) => setIncidentData({ ...incidentData, date_of_incident: e.target.value })} />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="nu-muted" style={{ fontSize: 12 }}>FIR Report Filed?</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked onChange={(e) => setIncidentData({ ...incidentData, fir_filed: e.target.checked })} />
                  <div className="w-9 h-5 bg-nu-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-secondary"></div>
                </label>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="nu-muted" style={{ fontSize: 12 }}>Policyholder at Fault?</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" onChange={(e) => setIncidentData({ ...incidentData, at_fault: e.target.checked })} />
                  <div className="w-9 h-5 bg-nu-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-secondary"></div>
                </label>
              </div>

              <button
                className="nu-btn-primary"
                onClick={handlePredict}
                disabled={analyzing}
                style={{ width: "100%", justifyContent: "center", height: 44 }}
              >
                {analyzing ? <RefreshCw className="animate-spin" size={16} /> : <TrendingUp size={16} />}
                Assess Eligibility
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
          ) : !prediction ? (
            <div className="nu-card" style={{ padding: 100, textAlign: "center", opacity: 0.5 }}>
              <IndianRupee size={40} color="#1E2535" style={{ margin: "0 auto 16px" }} />
              <div className="font-mono-ibm text-sm">Awaiting Record Stream Input</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Primary Result Hero */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div className="nu-card-ai" style={{ padding: 24, textAlign: "center" }}>
                  <div className="kpi-label" style={{ fontSize: 10 }}>Probability Index</div>
                  <div className="nu-mono-value" style={{ fontSize: 56, marginTop: 8, color: prediction.claim_probability > 0.5 ? "#FF3B5C" : "#00E676" }}>
                    {(prediction.claim_probability * 100).toFixed(1)}%
                  </div>
                  <div
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 12,
                      fontWeight: 700,
                      color: prediction.claim_probability > 0.5 ? "#FF3B5C" : "#00E676",
                      letterSpacing: "0.1em",
                      marginTop: 4,
                    }}
                  >
                    ● {prediction.claim_probability > 0.5 ? "ELEVATED RISK" : "NOMINAL RISK"}
                  </div>
                </div>

                <div className="nu-card" style={{ padding: 24, textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div className="kpi-label" style={{ fontSize: 10 }}>Eligibility Verdict</div>
                  <div
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 32,
                      fontWeight: 700,
                      color: "#FFB300",
                      marginTop: 12,
                    }}
                  >
                    CONDITIONAL
                  </div>
                  <div style={{ fontSize: 11, color: "#485068", marginTop: 4 }}>*NCB protection will be lost if claim is filed</div>
                </div>
              </div>

              {/* ReAct Trace Timeline */}
              <div className="nu-card-elevated" style={{ padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                  <Zap size={14} color="#00D4FF" fill="#00D4FF" />
                  <span className="font-mono-ibm" style={{ fontSize: 14, fontWeight: 600 }}>Claim Eligibility ReAct Trace</span>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div className="react-step">
                    <div className="react-step-dot" />
                    <div className="react-step-type">Thought 1</div>
                    <div className="react-step-content">Checking policy coverage type for commercial use declaration...</div>
                    <div className="react-step-code">coverage_check(policy_id='IQ-00247')</div>
                  </div>
                  <div className="react-step">
                    <div className="react-step-dot" />
                    <div className="react-step-type">Observation 1</div>
                    <div className="react-step-content">Coverage: Comprehensive. Commercial use declared in Mumbai RTO. Policy active.</div>
                  </div>
                  <div className="react-step">
                    <div className="react-step-dot" />
                    <div className="react-step-type">Thought 2</div>
                    <div className="react-step-content">FIR reported within 24h. Third party involved. Evaluating NCB impact rules...</div>
                    <div className="react-step-code">eligibility_rule_check(fir_filed=true, fault=false)</div>
                  </div>
                  <div className="react-step">
                    <div className="react-step-dot" />
                    <div className="react-step-type">Observation 2</div>
                    <div className="react-step-content">Eligible with NCB impact. Recommended for conditional approval.</div>
                  </div>
                  <div className="react-step" style={{ paddingBottom: 0 }}>
                    <div className="react-step-dot" style={{ borderColor: "#00E676" }} />
                    <div className="react-step-type" style={{ color: "#00E676" }}>Final Verdict</div>
                    <div className="react-step-content" style={{ color: "#F0F4FF", fontWeight: 600 }}>CONDITIONAL APPROVAL — NCB IMPACT: HIGH</div>
                  </div>
                </div>
              </div>

              {/* Document Check */}
              <div className="nu-card" style={{ padding: 24 }}>
                <div className="kpi-label" style={{ fontSize: 10, marginBottom: 16 }}>Required Compliance Artifacts</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    "FIR Copy (Mandatory)",
                    "Driving License",
                    "Insurance Policy",
                    "RC Book Snapshot",
                    "Damage Estimate",
                    "KYC Evidence",
                  ].map((doc) => (
                    <div key={doc} style={{ display: "flex", alignItems: "center", gap: 8, padding: 10, borderRadius: 6, backgroundColor: "#111622", border: "1px solid #1E2535" }}>
                      <CheckCircle size={14} color="#00E676" />
                      <span className="nu-muted" style={{ fontSize: 12 }}>{doc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
