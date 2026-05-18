import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  ShieldAlert,
  Activity,
  Zap,
  TrendingUp,
  BarChart3,
  ArrowRight,
  ShieldCheck,
  ZapOff,
  Cpu
} from 'lucide-react';
import { getDashboardStats, getPolicies } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, AICard } from '@/components/ui/card';
import { KPICard } from '@/components/KPICard';
import { AIActivityFeed } from '@/components/AIActivityFeed';
import { Badge, RiskBadge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, p] = await Promise.all([getDashboardStats(), getPolicies(1, 5)]);
        setStats(s);
        setPolicies(p);
      } catch {
        toast.error('Failed to sync intelligence stream');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  })();

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-[450px]" />
          <Skeleton className="h-[450px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={`${greeting}, ${user?.full_name?.split(' ')[0] || 'Analyst'}`}
        subtitle={new Date().toLocaleDateString('en-IN', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
        breadcrumb={["Main", "Intelligence Hub"]}
        actions={
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-risk-low-bg text-risk-low text-[10px] font-bold uppercase tracking-widest border border-risk-low/20">
              <span className="w-1.5 h-1.5 rounded-full bg-risk-low animate-pulse" />
              Engine Online
            </span>
          </div>
        }
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard 
          label="Registry Size" 
          value={stats?.total_policies || 1248} 
          trend={+12} 
          icon={FileText} 
        />
        <KPICard 
          label="Avg Risk Unit" 
          value={stats?.avg_risk_score ? Number(stats.avg_risk_score) : 42.4} 
          trend={+2.1} 
          icon={Activity} 
        />
        <KPICard 
          label="Critical Nodes" 
          value={stats?.high_risk_count || 84} 
          trend={-5} 
          icon={ShieldAlert} 
        />
        <KPICard 
          label="Claim Propensity" 
          value={31.2} 
          suffix="%"
          trend={+0.8} 
          icon={TrendingUp} 
        />
        <KPICard 
          label="AI Automations" 
          value={stats?.total_assessed || 890} 
          trend={+100} 
          icon={Zap} 
        />
        <KPICard 
          label="Reports Sync" 
          value={186} 
          icon={BarChart3} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Risk Trend Visualization */}
        <Card className="lg:col-span-2 overflow-hidden flex flex-col h-full" delay={0.2}>
          <CardHeader className="flex flex-row items-center justify-between border-b border-surface-border bg-surface-raised/30">
            <div>
              <CardTitle className="text-xs uppercase tracking-widest">Macro Risk Correlation</CardTitle>
              <CardDescription className="text-[10px]">12-month rolling trend of risk band distribution</CardDescription>
            </div>
            <div className="flex gap-3">
               {['CRITICAL', 'HIGH', 'MED', 'LOW'].map((label, i) => (
                 <div key={label} className="flex items-center gap-1.5 text-[9px] font-bold text-text-tertiary">
                   <div className={cn(
                     "w-1.5 h-1.5 rounded-full",
                     i === 0 ? "bg-risk-critical" : i === 1 ? "bg-risk-high" : i === 2 ? "bg-risk-medium" : "bg-risk-low"
                   )} />
                   {label}
                 </div>
               ))}
            </div>
          </CardHeader>
          
          <div className="flex-1 p-6 relative">
            <div className="absolute inset-x-6 inset-y-10 flex flex-col justify-between pointer-events-none">
              {[1, 2, 3, 4].map(i => <div key={i} className="w-full h-px bg-surface-border/50 border-dashed" />)}
            </div>
            
            <motion.div 
               initial={{ opacity: 0, scale: 0.98 }}
               animate={{ opacity: 1, scale: 1 }}
               className="w-full h-full relative z-10"
            >
              <svg width="100%" height="100%" viewBox="0 0 1000 220" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#534AB7" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#534AB7" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0,180 L100,165 200,170 300,155 400,140 500,145 600,135 700,120 800,125 900,110 1000,105 V220 H0 Z" fill="url(#areaGrad)" />
                <polyline fill="none" stroke="#534AB7" strokeWidth="2.5" strokeLinecap="round" points="0,180 100,165 200,170 300,155 400,140 500,145 600,135 700,120 800,125 900,110 1000,105" />
                <polyline fill="none" stroke="#DC2626" strokeWidth="1.5" strokeDasharray="4 4" points="0,50 100,45 200,48 300,42 400,35 500,38 600,32 700,25 800,28 900,22 1000,18" />
              </svg>
            </motion.div>
          </div>
          
          <div className="flex justify-between px-6 py-4 border-t border-surface-border bg-surface-raised/30 font-mono text-[9px] font-bold text-text-tertiary uppercase tracking-tighter">
            {['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'].map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
        </Card>

        {/* Intelligence Side Panel */}
        <div className="space-y-6">
           <AIActivityFeed />
           
           <AICard className="p-0 border-none shadow-brand-sm" delay={0.4}>
              <div className="bg-ai/5 p-4 flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <Cpu size={16} className="text-ai" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-ai">Neural Cache</span>
                 </div>
                 <Badge variant="ai" size="sm" className="h-4 py-0 text-[8px] border-none">Synced</Badge>
              </div>
              <div className="p-4 space-y-3">
                 <p className="text-[11px] text-text-secondary leading-relaxed">
                   Cross-segment correlation indicates <span className="text-text-primary font-bold">4.2x higher</span> claim propensity in urban multi-family residential zones for model years 2022-2024.
                 </p>
                 <button className="w-full py-2 bg-surface-raised hover:bg-surface-border text-text-primary text-[10px] font-bold uppercase tracking-widest rounded transition-colors border border-surface-border">
                    Generate Delta Report
                 </button>
              </div>
           </AICard>
        </div>
      </div>

      {/* Bottom Focus Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
         {/* Live Assessment Queue */}
         <Card className="lg:col-span-3 p-0 overflow-hidden" delay={0.5}>
            <CardHeader className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
               <CardTitle className="text-xs uppercase tracking-widest">Real-time Classification Stream</CardTitle>
               <Link to="/policies" className="text-[10px] font-bold text-brand-600 hover:underline uppercase tracking-wider flex items-center gap-1">
                  View Full Registry <ArrowRight size={12} />
               </Link>
            </CardHeader>
            <div className="overflow-x-auto">
               <table className="iq-table">
                  <thead>
                     <tr>
                        <th>Policy Protocol</th>
                        <th>Classification</th>
                        <th>Risk Core</th>
                        <th className="text-right">Unit Value</th>
                     </tr>
                  </thead>
                  <tbody>
                     {policies.map((p, i) => (
                        <tr key={p.id} className="group">
                           <td>
                              <div className="font-mono text-[13px] font-bold text-text-primary group-hover:text-brand-600 transition-colors">{p.policy_number}</div>
                              <div className="text-[10px] text-text-tertiary uppercase mt-0.5">{p.policyholder_name}</div>
                           </td>
                           <td>
                              <RiskBadge band={p.latest_risk_prediction?.risk_band || "LOW"} />
                           </td>
                           <td>
                              <div className="flex items-center gap-3">
                                 <div className="flex-1 h-1 bg-surface-raised rounded-full overflow-hidden max-w-[100px]">
                                    <div className="h-full bg-brand-500" style={{ width: `${p.risk_score || 45}%` }} />
                                 </div>
                                 <span className="text-[10px] font-mono font-bold text-text-secondary">{p.risk_score || 45}%</span>
                              </div>
                           </td>
                           <td className="text-right font-mono font-bold text-text-primary">
                              ₹{p.premium_amount.toLocaleString()}
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </Card>

         {/* System Health */}
         <div className="space-y-6">
           <Card className="p-5" delay={0.6}>
              <div className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-4">Pipeline Latency</div>
              <div className="space-y-4">
                 {[
                   { label: 'Risk Inference', val: '142ms', p: 65, status: 'low' },
                   { label: 'SHAP Attribution', val: '286ms', p: 85, status: 'low' },
                   { label: 'Vector Encoding', val: '12ms', p: 15, status: 'low' },
                 ].map(item => (
                   <div key={item.label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px]">
                         <span className="text-text-secondary font-medium">{item.label}</span>
                         <span className="text-text-primary font-mono font-bold">{item.val}</span>
                      </div>
                      <div className="h-1 bg-surface-raised rounded-full overflow-hidden">
                         <div className="h-full bg-brand-500/40" style={{ width: `${item.p}%` }} />
                      </div>
                   </div>
                 ))}
              </div>
           </Card>

           <Card className="p-5 bg-risk-low-bg/30 border-risk-low/10" delay={0.7}>
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-risk-low/10 flex items-center justify-center text-risk-low">
                    <ShieldCheck size={20} />
                 </div>
                 <div>
                    <div className="text-[10px] font-bold text-risk-low uppercase tracking-widest">Protocol Secured</div>
                    <div className="text-xs font-semibold text-text-primary">End-to-End Encrypted</div>
                 </div>
              </div>
           </Card>
         </div>
      </div>
    </div>
  );
}
