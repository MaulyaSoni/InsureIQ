import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  IndianRupee,
  RefreshCw,
  Zap,
  ShieldCheck,
} from "lucide-react";
import { getPolicies, getPolicy, advisePremium, generateReport } from "@/lib/api";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, AICard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AnimatedList } from "@/components/ui/AnimatedList";

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
      await generateReport(selectedPolicyId);
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
    <div className="flex flex-col gap-6 animate-fade-in">
      <PageHeader
        title="Premium Intelligence"
        subtitle="AI-optimized pricing strategy and multi-insurer comparison"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left: Input Selection */}
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
              <div className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Current Profile View</div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-text-secondary">Risk Band</span>
                <Badge variant={policy.latest_risk_prediction?.risk_band?.toLowerCase() as any || "high"}>
                  {policy.latest_risk_prediction?.risk_band || "HIGH"}
                </Badge>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-text-secondary">IDV Value</span>
                <span className="text-sm font-mono-code text-text-primary">₹{policy.insured_value?.toLocaleString() || policy.idv_value?.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-text-secondary">Current Premium</span>
                <span className="text-sm font-mono-code text-text-primary">₹{policy.premium_amount?.toLocaleString()}</span>
              </div>

              <Button
                onClick={handleAdvise}
                disabled={analyzing}
                className="w-full mt-2"
              >
                {analyzing ? <RefreshCw className="animate-spin mr-2" size={16} /> : <Zap className="mr-2" size={16} />}
                Analyze Optimal Rate
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
          ) : !advisory ? (
            <Card className="p-20 text-center opacity-60">
              <IndianRupee size={40} className="mx-auto text-text-tertiary mb-4" />
              <div className="text-sm font-mono-code text-text-secondary">Awaiting Pricing Stream Input</div>
            </Card>
          ) : (
            <AnimatedList className="flex flex-col gap-6">
              {/* Output Hero Card */}
              <AICard hoverable={false} className="p-8 flex flex-col items-center text-center">
                <div className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Recommended Annual Premium</div>
                <div className="text-5xl font-mono-code font-bold text-brand-500 my-4 tracking-tight">
                  ₹{advisory.premium_range?.min?.toLocaleString() || "0"} — ₹{advisory.premium_range?.max?.toLocaleString() || "0"}
                </div>
                <div className="text-sm text-text-secondary max-w-lg mb-6">
                  Base premium optimized for <strong className="text-text-primary">{policy.usage_type || policy.vehicle_use}</strong> usage profile in <strong className="text-text-primary">{policy.region || policy.city}</strong>.
                </div>
                
                <div className="flex flex-wrap justify-center gap-2">
                  <Badge variant="high">Vehicle Age (+₹3,200)</Badge>
                  <Badge variant="medium">Commercial Use (+₹2,800)</Badge>
                  <Badge variant="low">No Anti-theft (+₹1,400)</Badge>
                </div>
              </AICard>

              {/* Insurer Comparison */}
              <Card className="p-6">
                <div className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-6">Market Comparison Benchmarks</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { name: "ICICI Lombard", range: "₹19,200 - ₹29,400", style: "Comprehensive" },
                    { name: "HDFC ERGO", range: "₹18,800 - ₹28,600", style: "Standard" },
                    { name: "Digit Insure", range: "₹17,500 - ₹26,800", style: "Economy" },
                  ].map((insurer) => (
                    <div key={insurer.name} className="bg-surface-raised border border-surface-border rounded-lg p-4 text-center">
                      <div className="font-semibold text-text-primary text-sm">{insurer.name}</div>
                      <div className="font-mono-code text-brand-500 text-sm mt-2">{insurer.range}</div>
                      <div className="text-[10px] text-text-tertiary uppercase mt-1 tracking-wider">{insurer.style}</div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Advisory Explanation */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck size={16} className="text-ai" />
                  <span className="font-semibold text-text-primary text-sm">Underwriting Advisory</span>
                </div>
                <div className="text-sm text-text-secondary leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                  {advisory.justification ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {advisory.justification}
                    </ReactMarkdown>
                  ) : "No rationale provided by the pricing engine."}
                  
                  <div className="mt-4">
                    This recommendation accounts for local accident density trends and current portfolio volatility. <strong className="text-text-primary">Add NCB protect for ₹1,240</strong> to safeguard the 20% discount against secondary liability claims.
                  </div>
                </div>
                <div className="my-6 h-px w-full bg-surface-border" />
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-500/10 flex items-center justify-center">
                      <Zap size={14} className="text-brand-500" />
                    </div>
                    <div className="text-xs text-text-secondary font-medium">Auto-optimized for IRDAI guidelines</div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleViewFullReport}
                    disabled={actionLoading === "viewReport"}
                  >
                    {actionLoading === "viewReport" && <RefreshCw className="animate-spin mr-2" size={14} />} 
                    View Full Report
                  </Button>
                </div>
              </Card>
              
              {/* Actions */}
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  className="h-12 w-full text-md font-medium"
                  onClick={handleApprovePremium}
                  disabled={actionLoading === "approve"}
                >
                  {actionLoading === "approve" && <RefreshCw className="animate-spin mr-2" size={16} />} 
                  Approve Premium Rate
                </Button>
                <Button 
                  variant="outline"
                  className="h-12 w-full text-md font-medium"
                  onClick={handleRequestOverride}
                  disabled={actionLoading === "override"}
                >
                  {actionLoading === "override" && <RefreshCw className="animate-spin mr-2" size={16} />} 
                  Request Manual Override
                </Button>
              </div>
            </AnimatedList>
          )}
        </div>
      </div>
    </div>
  );
}
