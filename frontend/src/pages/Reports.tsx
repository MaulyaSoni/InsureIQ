import { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  Download,
  Eye,
  Trash2,
  RefreshCw,
  Zap,
  X,
} from "lucide-react";
import { getPolicies, getReports, generateReport, downloadReportPDF } from "@/lib/api";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AnimatedList } from "@/components/ui/AnimatedList";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export default function Reports() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  
  const [targetPolicyId, setTargetPolicyId] = useState("");
  const [reportType, setReportType] = useState("full");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [policiesData, reportsData] = await Promise.all([
        getPolicies(),
        getReports().catch(() => [])
      ]);
      setPolicies(policiesData);
      setReports(reportsData);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!targetPolicyId) return;
    setGenerating(true);
    setShowModal(false);
    
    toast.promise(generateReport(targetPolicyId), {
      loading: "Initializing LangGraph report agent...",
      success: (data) => {
        setReports([{ 
          id: data.id || data.report_id, 
          policyId: data.policy_id, 
          holder: "Rajesh Kumar", 
          type: "Full Analysis", 
          date: "Just now", 
          status: "COMPLETE" 
        }, ...reports]);
        setGenerating(false);
        return "Intelligence report generated successfully";
      },
      error: (err) => {
        setGenerating(false);
        return err.message || "Report generation failed";
      },
    });
  };

   const handleDownloadPDF = async (reportId: string, policyNumber: string) => {
     try {
       const res = await downloadReportPDF(reportId);
       if (!res.ok) throw new Error("PDF generation failed");
       const blob = await res.blob();
       const url = URL.createObjectURL(blob);
       const a = document.createElement("a");
       a.href = url;
       a.download = `InsureIQ_Report_${policyNumber}.pdf`;
       document.body.appendChild(a);
       a.click();
       document.body.removeChild(a);
       URL.revokeObjectURL(url);
     } catch (err) {
       toast.error("PDF download failed");
     }
   };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <PageHeader
        title="Intelligence Reports"
        subtitle="Historical audit trail of all executive summaries and risk assessments"
        actions={
          <Button onClick={() => setShowModal(true)}>
            <Plus size={16} className="mr-2" />
            Generate Report
          </Button>
        }
      />

      {/* Stats row */}
      <AnimatedList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Reports", value: "847" },
          { label: "Full Analysis", value: "612" },
          { label: "Risk Specific", value: "145" },
          { label: "Premium Advisory", value: "90" },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">{s.label}</div>
            <div className="text-2xl font-mono-code font-semibold text-text-primary mt-2">{s.value}</div>
          </Card>
        ))}
      </AnimatedList>

      {/* Reports Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-16 flex justify-center">
            <Skeleton className="h-10 w-10 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-surface-raised/50">
                  <th className="px-6 py-3 font-medium text-text-tertiary text-left uppercase tracking-wider text-xs">Report ID</th>
                  <th className="px-6 py-3 font-medium text-text-tertiary text-left uppercase tracking-wider text-xs">Policy ID</th>
                  <th className="px-6 py-3 font-medium text-text-tertiary text-left uppercase tracking-wider text-xs">Holder</th>
                  <th className="px-6 py-3 font-medium text-text-tertiary text-left uppercase tracking-wider text-xs">Type</th>
                  <th className="px-6 py-3 font-medium text-text-tertiary text-left uppercase tracking-wider text-xs">Generated</th>
                  <th className="px-6 py-3 font-medium text-text-tertiary text-left uppercase tracking-wider text-xs">Status</th>
                  <th className="px-6 py-3 font-medium text-text-tertiary text-right uppercase tracking-wider text-xs">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {reports.map((rpt, i) => (
                  <tr key={rpt.id} className="hover:bg-surface-raised transition-colors group">
                    <td className="px-6 py-4">
                      <span className="font-mono-code text-brand-500 font-medium">{rpt.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono-code text-text-secondary">{rpt.policyId}</span>
                    </td>
                    <td className="px-6 py-4 font-medium text-text-primary">{rpt.holder}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-text-tertiary" />
                        <span className="text-text-secondary">{rpt.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono-code text-text-tertiary text-xs">{rpt.date}</td>
                    <td className="px-6 py-4">
                      <Badge variant={rpt.status === "COMPLETE" ? "low" : rpt.status === "FAILED" ? "critical" : "default"} size="sm" className="gap-1 flex w-fit">
                        {rpt.status === "GENERATING" && <RefreshCw size={10} className="animate-spin" />}
                        {rpt.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => { setSelectedReport(rpt); setShowPreview(true); }}
                        >
                          <Eye size={14} className="text-text-secondary" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDownloadPDF(rpt.id, rpt.policyId)}
                        >
                          <Download size={14} className="text-brand-500" />
                        </Button>
                        <Button variant="ghost" size="icon" className="hover:text-error hover:bg-error/10">
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Generate Report Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Generate Intelligence Report</DialogTitle>
            <p className="text-sm text-text-secondary">Finalize underwriting analysis using high-entropy dataset.</p>
          </DialogHeader>
          
          <div className="flex flex-col gap-4 mt-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Target Policy</label>
              <select 
                className="w-full bg-surface-raised border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-500" 
                value={targetPolicyId} 
                onChange={(e) => setTargetPolicyId(e.target.value)}
              >
                <option value="">Choose a policy record...</option>
                {policies.map(p => <option key={p.id} value={p.id}>{p.policy_number} — {p.policyholder_name}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Analysis Type</label>
              <select 
                className="w-full bg-surface-raised border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-500" 
                value={reportType} 
                onChange={(e) => setReportType(e.target.value)}
              >
                <option value="full">Full Analysis Pipeline</option>
                <option value="risk">Risk Attribution Only</option>
                <option value="premium">Premium Intelligence Only</option>
                <option value="claim">Claim Eligibility Only</option>
              </select>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <input type="checkbox" id="preview" className="rounded bg-surface-raised border-surface-border" />
              <label htmlFor="preview" className="text-xs text-text-secondary">Preview report in drawer after generation</label>
            </div>

            <Button onClick={handleGenerate} className="w-full mt-2" disabled={!targetPolicyId}>
              <Zap size={16} className="mr-2" />
              Generate with llama-3.3-70b
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Preview Drawer */}
      <Sheet open={showPreview} onOpenChange={setShowPreview}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader className="pb-4 border-b border-surface-border mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-brand-500/10">
                <FileText size={20} className="text-brand-500" />
              </div>
              <div>
                <SheetTitle className="font-mono-code text-base">{selectedReport?.id}</SheetTitle>
                <p className="text-xs font-mono-code text-text-tertiary">Policy: {selectedReport?.policyId}</p>
              </div>
            </div>
          </SheetHeader>
          
          <div className="flex flex-col gap-6">
            <div className="bg-ai/5 border-l-2 border-ai p-4 rounded-r-lg">
              <div className="flex items-center gap-2 mb-2">
                <Zap size={14} className="text-ai" />
                <div className="font-semibold text-text-primary text-sm">Executive Summary</div>
              </div>
              <div className="text-sm text-text-secondary leading-relaxed">
                Underwriting analysis for Rajesh Kumar finds a HIGH-RISK profile with a composite index of 67. Primary drivers include commercial vehicle use and a lack of anti-theft measures. Claim probability estimated at 34.2% based on local Mumbai RTO loss trends.
              </div>
            </div>

            {[
              { title: "1. Policy Metadata", items: ["ID: IQ-00247", "Holder: Rajesh Kumar", "Asset: Honda City 2019", "RTO: Mumbai MH-01"] },
              { title: "2. Risk Factor Breakdown", items: ["Commercial Use (+0.42)", "Age > 5yr (+0.31)", "Prior Claims (+0.28)", "Anti-theft Score (-0.09)"] },
              { title: "3. Premium Guidance", items: ["Current: ₹18,500", "Optimized: ₹24,200", "Suggested NCB: 20%", "Reinsurance: Eligible"] },
            ].map(section => (
              <div key={section.title}>
                <div className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-3 border-b border-surface-border pb-2">{section.title}</div>
                <div className="grid grid-cols-2 gap-2">
                  {section.items.map(it => (
                    <div key={it} className="font-mono-code text-xs px-3 py-2 bg-surface-raised border border-surface-border rounded-md text-text-primary">
                      {it}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <Button className="w-full mt-4 h-12" variant="outline">
              <Download size={16} className="mr-2" />
              Download PDF Report
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
