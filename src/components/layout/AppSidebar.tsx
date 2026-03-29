import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Upload,
  ShieldAlert,
  TrendingUp,
  IndianRupee,
  FileText,
  Layers,
  ClipboardList,
  Settings,
  Zap,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/policies", icon: Upload, label: "Policies" },
  { to: "/risk-assessment", icon: ShieldAlert, label: "Risk Assessment" },
  { to: "/claim-prediction", icon: TrendingUp, label: "Claim Prediction" },
  { to: "/premium-advisory", icon: IndianRupee, label: "Premium Advisory" },
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
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border max-md:relative max-md:z-auto max-md:h-full max-md:border-r-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
          <Zap className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-sidebar-primary-foreground">InsureIQ</h1>
          <p className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50">Risk Analytics</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <NavLink
            to="/settings"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
          >
            <Settings className="h-4 w-4" />
            Settings
          </NavLink>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <ThemeToggle />
          </div>
        </div>
        {user && (
          <div className="flex items-center justify-between px-3">
            <span className="text-xs text-sidebar-foreground/60 truncate max-w-[140px]">{user.email}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-sidebar-foreground/50 hover:text-sidebar-foreground" onClick={logout}>
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        <p className="px-3 text-[10px] text-sidebar-foreground/30">
          Powered by Vishleshak AI
        </p>
      </div>
    </aside>
  );
}
