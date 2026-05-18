import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { 
  FileText, 
  ShieldAlert, 
  Activity, 
  Zap, 
  ArrowRight,
  TrendingUp,
  Download,
  Filter
} from "lucide-react"
import { getPolicies } from "@/lib/api"
import { PageHeader } from "@/components/ui/PageHeader"
import { KPICard } from "@/components/KPICard"
import { AIActivityFeed } from "@/components/AIActivityFeed"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge, RiskBadge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
// AnimatedList removed from here as it is not used directly.

export default function Home() {
  const [loading, setLoading] = useState(true)
  const [recentPolicies, setRecentPolicies] = useState<any[]>([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const data = await getPolicies(1, 8)
      setRecentPolicies(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-[500px]" />
          <Skeleton className="h-[500px]" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-10">
      <PageHeader 
        title="Global Intelligence" 
        subtitle="Real-time portfolio risk and neural classification diagnostics."
        breadcrumb={["Main", "Overview"]}
        actions={
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-surface-border text-xs font-semibold hover:bg-surface-raised transition-all">
              <Download size={14} /> Export CSV
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 shadow-brand transition-all">
              <TrendingUp size={14} /> Report Builder
            </button>
          </div>
        }
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          label="Total Exposure" 
          value={1248000} 
          prefix="₹" 
          trend={+12.4} 
          trendLabel="vs last month"
          icon={FileText}
          delay={0.1}
        />
        <KPICard 
          label="Critical Risk" 
          value={84} 
          trend={-3.2} 
          trendLabel="active alerts"
          icon={ShieldAlert}
          delay={0.2}
        />
        <KPICard 
          label="Avg Risk Score" 
          value={42.8} 
          suffix="/100"
          trend={+5.1} 
          trendLabel="portfolio health"
          icon={Activity}
          delay={0.3}
        />
        <KPICard 
          label="AI Decisions" 
          value={890} 
          trend={+100} 
          trendLabel="automated u/w"
          icon={Zap}
          delay={0.4}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Table */}
        <Card className="lg:col-span-2 flex flex-col h-full overflow-hidden" delay={0.5}>
          <CardHeader className="flex flex-row items-center justify-between border-b border-surface-border/50 pb-4">
            <div>
              <CardTitle>Recent Neural Classifications</CardTitle>
              <p className="text-xs text-text-tertiary mt-1">Live feed of policy evaluations from risk engine.</p>
            </div>
            <button className="text-xs text-brand-600 font-semibold hover:underline flex items-center gap-1">
              View All <ArrowRight size={12} />
            </button>
          </CardHeader>
          <div className="flex-1 overflow-x-auto">
            <table className="iq-table">
              <thead>
                <tr>
                  <th>Policy</th>
                  <th>Risk Band</th>
                  <th>Factors</th>
                  <th className="text-right">Premium</th>
                </tr>
              </thead>
              <tbody>
                {recentPolicies.map((p, i) => (
                  <motion.tr 
                    key={p.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + (i * 0.05) }}
                  >
                    <td>
                      <div className="font-mono text-text-primary text-[13px]">{p.policy_number}</div>
                      <div className="text-[11px] text-text-tertiary mt-0.5">{p.policyholder_name}</div>
                    </td>
                    <td>
                      <RiskBadge band={p.latest_risk_prediction?.risk_band || "PENDING"} />
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        {p.latest_risk_prediction?.risk_factors?.slice(0, 2).map((f: string) => (
                           <Badge key={f} variant="outline" size="sm" className="text-[10px] py-0">{f}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="text-right">
                      <div className="font-mono text-text-primary font-semibold">₹{p.premium_amount.toLocaleString()}</div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Side Feed */}
        <div className="space-y-6">
          <AIActivityFeed />
          
          <Card variant="ai" delay={0.7}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">LLM Insight</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-text-secondary leading-relaxed">
                Portfolio risk is currently concentrated in <span className="text-text-primary font-bold">Maharashtra/MH-01</span>. 
                AI suggests increasing baseline premiums for 2024 model SUVs by 4.2% based on recent regional collision spikes.
              </p>
              <button className="mt-4 w-full py-2 bg-ai-light dark:bg-ai-dark/20 text-ai text-xs font-bold rounded-lg border border-ai-border/40 hover:bg-ai/10 transition-colors">
                Apply System Baseline
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
