import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Zap, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';

const ACTIVITY = [
  { id: 1, type: 'prediction', text: 'Auto-renewal risk flag on Policy #1294', time: '2m ago', severity: 'high' },
  { id: 2, type: 'assessment', text: 'Fraud score validated: IND-4492-B', time: '14m ago', severity: 'low' },
  { id: 3, type: 'system', text: 'Market trend analysis sync complete', time: '1h ago', severity: 'default' },
  { id: 4, type: 'alert', text: 'Anomalous claim pattern detected: Mumbai Hub', time: '2h ago', severity: 'critical' },
];

export function AIActivityFeed() {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <Sparkles size={14} className="text-ai" />
          Neural Activity Feed
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto scrollbar-thin px-4 pb-4">
        <div className="space-y-3">
          {ACTIVITY.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-start gap-3 p-3 rounded-xl hover:bg-surface-raised transition-colors group cursor-pointer"
            >
              <div className="mt-0.5">
                <ActivityIcon type={item.type} severity={item.severity} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-text-primary leading-tight line-clamp-2">
                  {item.text}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-text-tertiary font-mono">{item.time}</span>
                  <span className="text-[10px] text-text-tertiary">·</span>
                  <Badge variant={item.severity as any} size="sm" className="px-1 py-0 h-4 text-[9px] font-bold">
                    {item.type}
                  </Badge>
                </div>
              </div>
              <ArrowRight size={14} className="text-text-tertiary opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0 mt-1" />
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityIcon({ type, severity }: { type: string; severity: string }) {
  switch (severity) {
    case 'critical': return <div className="w-2 h-2 rounded-full bg-risk-critical mt-1.5" />;
    case 'high': return <div className="w-2 h-2 rounded-full bg-risk-high mt-1.5" />;
    case 'low': return <div className="w-2 h-2 rounded-full bg-risk-low mt-1.5" />;
    default: return <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5" />;
  }
}
