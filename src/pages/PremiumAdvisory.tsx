import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPolicies, advisePremium } from "@/lib/api";
import type { Policy, PremiumAdvisory } from "@/types/insurance";
import { IndianRupee, Loader2, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function PremiumAdvisoryPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [result, setResult] = useState<PremiumAdvisory | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getPolicies().then(setPolicies);
  }, []);

  async function handleAdvise() {
    if (!selectedId) return;
    setLoading(true);
    try {
      const advisory = await advisePremium(selectedId);
      setResult(advisory);
      toast.success("Premium advisory generated");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  const diff = result ? result.recommended_premium - result.current_premium : 0;
  const diffPct = result ? ((diff / result.current_premium) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Premium Advisory</h1>
        <p className="text-sm text-muted-foreground">Risk-adjusted premium recommendations via Vishleshak AI</p>
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
                    {p.policy_number} — {p.holder_name} (₹{p.premium_amount.toLocaleString("en-IN")})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAdvise} disabled={!selectedId || loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <IndianRupee className="h-4 w-4 mr-2" />}
            Get Advisory
          </Button>
        </CardContent>
      </Card>

      {result && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-5 text-center">
                <p className="text-sm text-muted-foreground mb-2">Current Premium</p>
                <p className="text-3xl font-bold">₹{result.current_premium.toLocaleString("en-IN")}</p>
              </CardContent>
            </Card>
            <Card className="border-primary">
              <CardContent className="p-5 text-center">
                <p className="text-sm text-muted-foreground mb-2">Recommended Premium</p>
                <p className="text-3xl font-bold text-primary">₹{result.recommended_premium.toLocaleString("en-IN")}</p>
                <Badge variant={diff > 0 ? "destructive" : "secondary"} className="mt-2">
                  {diff > 0 ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
                  {diffPct}%
                </Badge>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 text-center">
                <p className="text-sm text-muted-foreground mb-2">Premium Range</p>
                <p className="text-lg font-semibold">
                  ₹{result.premium_range.min.toLocaleString("en-IN")} — ₹{result.premium_range.max.toLocaleString("en-IN")}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Adjustment Factors */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Adjustment Factors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {result.adjustment_factors.map((f, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <div>
                    <p className="text-sm font-medium">{f.factor_name}</p>
                    <p className="text-xs text-muted-foreground">{f.description}</p>
                  </div>
                  <Badge variant={f.direction === "increase" ? "destructive" : "secondary"}>
                    {f.direction === "increase" ? "+" : "-"}{f.impact}%
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Justification</CardTitle>
              <CardDescription>AI-generated premium recommendation rationale</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{result.justification}</p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
