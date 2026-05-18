import { create } from 'zustand';

interface ChatStore {
  isOpen: boolean;
  policyId: string | null;
  context: string;
  open: (policyId?: string, context?: string) => void;
  close: () => void;
  toggle: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  isOpen: false,
  policyId: null,
  context: 'general',
  open: (policyId, context = 'general') =>
    set({ isOpen: true, policyId: policyId || null, context }),
  close: () => set({ isOpen: false }),
  toggle: () => set(s => ({ isOpen: !s.isOpen })),
}));
