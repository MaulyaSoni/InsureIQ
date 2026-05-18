import React from 'react';
import { motion } from 'framer-motion';
import { Info, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { AICard, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SHAPFeature {
  feature: string;
  impact: number;
}

interface SHAPBreakdownCardProps {
  features: SHAPFeature[];
}

export function SHAPBreakdownCard({ features }: SHAPBreakdownCardProps) {
  if (!features || features.length === 0) return (
    <AICard>
      <CardContent className="p-10 flex flex-col items-center justify-center text-center">
        <BarChart3 size={24} className="text-text-tertiary mb-2" />
        <p className="text-sm text-text-tertiary italic">Neural attribution data unavailable for this instance.</p>
      </CardContent>
    </AICard>
  );

  // Sort features by absolute impact
  const sortedFeatures = [...features].sort((a, b) => {
    const valA = a.impact ?? (a as any).shap_value ?? 0;
    const valB = b.impact ?? (b as any).shap_value ?? 0;
    return Math.abs(valB) - Math.abs(valA);
  });

  return (
    <AICard className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <BarChart3 size={14} className="text-ai" />
          Neural Attribution
        </CardTitle>
        <CardDescription className="text-[11px]">
          XGBoost SHAP coefficients indicating feature impact on risk score.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 space-y-4 pt-2">
        <div className="space-y-4">
          {sortedFeatures.map((factor: any, idx: number) => {
            const value = factor.impact ?? factor.shap_value ?? 0;
            const label = factor.plain_name ?? factor.feature_name ?? factor.feature ?? "Unknown Factor";
            const isPositive = value >= 0;
            const percentage = Math.min(Math.abs(value) * 100, 100);

            return (
              <div key={label + idx} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isPositive ? (
                      <TrendingUp size={12} className="text-brand-500" />
                    ) : (
                      <TrendingDown size={12} className="text-risk-low" />
                    )}
                    <span className="text-xs font-semibold text-text-primary">{label}</span>
                  </div>
                  <span className={cn(
                    "text-[10px] font-mono font-bold",
                    isPositive ? "text-brand-600 dark:text-brand-400" : "text-risk-low"
                  )}>
                    {isPositive ? '+' : ''}{Number(value).toFixed(3)}
                  </span>
                </div>

                <div className="h-2 bg-surface-raised rounded-full overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, delay: idx * 0.1, ease: [0.22, 1, 0.36, 1] }}
                    className={cn(
                      "h-full rounded-full transition-all",
                      isPositive 
                        ? "bg-gradient-to-r from-brand-400 to-brand-600 shadow-[0_0_8px_rgba(83,74,183,0.3)]" 
                        : "bg-gradient-to-r from-green-400 to-green-600 shadow-[0_0_8px_rgba(22,163,74,0.3)]"
                    )}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 mt-auto border-t border-surface-border/50">
          <div className="flex items-center justify-between text-[10px] text-text-tertiary italic">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-brand-500" />
              <span>Increases Risk</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-risk-low" />
              <span>Decreases Risk</span>
            </div>
          </div>
        </div>
      </CardContent>
    </AICard>
  );
}
