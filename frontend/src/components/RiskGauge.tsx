import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';

const RISK_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  LOW:      { color: '#16A34A', bg: 'rgba(22,163,74,0.1)', label: 'Optimal' },
  MEDIUM:   { color: '#D97706', bg: 'rgba(217,119,6,0.1)', label: 'Elevated' },
  HIGH:     { color: '#EA580C', bg: 'rgba(234,88,12,0.1)', label: 'Aggressive' },
  CRITICAL: { color: '#DC2626', bg: 'rgba(220,38,38,0.1)', label: 'Extreme' },
};

interface RiskGaugeProps {
  score: number;
  band: string;
  size?: 'sm' | 'md' | 'lg';
}

export function RiskGauge({ score, band, size = 'md' }: RiskGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const config = RISK_CONFIG[band] || { color: '#6B7280', bg: 'rgba(100,100,100,0.1)', label: 'Unknown' };

  useEffect(() => {
    setAnimatedScore(score);
  }, [score]);

  const radius = size === 'lg' ? 70 : size === 'md' ? 55 : 40;
  const stroke = size === 'lg' ? 10 : size === 'md' ? 8 : 6;
  const circumference = 2 * Math.PI * radius;
  const progress = (animatedScore / 100);
  const angle = 220; // total arc angle
  const offset = circumference * (1 - (progress * angle) / 360);

  return (
    <div className="flex flex-col items-center">
      <div className={cn(
        "relative flex items-center justify-center",
        size === 'lg' ? 'w-48 h-40' : size === 'md' ? 'w-36 h-32' : 'w-24 h-20'
      )}>
        <svg 
          className="w-full h-full transform -rotate-[200deg]" 
          viewBox="0 0 160 160"
        >
          {/* Track */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-surface-border"
            strokeDasharray={`${circumference * (angle/360)} ${circumference}`}
            strokeLinecap="round"
          />
          {/* Progress */}
          <motion.circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={config.color}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            strokeLinecap="round"
            style={{ 
              filter: `drop-shadow(0 0 4px ${config.color}40)`,
            }}
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center"
          >
            <span className={cn(
              "font-display font-bold text-text-primary",
              size === 'lg' ? 'text-4xl' : size === 'md' ? 'text-2xl' : 'text-xl'
            )}>
              {Math.round(animatedScore)}
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-text-tertiary">
              Risk Index
            </span>
          </motion.div>
        </div>
      </div>

      <div className="mt-1">
         <Badge 
           variant={band.toLowerCase() as any} 
           size={size === 'lg' ? 'md' : 'sm'}
           className="font-bold border-none"
         >
           {band} · {config.label}
         </Badge>
      </div>
    </div>
  );
}
