import { create } from 'zustand';
import { ChatMessage } from '@/lib/providers/types';

export interface ToolStatus {
  id: string;
  name: string;
  arguments?: string;
  result?: string;
  status: 'running' | 'completed' | 'failed';
}

interface SessionState {
  guestId: string | null;
  credits: number;
  activeModelId: string;
  availableModels: any[];
  messages: ChatMessage[];
  isStreaming: boolean;
  activeToolCalls: ToolStatus[];
  conversations: any[];
  activeConversationId: string | null;
  
  setCredits: (credits: number) => void;
  setActiveModelId: (modelId: string) => void;
  setAvailableModels: (models: any[]) => void;
  setIsStreaming: (is: boolean) => void;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  updateLastMessageText: (text: string) => void;
  addToolCall: (toolCall: ToolStatus) => void;
  updateToolCall: (id: string, updates: Partial<ToolStatus>) => void;
  clearToolCalls: () => void;
  setConversations: (convs: any[]) => void;
  setActiveConversationId: (id: string | null) => void;
  initGuestSession: () => string;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  guestId: null,
  credits: 50,
  activeModelId: 'deepseek-ai/deepseek-v4-flash',
  availableModels: [],
  messages: [],
  isStreaming: false,
  activeToolCalls: [],
  conversations: [],
  activeConversationId: null,

  setCredits: (credits) => set({ credits }),
  setActiveModelId: (activeModelId) => set({ activeModelId }),
  setAvailableModels: (availableModels) => set({ availableModels }),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  setMessages: (messages) => set({ messages }),
  
  addMessage: (message) => set((state) => ({ 
    messages: [...state.messages, message] 
  })),

  updateLastMessageText: (text) => set((state) => {
    const updated = [...state.messages];
    if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
      updated[updated.length - 1] = {
        ...updated[updated.length - 1],
        content: updated[updated.length - 1].content + text,
      };
    }
    return { messages: updated };
  }),

  addToolCall: (toolCall) => set((state) => ({
    activeToolCalls: [...state.activeToolCalls, toolCall],
  })),

  updateToolCall: (id, updates) => set((state) => ({
    activeToolCalls: state.activeToolCalls.map((tc) =>
      tc.id === id ? { ...tc, ...updates } : tc
    ),
  })),

  clearToolCalls: () => set({ activeToolCalls: [] }),
  setConversations: (conversations) => set({ conversations }),
  setActiveConversationId: (activeConversationId) => set({ activeConversationId }),

  initGuestSession: () => {
    if (typeof window === 'undefined') return '';
    let id = localStorage.getItem('nexus_guest_id');
    if (!id || !id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      id = crypto.randomUUID();
      localStorage.setItem('nexus_guest_id', id);
    }
    set({ guestId: id });
    return id;
  },
}));
