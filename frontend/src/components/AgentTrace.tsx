import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Loader2, Sparkles, AlertCircle, ChevronRight, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface TraceNode {
  name: string;
  model: string;
  description: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  duration_ms?: number;
  tokens?: number;
  cached?: boolean;
  error?: string;
  streamedText?: string;
}

interface AgentTraceProps {
  policyId: string;
  onComplete: (result: any) => void;
  onError: (error: string) => void;
  autoStart?: boolean;
}

const NODE_ORDER = ['supervisor', 'risk_node', 'explainer_node', 'premium_node', 'report_node'];

const NODE_META: Record<string, { label: string; icon: any; color: string }> = {
  supervisor:     { label: 'Supervisor',    icon: Sparkles, color: '#534AB7' },
  risk_node:      { label: 'Risk Agent',    icon: AlertCircle, color: '#D97706' },
  explainer_node: { label: 'Explainer',     icon: Sparkles, color: '#0891B2' },
  premium_node:   { label: 'Premium',       icon: Check, color: '#16A34A' },
  report_node:    { label: 'Report Writer', icon: FileText, color: '#534AB7' },
};

export function AgentTrace({ policyId, onComplete, onError, autoStart = false }: AgentTraceProps) {
  const [nodes, setNodes] = useState<Record<string, TraceNode>>(() => {
    const initial: Record<string, TraceNode> = {};
    NODE_ORDER.forEach(name => {
      initial[name] = { name, model: '', description: '', status: 'pending' };
    });
    return initial;
  });
  const [isRunning, setIsRunning] = useState(false);
  const [totalDuration, setTotalDuration] = useState<number | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const startTimeRef = useRef<number>(0);

  const startTrace = () => {
    if (isRunning) return;

    setNodes(prev => {
      const reset: Record<string, TraceNode> = {};
      NODE_ORDER.forEach(name => {
        reset[name] = { name, model: '', description: '', status: 'pending' };
      });
      return reset;
    });
    setTotalDuration(null);
    setIsRunning(true);
    startTimeRef.current = Date.now();

    const token = localStorage.getItem('insureiq_token') || '';
    const BASE_URL = '';
    const url = `${BASE_URL}/api/policies/${policyId}/run-all/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener('node_start', (e) => {
      const data = JSON.parse(e.data);
      setNodes(prev => ({
        ...prev,
        [data.node]: {
          ...prev[data.node],
          status: 'running',
          model: data.model || '',
          description: data.description || '',
          cached: data.cached,
        }
      }));
    });

    es.addEventListener('node_complete', (e) => {
      const data = JSON.parse(e.data);
      setNodes(prev => ({
        ...prev,
        [data.node]: {
          ...prev[data.node],
          status: 'complete',
          duration_ms: data.duration_ms,
          tokens: data.tokens,
          cached: data.cached,
        }
      }));
    });

    es.addEventListener('token', (e) => {
      const data = JSON.parse(e.data);
      setNodes(prev => ({
        ...prev,
        [data.node]: {
          ...prev[data.node],
          streamedText: (prev[data.node]?.streamedText || '') + data.token,
        }
      }));
    });

    es.addEventListener('node_error', (e) => {
      const data = JSON.parse(e.data);
      setNodes(prev => ({
        ...prev,
        [data.node]: { ...prev[data.node], status: 'error', error: data.error }
      }));
    });

    es.addEventListener('complete', (e) => {
      const data = JSON.parse(e.data);
      setTotalDuration(Date.now() - startTimeRef.current);
      setIsRunning(false);
      es.close();
      onComplete(data);
    });

    es.addEventListener('error', () => {
      setIsRunning(false);
      es.close();
      onError('Connection to agent pipeline lost');
    });
  };

  useEffect(() => {
    const handleStart = () => startTrace();
    document.addEventListener('START_AGENT_TRACE', handleStart);
    if (autoStart) startTrace();
    
    return () => {
      document.removeEventListener('START_AGENT_TRACE', handleStart);
      eventSourceRef.current?.close();
    };
  }, [policyId]); // removed autoStart from deps to prevent re-triggering unless policy changes

  // Only render if pipeline has been run or is running
  const hasStarted = isRunning || totalDuration !== null;
  if (!hasStarted) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
        LangGraph Execution Trace
      </div>
      
      {/* Visual Pipeline Graph */}
      <div className="flex bg-transparent overflow-x-auto pb-4 gap-2 no-scrollbar">
        {NODE_ORDER.map((nodeName, idx) => {
          const node = nodes[nodeName];
          const meta = NODE_META[nodeName];
          
          return (
            <React.Fragment key={nodeName}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="agent-trace-node"
                style={{
                  minWidth: '160px',
                  borderColor: node.status === 'running' ? '#534AB7' : node.status === 'complete' ? 'rgba(22,163,74,0.35)' : 'var(--surface-border)',
                  boxShadow: node.status === 'running' ? '0 0 16px rgba(83,74,183,0.15)' : 'none',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                    <meta.icon size={12} style={{ color: meta.color }} />
                    {meta.label}
                  </div>
                  {node.status === 'running' && <Loader2 size={12} className="animate-spin text-brand" />}
                  {node.status === 'complete' && <Check size={12} className="text-success" />}
                  {node.status === 'error' && <X size={12} className="text-danger" />}
                </div>
                
                {node.model && (
                  <div className="font-mono-code text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                    {node.model}
                  </div>
                )}
                
                <div className="font-mono-code text-[10px] mt-auto pt-2 flex justify-between" style={{ color: 'var(--text-tertiary)' }}>
                  <span>{node.duration_ms ? `${(node.duration_ms / 1000).toFixed(1)}s` : '—'}</span>
                  <span>{node.tokens ? `${node.tokens} tok` : ''}</span>
                </div>
              </motion.div>
              
              {idx < NODE_ORDER.length - 1 && (
                <div className="agent-trace-arrow flex items-center shrink-0">
                  <ChevronRight size={16} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Streamed Output Panel */}
      {(nodes.explainer_node.streamedText || nodes.report_node.streamedText) && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }} 
          animate={{ opacity: 1, height: 'auto' }}
          className="iq-card overflow-hidden"
        >
          <div className="flex text-sm border-b" style={{ borderColor: 'var(--surface-border)' }}>
            <div className="px-5 py-3 font-medium text-brand" style={{ borderBottom: '2px solid var(--text-brand)' }}>
              Agent Outputs
            </div>
          </div>
          
          <div className="p-5 flex flex-col gap-6">
            {nodes.explainer_node.streamedText && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={14} style={{ color: '#0891B2' }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Risk Explanation</span>
                  <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-surface-raised" style={{ color: 'var(--text-tertiary)' }}>llama-3.3-70b</span>
                </div>
                <div className="ai-prose">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{nodes.explainer_node.streamedText}</ReactMarkdown>
                </div>
              </div>
            )}
            
            {nodes.explainer_node.streamedText && nodes.report_node.streamedText && (
              <div className="h-px bg-surface-border my-2" style={{ backgroundColor: 'var(--surface-border)' }} />
            )}
            
            {nodes.report_node.streamedText && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={14} style={{ color: '#534AB7' }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Underwriting Report</span>
                  <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-surface-raised" style={{ color: 'var(--text-tertiary)' }}>llama-3.3-70b</span>
                </div>
                <div className="ai-prose">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{nodes.report_node.streamedText}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
