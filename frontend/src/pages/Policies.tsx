import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Search,
  Filter,
  Download,
  AlertCircle,
  Zap,
  ArrowRight,
  ChevronRight,
  MoreVertical,
  Activity
} from "lucide-react";
import { getPolicies, createPolicy } from "@/lib/api";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, RiskBadge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

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
      const data = await getPolicies(1, 100);
      setPolicies(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load policy stream");
    } finally {
      setLoading(false);
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
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Policy Registry"
        subtitle="Operational ledger of active policies and neural risk fingerprints."
        breadcrumb={["Main", "Portfolio", "Registry"]}
        actions={
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-surface-border text-xs font-semibold hover:bg-surface-raised transition-all">
              <Download size={14} /> Dataset Export
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 shadow-brand transition-all">
              <Plus size={14} /> Add Protocol
            </button>
          </div>
        }
      />

      {/* Filters Area */}
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 group">
          <Search size={16} className="absolute left-3 top-3 text-text-tertiary group-focus-within:text-brand-500 transition-colors" />
          <input
            type="text"
            className="w-full bg-surface-card border border-surface-border text-text-primary text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-medium placeholder:font-normal"
            placeholder="Filter by holder, number, or asset ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 bg-surface-card border border-surface-border p-1 rounded-xl shrink-0">
          {['all', 'low', 'medium', 'high', 'critical'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                filter === f 
                  ? "bg-brand-600 text-white shadow-sm" 
                  : "text-text-tertiary hover:text-text-primary hover:bg-surface-raised"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Policy List Rendering */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
            {filteredPolicies.map((p, i) => (
              <PolicyCard key={p.id} policy={p} delay={i * 0.05} />
            ))}
          </div>
        </AnimatePresence>
      )}

      {!loading && filteredPolicies.length === 0 && (
        <Card className="h-[400px] flex flex-col items-center justify-center border-dashed">
          <div className="w-16 h-16 rounded-full bg-surface-raised flex items-center justify-center mb-4">
             <AlertCircle size={32} className="text-text-tertiary" />
          </div>
          <div className="text-sm font-semibold text-text-secondary">No Matching Records</div>
          <p className="text-xs text-text-tertiary mt-1">Try broadening your filter criteria.</p>
        </Card>
      )}
    </div>
  );
}

function PolicyCard({ policy, delay }: { policy: any, delay: number }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3, delay }}
    >
      <Link to={`/risk-assessment?policy=${policy.id}`}>
        <Card hoverable className="h-full flex flex-col group border-t-2 border-t-transparent hover:border-t-brand-500 overflow-hidden">
          <div className="p-5 flex-1 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] font-mono font-bold text-brand-600 dark:text-brand-400 bg-brand-500/5 px-1.5 py-0.5 rounded border border-brand-500/10 mb-1 inline-block">
                  {policy.policy_number}
                </div>
                <h3 className="text-sm font-bold text-text-primary line-clamp-1">{policy.policyholder_name}</h3>
              </div>
              <RiskBadge band={policy.latest_risk_prediction?.risk_band || "PENDING"} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-tertiary">Asset</span>
                <span className="text-text-secondary font-medium">{policy.vehicle_make} {policy.vehicle_model}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-tertiary">Premium</span>
                <span className="text-text-primary font-mono font-bold">₹{policy.premium_amount.toLocaleString()}</span>
              </div>
               <div className="flex items-center justify-between text-xs">
                <span className="text-text-tertiary">Risk Score</span>
                <div className="flex items-center gap-1.5">
                   <div className="w-16 h-1 bg-surface-raised rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-brand-500" 
                        style={{ width: `${policy.risk_score || 0}%` }} 
                      />
                   </div>
                   <span className="font-mono font-bold text-[10px]">{policy.risk_score || 0}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="px-5 py-3 bg-surface-raised/50 border-t border-surface-border flex items-center justify-between group-hover:bg-brand-500 group-hover:text-white transition-colors duration-200">
             <div className="flex items-center gap-1.5">
                <Activity size={12} className="text-brand-500 group-hover:text-white" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Engine Analysis</span>
             </div>
             <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
          </div>
        </Card>
      </Link>
    </motion.div>
  )
}
