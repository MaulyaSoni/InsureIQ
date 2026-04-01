import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getPolicies, runBatchAnalysis } from "@/lib/api";
import type { Policy, BatchJob } from "@/types/insurance";
import { Layers, Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["hsl(160,60%,40%)", "hsl(35,90%,55%)", "hsl(0,72%,51%)", "hsl(0,85%,40%)"];

export default function BatchAnalysisPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [job, setJob] = useState<BatchJob | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getPolicies().then(setPolicies);
  }, []);

  async function handleRun() {
    setLoading(true);
    try {
      const result = await runBatchAnalysis(policies.map((p) => p.id));
      setJob(result);
      toast.success(`Batch analysis complete: ${result.total_policies} policies processed`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  const pieData = job?.results_summary
    ? [
        { name: "Low", value: job.results_summary.risk_distribution.low },
        { name: "Medium", value: job.results_summary.risk_distribution.medium },
        { name: "High", value: job.results_summary.risk_distribution.high },
        { name: "Critical", value: job.results_summary.risk_distribution.critical },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Batch Analysis</h1>
          <p className="text-sm text-muted-foreground">Portfolio-level risk analysis across all policies</p>
        </div>
        <Button onClick={handleRun} disabled={loading || policies.length === 0}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
          Analyze All ({policies.length})
        </Button>
      </div>

      {job && job.results_summary && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-5 text-center">
                <p className="text-sm text-muted-foreground">Avg Risk Score</p>
                <p className="text-3xl font-bold">{job.results_summary.avg_risk_score}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 text-center">
                <p className="text-sm text-muted-foreground">High Risk Count</p>
                <p className="text-3xl font-bold text-destructive">{job.results_summary.high_risk_count}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 text-center">
                <p className="text-sm text-muted-foreground">Total Insured</p>
                <p className="text-2xl font-bold">₹{(job.results_summary.total_insured_value / 100000).toFixed(1)}L</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 text-center">
                <p className="text-sm text-muted-foreground">Total Premium</p>
                <p className="text-2xl font-bold">₹{(job.results_summary.total_premium / 1000).toFixed(0)}K</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Risk Distribution</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Job ID: {job.id}</span>
                <Badge variant={job.status === "completed" ? "secondary" : "outline"}>
                  {job.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
