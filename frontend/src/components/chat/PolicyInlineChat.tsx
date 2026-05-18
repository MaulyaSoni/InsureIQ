import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  SendHorizonal, 
  ChevronRight, 
  Loader2, 
  ShieldAlert 
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useStreamingChat } from '@/hooks/useStreamingChat';
import { AICard, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { cn } from '@/lib/utils';

export function PolicyInlineChat({ policyId }: { policyId: string }) {
  const { messages, isLoading, sendMessage } = useStreamingChat(policyId);
  const [input, setInput] = useState('');

  const lastAssistantMessage = messages.slice().reverse().find(m => m.role === 'assistant');

  return (
    <AICard className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles size={16} className="text-ai" />
          Neural Assessment
        </CardTitle>
        <CardDescription>
          Ask about underwriting risks or specific data points for this policy.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Assistant Response Box */}
        <div className="min-h-[100px] max-h-[300px] overflow-y-auto bg-surface-raised rounded-xl p-4 border border-surface-border text-sm scrollbar-thin">
          {!lastAssistantMessage && !isLoading && (
            <p className="text-text-tertiary italic">
              "Policy intelligence system ready. Ask me to perform a deep-dive analysis on specific risk factors."
            </p>
          )}

          {lastAssistantMessage && (
            <div className="ai-prose">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {lastAssistantMessage.content}
              </ReactMarkdown>
            </div>
          )}

          {isLoading && !lastAssistantMessage && (
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 rounded-full bg-ai" />
                <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-ai" />
                <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-ai" />
              </div>
              <span className="text-xs text-ai font-medium">Analyzing neural pathways...</span>
            </div>
          )}
        </div>

        {/* Suggested Queries */}
        <div className="grid grid-cols-2 gap-2">
          <QuickActionBtn 
            label="Risk Drivers" 
            onClick={() => sendMessage("What are the top 3 risk drivers for this policy?")} 
          />
          <QuickActionBtn 
            label="Verify Data" 
            onClick={() => sendMessage("Are there any inconsistencies in the submitted data?")} 
          />
        </div>

        {/* Input area */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <ShieldAlert size={14} className="text-text-tertiary group-focus-within:text-ai transition-colors" />
          </div>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (sendMessage(input), setInput(''))}
            placeholder="Search Intelligence..."
            className="w-full bg-surface-card border border-surface-border text-sm rounded-lg pl-9 pr-12 py-2.5 focus:outline-none focus:border-ai ring-ai/10 focus:ring-4 transition-all"
          />
          <button
            onClick={() => { sendMessage(input); setInput(''); }}
            className="absolute inset-y-1.5 right-1.5 flex items-center justify-center w-7 h-7 bg-ai text-white rounded-md hover:bg-ai-dark transition-colors"
          >
            {isLoading ? <Loader2 size={12} className="animate-spin" /> : <ChevronRight size={14} />}
          </button>
        </div>
      </CardContent>
    </AICard>
  );
}

function QuickActionBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left px-3 py-2 rounded-lg bg-surface-raised border border-surface-border hover:border-ai/30 hover:bg-ai/5 text-[11px] font-semibold text-text-secondary hover:text-ai transition-all flex items-center justify-between group"
    >
      {label}
      <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
    </button>
  );
}
