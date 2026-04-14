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
  X,
} from "lucide-react";
import { getPolicies, createPolicy } from "@/lib/api";
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    policy_number: "",
    policyholder_name: "",
    vehicle_make: "",
    vehicle_model: "",
    vehicle_year: new Date().getFullYear(),
    engine_cc: 1200,
    seating_capacity: 5,
    vehicle_use: "personal",
    insured_value: 500000,
    premium_amount: 15000,
    prior_claims_count: 0,
    prior_claim_amount: 0,
    anti_theft_device: false,
    parking_type: "street",
    city: "Mumbai",
    annual_mileage_km: 12000,
    ncb_percentage: 0,
    policy_start_date: new Date().toISOString().split('T')[0],
    policy_duration_months: 12,
  });

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

  const handleAddPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createPolicy(formData);
      toast.success("Policy added successfully");
      setShowAddModal(false);
      fetchPolicies();
      setFormData({
        policy_number: "",
        policyholder_name: "",
        vehicle_make: "",
        vehicle_model: "",
        vehicle_year: new Date().getFullYear(),
        engine_cc: 1200,
        seating_capacity: 5,
        vehicle_use: "personal",
        insured_value: 500000,
        premium_amount: 15000,
        prior_claims_count: 0,
        prior_claim_amount: 0,
        anti_theft_device: false,
        parking_type: "street",
        city: "Mumbai",
        annual_mileage_km: 12000,
        ncb_percentage: 0,
        policy_start_date: new Date().toISOString().split('T')[0],
        policy_duration_months: 12,
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to add policy");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPolicies = policies.filter((p) => {
    const matchesSearch =
      (p.policyholder_name?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (p.policy_number?.toLowerCase() || "").includes(search.toLowerCase());
    const matchesFilter = filter === "all" || (p.latest_risk_prediction?.risk_band?.toLowerCase() === filter.toLowerCase());
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
          <button 
            className="nu-btn-primary" 
            onClick={() => setShowAddModal(true)}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <Plus size={16} />
            New Policy
          </button>
        </div>
      </div>

      {/* Add Policy Modal */}
      {showAddModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 50,
          padding: 20
        }}>
          <div className="nu-card" style={{ width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 className="font-mono-ibm text-lg font-semibold text-[#F0F4FF]">Add New Policy</h2>
              <button onClick={() => setShowAddModal(false)} className="nu-btn-ghost" style={{ padding: 4 }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddPolicy} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="nu-label">Policy Number</label>
                <input 
                  type="text" 
                  className="nu-input" 
                  required 
                  value={formData.policy_number}
                  onChange={(e) => setFormData({...formData, policy_number: e.target.value})}
                  placeholder="e.g. POL-12345"
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="nu-label">Policyholder Name</label>
                <input 
                  type="text" 
                  className="nu-input" 
                  required 
                  value={formData.policyholder_name}
                  onChange={(e) => setFormData({...formData, policyholder_name: e.target.value})}
                  placeholder="e.g. John Doe"
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="nu-label">Vehicle Make</label>
                <input 
                  type="text" 
                  className="nu-input" 
                  required 
                  value={formData.vehicle_make}
                  onChange={(e) => setFormData({...formData, vehicle_make: e.target.value})}
                  placeholder="e.g. Toyota"
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="nu-label">Vehicle Model</label>
                <input 
                  type="text" 
                  className="nu-input" 
                  required 
                  value={formData.vehicle_model}
                  onChange={(e) => setFormData({...formData, vehicle_model: e.target.value})}
                  placeholder="e.g. Corolla"
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="nu-label">Vehicle Year</label>
                <input 
                  type="number" 
                  className="nu-input" 
                  required 
                  value={formData.vehicle_year}
                  onChange={(e) => setFormData({...formData, vehicle_year: parseInt(e.target.value)})}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="nu-label">City</label>
                <input 
                  type="text" 
                  className="nu-input" 
                  required 
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  placeholder="e.g. Mumbai"
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="nu-label">Insured Value (IDV)</label>
                <input 
                  type="number" 
                  className="nu-input" 
                  required 
                  value={formData.insured_value}
                  onChange={(e) => setFormData({...formData, insured_value: parseFloat(e.target.value)})}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="nu-label">Premium Amount</label>
                <input 
                  type="number" 
                  className="nu-input" 
                  required 
                  value={formData.premium_amount}
                  onChange={(e) => setFormData({...formData, premium_amount: parseFloat(e.target.value)})}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="nu-label">Start Date</label>
                <input 
                  type="date" 
                  className="nu-input" 
                  required 
                  value={formData.policy_start_date}
                  onChange={(e) => setFormData({...formData, policy_start_date: e.target.value})}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="nu-label">Duration (Months)</label>
                <input 
                  type="number" 
                  className="nu-input" 
                  required 
                  value={formData.policy_duration_months}
                  onChange={(e) => setFormData({...formData, policy_duration_months: parseInt(e.target.value)})}
                />
              </div>
              <div style={{ gridColumn: "span 2", display: "flex", gap: 12, marginTop: 10 }}>
                <button 
                  type="submit" 
                  className="nu-btn-primary" 
                  style={{ flex: 1 }}
                  disabled={submitting}
                >
                  {submitting ? "Adding..." : "Add Policy"}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)} 
                  className="nu-btn-ghost" 
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                    <div style={{ color: "#F0F4FF", fontWeight: 500 }}>{p.policyholder_name}</div>
                    <div style={{ fontSize: 11, color: "#485068" }}>{p.city || "Mumbai"}</div>
                  </td>
                  <td>
                    <div className="font-roboto-mono" style={{ fontSize: 12, color: "#8A95B0" }}>
                      {p.vehicle_make} {p.vehicle_model}
                    </div>
                    <div style={{ fontSize: 10, color: "#485068" }}>{p.vehicle_year} · {p.vehicle_use}</div>
                  </td>
                  <td>
                    <RiskBadge band={p.latest_risk_prediction?.risk_band || "LOW"} />
                  </td>
                  <td>
                    <div className="nu-mono-value" style={{ color: (p.latest_risk_prediction?.claim_probability || 0) > 0.6 ? "#FF3B5C" : (p.latest_risk_prediction?.claim_probability || 0) > 0.3 ? "#FFB300" : "#00E676" }}>
                      {((p.latest_risk_prediction?.claim_probability || 0) * 100).toFixed(1)}%
                    </div>
                  </td>
                  <td>
                    <div className="font-roboto-mono" style={{ fontSize: 11, color: "#485068" }}>
                      {p.latest_risk_prediction?.created_at ? new Date(p.latest_risk_prediction.created_at).toLocaleTimeString() : "Never"}
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
