import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  TrendingUp,
  RefreshCw,
  Zap,
  IndianRupee,
  CheckCircle,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { getPolicies, getPolicy, predictClaim, checkClaimEligibility } from "@/lib/api";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, AICard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AnimatedList } from "@/components/ui/AnimatedList";

export default function ClaimPrediction() {
  const [searchParams] = useSearchParams();
  const policyId = searchParams.get("policy");
  
  const [policies, setPolicies] = useState<any[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState(policyId || "");
  const [policy, setPolicy] = useState<any>(null);
  const [prediction, setPrediction] = useState<any>(null);
  const [eligibility, setEligibility] = useState<any>(null);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);
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
  const [analyzingPrediction, setAnalyzingPrediction] = useState(false);
  const [analyzingEligibility, setAnalyzingEligibility] = useState(false);

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
    
    // Clear previous results
    setPrediction(null);
    setEligibility(null);
    setEligibilityError(null);
    
    setAnalyzingPrediction(true);
    try {
      const predResult = await predictClaim(selectedPolicyId);
      setPrediction(predResult);
      setAnalyzingPrediction(false);

      if (incidentData.incident_type && incidentData.date_of_incident) {
        setAnalyzingEligibility(true);
        try {
          const eligResult = await checkClaimEligibility({
            policy_id: selectedPolicyId,
            ...incidentData,
          });
          setEligibility(eligResult);
        } catch (eligErr: any) {
          setEligibilityError(eligErr?.message || "Eligibility analysis failed. Claim probability is still available.");
        }
      }
      toast.success("Intelligence assessment stream finalized");
    } catch (err: any) {
      toast.error(err.message || "Prediction node error");
    } finally {
      setAnalyzingPrediction(false);
      setAnalyzingEligibility(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <PageHeader
        title="Claim Intelligence"
        subtitle="Predictive liability scoring and ReAct eligibility attribution"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left: Input Panel */}
        <Card className="p-6 flex flex-col gap-6">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-2 block">Select Target Policy</label>
            <select
              className="w-full bg-surface-raised border border-surface-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-500 transition-colors"
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

          <div className="h-px w-full bg-surface-border my-2" />

          {policy && (
            <div className="flex flex-col gap-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Incident Attributes</div>
              
              <div className="flex flex-col gap-2">
                <span className="text-sm text-text-secondary">Incident Type</span>
                <select 
                  className="bg-surface-raised border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 w-full" 
                  onChange={(e) => setIncidentData({ ...incidentData, incident_type: e.target.value })}
                >
                  <option value="">Select type...</option>
                  <option value="accident">Accident / Collision</option>
                  <option value="theft">Total Theft</option>
                  <option value="vandalism">Vandalism</option>
                  <option value="flood">Natural Calamity</option>
                  <option value="fire">Fire / Explosion</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-sm text-text-secondary">Incident Date</span>
                <input 
                  type="date" 
                  className="bg-surface-raised border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 w-full" 
                  onChange={(e) => setIncidentData({ ...incidentData, date_of_incident: e.target.value })} 
                />
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-text-secondary">FIR Report Filed?</span>
                <button
                  onClick={() => setIncidentData({ ...incidentData, fir_filed: !incidentData.fir_filed })}
                  className={`w-11 h-6 rounded-full relative transition-colors ${incidentData.fir_filed ? 'bg-brand-500' : 'bg-surface-border-strong'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${incidentData.fir_filed ? 'left-6' : 'left-1'}`} />
                </button>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-text-secondary">Policyholder at Fault?</span>
                <button
                  onClick={() => setIncidentData({ ...incidentData, at_fault: !incidentData.at_fault })}
                  className={`w-11 h-6 rounded-full relative transition-colors ${incidentData.at_fault ? 'bg-brand-500' : 'bg-surface-border-strong'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${incidentData.at_fault ? 'left-6' : 'left-1'}`} />
                </button>
              </div>

              <Button
                onClick={handlePredict}
                disabled={analyzingPrediction || analyzingEligibility}
                className="w-full mt-2"
              >
                {analyzingPrediction || analyzingEligibility ? <RefreshCw className="animate-spin mr-2" size={16} /> : <TrendingUp className="mr-2" size={16} />}
                {analyzingPrediction ? "Predicting Risk..." : analyzingEligibility ? "Tracing LLM Eligibility..." : "Assess Eligibility"}
              </Button>
            </div>
          )}
        </Card>

        {/* Right: Results Analysis */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {loading ? (
            <Card className="p-20 flex justify-center items-center">
              <Skeleton className="h-10 w-10 rounded-full animate-spin" />
            </Card>
          ) : !prediction ? (
            <Card className="p-20 text-center opacity-60">
              <IndianRupee size={40} className="mx-auto text-text-tertiary mb-4" />
              <div className="text-sm font-mono-code text-text-secondary">Awaiting Record Stream Input</div>
            </Card>
          ) : (
            <AnimatedList className="flex flex-col gap-6">
              {/* Primary Result Hero */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AICard hoverable={false} className="p-6 text-center">
                  <div className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Probability Index</div>
                  <div className={`text-5xl font-mono-code font-bold mt-4 mb-2 ${prediction.claim_probability > 0.5 ? 'text-error' : 'text-success'}`}>
                    {(prediction.claim_probability * 100).toFixed(1)}%
                  </div>
                  <Badge variant={prediction.claim_probability > 0.5 ? "critical" : "low"}>
                    {prediction.claim_probability > 0.5 ? "ELEVATED RISK" : "NOMINAL RISK"}
                  </Badge>
                </AICard>

                <Card className="p-6 text-center flex flex-col justify-center">
                  <div className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Eligibility Verdict</div>
                  <div className={`text-2xl font-mono-code font-bold mt-4 mb-2 ${eligibility ? (eligibility.eligible ? 'text-success' : 'text-error') : 'text-warning'}`}>
                    {eligibility ? (eligibility.eligible ? "APPROVED" : "REJECTED") : "PENDING DATA"}
                  </div>
                  <div className="text-xs text-text-secondary">
                    {eligibility ? eligibility.eligibility_reason : "Awaiting detailed incident data"}
                  </div>
                </Card>
              </div>

              {/* Eligibility Loading/Error States */}
              {analyzingEligibility && (
                <Card className="p-12 text-center">
                  <RefreshCw className="animate-spin mx-auto text-ai mb-4" size={24} />
                  <div className="text-sm text-text-secondary">AI analyzing claim eligibility...</div>
                </Card>
              )}

              {eligibilityError && (
                <Card className="p-6 bg-error/5 border-error/20">
                  <div className="text-error text-sm font-medium">{eligibilityError}</div>
                </Card>
              )}

              {/* Eligibility details */}
              {eligibility && (
                <Card className="p-6 flex flex-col gap-6">
                  <div className="flex items-center gap-2">
                    <Zap size={16} className="text-ai" />
                    <span className="font-semibold text-text-primary">Eligibility Analysis</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-surface-raised border border-surface-border rounded-lg">
                      <div className="text-xs text-text-tertiary mb-2 uppercase tracking-wider">NCB Impact</div>
                      <div className="text-sm text-text-primary font-medium">{eligibility.ncb_impact}</div>
                    </div>
                    
                    <div className="p-4 bg-surface-raised border border-surface-border rounded-lg">
                      <div className="text-xs text-text-tertiary mb-2 uppercase tracking-wider">Estimated Claim Range</div>
                      <div className="text-sm text-brand-500 font-mono-code font-medium">{eligibility.estimated_claim_range}</div>
                    </div>
                  </div>

                  {eligibility.rejection_risks && eligibility.rejection_risks.length > 0 && (
                    <div className="p-4 bg-error/10 border border-error/20 rounded-lg">
                      <div className="text-xs text-error mb-3 font-semibold uppercase tracking-wider">Rejection Risks ({eligibility.risk_of_rejection})</div>
                      <ul className="space-y-2">
                        {eligibility.rejection_risks.map((risk: string, i: number) => (
                           <li key={i} className="flex items-start gap-2 text-sm text-text-primary">
                             <AlertTriangle size={14} className="text-error mt-0.5 shrink-0" />
                             <span>{risk}</span>
                           </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-2 h-px w-full bg-surface-border" />

                  <div className="flex flex-col gap-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Next Steps</div>
                    <ol className="list-decimal pl-4 space-y-2 text-sm text-text-secondary marker:text-text-tertiary">
                      {eligibility.next_steps?.map((step: string, i: number) => (
                        <li key={i} className="pl-1">{step}</li>
                      ))}
                    </ol>
                  </div>

                  <div className="flex flex-col gap-4 mt-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Documents Required</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(eligibility.documents_required || [
                        "FIR Copy (Mandatory)",
                        "Driving License",
                        "Insurance Policy",
                        "RC Book Snapshot",
                        "Damage Estimate",
                        "KYC Evidence",
                      ]).map((doc: string) => (
                        <div key={doc} className="flex items-center gap-3 p-3 rounded-lg bg-surface-raised border border-surface-border">
                          <FileText size={14} className="text-brand-500" />
                          <span className="text-sm text-text-primary">{doc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              )}
            </AnimatedList>
          )}
        </div>
      </div>
    </div>
  );
}
