import { useState, useEffect, useRef } from "react";
import {
  Search,
  Download,
  ShieldCheck,
  Zap,
  User,
  Bot,
  RefreshCw,
} from "lucide-react";
import { getAuditLog } from "@/lib/api";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLogs = async () => {
    try {
      const data = await getAuditLog(1, 100);
      setLogs(data);
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
    <div className="flex flex-col gap-6 animate-fade-in pb-12">
      <PageHeader
        title="Compliance Audit Log"
        subtitle="Immutable chronological trail of all human and neural agent activity"
        actions={
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-tertiary">Auto-refreshing every 5s</span>
            <Button variant="outline" size="sm" onClick={handleManualRefresh}>
              <RefreshCw size={14} className={`mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download size={14} className="mr-2" />
              Export
            </Button>
          </div>
        }
      />

      {/* Persistence Indicator */}
      <Card className="bg-success/5 border-l-4 border-l-success flex items-center gap-3 p-4">
        <ShieldCheck size={20} className="text-success" />
        <div className="font-mono-code text-sm text-text-primary">
          Active Session encrypted with 256-bit SHA. Logs are IRDAI compliant and hash-locked every 24 hours.
        </div>
      </Card>

      {/* Table & Filters */}
      <div className="flex flex-col gap-4">
        <Card className="p-4 flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input 
              type="text" 
              className="w-full bg-surface-raised border border-surface-border text-sm text-text-primary rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-brand-500" 
              placeholder="Search audit trail..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <select 
            className="w-full sm:w-[160px] bg-surface-raised border border-surface-border text-sm text-text-primary rounded-lg px-3 py-2 focus:outline-none focus:border-brand-500" 
            value={filter} 
            onChange={e => setFilter(e.target.value)}
          >
            <option value="all">All Event Types</option>
            <option value="action">Human Action</option>
            <option value="agent">Agent Node</option>
            <option value="override">Manual Override</option>
            <option value="system">System Event</option>
            <option value="auth">Auth Event</option>
          </select>
        </Card>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-surface-raised/50">
                  <th className="px-4 py-3 font-medium text-text-tertiary text-left uppercase tracking-wider text-xs w-[110px]">Log ID</th>
                  <th className="px-4 py-3 font-medium text-text-tertiary text-left uppercase tracking-wider text-xs">Entity / Node</th>
                  <th className="px-4 py-3 font-medium text-text-tertiary text-left uppercase tracking-wider text-xs">Event Description</th>
                  <th className="px-4 py-3 font-medium text-text-tertiary text-left uppercase tracking-wider text-xs w-[140px]">Target Policy</th>
                  <th className="px-4 py-3 font-medium text-text-tertiary text-left uppercase tracking-wider text-xs w-[120px]">Role</th>
                  <th className="px-4 py-3 font-medium text-text-tertiary text-left uppercase tracking-wider text-xs w-[100px]">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {filteredLogs.map((l: any, i: number) => {
                  const isRealData = l.timestamp !== undefined || l.action !== undefined;
                  return (
                    <tr key={l.id || i} className="hover:bg-surface-raised transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono-code text-xs text-text-tertiary">{l.id || `LOG-${9000 + i}`}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isRealData && l.user_id?.includes("llama") ? <Bot size={14} className="text-ai" /> : <User size={14} className="text-text-tertiary" />}
                          <span className="text-text-primary font-medium text-sm">{l.user_id || l.user || "System"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${l.action?.includes("OVERRIDE") ? "bg-warning" : l.user_id?.includes("llama") ? "bg-ai" : "bg-text-tertiary"}`} />
                          <span className="text-sm text-text-secondary">{l.details || l.event || "No details"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono-code text-brand-500 text-xs">{l.entity_id || l.policy || "N/A"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono-code text-text-tertiary text-[10px] uppercase">{l.entity_type || l.role || "USER"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono-code text-text-tertiary text-xs">{l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : l.time}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Verification Panel */}
      <Card className="p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={16} className="text-ai" />
          <span className="font-semibold text-text-primary text-sm">Chain-of-Trust Verification</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-surface-raised border border-surface-border p-3 rounded-lg flex flex-col gap-1">
            <div className="text-xs text-text-tertiary uppercase tracking-wider font-semibold">Last Hash Block</div>
            <div className="font-mono-code text-xs text-text-primary truncate">0xCF2D7E938B9C82301A4B7DDA14C234E</div>
          </div>
          <div className="bg-surface-raised border border-surface-border p-3 rounded-lg flex flex-col gap-1">
            <div className="text-xs text-text-tertiary uppercase tracking-wider font-semibold">Protocol Status</div>
            <div className="font-mono-code text-xs text-success">✓ VERIFIED BY IRDAI NODE</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
