import { Card } from '@/components/ui/card';
import { CircleCheck } from 'lucide-react';

interface PremiumCardProps {
  premiumMin: number;
  premiumMax: number;
  usageType?: string;
  city?: string;
}

export function PremiumCard({ premiumMin, premiumMax, usageType = 'Personal', city = 'Mumbai' }: PremiumCardProps) {
  const avgPremium = Math.round((premiumMin + premiumMax) / 2);

  return (
    <Card className="p-5" style={{ backgroundColor: 'var(--surface-raised)' }}>
      <div className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
        Premium Advisory
      </div>
      <div className="font-mono text-3xl font-semibold" style={{ color: 'var(--text-brand)' }}>
        ₹{avgPremium.toLocaleString()}
      </div>
      <div className="text-sm font-medium mt-1" style={{ color: 'var(--text-primary)' }}>
        Expected Annual Premium
      </div>
      <div className="mt-4 pt-4 flex flex-col gap-2.5" style={{ borderTop: '1px solid var(--surface-border)' }}>
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: usageType === 'Commercial' ? '#D97706' : '#16A34A' }}
          />
          Impact: {usageType} Use
        </div>
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <CircleCheck size={12} style={{ color: '#16A34A' }} />
          Optimized for {city} RTO
        </div>
      </div>
    </Card>
  );
}
