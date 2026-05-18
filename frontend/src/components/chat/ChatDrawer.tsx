import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Sparkles, 
  Trash2, 
  FileText, 
  SendHorizonal, 
  Loader2,
  ChevronRight
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useStreamingChat } from '@/hooks/useStreamingChat';
import { useChatStore } from '@/stores/useChatStore';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';

export function ChatDrawer() {
  const { isOpen, close: onClose, policyId } = useChatStore();
  const { messages, isLoading, sendMessage, clearMessages, suggestedPrompts } =
    useStreamingChat(policyId || undefined);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop (subtle, doesn't block page) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/10 dark:bg-black/20 z-40 backdrop-blur-[2px]"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-[420px] bg-surface-card border-l border-surface-border z-50 flex flex-col shadow-modal"
          >
            {/* Header */}
            <div className="h-14 border-b border-surface-border flex items-center px-5 gap-3 shrink-0">
              <div className="flex items-center gap-2 flex-1">
                <div className="w-7 h-7 rounded-full bg-ai-light dark:bg-ai-dark/30 flex items-center justify-center">
                  <Sparkles size={14} className="text-ai" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-text-primary leading-none">InsureIQ AI</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-risk-low animate-pulse" />
                    <span className="text-[10px] text-text-tertiary font-mono uppercase tracking-tight">llama-3.3-70b · Active</span>
                  </div>
                </div>
              </div>

              {/* Context pill */}
              {policyId && (
                <Badge variant="ai" size="sm" className="hidden sm:inline-flex">
                  <FileText size={10} />
                  Context Loaded
                </Badge>
              )}

              <div className="flex items-center gap-1">
                <button
                  onClick={clearMessages}
                  className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-raised transition-colors"
                  title="Clear chat"
                >
                  <Trash2 size={14} />
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-raised transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
              {/* Welcome message (shown only when no messages) */}
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-start gap-3">
                    <AIAvatar />
                    <div className="flex-1">
                      <div className="bg-surface-raised rounded-xl rounded-tl-sm px-4 py-3">
                        <p className="text-sm text-text-primary leading-relaxed">
                          {policyId
                            ? "I've loaded the policy context. I can explain the risk score, SHAP factors, premium recommendation, or answer any question about this specific policy."
                            : "I'm your insurance underwriting copilot. Ask me about risk scores, claim eligibility, premium calculations, IRDAI regulations, or anything about your portfolio."
                          }
                        </p>
                      </div>
                      <div className="text-[11px] text-text-tertiary mt-1.5 ml-1">InsureIQ AI Agent</div>
                    </div>
                  </div>

                  {/* Suggested prompts */}
                  <div className="space-y-2 mt-4">
                    <p className="text-[10px] text-text-tertiary uppercase tracking-widest font-bold px-1 mb-3">
                      Recommended Modules
                    </p>
                    <div className="grid gap-2">
                      {suggestedPrompts.map((prompt) => (
                        <motion.button
                          key={prompt}
                          whileHover={{ scale: 1.01, x: 4 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => sendMessage(prompt)}
                          className="w-full text-left text-sm text-text-secondary px-3 py-2.5 rounded-lg border border-surface-border hover:border-brand-300 dark:hover:border-brand-700 hover:bg-brand-500/5 hover:text-text-primary transition-all group"
                        >
                          <div className="flex items-center justify-between">
                            <span>{prompt}</span>
                            <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-brand-500" />
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Message list */}
              {messages.map((msg, i) => (
                <ChatMessage key={i} message={msg} />
              ))}

              {/* Loading indicator */}
              {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="flex items-start gap-3 animate-fade-in">
                  <AIAvatar />
                  <div className="bg-surface-raised rounded-xl rounded-tl-sm px-4 py-3 shadow-sm border border-surface-border/50">
                    <ThinkingIndicator />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* Input area */}
            <div className="border-t border-surface-border p-4 bg-surface-card/80 backdrop-blur-md">
              <div className="flex items-end gap-2 bg-surface-raised border border-surface-border rounded-xl p-1.5 focus-within:border-brand-400 dark:focus-within:border-brand-500 transition-colors">
                <div className="flex-1 px-2.5 py-1.5 min-h-[44px] flex items-center">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={policyId ? "Analyze this policy..." : "Inquire about portfolio..."}
                    rows={1}
                    className="w-full bg-transparent border-none text-sm text-text-primary placeholder-text-tertiary resize-none focus:outline-none max-h-32"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-sm transition-all',
                    (!input.trim() || isLoading)
                      ? 'bg-surface-card text-text-tertiary border border-surface-border cursor-not-allowed'
                      : 'bg-brand-600 text-white hover:bg-brand-700 active:scale-95'
                  )}
                >
                  {isLoading
                    ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><Loader2 size={16} /></motion.div>
                    : <SendHorizonal size={16} />
                  }
                </motion.button>
              </div>
              <p className="text-[10px] text-text-tertiary mt-2 text-center font-medium opacity-60">
                Shift + Enter for multiline · AI results may vary
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ChatMessage({ message }: { message: any }) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={cn('flex items-start gap-3', isUser && 'flex-row-reverse')}
    >
      {isUser ? (
        <div className="w-7 h-7 rounded-full bg-surface-raised flex items-center justify-center border border-surface-border shrink-0 mt-1">
          <span className="text-[10px] font-bold">U</span>
        </div>
      ) : (
        <AIAvatar />
      )}

      <div className={cn(
        'max-w-[85%] rounded-2xl px-4 py-3 shadow-sm',
        isUser
          ? 'bg-brand-600 text-white rounded-tr-sm'
          : 'bg-surface-raised text-text-primary border border-surface-border/50 rounded-tl-sm'
      )}>
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none ai-prose">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
            {message.isStreaming && (
              <motion.span 
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="inline-block w-1.5 h-4 bg-brand-500 rounded-sm ml-1 align-middle" 
              />
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function AIAvatar() {
  return (
    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-ai to-brand-500 flex items-center justify-center shrink-0 mt-1 shadow-brand">
      <Sparkles size={12} className="text-white" />
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-1.5 h-5">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-brand-500"
          animate={{ y: [0, -4, 0], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}
