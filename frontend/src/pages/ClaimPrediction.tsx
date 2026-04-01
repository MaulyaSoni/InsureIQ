import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getPolicies, predictClaim } from "@/lib/api";
import type { Policy, ClaimPrediction } from "@/types/insurance";
import { TrendingUp, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function ClaimPredictionPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [result, setResult] = useState<ClaimPrediction | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getPolicies().then(setPolicies);
  }, []);

  async function handlePredict() {
    if (!selectedId) return;
    setLoading(true);
    try {
      const prediction = await predictClaim(selectedId);
      setResult(prediction);
      toast.success("Claim prediction complete");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Claim Prediction</h1>
        <p className="text-sm text-muted-foreground">XGBoost-powered claim probability & amount prediction</p>
      </div>

      <Card>
        <CardContent className="flex items-end gap-4 p-5">
          <div className="flex-1 space-y-1.5">
            <p className="text-sm font-medium">Select Policy</p>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger><SelectValue placeholder="Choose a policy..." /></SelectTrigger>
              <SelectContent>
                {policies.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.policy_number} — {p.holder_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handlePredict} disabled={!selectedId || loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TrendingUp className="h-4 w-4 mr-2" />}
            Predict Claim
          </Button>
        </CardContent>
      </Card>

      {result && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-5 text-center">
                <p className="text-sm text-muted-foreground mb-2">Claim Probability</p>
                <p className="text-4xl font-bold">{(result.claim_probability * 100).toFixed(1)}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 text-center">
                <p className="text-sm text-muted-foreground mb-2">Predicted Claim Amount</p>
                <p className="text-4xl font-bold">₹{result.predicted_claim_amount.toLocaleString("en-IN")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 text-center">
                <p className="text-sm text-muted-foreground mb-2">Confidence Interval</p>
                <p className="text-lg font-semibold">
                  ₹{result.confidence_interval.lower.toLocaleString("en-IN")} — ₹{result.confidence_interval.upper.toLocaleString("en-IN")}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Risk Factors
              </CardTitle>
              <CardDescription>Factors contributing to claim risk</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {result.risk_factors.map((f, i) => (
                  <Badge key={i} variant="secondary">{f}</Badge>
                ))}
                {result.risk_factors.length === 0 && (
                  <p className="text-sm text-muted-foreground">No significant risk factors identified</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">Model Version: {result.model_version} | Generated: {new Date(result.created_at).toLocaleString()}</p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
