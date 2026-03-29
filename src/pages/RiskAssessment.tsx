import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getPolicies, assessRisk } from "@/lib/api";
import type { Policy, RiskAssessment, RiskBand } from "@/types/insurance";
import { ShieldAlert, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const BAND_STYLES: Record<RiskBand, string> = {
  low: "bg-success text-success-foreground",
  medium: "bg-warning text-warning-foreground",
  high: "bg-destructive text-destructive-foreground",
  critical: "bg-risk-critical text-destructive-foreground",
};

export default function RiskAssessmentPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [result, setResult] = useState<RiskAssessment | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getPolicies().then(setPolicies);
  }, []);

  async function handleAssess() {
    if (!selectedId) return;
    setLoading(true);
    try {
      const assessment = await assessRisk(selectedId);
      setResult(assessment);
      toast.success(`Risk assessment complete: ${assessment.risk_band.toUpperCase()}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  const shapData = result?.top_features.map((f) => ({
    name: f.feature_name.replace("_", " "),
    value: Math.abs(f.shap_value),
    direction: f.direction,
  })) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Risk Assessment</h1>
        <p className="text-sm text-muted-foreground">XGBoost + SHAP powered risk scoring via Vishleshak AI</p>
      </div>

      {/* Policy Selector */}
      <Card>
        <CardContent className="flex items-end gap-4 p-5">
          <div className="flex-1 space-y-1.5">
            <p className="text-sm font-medium">Select Policy</p>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a policy..." />
              </SelectTrigger>
              <SelectContent>
                {policies.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.policy_number} — {p.holder_name} ({p.vehicle_make} {p.vehicle_model})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAssess} disabled={!selectedId || loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldAlert className="h-4 w-4 mr-2" />}
            Assess Risk
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Score Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-5 text-center">
                <p className="text-sm text-muted-foreground mb-2">Risk Score</p>
                <p className="text-4xl font-bold">{result.risk_score}</p>
                <Progress value={result.risk_score} className="mt-3" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 text-center">
                <p className="text-sm text-muted-foreground mb-2">Risk Band</p>
                <Badge className={`text-lg px-4 py-1 ${BAND_STYLES[result.risk_band]}`}>
                  {result.risk_band.toUpperCase()}
                </Badge>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 text-center">
                <p className="text-sm text-muted-foreground mb-2">Claim Probability</p>
                <p className="text-4xl font-bold">{(result.claim_probability * 100).toFixed(1)}%</p>
              </CardContent>
            </Card>
          </div>

          {/* SHAP Features */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">SHAP Feature Importance</CardTitle>
              <CardDescription>Key factors driving the risk score</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={shapData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} className="text-xs capitalize" />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(220,70%,45%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Explanation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI Explanation</CardTitle>
              <CardDescription>Generated by Vishleshak AI Explainer Agent</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{result.explanation}</p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
