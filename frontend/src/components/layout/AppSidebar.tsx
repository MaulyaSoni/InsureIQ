import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FolderOpen,
  ShieldAlert,
  TrendingUp,
  IndianRupee,
  FileText,
  Layers,
  ClipboardList,
  Settings,
  LogOut,
  Zap,
  Map,
  Inbox
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/analytics", icon: Map, label: "Portfolio Heatmap" },
  { to: "/workbench", icon: Inbox, label: "Review Workbench" },
  { to: "/policies", icon: FolderOpen, label: "Policies" },
  { to: "/risk-assessment", icon: ShieldAlert, label: "Risk Assessment" },
  { to: "/claim-prediction", icon: TrendingUp, label: "Claim Prediction" },
  { to: "/premium-advisory", icon: IndianRupee, label: "Premium Advisory" },
  { to: "/fraud-review", icon: ShieldAlert, label: "Fraud Review" },
  { to: "/reports", icon: FileText, label: "Reports" },
  { to: "/batch-analysis", icon: Layers, label: "Batch Analysis" },
  { to: "/audit-log", icon: ClipboardList, label: "Audit Log" },
];

interface AppSidebarProps {
  onNavigate?: () => void;
}

export default function AppSidebar({ onNavigate }: AppSidebarProps) {
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <aside
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: 40,
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "240px",
        backgroundColor: "#0A0C14",
        borderRight: "1px solid #1E2535",
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "20px 20px 18px",
          borderBottom: "1px solid #1E2535",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: "rgba(0,212,255,0.1)",
            border: "1px solid rgba(0,212,255,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Zap size={18} color="#00D4FF" />
        </div>
        <div>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 15,
              fontWeight: 700,
              color: "#F0F4FF",
              letterSpacing: "-0.01em",
            }}
          >
            InsureIQ
          </div>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9,
              color: "#485068",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              marginTop: 1,
            }}
          >
            Risk Analytics
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {navItems.map((item) => {
          const isActive =
            item.to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 12px",
                borderRadius: 6,
                textDecoration: "none",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "#00D4FF" : "#8A95B0",
                backgroundColor: isActive ? "rgba(0,212,255,0.08)" : "transparent",
                borderLeft: isActive ? "3px solid #00D4FF" : "3px solid transparent",
                transition: "all 150ms ease",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.color = "#F0F4FF";
                  (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.04)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.color = "#8A95B0";
                  (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                }
              }}
            >
              <item.icon size={15} style={{ flexShrink: 0 }} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        style={{
          borderTop: "1px solid #1E2535",
          padding: "12px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {/* Agent Active Indicator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "7px 12px",
            borderRadius: 6,
            backgroundColor: "rgba(0,212,255,0.06)",
            border: "1px solid rgba(0,212,255,0.12)",
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: "#00D4FF",
              animation: "agentPulse 2s ease-in-out infinite",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: "'Roboto Mono', monospace",
              fontSize: 10,
              color: "#00D4FF",
            }}
          >
            AGENT READY
          </span>
        </div>

        {/* Settings Link */}
        <NavLink
          to="/settings"
          onClick={onNavigate}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "9px 12px",
            borderRadius: 6,
            textDecoration: "none",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
            color: "#485068",
            borderLeft: "3px solid transparent",
            transition: "all 150ms ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "#8A95B0";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "#485068";
          }}
        >
          <Settings size={15} />
          Settings
        </NavLink>

        {/* User */}
        {user && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 12px",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#8A95B0",
                  maxWidth: 140,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user.name || user.email.split("@")[0]}
              </div>
              <div
                style={{
                  fontFamily: "'Roboto Mono', monospace",
                  fontSize: 9,
                  color: "#485068",
                  marginTop: 1,
                }}
              >
                {user.email}
              </div>
            </div>
            <button
              onClick={logout}
              style={{
                background: "transparent",
                border: "none",
                padding: "6px",
                cursor: "pointer",
                color: "#485068",
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                transition: "color 150ms ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = "#FF3B5C";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = "#485068";
              }}
              title="Sign out"
            >
              <LogOut size={13} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
