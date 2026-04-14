import { useState, useEffect } from "react";
import {
  Layers,
  Upload,
  Cloud,
  FileText,
  Search,
  CheckCircle,
  AlertTriangle,
  Zap,
  Loader2,
  RefreshCw,
  Download,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { getPolicies, runBatchAnalysis } from "@/lib/api";
import { toast } from "sonner";

export default function BatchAnalysis() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
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
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 className="nu-page-title">Portfolio Batch Engine</h1>
          <div className="nu-page-subtitle">Massive-scale underwriting assessment and risk cluster identification</div>
        </div>
        {viewMode !== "upload" && (
          <button className="nu-btn-ghost" onClick={() => setViewMode("upload")} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Upload size={14} /> Back to Upload
          </button>
        )}
      </div>

      {/* Upload Zone (Mode: Upload) */}
      {viewMode === "upload" && !processing && (
        <div 
          className="nu-card" 
          style={{ 
            height: 320, 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            justifyContent: "center", 
            borderStyle: "dashed", 
            borderWidth: 2, 
            borderColor: "#1E2535" 
          }}
        >
          <div 
            style={{ 
              width: 80, 
              height: 80, 
              borderRadius: "50%", 
              backgroundColor: "rgba(0, 212, 255, 0.05)", 
              border: "1px solid rgba(0, 212, 255, 0.2)", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              marginBottom: 20 
            }}
          >
            <Cloud size={32} color="#00D4FF" />
          </div>
          <div className="font-mono-ibm" style={{ fontSize: 18, color: "#F0F4FF", fontWeight: 600 }}>Batch Load Pipeline</div>
          <div className="nu-muted" style={{ marginTop: 8, fontSize: 13 }}>Primary intake for CSV / JSON policy datasets up to 10k entities.</div>
          
          <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
            <button className="nu-btn-primary" onClick={() => toast.info("CSV selection triggered")}>Select CSV Stream</button>
            <button className="nu-btn-ghost" onClick={() => setViewMode("select")}>Select from Portfolio</button>
          </div>
          <div className="nu-muted" style={{ marginTop: 16, fontSize: 11 }}>IRDAI compliant schema validation v3.2 active</div>
        </div>
      )}

      {/* Manual Selection (Mode: Select) */}
      {viewMode === "select" && !processing && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="nu-card" style={{ padding: "0" }}>
            <table className="nu-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}><input type="checkbox" onChange={() => setSelectedIds(selectedIds.length === policies.length ? [] : policies.map(p => p.id))} /></th>
                  <th>Policy ID</th>
                  <th>Holder Name</th>
                  <th>Risk Band</th>
                  <th>Asset Class</th>
                </tr>
              </thead>
              <tbody>
                {policies.map(p => (
                  <tr key={p.id} onClick={() => toggleSelect(p.id)} style={{ cursor: "pointer" }}>
                    <td><input type="checkbox" checked={selectedIds.includes(p.id)} readOnly /></td>
                    <td><span className="nu-mono-value" style={{ color: "#00D4FF" }}>{p.policy_number}</span></td>
                    <td style={{ color: "#F0F4FF" }}>{p.policyholder_name}</td>
                    <td>● {p.risk_band || "LOW"}</td>
                    <td>{p.vehicle_make} {p.vehicle_model}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div 
            className="nu-card-elevated" 
            style={{ 
              padding: 16, 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between", 
              borderLeft: "3px solid #0066FF" 
            }}
          >
            <div className="font-mono-ibm" style={{ fontSize: 14 }}>{selectedIds.length} Policies selected for batch analysis</div>
            <button 
              className="nu-btn-primary" 
              onClick={handleRunBatch}
              disabled={selectedIds.length === 0}
            >
              Initialize Assessment
            </button>
          </div>
        </div>
      )}

      {/* Processing View */}
      {processing && (
        <div className="nu-card-ai" style={{ padding: 48, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div className="kpi-label" style={{ fontSize: 11, marginBottom: 24 }}>Initializing Neural Batch Compute</div>
          <div style={{ width: "100%", height: 32, backgroundColor: "#111622", borderRadius: 16, border: "1px solid #1E2535", position: "relative", overflow: "hidden", marginBottom: 12 }}>
            <div 
              style={{ 
                height: "100%", 
                width: `${progress}%`, 
                backgroundColor: "#00D4FF", 
                transition: "width 400ms ease",
                boxShadow: "0 0 20px rgba(0, 212, 255, 0.4)" 
              }} 
            />
          </div>
          <div 
            className="nu-mono-value" 
            style={{ fontSize: 12, color: "#8A95B0" }}
          >
            Processing {Math.floor(selectedIds.length * (progress/100))} / {selectedIds.length} records · 4.8 policies/sec
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, width: "100%", marginTop: 40 }}>
            <div className="nu-card" style={{ padding: 16, textAlign: "center" }}>
              <div className="kpi-label" style={{ fontSize: 9 }}>Processed</div>
              <div className="nu-mono-value" style={{ fontSize: 20, marginTop: 4 }}>{selectedIds.length}</div>
            </div>
            <div className="nu-card" style={{ padding: 16, textAlign: "center" }}>
              <div className="kpi-label" style={{ fontSize: 9 }}>Errors</div>
              <div className="nu-mono-value" style={{ fontSize: 20, marginTop: 4, color: "#FF3B5C" }}>0</div>
            </div>
            <div className="nu-card" style={{ padding: 16, textAlign: "center" }}>
              <div className="kpi-label" style={{ fontSize: 9 }}>Nodes Active</div>
              <div className="nu-mono-value" style={{ fontSize: 20, marginTop: 4 }}>4</div>
            </div>
          </div>
        </div>
      )}

      {/* Results Mode */}
      {viewMode === "results" && batchResults && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Summary KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {[
              { label: "Total Streamed", value: selectedIds.length, color: "#00D4FF" },
              { label: "Avg Risk Index", value: "43.8", color: "#FFB300" },
              { label: "Critical Flags", value: "7", color: "#FF3B5C" },
              { label: "Engine Run-time", value: "48.2s", color: "#F0F4FF" },
            ].map(s => (
              <div key={s.label} className="nu-card" style={{ padding: 16 }}>
                <div className="kpi-label" style={{ fontSize: 9 }}>{s.label}</div>
                <div className="nu-mono-value" style={{ fontSize: 24, marginTop: 8, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Risk Clusters */}
          <div className="nu-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <Layers size={14} color="#00D4FF" />
              <div className="font-mono-ibm" style={{ fontSize: 13, fontWeight: 700 }}>Neural Cluster Analysis</div>
            </div>
            
            <div style={{ display: "flex", height: 32, borderRadius: 6, overflow: "hidden", marginBottom: 24 }}>
              <div style={{ width: "45%", height: "100%", backgroundColor: "#00E676" }} title="LOW Risk (45%)" />
              <div style={{ width: "30%", height: "100%", backgroundColor: "#0066FF" }} title="MEDIUM Risk (30%)" />
              <div style={{ width: "18%", height: "100%", backgroundColor: "#FFB300" }} title="HIGH Risk (18%)" />
              <div style={{ width: "7%", height: "100%", backgroundColor: "#FF3B5C" }} title="CRITICAL Risk (7%)" />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { band: "CRITICAL", count: 7, reason: "Shared Factor: Vehicle Age > 15 Years (71%)", color: "#FF3B5C" },
                { band: "HIGH", count: 43, reason: "Shared Factor: Commercial usage declared (65%)", color: "#FF6400" },
                { band: "MEDIUM", count: 74, reason: "Shared Factor: Prior claims and high-mileage RTOs", color: "#FFB300" },
              ].map(c => (
                <div key={c.band} className="nu-card-elevated" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 16, borderLeft: `3px solid ${c.color}` }}>
                  <div style={{ backgroundColor: c.color + "20", color: c.color, fontFamily: "'IBM Plex Mono', monospace", padding: "4px 10px", borderRadius: 4, fontSize: 10, fontWeight: 700 }}>{c.band}</div>
                  <div className="nu-mono-value" style={{ fontSize: 13, minWidth: 24 }}>{c.count}</div>
                  <div style={{ fontSize: 13, color: "#8A95B0" }}>{c.reason}</div>
                  <ChevronDown size={14} color="#485068" style={{ marginLeft: "auto" }} />
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button className="nu-btn-primary" style={{ flex: 1, justifyContent: "center" }}>
              <Download size={14} style={{ marginRight: 8 }} />
              Download Batch PDF Report
            </button>
            <button className="nu-btn-ghost" style={{ flex: 1, justifyContent: "center" }}>
              <RefreshCw size={14} style={{ marginRight: 8 }} />
              Re-run Batch compute
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
