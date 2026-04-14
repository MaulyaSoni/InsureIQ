import { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  Download,
  Eye,
  Trash2,
  Search,
  Filter,
  Loader2,
  RefreshCw,
  Zap,
  ChevronRight,
  X,
} from "lucide-react";
import { getPolicies, getReports, generateReport, downloadReportPDF, request } from "@/lib/api";
import { toast } from "sonner";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const getAuthHeaders = () => {
  const token = localStorage.getItem("insureiq_token") || "";
  return { "Authorization": `Bearer ${token}` };
};

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
    <div style={{ display: "flex", flexDirection: "column", gap: 24, position: "relative" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 className="nu-page-title">Intelligence Reports</h1>
          <div className="nu-page-subtitle">Historical audit trail of all executive summaries and risk assessments</div>
        </div>
        <button 
          className="nu-btn-primary" 
          onClick={() => setShowModal(true)}
          style={{ display: "flex", alignItems: "center", gap: 10 }}
        >
          <Plus size={16} />
          Generate Report
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {[
          { label: "Total Reports", value: "847" },
          { label: "Full Analysis", value: "612" },
          { label: "Risk Specific", value: "145" },
          { label: "Premium Advisory", value: "90" },
        ].map((s) => (
          <div key={s.label} className="nu-card" style={{ padding: 16 }}>
            <div className="kpi-label" style={{ fontSize: 9 }}>{s.label}</div>
            <div className="nu-mono-value" style={{ fontSize: 20, marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Reports Table */}
      <div className="nu-card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 100, textAlign: "center" }}><Loader2 className="animate-spin" /></div>
        ) : (
          <table className="nu-table">
            <thead>
              <tr>
                <th>Report ID</th>
                <th>Policy ID</th>
                <th>Holder</th>
                <th>Type</th>
                <th>Generated</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((rpt, i) => (
                <tr key={rpt.id} className={`stagger-${(i % 6) + 1}`}>
                  <td>
                    <span className="nu-mono-value" style={{ color: "#00D4FF" }}>{rpt.id}</span>
                  </td>
                  <td><span className="nu-mono-value">{rpt.policyId}</span></td>
                  <td style={{ color: "#F0F4FF" }}>{rpt.holder}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <FileText size={12} color="#485068" />
                      <span className="nu-muted" style={{ fontSize: 13 }}>{rpt.type}</span>
                    </div>
                  </td>
                  <td className="nu-mono-value" style={{ fontSize: 11, color: "#485068" }}>{rpt.date}</td>
                  <td>
                    <div 
                      className="risk-badge" 
                      style={{ 
                        backgroundColor: rpt.status === "COMPLETE" ? "rgba(0, 230, 118, 0.1)" : rpt.status === "FAILED" ? "rgba(255, 59, 92, 0.1)" : "rgba(0, 212, 255, 0.1)",
                        color: rpt.status === "COMPLETE" ? "#00E676" : rpt.status === "FAILED" ? "#FF3B5C" : "#00D4FF",
                        borderColor: "transparent"
                      }}
                    >
                      {rpt.status === "GENERATING" && <RefreshCw size={10} className="animate-spin" style={{ marginRight: 4 }} />}
                      {rpt.status}
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
                      <button 
                        className="nu-btn-ghost" 
                        style={{ padding: 6, border: "none" }}
                        onClick={() => { setSelectedReport(rpt); setShowPreview(true); }}
                      >
                        <Eye size={14} color="#8A95B0" />
                      </button>
                      <button className="nu-btn-ghost" style={{ padding: 6, border: "none" }} onClick={() => handleDownloadPDF(rpt.id, rpt.policyId)}>
                        <Download size={14} color="#0066FF" />
                      </button>
                      <button className="nu-btn-ghost" style={{ padding: 6, border: "none" }}>
                        <Trash2 size={14} color="#FF3B5C" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Generate Report Modal Overlay */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(7, 8, 13, 0.8)", backdropFilter: "blur(4px)" }}>
          <div className="nu-card-elevated" style={{ width: 440, padding: 32, position: "relative", boxShadow: "0 20px 40px rgba(0,0,0,0.5)" }}>
            <button 
              onClick={() => setShowModal(false)}
              style={{ position: "absolute", right: 20, top: 20, color: "#485068", border: "none", background: "none", cursor: "pointer" }}
            >
              <X size={18} />
            </button>
            <h2 className="font-mono-ibm" style={{ fontSize: 18, color: "#F0F4FF", marginBottom: 6 }}>Generate Intelligence Report</h2>
            <p className="nu-muted" style={{ marginBottom: 24, fontSize: 13 }}>Finalize underwriting analysis using high-entropy dataset.</p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label className="nu-label">Target Policy</label>
                <select className="nu-select" value={targetPolicyId} onChange={(e) => setTargetPolicyId(e.target.value)}>
                  <option value="">Choose a policy record...</option>
                  {policies.map(p => <option key={p.id} value={p.id}>{p.policy_number} — {p.policyholder_name}</option>)}
                </select>
              </div>

              <div>
                <label className="nu-label">Analysis Type</label>
                <select className="nu-select" value={reportType} onChange={(e) => setReportType(e.target.value)}>
                  <option value="full">Full Analysis Pipeline</option>
                  <option value="risk">Risk Attribution Only</option>
                  <option value="premium">Premium Intelligence Only</option>
                  <option value="claim">Claim Eligibility Only</option>
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0" }}>
                <input type="checkbox" id="preview" />
                <label htmlFor="preview" style={{ fontSize: 12, color: "#8A95B0" }}>Preview report in drawer after generation</label>
              </div>

              <button 
                className="nu-btn-primary" 
                onClick={handleGenerate}
                style={{ width: "100%", height: 48, justifyContent: "center" }}
              >
                <Zap size={16} fill="#00D4FF" color="#00D4FF" />
                Generate with llama-3.3-70b
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Preview Drawer */}
      <div 
        className={`ai-drawer ${showPreview ? "open" : ""}`}
        style={{ width: 480 }}
      >
        <div style={{ height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", borderBottom: "1px solid #1E2535" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FileText size={18} color="#0066FF" />
            <div>
              <div className="font-mono-ibm" style={{ fontSize: 13, fontWeight: 700, color: "#F0F4FF" }}>{selectedReport?.id}</div>
              <div className="font-roboto-mono" style={{ fontSize: 10, color: "#485068" }}>Policy: {selectedReport?.policyId}</div>
            </div>
          </div>
          <button 
            onClick={() => setShowPreview(false)}
            style={{ color: "#485068", border: "none", background: "none", cursor: "pointer", marginLeft: "auto" }}
          >
            <X size={18} />
          </button>
        </div>
        
        <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
          <div className="nu-card-elevated" style={{ padding: 16, backgroundColor: "#111622", borderLeft: "3px solid #00D4FF" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <Zap size={13} color="#00D4FF" fill="#00D4FF" />
              <div className="font-mono-ibm" style={{ fontSize: 12, fontWeight: 700, color: "#F0F4FF" }}>Executive Summary</div>
            </div>
            <div className="nu-muted" style={{ fontSize: 12, lineHeight: 1.6 }}>
              Underwriting analysis for Rajesh Kumar finds a HIGH-RISK profile with a composite index of 67. Primary drivers include commercial vehicle use and a lack of anti-theft measures. Claim probability estimated at 34.2% based on local Mumbai RTO loss trends.
            </div>
          </div>

          {[
            { title: "1. Policy Metadata", items: ["ID: IQ-00247", "Holder: Rajesh Kumar", "Asset: Honda City 2019", "RTO: Mumbai MH-01"] },
            { title: "2. Risk Factor Breakdown", items: ["Commercial Use (+0.42)", "Age > 5yr (+0.31)", "Prior Claims (+0.28)", "Anti-theft Score (-0.09)"] },
            { title: "3. Premium Guidance", items: ["Current: ₹18,500", "Optimized: ₹24,200", "Suggested NCB: 20%", "Reinsurance: Eligible"] },
          ].map(section => (
            <div key={section.title}>
              <div style={{ fontVariant: "small-caps", fontSize: 11, color: "#485068", fontWeight: 700, marginBottom: 12, borderBottom: "1px solid #1E2535", paddingBottom: 6 }}>{section.title}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {section.items.map(it => (
                  <div key={it} className="nu-mono-value" style={{ fontSize: 11, padding: "8px 12px", backgroundColor: "#0E1118", border: "1px solid #1E2535", borderRadius: 4 }}>
                    {it}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div style={{ height: 20 }} />
          <button className="nu-btn-primary" style={{ height: 48, justifyContent: "center" }}>
            <Download size={16} style={{ marginRight: 8 }} />
            Download PDF Report
          </button>
        </div>
      </div>
      
      {/* Drawer backdrop for showPreview */}
      <div 
        className={`ai-drawer-backdrop ${showPreview ? "open" : ""}`}
        onClick={() => setShowPreview(false)}
      />
    </div>
  );
}
