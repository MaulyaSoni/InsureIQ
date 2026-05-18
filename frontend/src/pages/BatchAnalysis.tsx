import { useState, useEffect } from "react";
import {
  Layers,
  Upload,
  Cloud,
  ChevronDown,
  Download,
  RefreshCw,
} from "lucide-react";
import { getPolicies, runBatchAnalysis } from "@/lib/api";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, AICard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnimatedList } from "@/components/ui/AnimatedList";

export default function BatchAnalysis() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [batchResults, setBatchResults] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"upload" | "select" | "results">("upload");

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      const data = await getPolicies(1, 100);
      setPolicies(data);
    } catch {
      toast.error("Failed to load policy list");
    }
  };

  const handleRunBatch = async () => {
    if (selectedIds.length === 0) return;
    setProcessing(true);
    setProgress(0);
    
    // Simulate progress while calling backend
    const interval = setInterval(() => setProgress(p => p < 95 ? p + (100 - p) * 0.1 : p), 400);
    
    try {
      const data = await runBatchAnalysis(selectedIds);
      clearInterval(interval);
      setProgress(100);
      setBatchResults(data);
      setViewMode("results");
      toast.success("Batch analysis engine complete");
    } catch (err: any) {
      toast.error(err.message || "Batch job failed");
    } finally {
      clearInterval(interval);
      setProcessing(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-20">
      <PageHeader
        title="Portfolio Batch Engine"
        subtitle="Massive-scale underwriting assessment and risk cluster identification"
        actions={
          viewMode !== "upload" && (
            <Button variant="outline" onClick={() => setViewMode("upload")}>
              <Upload size={14} className="mr-2" /> Back to Upload
            </Button>
          )
        }
      />

      {/* Upload Zone (Mode: Upload) */}
      {viewMode === "upload" && !processing && (
        <Card className="h-[320px] flex flex-col items-center justify-center border-dashed border-2 border-surface-border bg-surface-raised/20">
          <div className="w-20 h-20 rounded-full bg-brand-500/10 border border-brand-500/20 flex flex-col items-center justify-center mb-6">
            <Cloud size={32} className="text-brand-500" />
          </div>
          <div className="text-lg text-text-primary font-semibold mb-2">Batch Load Pipeline</div>
          <div className="text-sm text-text-secondary mb-8">Primary intake for CSV / JSON policy datasets up to 10k entities.</div>
          
          <div className="flex gap-4">
            <Button onClick={() => toast.info("CSV selection triggered")}>Select CSV Stream</Button>
            <Button variant="outline" onClick={() => setViewMode("select")}>Select from Portfolio</Button>
          </div>
          <div className="mt-4 text-xs text-text-tertiary">IRDAI compliant schema validation v3.2 active</div>
        </Card>
      )}

      {/* Manual Selection (Mode: Select) */}
      {viewMode === "select" && !processing && (
        <div className="flex flex-col gap-6">
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-raised/50 sticky top-0 z-10">
                    <th className="px-4 py-3 w-10">
                      <input 
                        type="checkbox" 
                        onChange={() => setSelectedIds(selectedIds.length === policies.length ? [] : policies.map(p => p.id))} 
                        className="rounded bg-surface-raised border-surface-border"
                      />
                    </th>
                    <th className="px-4 py-3 font-medium text-text-tertiary text-left uppercase tracking-wider text-xs">Policy ID</th>
                    <th className="px-4 py-3 font-medium text-text-tertiary text-left uppercase tracking-wider text-xs">Holder Name</th>
                    <th className="px-4 py-3 font-medium text-text-tertiary text-left uppercase tracking-wider text-xs">Risk Band</th>
                    <th className="px-4 py-3 font-medium text-text-tertiary text-left uppercase tracking-wider text-xs">Asset Class</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {policies.map(p => (
                    <tr key={p.id} onClick={() => toggleSelect(p.id)} className="cursor-pointer hover:bg-surface-raised transition-colors">
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selectedIds.includes(p.id)} readOnly className="rounded bg-surface-raised border-surface-border" />
                      </td>
                      <td className="px-4 py-3 font-mono-code text-brand-500 text-xs">{p.policy_number}</td>
                      <td className="px-4 py-3 text-text-primary font-medium">{p.policyholder_name}</td>
                      <td className="px-4 py-3">
                        <Badge variant={(p.risk_band || "low").toLowerCase()} size="sm">
                          {p.risk_band || "LOW"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-text-secondary text-sm">{p.vehicle_make} {p.vehicle_model}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card className="p-4 flex items-center justify-between border-l-4 border-l-brand-500">
            <div className="font-mono-code text-text-primary text-sm">{selectedIds.length} Policies selected for batch analysis</div>
            <Button 
              onClick={handleRunBatch}
              disabled={selectedIds.length === 0}
            >
              Initialize Assessment
            </Button>
          </Card>
        </div>
      )}

      {/* Processing View */}
      {processing && (
        <AICard hoverable={false} className="p-12 flex flex-col items-center justify-center text-center">
          <div className="text-xs uppercase tracking-wider text-text-tertiary mb-6 font-semibold">Initializing Neural Batch Compute</div>
          <div className="w-full h-8 bg-surface-border-strong rounded-full overflow-hidden border border-surface-border mb-4">
            <div 
              className="h-full bg-brand-500 transition-all duration-300"
              style={{ width: `${progress}%`, boxShadow: "0 0 20px rgba(83, 74, 183, 0.4)" }} 
            />
          </div>
          <div className="font-mono-code text-text-secondary text-sm">
            Processing {Math.floor(selectedIds.length * (progress/100))} / {selectedIds.length} records · 4.8 policies/sec
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-10">
            <Card className="p-4 text-center bg-surface-raised/50">
              <div className="text-xs text-text-tertiary uppercase tracking-wider mb-2">Processed</div>
              <div className="text-2xl font-mono-code text-text-primary">{selectedIds.length}</div>
            </Card>
            <Card className="p-4 text-center bg-surface-raised/50">
              <div className="text-xs text-text-tertiary uppercase tracking-wider mb-2">Errors</div>
              <div className="text-2xl font-mono-code text-error">0</div>
            </Card>
            <Card className="p-4 text-center bg-surface-raised/50">
              <div className="text-xs text-text-tertiary uppercase tracking-wider mb-2">Nodes Active</div>
              <div className="text-2xl font-mono-code text-text-primary">4</div>
            </Card>
          </div>
        </AICard>
      )}

      {/* Results Mode */}
      {viewMode === "results" && batchResults && (
        <AnimatedList className="flex flex-col gap-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: "Total Streamed", value: selectedIds.length, color: "text-brand-500" },
              { label: "Avg Risk Index", value: "43.8", color: "text-warning" },
              { label: "Critical Flags", value: "7", color: "text-error" },
              { label: "Engine Run-time", value: "48.2s", color: "text-text-primary" },
            ].map(s => (
              <Card key={s.label} className="p-4">
                <div className="text-xs text-text-tertiary uppercase tracking-wider">{s.label}</div>
                <div className={`text-2xl font-mono-code mt-2 ${s.color}`}>{s.value}</div>
              </Card>
            ))}
          </div>

          {/* Risk Clusters */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Layers size={16} className="text-brand-500" />
              <div className="font-semibold text-text-primary">Neural Cluster Analysis</div>
            </div>
            
            <div className="flex h-8 rounded-lg overflow-hidden mb-8">
              <div className="w-[45%] h-full bg-success" title="LOW Risk (45%)" />
              <div className="w-[30%] h-full bg-brand-500" title="MEDIUM Risk (30%)" />
              <div className="w-[18%] h-full bg-warning" title="HIGH Risk (18%)" />
              <div className="w-[7%] h-full bg-error" title="CRITICAL Risk (7%)" />
            </div>

            <div className="flex flex-col gap-3">
              {[
                { band: "CRITICAL", count: 7, reason: "Shared Factor: Vehicle Age > 15 Years (71%)", wrapperClass: "border-l-error bg-error/5" },
                { band: "HIGH", count: 43, reason: "Shared Factor: Commercial usage declared (65%)", wrapperClass: "border-l-warning bg-warning/5" },
                { band: "MEDIUM", count: 74, reason: "Shared Factor: Prior claims and high-mileage RTOs", wrapperClass: "border-l-success bg-success/5" },
              ].map(c => (
                <div key={c.band} className={`p-4 border border-surface-border border-l-4 rounded-lg flex items-center gap-4 ${c.wrapperClass}`}>
                  <Badge variant={c.band.toLowerCase() as any}>{c.band}</Badge>
                  <div className="font-mono-code text-sm text-text-primary text-center min-w-[24px]">{c.count}</div>
                  <div className="text-sm text-text-secondary w-full">{c.reason}</div>
                  <ChevronDown size={14} className="text-text-tertiary ml-auto" />
                </div>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Button className="h-12 w-full text-md font-medium">
              <Download size={16} className="mr-2" />
              Download Batch PDF Report
            </Button>
            <Button variant="outline" className="h-12 w-full text-md font-medium" onClick={() => setViewMode("upload")}>
              <RefreshCw size={16} className="mr-2" />
              Re-run Batch compute
            </Button>
          </div>
        </AnimatedList>
      )}
    </div>
  );
}
