import { useState } from "react";
import {
  Settings as SettingsIcon,
  ShieldCheck,
  Zap,
  Bot,
  Database,
  Lock,
  Globe,
  Bell,
  RefreshCw,
  Save,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const [activeTab, setActiveTab] = useState<"api" | "model" | "policy" | "security" | "team">("team");
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("System configuration persistent");
    }, 1200);
  };

  const tabs = [
    { id: "api", name: "API & Data Streams", icon: Database },
    { id: "model", name: "Neural Agents", icon: Bot },
    { id: "policy", name: "Underwriting Rules", icon: SettingsIcon },
    { id: "security", name: "OAuth & Security", icon: Lock },
    { id: "team", name: "Workspace Members", icon: ShieldCheck },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 className="nu-page-title">Intelligence Console</h1>
          <div className="nu-page-subtitle">Configure system-wide neural parameters and API connectivity</div>
        </div>
        <button 
          className="nu-btn-primary" 
          onClick={handleSave}
          disabled={saving}
          style={{ width: 140, justifyContent: "center" }}
        >
          {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
          {saving ? "Hashing..." : "Save Configuration"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 32, alignItems: "start" }}>
        {/* Left Side: Category Navigator */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 20px",
                borderRadius: 8,
                backgroundColor: activeTab === t.id ? "rgba(0, 212, 255, 0.08)" : "transparent",
                color: activeTab === t.id ? "#00D4FF" : "#8A95B0",
                border: activeTab === t.id ? "1px solid rgba(0, 212, 255, 0.2)" : "1px solid transparent",
                textAlign: "left",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                fontWeight: activeTab === t.id ? 700 : 400,
                cursor: "pointer",
                transition: "all 150ms ease",
              }}
            >
              <t.icon size={16} />
              {t.name}
            </button>
          ))}

          <div style={{ padding: "32px 20px" }}>
            <div className="font-mono-ibm" style={{ fontSize: 11, color: "#485068", borderTop: "1px solid #1E2535", paddingTop: 16 }}>
              System v2.4.1 (Stable)<br />
              Environment: Production-Mumbai<br />
              IRDAI Compliance: ACTIVE
            </div>
          </div>
        </div>

        {/* Right Side: Configuration Blocks */}
        <div className="nu-card" style={{ padding: 32, display: "flex", flexDirection: "column", gap: 32 }}>
          {activeTab === "team" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div>
                <h3 className="font-mono-ibm text-[15px] font-semibold text-[#F0F4FF] mb-2">Team Management</h3>
                <p className="nu-muted mb-6">Manage organization members and role-based access control.</p>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 24 }}>
                  <div style={{ flex: 1 }}>
                    <label className="nu-label">Email Address</label>
                    <input type="email" className="nu-input" placeholder="colleague@suresafe.in" />
                  </div>
                  <div style={{ width: 140 }}>
                    <label className="nu-label">Role</label>
                    <select className="nu-select">
                      <option value="VIEWER">VIEWER</option>
                      <option value="ANALYST">ANALYST</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>
                  <button className="nu-btn-primary" onClick={() => toast.success("Invitation sent with temporary credentials.")}>Invite User</button>
                </div>
                
                <div style={{ border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, overflow: "hidden" }}>
                  <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", backgroundColor: "rgba(0,0,0,0.2)", fontSize: 12 }}>
                        <th style={{ padding: "12px 16px", color: "#8A95B0", fontWeight: 500 }}>User</th>
                        <th style={{ padding: "12px 16px", color: "#8A95B0", fontWeight: 500 }}>Role</th>
                        <th style={{ padding: "12px 16px", color: "#8A95B0", fontWeight: 500 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: "16px", color: "#F0F4FF", fontSize: 13, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                           admin@suresafe.in<br/><span style={{ color: "#485068", fontSize: 11 }}>Admin User</span>
                        </td>
                        <td style={{ padding: "16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                           <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, backgroundColor: "rgba(0, 212, 255, 0.1)", color: "#00D4FF", border: "1px solid rgba(0, 212, 255, 0.2)"}}>ADMIN</span>
                        </td>
                        <td style={{ padding: "16px", color: "#00E676", fontSize: 12, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Active</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "16px", color: "#F0F4FF", fontSize: 13, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                           analyst@suresafe.in<br/><span style={{ color: "#485068", fontSize: 11 }}>Senior Analyst</span>
                        </td>
                        <td style={{ padding: "16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                           <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, backgroundColor: "rgba(255, 255, 255, 0.05)", color: "#8A95B0", border: "1px solid rgba(255, 255, 255, 0.1)"}}>ANALYST</span>
                        </td>
                        <td style={{ padding: "16px", color: "#00E676", fontSize: 12, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Active</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "api" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="nu-label">Main Backend Core Endpoint</label>
                <div style={{ position: "relative" }}>
                  <Globe size={14} color="#485068" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
                  <input type="text" className="nu-input" style={{ paddingLeft: 40 }} defaultValue="https://api.insureiq.internal/v2" />
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="nu-label">External Risk Oracle (XOR)</label>
                <input type="text" className="nu-input" defaultValue="https://xor.internal.mumbai.gov.in" />
                <span style={{ fontSize: 10, color: "#485068" }}>Last synced 2.4 min ago · Latency: 14ms</span>
              </div>
              <div className="nu-divider" />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div className="font-mono-ibm" style={{ fontSize: 13, color: "#F0F4FF" }}>Auto-Stream Evaluation</div>
                  <div className="nu-muted" style={{ fontSize: 11 }}>Trigger assessment pipeline automatically upon ingest.</div>
                </div>
                <div style={{ width: 44, height: 22, borderRadius: 20, backgroundColor: "#00D4FF", position: "relative", cursor: "pointer", marginLeft: "auto" }}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", backgroundColor: "#FFF", position: "absolute", top: 3, right: 3 }} />
                </div>
              </div>
            </div>
          )}

          {activeTab === "model" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <label className="nu-label">Active Underwriting Model Node</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { id: "llama-3.1-8b", name: "llama-3.1-8b", tag: "Fast / Efficient", color: "#8A95B0" },
                    { id: "llama-3.3-70b", name: "llama-3.3-70b", tag: "Most Intelligent", color: "#00D4FF", active: true },
                    { id: "gpt-4o", name: "GPT-4o", tag: "External Enterprise", color: "#CC74FF" },
                    { id: "ensemble", name: "Ensemble-V3", tag: "Multi-Model Voting", color: "#00E676" },
                  ].map(m => (
                    <div 
                      key={m.id} 
                      style={{ 
                        padding: 16, 
                        border: m.active ? "1px solid #00D4FF" : "1px solid #1E2535", 
                        backgroundColor: m.active ? "rgba(0, 212, 255, 0.05)" : "#0E1118",
                        borderRadius: 8,
                        cursor: "pointer",
                        transition: "all 150ms ease",
                        display: "flex",
                        alignItems: "center",
                        gap: 12
                      }}
                    >
                      <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: m.color }} />
                      <div style={{ flex: 1 }}>
                        <div className="font-mono-ibm" style={{ fontSize: 13, color: "#F0F4FF", fontWeight: 600 }}>{m.name}</div>
                        <div className="nu-muted" style={{ fontSize: 10 }}>{m.tag}</div>
                      </div>
                      {m.active && <Zap size={14} color="#00D4FF" fill="#00D4FF" />}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="nu-label">Reasoning Chain-of-Thought Temperature</label>
                <input type="range" style={{ accentColor: "#00D4FF" }} min="1" max="100" defaultValue="42" />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#485068" }}>
                  <span>Precise (0.1)</span>
                  <span>Neural Standard (0.42)</span>
                  <span>Creative (0.9+)</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "policy" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="nu-label">Critical Severity Threshold</label>
                <div className="nu-mono-value" style={{ fontSize: 15, color: "#FF3B5C", marginBottom: 8 }}>85.0 +</div>
                <input type="range" style={{ accentColor: "#FF3B5C" }} min="50" max="95" defaultValue="85" />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, backgroundColor: "rgba(255, 179, 0, 0.05)", border: "1px solid rgba(255, 179, 0, 0.15)", borderRadius: 6 }}>
                <AlertTriangle size={14} color="#FFB300" />
                <span className="nu-muted" style={{ fontSize: 11, lineHeight: 1.4 }}>Modifying these thresholds will re-classify all active policies in the next nightly batch run.</span>
              </div>
              <div className="nu-divider" />
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <label className="nu-label">Mandatory Report Sections</label>
                {[
                  { id: "risk", label: "SHAP Factor Attribution", active: true },
                  { id: "prem", label: "Multi-insurer Benchmarks", active: true },
                  { id: "auth", label: "Sign-off Metadata Block", active: false },
                ].map(s => (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <input type="checkbox" id={s.id} defaultChecked={s.active} />
                    <label htmlFor={s.id} style={{ fontSize: 13, color: "#8A95B0" }}>{s.label}</label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="nu-label">Session Rotation Frequency</label>
                <select className="nu-select">
                  <option>Every 24 Hours</option>
                  <option>Every 12 Hours</option>
                  <option>IRDAI Compliant (Real-time)</option>
                </select>
              </div>
              <div className="nu-divider" />
              <button className="nu-btn-ghost" style={{ width: "fit-content", borderColor: "#FF3B5C", color: "#FF3B5C" }}>
                <Trash2 size={14} /> Clear System Audit Hashing
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
