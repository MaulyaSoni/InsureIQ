import { create } from 'zustand';

interface AgentStore {
  isRunning: boolean;
  currentNode: string | null;
  model: string | null;
  elapsedMs: number;
  startRun: (node: string, model: string) => void;
  updateNode: (node: string, model: string) => void;
  endRun: () => void;
  tick: (ms: number) => void;
}

export const useAgentStore = create<AgentStore>((set) => ({
  isRunning: false,
  currentNode: null,
  model: null,
  elapsedMs: 0,
  startRun: (node, model) => set({ isRunning: true, currentNode: node, model, elapsedMs: 0 }),
  updateNode: (node, model) => set({ currentNode: node, model }),
  endRun: () => set({ isRunning: false, currentNode: null, model: null }),
  tick: (ms) => set(state => ({ elapsedMs: state.elapsedMs + ms }))
}));
