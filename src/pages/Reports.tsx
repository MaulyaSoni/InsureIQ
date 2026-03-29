import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getPolicies, generateReport } from "@/lib/api";
import type { Policy, UnderwritingReport } from "@/types/insurance";
import { FileText, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { exportReportPDF } from "@/lib/pdf-export";

export default function ReportsPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [report, setReport] = useState<UnderwritingReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getPolicies().then(setPolicies);
  }, []);

  async function handleGenerate() {
    if (!selectedId) return;
    setLoading(true);
    try {
      const rpt = await generateReport(selectedId);
      setReport(rpt);
      toast.success("Underwriting report generated");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  const recColors = { approve: "bg-success text-success-foreground", review: "bg-warning text-warning-foreground", reject: "bg-destructive text-destructive-foreground" };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Underwriting Reports</h1>
        <p className="text-sm text-muted-foreground">Full underwriting report aggregating all agent outputs</p>
      </div>

      <Card>
        <CardContent className="flex items-end gap-4 p-5">
          <div className="flex-1 space-y-1.5">
            <p className="text-sm font-medium">Select Policy</p>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger><SelectValue placeholder="Choose a policy..." /></SelectTrigger>
              <SelectContent>
                {policies.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.policy_number} — {p.holder_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGenerate} disabled={!selectedId || loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
            Generate Report
          </Button>
        </CardContent>
      </Card>

      {report && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Header */}
          <Card>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-lg font-bold">Report #{report.id}</p>
                <p className="text-xs text-muted-foreground">Generated: {new Date(report.generated_at).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={`text-sm px-4 py-1.5 ${recColors[report.recommendation]}`}>
                  {report.recommendation.toUpperCase()}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    exportReportPDF(report);
                    toast.success("PDF downloaded");
                  }}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export PDF
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Executive Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{report.summary}</p>
            </CardContent>
          </Card>

          {/* Sections */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Risk Assessment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Score</span>
                  <span className="font-bold">{report.risk_assessment.risk_score}/100</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Band</span>
                  <Badge variant="outline" className="capitalize">{report.risk_assessment.risk_band}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Claim Prob.</span>
                  <span>{(report.risk_assessment.claim_probability * 100).toFixed(1)}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Claim Prediction</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-bold">₹{report.claim_prediction.predicted_claim_amount.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Confidence</span>
                  <span className="text-xs">₹{report.claim_prediction.confidence_interval.lower.toLocaleString("en-IN")} - ₹{report.claim_prediction.confidence_interval.upper.toLocaleString("en-IN")}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Premium Advisory</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Current</span>
                  <span>₹{report.premium_advisory.current_premium.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Recommended</span>
                  <span className="font-bold text-primary">₹{report.premium_advisory.recommended_premium.toLocaleString("en-IN")}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Explanation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI Risk Explanation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{report.risk_assessment.explanation}</p>
              <Separator className="my-4" />
              <p className="text-sm leading-relaxed">{report.premium_advisory.justification}</p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
