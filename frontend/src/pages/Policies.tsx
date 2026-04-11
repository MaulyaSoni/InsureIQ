import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Search,
  Filter,
  Download,
  MoreVertical,
  Loader2,
  AlertCircle,
  Zap,
} from "lucide-react";
import { getPolicies } from "@/lib/api";
import { toast } from "sonner";

function RiskBadge({ band }: { band: string }) {
  const b = (band || "LOW").toUpperCase();
  const cls =
    b === "CRITICAL"
      ? "risk-badge risk-badge-critical"
      : b === "HIGH"
      ? "risk-badge risk-badge-high"
      : b === "MEDIUM"
      ? "risk-badge risk-badge-medium"
      : "risk-badge risk-badge-low";
  return <span className={cls}>● {b}</span>;
}

export default function Policies() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const data = await getPolicies();
      setPolicies(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load policies");
    } finally {
      setLoading(false);
    }
  };

  const filteredPolicies = policies.filter((p) => {
    const matchesSearch =
      (p.holder_name?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (p.policy_number?.toLowerCase() || "").includes(search.toLowerCase());
    const matchesFilter = filter === "all" || (p.risk_band?.toLowerCase() === filter.toLowerCase());
    return matchesSearch && matchesFilter;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 className="nu-page-title">Policy Portfolio</h1>
          <div className="nu-page-subtitle">Manage and monitor insured assets and risk profiles</div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="nu-btn-ghost" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Download size={14} />
            Export CSV
          </button>
          <button className="nu-btn-primary" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Plus size={16} />
            New Policy
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="nu-card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search
            size={14}
            color="#485068"
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            type="text"
            className="nu-input"
            placeholder="Search by holder name or policy number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="nu-label" style={{ marginBottom: 0 }}>Filter:</span>
          <select
            className="nu-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ width: 140, padding: "8px 12px", border: "1px solid #1E2535" }}
          >
            <option value="all">All Risk Bands</option>
            <option value="low">Low Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="high">High Risk</option>
            <option value="critical">Critical Risk</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="nu-card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <Loader2 className="animate-spin" size={32} color="#00D4FF" style={{ margin: "0 auto 16px" }} />
            <div className="font-mono-ibm text-sm text-muted-foreground">Initializing data stream...</div>
          </div>
        ) : filteredPolicies.length === 0 ? (
          <div style={{ padding: 80, textAlign: "center" }}>
            <AlertCircle size={40} color="#1E2535" style={{ margin: "0 auto 16px" }} />
            <div className="font-mono-ibm text-lg text-primary-foreground">No records found</div>
            <div className="nu-muted mt-2">Adjust your filters or add a new policy to the engine.</div>
          </div>
        ) : (
          <table className="nu-table">
            <thead>
              <tr>
                <th>Policy ID</th>
                <th>Holder Name</th>
                <th>Vehicle / Asset</th>
                <th>Risk Band</th>
                <th>Claim Prob</th>
                <th>Last Run</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPolicies.map((p, i) => (
                <tr key={p.id} className={`stagger-${(i % 6) + 1}`}>
                  <td>
                    <span className="nu-mono-value" style={{ color: "#00D4FF" }}>
                      {p.policy_number || `IQ-00${String(p.id).slice(-3)}`}
                    </span>
                  </td>
                  <td>
                    <div style={{ color: "#F0F4FF", fontWeight: 500 }}>{p.holder_name}</div>
                    <div style={{ fontSize: 11, color: "#485068" }}>{p.registration_city || "Mumbai"}</div>
                  </td>
                  <td>
                    <div className="font-roboto-mono" style={{ fontSize: 12, color: "#8A95B0" }}>
                      {p.vehicle_make} {p.vehicle_model}
                    </div>
                    <div style={{ fontSize: 10, color: "#485068" }}>{p.vehicle_year || "2020"} · {p.usage_type || "Personal"}</div>
                  </td>
                  <td>
                    <RiskBadge band={p.risk_band || "LOW"} />
                  </td>
                  <td>
                    <div className="nu-mono-value" style={{ color: (p.claim_probability || 0) > 60 ? "#FF3B5C" : (p.claim_probability || 0) > 30 ? "#FFB300" : "#00E676" }}>
                      {(p.claim_probability || 24.2).toFixed(1)}%
                    </div>
                  </td>
                  <td>
                    <div className="font-roboto-mono" style={{ fontSize: 11, color: "#485068" }}>
                      {p.last_run_timestamp ? new Date(p.last_run_timestamp).toLocaleTimeString() : "2 min ago"}
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                      {p.has_ai_analysis && <Zap size={12} color="#00D4FF" fill="#00D4FF" />}
                      <Link to={`/policies/${p.id}`} className="nu-btn-ghost" style={{ padding: "6px 12px", fontSize: 11 }}>
                        Analyze →
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" }}>
        <div className="font-roboto-mono" style={{ fontSize: 11, color: "#485068" }}>
          Showing 1–{filteredPolicies.length} of {policies.length} entries
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="nu-btn-ghost" style={{ padding: "6px 12px", fontSize: 11 }} disabled>Prev</button>
          <button className="nu-btn-ghost" style={{ padding: "6px 12px", fontSize: 11, borderColor: "#00D4FF", color: "#00D4FF" }}>1</button>
          <button className="nu-btn-ghost" style={{ padding: "6px 12px", fontSize: 11 }}>2</button>
          <button className="nu-btn-ghost" style={{ padding: "6px 12px", fontSize: 11 }}>Next</button>
        </div>
      </div>
    </div>
  );
}
