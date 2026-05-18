import React from 'react';
import { motion, useSpring, useTransform, animate } from 'framer-motion';
import { Card } from './ui/card';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  trend?: number;
  trendLabel?: string;
  icon?: React.ElementType;
  delay?: number;
}

export function KPICard({ 
  label, 
  value, 
  prefix = '', 
  suffix = '', 
  trend, 
  trendLabel, 
  icon: Icon,
  delay = 0 
}: KPICardProps) {
  return (
    <Card hoverable delay={delay} className="p-5 flex flex-col justify-between h-full">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold text-text-tertiary uppercase tracking-widest">{label}</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-sm font-medium text-text-secondary">{prefix}</span>
            <Counter value={value} />
            <span className="text-sm font-medium text-text-secondary">{suffix}</span>
          </div>
        </div>
        
        {Icon && (
          <div className="p-2 rounded-lg bg-brand-500/5 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            <Icon size={18} />
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {trend !== undefined && (
            <div className={cn(
              "flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded",
              trend > 0 ? "bg-risk-critical-bg text-risk-critical" : 
              trend < 0 ? "bg-risk-low-bg text-risk-low" : 
              "bg-surface-raised text-text-tertiary"
            )}>
              {trend > 0 ? <ArrowUpRight size={10} /> : trend < 0 ? <ArrowDownRight size={10} /> : <Minus size={10} />}
              {Math.abs(trend)}%
            </div>
          )}
          {trendLabel && (
            <span className="text-[10px] font-medium text-text-tertiary">{trendLabel}</span>
          )}
        </div>

        {/* Mini sparkline or similar visual could go here */}
        <div className="h-1.5 w-16 bg-surface-raised rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: "65%" }}
            transition={{ duration: 1, delay: delay + 0.5 }}
            className="h-full bg-brand-500/30"
          />
        </div>
      </div>
    </Card>
  );
}

function Counter({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = React.useState(0);
  
  React.useEffect(() => {
    const controls = animate(0, value, {
      duration: 1.5,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setDisplayValue(latest)
    });
    return controls.stop;
  }, [value]);

  return (
    <span className="text-2xl font-bold text-text-primary tracking-tight font-display">
      {displayValue.toLocaleString(undefined, { maximumFractionDigits: 1 })}
    </span>
  );
}
