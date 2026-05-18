import React, { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/lib/auth-context"
import {
  Shield,
  LayoutDashboard,
  FileText,
  TrendingUp,
  BookOpen,
  Layers,
  History,
  Settings as SettingsIcon,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Search,
  Bell,
  Sparkles,
  Zap,
  AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { path: '/',              label: 'Dashboard',    icon: LayoutDashboard },
  { path: '/policies',      label: 'Policies',     icon: FileText },
  { path: '/risk-assessment', label: 'Risk Engine',  icon: Shield },
  { path: '/claim-prediction', label: 'Claims',       icon: AlertCircle },
  { path: '/premium-advisory', label: 'Premium',      icon: TrendingUp },
  { path: '/reports',       label: 'Reports',      icon: BookOpen },
  { path: '/batch-analysis', label: 'Batch',        icon: Layers },
  { path: '/audit-log',     label: 'Audit Log',    icon: History },
];

export function AppSidebar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <motion.aside
      animate={{ width: isExpanded ? 240 : 64 }}
      transition={{ type: "spring", damping: 20, stiffness: 200 }}
      className="bg-surface-card border-r border-surface-border flex flex-col h-screen shrink-0 relative z-40"
    >
      {/* Brand */}
      <div className="h-16 flex items-center px-4 border-b border-surface-border overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-display font-bold shadow-brand shrink-0">
            I
          </div>
          <AnimatePresence>
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="font-display font-bold text-lg tracking-tight text-text-primary whitespace-nowrap"
              >
                Insure<span className="text-brand-500">IQ</span>
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-6 space-y-1 overflow-y-auto scrollbar-thin">
        {NAV_ITEMS.map((item) => {
          const isActive = item.path === "/" 
            ? location.pathname === "/" 
            : location.pathname.startsWith(item.path);
            
          return (
            <Link key={item.path} to={item.path}>
              <motion.div
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors duration-150 group relative',
                  isActive
                    ? 'bg-brand-500/10 text-brand-600 dark:text-brand-300'
                    : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary'
                )}
                whileHover={{ x: isExpanded ? 2 : 0 }}
                whileTap={{ scale: 0.98 }}
              >
                <item.icon size={18} className={cn(isActive ? 'text-brand-500' : 'text-text-tertiary group-hover:text-text-primary')} />
                
                <AnimatePresence>
                  {isExpanded && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="text-sm font-medium whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>

                {isActive && isExpanded && (
                  <motion.div
                    layoutId="active-nav"
                    className="absolute left-0 top-2 bottom-2 w-1 bg-brand-500 rounded-r-md"
                  />
                )}
              </motion.div>
            </Link>
          )
        })}
      </nav>

      {/* Toggle & User Section */}
      <div className="p-2 border-t border-surface-border">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center p-2 rounded-lg text-text-tertiary hover:bg-surface-raised hover:text-text-primary transition-colors mb-2"
        >
          {isExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>

        <div className={cn(
          "flex items-center gap-3 p-2 rounded-xl transition-colors",
          isExpanded ? "bg-surface-raised/50" : "justify-center"
        )}>
          <div className="w-8 h-8 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-xs shrink-0 border border-brand-500/20 uppercase">
            {user?.full_name?.charAt(0) || "A"}
          </div>
          
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden flex-1"
              >
                <div className="text-xs font-semibold text-text-primary truncate">{user?.full_name || "Analyst"}</div>
                <div className="text-[10px] text-text-tertiary font-mono-code truncate tracking-tighter">ID: {user?.id?.substring(0, 8)}</div>
              </motion.div>
            )}
          </AnimatePresence>

          {isExpanded && (
            <button 
              onClick={logout}
              className="p-1.5 text-text-tertiary hover:text-risk-critical transition-colors"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  )
}
