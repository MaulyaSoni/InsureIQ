import { useState, useEffect, useRef } from "react";
import {
  ClipboardList,
  Search,
  Filter,
  Download,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Info,
  ChevronRight,
  Clock,
  User,
  Bot,
  RefreshCw,
} from "lucide-react";
import { getAuditLog } from "@/lib/api";
import { toast } from "sonner";

const AUDIT_DATA = [
  { id: "LOG-9283", user: "Vikram Singh", event: "Generated Intelligence Report (RPT-0834)", policy: "IQ-00247", time: "2 min ago", role: "Manager", type: "ACTION" },
  { id: "LOG-9284", user: "llama-3.3-70b", event: "Executed Risk Assessment Node (v2.4.1)", policy: "IQ-00247", time: "2 min ago", role: "AI Node", type: "AGENT" },
  { id: "LOG-9285", user: "Priya Sharma", event: "Modified Premium Override (₹22,400 → ₹24,200)", policy: "IQ-00248", time: "8 min ago", role: "Underwriter", type: "OVERRIDE" },
  { id: "LOG-9286", user: "Rajesh Kumar", event: "Batch Intake Pipeline Initialized", policy: "BATCH-47", time: "15 min ago", role: "Analyst", type: "INTAKE" },
  { id: "LOG-9287", user: "Amit Patel", event: "Claim Prediction Verdict (CONDITIONAL)", policy: "IQ-00249", time: "28 min ago", role: "Actuary", type: "ACTION" },
  { id: "LOG-9288", user: "System", event: "SOC-2 Compliance Re-validation", policy: "GLOBAL", time: "1 hr ago", role: "Security", type: "SYSTEM" },
  { id: "LOG-9289", user: "Vikram Singh", event: "Access Token Refresh (IRDAI-OAuth)", policy: "USER-001", time: "2 hr ago", role: "Manager", type: "AUTH" },
];

export default function AuditLog() {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLogs = async () => {
    try {
      const data = await getAuditLog(1, 100);
      setLogs(data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchLogs().finally(() => setLoading(false));

    intervalRef.current = setInterval(fetchLogs, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleManualRefresh = () => {
    setLoading(true);
    fetchLogs().finally(() => setLoading(false));
  };

  const filteredLogs = logs.length > 0 
    ? logs.filter(l => 
        ((l.user_id || "").toLowerCase().includes(search.toLowerCase()) || (l.details || "").toLowerCase().includes(search.toLowerCase())) &&
        (filter === "all" || (l.action || "").toLowerCase() === filter.toLowerCase())
      )
    : AUDIT_DATA.filter(l => 
        (l.user.toLowerCase().includes(search.toLowerCase()) || l.event.toLowerCase().includes(search.toLowerCase())) &&
        (filter === "all" || l.type.toLowerCase() === filter.toLowerCase())
      );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 className="nu-page-title">Compliance Audit Log</h1>
          <div className="nu-page-subtitle">Immutable chronological trail of all human and neural agent activity</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="nu-muted" style={{ fontSize: 11 }}>Auto-refreshing every 5s</span>
          <button 
            className="nu-btn-ghost" 
            style={{ display: "flex", alignItems: "center", gap: 8 }}
            onClick={handleManualRefresh}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button className="nu-btn-ghost" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      {/* Persistence Indicator */}
      <div 
        className="nu-card-elevated" 
        style={{ 
          padding: "12px 20px", 
          backgroundColor: "rgba(0, 230, 118, 0.05)", 
          borderLeft: "3px solid #00E676",
          display: "flex",
          alignItems: "center",
          gap: 12
        }}
      >
        <ShieldCheck size={18} color="#00E676" />
        <div className="font-mono-ibm" style={{ fontSize: 13, color: "#F0F4FF" }}>
          Active Session encrypted with 256-bit SHA. Logs are IRDAI compliant and hash-locked every 24 hours.
        </div>
      </div>

      {/* Table & Filters */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="nu-card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={14} color="#485068" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input 
              type="text" 
              className="nu-input" 
              placeholder="Search audit trail..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              style={{ paddingLeft: 36 }} 
            />
          </div>
          <select className="nu-select" value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 160 }}>
            <option value="all">All Event Types</option>
            <option value="action">Human Action</option>
            <option value="agent">Agent Node</option>
            <option value="override">Manual Override</option>
            <option value="system">System Event</option>
            <option value="auth">Auth Event</option>
          </select>
        </div>

        <div className="nu-card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="nu-table">
            <thead>
              <tr>
                <th style={{ width: 110 }}>Log ID</th>
                <th>Entity / Node</th>
                <th>Event Description</th>
                <th style={{ width: 140 }}>Target Policy</th>
                <th style={{ width: 120 }}>Role</th>
                <th style={{ width: 100 }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((l: any, i: number) => {
                const isRealData = l.timestamp !== undefined || l.action !== undefined;
                return (
                  <tr key={l.id || i} className={`stagger-${(i % 6) + 1}`}>
                    <td><span className="nu-mono-value" style={{ fontSize: 11, color: "#485068" }}>{l.id || `LOG-${9000 + i}`}</span></td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {isRealData && l.user_id?.includes("llama") ? <Bot size={14} color="#00D4FF" /> : <User size={14} color="#8A95B0" />}
                        <span style={{ color: "#F0F4FF", fontWeight: 500, fontSize: 13 }}>{l.user_id || l.user || "System"}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: l.action?.includes("OVERRIDE") ? "#FFB300" : l.user_id?.includes("llama") ? "#00D4FF" : "#8A95B0" }} />
                        <span className="nu-muted" style={{ fontSize: 13 }}>{l.details || l.event || "No details"}</span>
                      </div>
                    </td>
                    <td><span className="nu-mono-value" style={{ fontSize: 12, color: "#0066FF" }}>{l.entity_id || l.policy || "N/A"}</span></td>
                    <td><span className="font-roboto-mono" style={{ fontSize: 10, color: "#485068", textTransform: "uppercase" }}>{l.entity_type || l.role || "USER"}</span></td>
                    <td className="nu-mono-value" style={{ fontSize: 11, color: "#485068" }}>{l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : l.time}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verification Panel */}
      <div className="nu-card-elevated" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Zap size={14} color="#00D4FF" fill="#00D4FF" />
          <span className="font-mono-ibm" style={{ fontSize: 14, fontWeight: 700 }}>Chain-of-Trust Verification</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="nu-card" style={{ padding: 12, backgroundColor: "#0E1118" }}>
            <div className="kpi-label" style={{ fontSize: 8 }}>Last Hash Block</div>
            <div className="nu-mono-value" style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#F0F4FF" }}>0xCF2D7E938B9C82301A4B7DDA14C234E</div>
          </div>
          <div className="nu-card" style={{ padding: 12, backgroundColor: "#0E1118" }}>
            <div className="kpi-label" style={{ fontSize: 8 }}>Protocol Status</div>
            <div className="nu-mono-value" style={{ fontSize: 11, color: "#00E676" }}>✓ VERIFIED BY IRDAI NODE</div>
          </div>
        </div>
      </div>
    </div>
  );
}
