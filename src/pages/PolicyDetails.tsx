import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getPolicy, assessRisk, predictClaim, advisePremium } from "@/lib/api";
import type { Policy, RiskAssessment, ClaimPrediction, PremiumAdvisory } from "@/types/insurance";
import { ArrowLeft, ShieldAlert, TrendingUp, IndianRupee, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function PolicyDetails() {
  const { id } = useParams<{ id: string }>();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [riskHistory, setRiskHistory] = useState<RiskAssessment[]>([]);
  const [claimHistory, setClaimHistory] = useState<ClaimPrediction[]>([]);
  const [premiumHistory, setPremiumHistory] = useState<PremiumAdvisory[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!id) return;
    getPolicy(id).then((p) => {
      setPolicy(p || null);
      setLoading(false);
    });
  }, [id]);

  async function runAllAnalyses() {
    if (!id) return;
    setRunning(true);
    try {
      const [risk, claim, premium] = await Promise.all([
        assessRisk(id),
        predictClaim(id),
        advisePremium(id),
      ]);
      setRiskHistory((prev) => [risk, ...prev]);
      setClaimHistory((prev) => [claim, ...prev]);
      setPremiumHistory((prev) => [premium, ...prev]);
      toast.success("All analyses completed");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRunning(false);
    }
  }

  const riskBandColor: Record<string, string> = {
    low: "bg-success text-success-foreground",
    medium: "bg-warning text-warning-foreground",
    high: "bg-destructive text-destructive-foreground",
    critical: "bg-destructive text-destructive-foreground",
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!policy) return <div className="text-center py-20 text-muted-foreground">Policy not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/policies"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{policy.holder_name}</h1>
          <p className="text-sm text-muted-foreground font-mono">{policy.policy_number}</p>
        </div>
        <Button onClick={runAllAnalyses} disabled={running}>
          {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldAlert className="h-4 w-4 mr-2" />}
          Run Full Analysis
        </Button>
      </div>

      {/* Policy Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Vehicle", value: `${policy.vehicle_make} ${policy.vehicle_model} (${policy.production_year})` },
          { label: "Type / Usage", value: `${policy.vehicle_type} / ${policy.usage_type}` },
          { label: "Insured Value", value: `₹${policy.insured_value.toLocaleString("en-IN")}` },
          { label: "Premium", value: `₹${policy.premium_amount.toLocaleString("en-IN")}` },
          { label: "Engine", value: `${policy.engine_cc}cc` },
          { label: "Seats", value: String(policy.seats) },
          { label: "Prior Claims", value: String(policy.prior_claims) },
          { label: "Region", value: policy.region },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-sm font-semibold mt-1">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Risk Assessment History */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Risk Assessment History</CardTitle>
          <Badge variant="outline" className="ml-auto">{riskHistory.length} records</Badge>
        </CardHeader>
        <CardContent>
          {riskHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assessments yet. Run a full analysis to generate data.</p>
          ) : (
            <div className="space-y-3">
              {riskHistory.map((r, i) => (
                <motion.div key={r.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between border rounded-lg p-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
                    <p className="text-sm mt-0.5">{r.explanation.slice(0, 120)}…</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-lg font-bold">{r.risk_score}</span>
                    <Badge className={riskBandColor[r.risk_band]}>{r.risk_band}</Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Claim Prediction History */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Claim Prediction History</CardTitle>
          <Badge variant="outline" className="ml-auto">{claimHistory.length} records</Badge>
        </CardHeader>
        <CardContent>
          {claimHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No predictions yet.</p>
          ) : (
            <div className="space-y-3">
              {claimHistory.map((c, i) => (
                <motion.div key={c.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between border rounded-lg p-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</p>
                    <p className="text-sm mt-0.5">Probability: {(c.claim_probability * 100).toFixed(1)}% | Factors: {c.risk_factors.join(", ") || "None"}</p>
                  </div>
                  <span className="text-lg font-bold shrink-0">₹{c.predicted_claim_amount.toLocaleString("en-IN")}</span>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Premium Advisory History */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <IndianRupee className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Premium Advisory History</CardTitle>
          <Badge variant="outline" className="ml-auto">{premiumHistory.length} records</Badge>
        </CardHeader>
        <CardContent>
          {premiumHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No advisories yet.</p>
          ) : (
            <div className="space-y-3">
              {premiumHistory.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between border rounded-lg p-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</p>
                    <p className="text-sm mt-0.5">Current: ₹{p.current_premium.toLocaleString("en-IN")} → Recommended: ₹{p.recommended_premium.toLocaleString("en-IN")}</p>
                  </div>
                  <Badge variant={p.recommended_premium > p.current_premium ? "destructive" : "outline"}>
                    {p.recommended_premium > p.current_premium ? "↑" : "↓"} {Math.abs(Math.round((p.recommended_premium - p.current_premium) / p.current_premium * 100))}%
                  </Badge>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
