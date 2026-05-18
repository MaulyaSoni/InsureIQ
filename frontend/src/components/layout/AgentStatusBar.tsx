import { motion, AnimatePresence } from 'framer-motion';
import { useAgentStore } from '@/stores/useAgentStore';

export function AgentStatusBar() {
  const { isRunning, currentNode, model, elapsedMs } = useAgentStore();

  return (
    <AnimatePresence>
      {isRunning && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 32, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="h-8 bg-brand-50 dark:bg-brand-900/20 border-b border-brand-100 dark:border-brand-800 flex items-center px-5 gap-3">
            {/* Animated dot */}
            <motion.div
              className="w-2 h-2 rounded-full bg-brand-500"
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-xs font-medium text-brand-600 dark:text-brand-300">
              {currentNode ? `${currentNode} running` : 'Agent pipeline starting'}
            </span>
            {model && (
              <span className="text-xs font-mono text-brand-400 dark:text-brand-400">
                · {model}
              </span>
            )}
            {elapsedMs > 0 && (
              <span className="text-xs text-brand-400 ml-auto font-mono">
                {(elapsedMs / 1000).toFixed(1)}s
              </span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
