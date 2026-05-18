import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, MessageSquare } from 'lucide-react';
import { useChatStore } from '@/stores/useChatStore';
import { useAgentStore } from '@/stores/useAgentStore';
import { cn } from '@/lib/utils';

export function ChatFAB() {
  const { isOpen, toggle } = useChatStore();
  const { isRunning } = useAgentStore();

  if (isOpen) return null;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3"
    >
      {/* Agent Status Chip (shows when graph is running) */}
      <AnimatePresence>
        {isRunning && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="px-3 py-1.5 rounded-full bg-surface-card border border-brand-500/30 shadow-brand flex items-center gap-2"
          >
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
            </span>
            <span className="text-[10px] font-mono font-bold text-brand-600 dark:text-brand-400 uppercase tracking-tight">Agent Active</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggle}
        className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center shadow-modal relative overflow-hidden group transition-all",
          isRunning 
            ? "bg-gradient-to-br from-brand-500 to-brand-700 text-white" 
            : "bg-surface-card border border-surface-border text-brand-600 dark:text-brand-400 hover:border-brand-500/50"
        )}
      >
        {/* Pulsing background when agent is running */}
        {isRunning && (
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-white"
          />
        )}
        
        <Sparkles size={24} className={cn("relative z-10", isRunning && "animate-pulse-ai")} />
        
        {/* Hover label */}
        <div className="absolute inset-0 bg-brand-600 flex items-center justify-center translate-y-full group-hover:translate-y-0 transition-transform text-white">
          <MessageSquare size={20} />
        </div>
      </motion.button>
    </motion.div>
  );
}
