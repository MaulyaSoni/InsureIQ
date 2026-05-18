import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RiskGauge } from '@/components/RiskGauge';
import { SHAPBreakdownCard } from '@/components/SHAPBreakdownCard';
import { PremiumCard } from '@/components/PremiumCard';
import { AgentTrace } from '@/components/AgentTrace';
import { useState } from 'react';

interface Prediction {
  risk_band: string;
  risk_score: number;
  shap_features: Array<{ feature: string; impact: number }>;
  premium_min?: number;
  premium_max?: number;
}

interface IntelligencePanelProps {
  policy: any;
  prediction: Prediction | null;
  onComplete?: (result: any) => void;
  onError?: (err: any) => void;
}

export function IntelligencePanel({ policy, prediction, onComplete, onError }: IntelligencePanelProps) {
  const [analyzing, setAnalyzing] = useState(false);

  const handleRunAnalysis = () => {
    setAnalyzing(true);
    // Dispatch event to start AgentTrace
    document.dispatchEvent(new CustomEvent('START_AGENT_TRACE'));
  };

  const handleComplete = (result: any) => {
    setAnalyzing(false);
    setPredictionHere(result);
    onComplete?.(result);
  };

  const [predictionHere, setPredictionHere] = useState<Prediction | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-ai" />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Intelligence Panel
        </h3>
      </div>

      {/* Run Analysis button */}
      <motion.button
        whileHover={{ scale: analyzing ? 1 : 1.02 }}
        whileTap={{ scale: analyzing ? 1 : 0.98 }}
        onClick={handleRunAnalysis}
        disabled={analyzing}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-all"
        style={{
          backgroundColor: analyzing ? 'var(--surface-raised)' : '#534AB7',
          color: analyzing ? 'var(--text-tertiary)' : 'white',
          opacity: analyzing ? 0.7 : 1,
          border: '1px solid transparent',
        }}
      >
        {analyzing ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Agent running...
          </>
        ) : (
          <>
            <Zap size={14} />
            Assess Policy
          </>
        )}
      </motion.button>

      {/* Agent Trace (hidden until started) */}
      <AgentTrace
        policyId={policy.id}
        onComplete={handleComplete}
        onError={(e) => {
          setAnalyzing(false);
          onError?.(e);
        }}
      />

      {/* Results — animate in after analysis */}
      <AnimatePresence>
        {(prediction || predictionHere) && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-3"
          >
            <Card variant="ai" className="p-5">
              <div className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color: 'var(--text-tertiary)' }}>
                Intelligence Profile
              </div>
              <div className="flex justify-center mb-4">
                <RiskGauge score={(prediction || predictionHere)!.risk_score} band={(prediction || predictionHere)!.risk_band.toUpperCase()} />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4" style={{ borderTop: '1px solid var(--surface-border)' }}>
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                    Claim Probability
                  </div>
                  <div className="font-mono text-lg mt-1" style={{ color: 'var(--text-primary)' }}>
                    {(policy.claim_probability || 0).toFixed(1)}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                    Confidence
                  </div>
                  <div className="font-mono text-lg mt-1" style={{ color: '#16A34A' }}>
                    94%
                  </div>
                </div>
              </div>
            </Card>

            <SHAPBreakdownCard features={(prediction || predictionHere)!.shap_features || []} />
            <PremiumCard
              premiumMin={(prediction || predictionHere)!.premium_min || policy.premium_amount * 0.85}
              premiumMax={(prediction || predictionHere)!.premium_max || policy.premium_amount * 1.15}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

