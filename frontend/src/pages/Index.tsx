import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import RenewalTab from "@/components/RenewalTab";
import {
  FileText,
  ShieldAlert,
  AlertTriangle,
  Bell,
  TrendingUp,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Zap,
} from "lucide-react";
import { getDashboardStats, getPolicies } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

const RISK_COLORS: Record<string, string> = {
  LOW: "#00E676",
  MEDIUM: "#FFB300",
  HIGH: "#FF6400",
  CRITICAL: "#FF3B5C",
};

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

function KpiCard({
  icon: Icon,
  label,
  value,
  trend,
  trendUp,
  color,
  delay,
}: {
  icon: any;
  label: string;
  value: string | number;
  trend: string;
  trendUp: boolean | null;
  color: string;
  delay: number;
}) {
  return (
    <div
      className="kpi-card"
      style={{ animation: `fadeInUp 0.35s ease ${delay}ms both` }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            backgroundColor: color + "18",
            border: `1px solid ${color}30`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={16} color={color} />
        </div>
        <div
          className={`kpi-trend ${
            trendUp === null ? "kpi-trend-neutral" : trendUp ? "kpi-trend-up" : "kpi-trend-down"
          }`}
          style={{ display: "flex", alignItems: "center", gap: 3 }}
        >
          {trendUp !== null &&
            (trendUp ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />)}
          {trend}
        </div>
      </div>
      <div>
        <div className="kpi-number">{value}</div>
        <div className="kpi-label" style={{ marginTop: 4 }}>{label}</div>
      </div>
    </div>
  );
}

const AGENT_RUNS = [
  { id: "IQ-00247", holder: "Rajesh Kumar", nodes: "supervisor→risk→explainer→report", model: "llama-3.3-70b", time: "2 min ago", band: "HIGH" },
  { id: "IQ-00248", holder: "Priya Sharma", nodes: "supervisor→risk→report", model: "llama-3.1-8b", time: "5 min ago", band: "LOW" },
  { id: "IQ-00249", holder: "Amit Patel", nodes: "supervisor→risk→explainer", model: "llama-3.3-70b", time: "18 min ago", band: "CRITICAL" },
  { id: "IQ-00250", holder: "Sunita Rao", nodes: "supervisor→risk→report", model: "llama-3.1-8b", time: "1 hr ago", band: "MEDIUM" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("feed");

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  useEffect(() => {
    (async () => {
      try {
        const [s, p] = await Promise.all([getDashboardStats(), getPolicies()]);
        setStats(s);
        setPolicies(p.slice(0, 5));
      } catch {
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const kpis = [
    {
      icon: FileText,
      label: "Total Policies",
      value: stats?.total_policies ?? "—",
      trend: "+12 this month",
      trendUp: true,
      color: "#00D4FF",
    },
    {
      icon: BarChart3,
      label: "Avg Risk Score",
      value: stats?.avg_risk_score ? Number(stats.avg_risk_score).toFixed(1) : "—",
      trend: "+2.1 pts",
      trendUp: true,
      color: "#FFB300",
    },
    {
      icon: ShieldAlert,
      label: "High Risk Count",
      value: stats?.total_assessed ?? "—",
      trend: "+5 flagged",
      trendUp: true,
      color: "#FF6400",
    },
    {
      icon: AlertTriangle,
      label: "Critical Alerts",
      value: loading ? "—" : 7,
      trend: "−2 resolved",
      trendUp: false,
      color: "#FF3B5C",
    },
    {
      icon: TrendingUp,
      label: "Claims Predicted",
      value: stats?.claims_predicted ?? "—",
      trend: "+8% this week",
      trendUp: true,
      color: "#0066FF",
    },
    {
      icon: BarChart3,
      label: "Reports Generated",
      value: stats?.reports_generated ?? "—",
      trend: "Last 30 days",
      trendUp: null,
      color: "#00D4FF",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 className="nu-page-title">
            {greeting},{" "}
            <span style={{ color: "#00D4FF" }}>
              {user?.name || user?.email?.split("@")[0] || "Analyst"}
            </span>
          </h1>
          <div
            style={{
              fontFamily: "'Roboto Mono', monospace",
              fontSize: 12,
              color: "#485068",
              marginTop: 6,
            }}
          >
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
        <button
          className="nu-btn-ghost"
          onClick={() => window.location.reload()}
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {/* KPI Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 16,
        }}
      >
        {kpis.map((kpi, i) => (
          <KpiCard key={kpi.label} {...kpi} delay={i * 40} />
        ))}
      </div>
      
      {/* Tab Navigation */}
      <div style={{ display: "flex", gap: 24, borderBottom: "1px solid #1E2535", paddingBottom: 0 }}>
        <button
          onClick={() => setActiveTab("feed")}
          style={{
            background: "none", border: "none", cursor: "pointer",
            padding: "8px 0 12px", borderBottom: activeTab === "feed" ? "2px solid #00D4FF" : "2px solid transparent",
            color: activeTab === "feed" ? "#00D4FF" : "#8A95B0",
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 500,
          }}
        >
          Live Inference Feed
        </button>
        <button
          onClick={() => setActiveTab("renewal")}
          style={{
            background: "none", border: "none", cursor: "pointer",
            padding: "8px 0 12px", borderBottom: activeTab === "renewal" ? "2px solid #00D4FF" : "2px solid transparent",
            color: activeTab === "renewal" ? "#00D4FF" : "#8A95B0",
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 500,
          }}
        >
          Renewal Intelligence
        </button>
      </div>

      {activeTab === "renewal" ? (
        <RenewalTab />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 20 }}>
        {/* Risk Trend Chart Placeholder */}
        <div className="nu-card" style={{ padding: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 13,
                fontWeight: 600,
                color: "#F0F4FF",
              }}
            >
              Risk Trend
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              {[
                { label: "LOW", color: "#00E676" },
                { label: "MEDIUM", color: "#FFB300" },
                { label: "HIGH", color: "#FF6400" },
                { label: "CRITICAL", color: "#FF3B5C" },
              ].map((l) => (
                <div
                  key={l.label}
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 9,
                    color: l.color,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 2,
                      backgroundColor: l.color,
                      borderRadius: 1,
                    }}
                  />
                  {l.label}
                </div>
              ))}
            </div>
          </div>
          {/* Fake sparkline chart */}
          <svg width="100%" height="140" style={{ display: "block" }}>
            <defs>
              <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00D4FF" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#00D4FF" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Grid lines */}
            {[0, 35, 70, 105, 140].map((y) => (
              <line key={y} x1="0" y1={y} x2="100%" y2={y} stroke="#1E2535" strokeWidth="1" />
            ))}
            {/* LOW line */}
            <polyline
              fill="none"
              stroke="#00E676"
              strokeWidth="1.5"
              points="0,110 60,105 120,108 180,100 240,95 300,92 360,90 420,85 480,82 540,78 600,75 660,72"
            />
            {/* MEDIUM line */}
            <polyline
              fill="none"
              stroke="#FFB300"
              strokeWidth="1.5"
              points="0,80 60,75 120,78 180,72 240,68 300,65 360,62 420,58 480,55 540,52 600,50 660,48"
            />
            {/* HIGH line */}
            <polyline
              fill="none"
              stroke="#FF6400"
              strokeWidth="1.5"
              points="0,55 60,50 120,52 180,48 240,45 300,42 360,40 420,38 480,36 540,34 600,32 660,30"
            />
            {/* CRITICAL line */}
            <polyline
              fill="none"
              stroke="#FF3B5C"
              strokeWidth="1.5"
              points="0,35 60,32 120,30 180,28 240,26 300,24 360,22 420,20 480,18 540,16 600,15 660,14"
            />
          </svg>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 8,
              fontFamily: "'Roboto Mono', monospace",
              fontSize: 9,
              color: "#485068",
            }}
          >
            {["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"].map(
              (m) => <span key={m}>{m}</span>
            )}
          </div>
        </div>

        {/* Agent Runs Card */}
        <div className="nu-card-ai" style={{ padding: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 18,
            }}
          >
            <Zap size={13} color="#00D4FF" />
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 13,
                fontWeight: 600,
                color: "#F0F4FF",
              }}
            >
              Agent Runs
            </span>
            <span
              style={{
                marginLeft: "auto",
                fontFamily: "'Roboto Mono', monospace",
                fontSize: 9,
                color: "#485068",
              }}
            >
              llama-3.3-70b
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {AGENT_RUNS.map((run) => (
              <div
                key={run.id}
                style={{
                  borderBottom: "1px solid #1E2535",
                  paddingBottom: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Roboto Mono', monospace",
                      fontSize: 12,
                      color: "#00D4FF",
                    }}
                  >
                    {run.id}
                  </span>
                  <RiskBadge band={run.band} />
                </div>
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 12,
                    color: "#8A95B0",
                    marginBottom: 4,
                  }}
                >
                  {run.holder}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontFamily: "'Roboto Mono', monospace",
                    fontSize: 9,
                    color: "#485068",
                  }}
                >
                  <span>{run.nodes}</span>
                  <span>·</span>
                  <span>{run.time}</span>
                </div>
              </div>
            ))}
          </div>
          </div>
        </div>
      )}

      {/* Recent Policies Table */}
      <div className="nu-card" style={{ padding: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 13,
              fontWeight: 600,
              color: "#F0F4FF",
            }}
          >
            Recent Policies
          </div>
          <Link
            to="/policies"
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              color: "#00D4FF",
              textDecoration: "none",
            }}
          >
            View All →
          </Link>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="nu-shimmer"
                style={{ height: 44, borderRadius: 6 }}
              />
            ))}
          </div>
        ) : policies.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 0",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              color: "#485068",
            }}
          >
            No policies yet.{" "}
            <Link to="/policies" style={{ color: "#00D4FF", textDecoration: "none" }}>
              Add your first policy →
            </Link>
          </div>
        ) : (
          <table className="nu-table">
            <thead>
              <tr>
                <th>Policy No.</th>
                <th>Holder Name</th>
                <th>Vehicle</th>
                <th>Risk Band</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span
                      style={{
                        fontFamily: "'Roboto Mono', monospace",
                        fontSize: 12,
                        color: "#00D4FF",
                      }}
                    >
                      {p.policy_number || `IQ-${String(p.id).slice(-5)}`}
                    </span>
                  </td>
                  <td style={{ color: "#F0F4FF", fontSize: 13 }}>{p.policyholder_name || "—"}</td>
                  <td style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 11, color: "#8A95B0" }}>
                    {p.vehicle_make || "—"} {p.vehicle_model || ""}
                  </td>
                  <td>
                    <RiskBadge
                      band={p.risk_band || p.current_risk_band || "LOW"}
                    />
                  </td>
                  <td>
                    <Link
                      to={`/policies/${p.id}`}
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 11,
                        color: "#0066FF",
                        textDecoration: "none",
                      }}
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
