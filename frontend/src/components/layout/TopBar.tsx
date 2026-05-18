import React from "react"
import { useLocation } from "react-router-dom"
import { motion } from "framer-motion"
import { 
  ChevronRight, 
  Sparkles, 
  Bell, 
  Moon, 
  Sun,
  User 
} from "lucide-react"
import { useChatStore } from "@/stores/useChatStore"
import { cn } from "@/lib/utils"

export function TopBar() {
  const location = useLocation()
  const { open: openChat } = useChatStore()
  const [isDark, setIsDark] = React.useState(document.documentElement.classList.contains("dark"))

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    if (next) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }

  // Map path to title
  const getPageTitle = (path: string) => {
    switch (path) {
      case '/': return 'Dashboard'
      case '/policies': return 'Policies'
      case '/risk-assessment': return 'Risk Intelligence'
      case '/claim-prediction': return 'Claim Analysis'
      case '/premium-advisory': return 'Premium Advisory'
      case '/batch-analysis': return 'Batch Processing'
      case '/audit-log': return 'Audit Trace'
      case '/settings': return 'System Config'
      default: return 'Overview'
    }
  }

  const pageTitle = getPageTitle(location.pathname)

  return (
    <header className="h-14 border-b border-surface-border bg-surface-card/80 backdrop-blur-sm flex items-center px-5 gap-4 z-10 shrink-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 flex-1">
        <span className="text-text-tertiary text-sm">InsureIQ</span>
        <ChevronRight size={14} className="text-text-tertiary" />
        <span className="text-text-primary text-sm font-medium">{pageTitle}</span>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Ask AI button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => openChat()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-ai-light dark:bg-ai-dark/20 text-ai text-sm font-medium border border-ai-border/30 hover:border-ai-border transition-all mr-2"
        >
          <Sparkles size={14} className="animate-pulse-ai" />
          Ask AI
        </motion.button>

        <button className="p-2 text-text-tertiary hover:text-text-primary rounded-md hover:bg-surface-raised transition-colors">
          <Bell size={18} />
        </button>

        <button 
          onClick={toggleTheme}
          className="p-2 text-text-tertiary hover:text-text-primary rounded-md hover:bg-surface-raised transition-colors"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="w-8 h-8 rounded-full bg-surface-raised flex items-center justify-center border border-surface-border ml-2">
          <User size={16} className="text-text-secondary" />
        </div>
      </div>
    </header>
  )
}
