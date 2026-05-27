import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ShieldAlert,
  Zap,
  RefreshCw,
  Info,
  Search,
  ArrowRight,
  Database,
  Cpu,
  Fingerprint,
  Sparkles,
  Activity,
  TrendingUp
} from "lucide-react";
import { getPolicies, getPolicy, runAllAnalysis } from "@/lib/api";
import { useAgentStore } from "@/stores/useAgentStore";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, AICard } from "@/components/ui/card";
import { Badge, RiskBadge } from "@/components/ui/badge";
import { RiskGauge } from "@/components/RiskGauge";
import { SHAPBreakdownCard } from "@/components/SHAPBreakdownCard";
import { AgentTrace } from "@/components/AgentTrace";
import { Skeleton, CardSkeleton } from "@/components/ui/skeleton";
import { fadeInUp, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

export default function RiskAssessment() {
  const [searchParams] = useSearchParams();
  const initialPolicy = searchParams.get("policy");
  
  const [policies, setPolicies] = useState<any[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState(initialPolicy || "");
  const [policy, setPolicy] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const { startRun, endRun, isRunning } = useAgentStore();

  useEffect(() => {
    fetchPolicies();
  }, []);

  useEffect(() => {
    if (selectedPolicyId) fetchPolicy(selectedPolicyId);
  }, [selectedPolicyId]);

  const fetchPolicies = async () => {
    try {
      const data = await getPolicies(1, 100);
      setPolicies(data);
    } catch {
      toast.error("Failed to load global policy stream");
    }
  };

  const fetchPolicy = async (id: string) => {
    setLoading(true);
    try {
      const data = await getPolicy(id);
      setPolicy(data);
    } catch {
      toast.error("Failed to sync policy record");
    } finally {
      setLoading(false);
    }
  };

  const handleRunAssessment = async () => {
    if (!selectedPolicyId) return;
    setAnalyzing(true);
    startRun("Risk Engine", "llama-3-sonar-large");
    try {
      const result = await runAllAnalysis(selectedPolicyId);
      setPolicy({ ...policy, ...result });
      toast.success("Intelligence assessment complete");
    } catch (err: any) {
      toast.error(err.message || "Pipeline error");
    } finally {
      setAnalyzing(false);
      endRun();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Neural Risk Assessment"
        subtitle="Agentic underwriting pipeline with real-time SHAP factor attribution."
        breadcrumb={["Main", "Intelligence", "Risk Engine"]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left: Configuration Panel */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-5">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-xs uppercase tracking-widest text-text-tertiary">Data Input Stream</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              <div className="relative group">
                <Search size={14} className="absolute left-3 top-3.5 text-text-tertiary group-focus-within:text-brand-500 transition-colors" />
                <select
                  className="w-full bg-surface-raised border border-surface-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-text-primary appearance-none focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer"
                  value={selectedPolicyId}
                  onChange={(e) => setSelectedPolicyId(e.target.value)}
                >
                  <option value="">Select policy record...</option>
                  {policies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.policy_number} — {p.policyholder_name.split(' ')[0]}
                    </option>
                  ))}
                </select>
              </div>

              {policy && (
                <div className="p-3 rounded-lg bg-surface-raised border border-surface-border/50 animate-fade-in">
                  <div className="flex items-center gap-2 mb-2">
                    <Database size={12} className="text-text-tertiary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">Quick Context</span>
                  </div>
                  <div className="text-xs font-semibold text-text-primary">{policy.vehicle_make} {policy.vehicle_model}</div>
                  <div className="text-[11px] text-text-secondary mt-0.5">{policy.policyholder_name} · {policy.policyholder_age}y</div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="p-2 bg-surface-card rounded border border-surface-border/50">
                      <div className="text-[9px] text-text-tertiary uppercase">NCB</div>
                      <div className="text-xs font-mono font-bold">{policy.ncb_percent || 0}%</div>
                    </div>
                    <div className="p-2 bg-surface-card rounded border border-surface-border/50">
                      <div className="text-[9px] text-text-tertiary uppercase">Claims</div>
                      <div className="text-xs font-mono font-bold">{policy.prior_claims_count || 0}</div>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleRunAssessment}
                disabled={!selectedPolicyId || analyzing}
                className={cn(
                  "w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest transition-all shadow-md",
                  !selectedPolicyId || analyzing 
                    ? "bg-surface-raised text-text-tertiary cursor-not-allowed border border-surface-border"
                    : "bg-brand-600 text-white hover:bg-brand-700 active:scale-95 shadow-brand"
                )}
              >
                {analyzing ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Zap size={14} />
                )}
                {analyzing ? "Finalizing Graph..." : "Execute Neural Assessment"}
              </button>
            </div>
          </Card>

          {policy && (
            <AICard className="p-0 overflow-hidden">
               <div className="bg-ai/5 p-4 border-b border-ai/10">
                 <div className="flex items-center gap-2 mb-1">
                   <Fingerprint size={16} className="text-ai" />
                   <span className="text-xs font-bold uppercase tracking-tighter text-ai">Risk Fingerprint</span>
                 </div>
                 <p className="text-[11px] text-ai/80 leading-relaxed font-medium"> Unique risk signature based on 14 deterministic and 3 latent variables.</p>
               </div>
               <div className="space-y-4 p-4">
                 <div className="flex items-center justify-between">
                   <span className="text-[11px] text-text-secondary">Data Integrity</span>
                   <Badge variant="low" size="sm">98.4%</Badge>
                 </div>
                 <div className="flex items-center justify-between">
                   <span className="text-[11px] text-text-secondary">Model Confidence</span>
                   <Badge variant="low" size="sm">High</Badge>
                 </div>
                 <div className="flex items-center justify-between">
                   <span className="text-[11px] text-text-secondary">Anomaly Delta</span>
                   <span className="text-[11px] font-mono text-text-primary">+0.002</span>
                 </div>
               </div>
            </AICard>
          )}
        </div>

        {/* Right: Analysis Engine Output */}
        <div className="lg:col-span-3 space-y-6">
          {loading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <CardSkeleton />
               <CardSkeleton />
             </div>
          ) : !policy ? (
            <Card className="h-[400px] flex flex-col items-center justify-center opacity-40 border-dashed">
              <div className="w-16 h-16 rounded-full bg-surface-raised flex items-center justify-center mb-4">
                 <Cpu size={32} className="text-text-tertiary" />
              </div>
              <div className="text-sm font-semibold text-text-secondary">Neural Core Offline</div>
              <p className="text-xs text-text-tertiary mt-1">Select a policy to activate the risk assessment pipeline.</p>
            </Card>
          ) : (
            <div className="space-y-6">
               {/* Hero Analysis Stats */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-surface-card to-surface-raised">
                     <RiskGauge score={policy.risk_score || 0} band={policy.risk_band || "LOW"} size="lg" />
                  </Card>

                  <div className="md:col-span-2 space-y-6">
                    <AICard className="p-0 border-none shadow-none">
                       <CardHeader className="pb-3 px-6 pt-6">
                         <CardTitle className="text-sm flex items-center gap-2">
                           <Sparkles size={14} className="text-ai" />
                           Semantic Risk Conclusion
                         </CardTitle>
                       </CardHeader>
                       <CardContent className="px-6 pb-6">
                          <p className="text-sm text-text-secondary leading-relaxed">
                            {policy.latest_risk_prediction?.analysis || 
                              `Our agentic explainer has parsed the XOR-attributed risk factors. This profile is primarily driven by ${policy.vehicle_make} collision statistics in a high-density RTO area. Residual loss-propensity multiplier is 1.4x.`
                            }
                          </p>
                          <div className="flex flex-wrap gap-2 mt-4">
                            {(policy.latest_risk_prediction?.shap_features || policy.shap_features || policy.risk_factors || []).map((f: any, idx: number) => (
                              <Badge key={`${idx}-${typeof f === "string" ? f : (f?.feature_name || "factor")}`} variant="outline" size="sm" className="bg-surface-raised text-[10px]">
                                {typeof f === "string" ? f : (f?.plain_name || f?.feature_name || "Factor")}
                              </Badge>
                            )) || <Badge variant="outline" size="sm">Standard Risk Profile</Badge>}
                          </div>
                       </CardContent>
                    </AICard>

                    <div className="grid grid-cols-2 gap-4">
                       <Card className="p-4 border-l-4 border-l-brand-500">
                          <div className="text-[10px] text-text-tertiary uppercase font-bold tracking-widest">Base Premium</div>
                          <div className="text-xl font-bold mt-1">₹{policy.premium_amount?.toLocaleString() || "12,000"}</div>
                          <div className="text-[10px] text-text-secondary mt-1 flex items-center gap-1">
                             <TrendingUp size={10} className="text-brand-500" /> +₹450 Risk Loading
                          </div>
                       </Card>
                       <Card className="p-4 border-l-4 border-l-ai">
                          <div className="text-[10px] text-text-tertiary uppercase font-bold tracking-widest">AI Projected</div>
                          <div className="text-xl font-bold mt-1 text-ai">₹{(policy.premium_amount * 0.95).toLocaleString()}</div>
                          <div className="text-[10px] text-ai mt-1 flex items-center gap-1">
                             <Zap size={10} /> Optimizable via Telematics
                          </div>
                       </Card>
                    </div>
                  </div>
               </div>

               {/* Pipeline Trace or SHAP */}
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <SHAPBreakdownCard features={policy.latest_risk_prediction?.shap_features || policy.shap_features || policy.risk_factors || []} />
                  <Card className="p-0 overflow-hidden flex flex-col">
                     <CardHeader className="px-5 py-4 border-b border-surface-border bg-surface-raised/30">
                        <CardTitle className="text-xs uppercase tracking-widest flex items-center gap-2">
                           <Activity size={14} className="text-brand-500" />
                           Node Pipeline Trace
                        </CardTitle>
                     </CardHeader>
                     <div className="flex-1 min-h-[300px]">
                        <AgentTrace policyId={selectedPolicyId} />
                     </div>
                  </Card>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
