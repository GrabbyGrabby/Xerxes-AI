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
  showTopControls: boolean;
  
  setCredits: (credits: number) => void;
  setActiveModelId: (modelId: string) => void;
  setAvailableModels: (models: any[]) => void;
  setIsStreaming: (is: boolean) => void;
  setMessages: (messages: ChatMessage[]) => void;
  setShowTopControls: (show: boolean) => void;
  addMessage: (message: ChatMessage) => void;
  updateLastMessageText: (text: string) => void;
  addToolCall: (toolCall: ToolStatus) => void;
  updateToolCall: (id: string, updates: Partial<ToolStatus>) => void;
  clearToolCalls: () => void;
  setConversations: (convs: any[]) => void;
  setActiveConversationId: (id: string | null) => void;
  initGuestSession: () => string;
  loadConversationsFromLocal: (guestId: string | null, userId: string | null) => Promise<void>;
  saveLocalConversation: (id: string, title: string, guestId: string | null, userId: string | null) => Promise<void>;
  saveLocalMessage: (conversationId: string, message: ChatMessage) => Promise<void>;
  syncConversationsWithBackend: (apiList: any[], guestId: string | null, userId: string | null) => Promise<void>;
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
  showTopControls: true,

  setCredits: (credits) => set({ credits }),
  setActiveModelId: (activeModelId) => set({ activeModelId }),
  setAvailableModels: (availableModels) => set({ availableModels }),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  setMessages: (messages) => set({ messages }),
  setShowTopControls: (showTopControls) => set({ showTopControls }),
  
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

  loadConversationsFromLocal: async (guestId, userId) => {
    if (typeof window === 'undefined') return;
    try {
      const { localDb } = await import('@/lib/storage/indexedDbHelper');
      const localConvs = await localDb.getAllConversations(guestId, userId);
      set({ conversations: localConvs });
    } catch (e) {
      console.error('Error in loadConversationsFromLocal:', e);
    }
  },

  saveLocalConversation: async (id, title, guestId, userId) => {
    if (typeof window === 'undefined') return;
    try {
      const { localDb } = await import('@/lib/storage/indexedDbHelper');
      await localDb.saveConversation({
        id,
        title,
        created_at: new Date().toISOString(),
        user_id: userId,
        guest_id: guestId,
      });
      // Refresh state from DB
      const localConvs = await localDb.getAllConversations(guestId, userId);
      set({ conversations: localConvs });
    } catch (e) {
      console.error('Error in saveLocalConversation:', e);
    }
  },

  saveLocalMessage: async (conversationId, message) => {
    if (typeof window === 'undefined') return;
    try {
      const { localDb } = await import('@/lib/storage/indexedDbHelper');
      await localDb.saveMessage({
        conversation_id: conversationId,
        role: message.role,
        content: message.content,
        model_id: message.id || undefined,
        tool_calls: (message as any).tool_calls || null,
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Error in saveLocalMessage:', e);
    }
  },

  syncConversationsWithBackend: async (apiList, guestId, userId) => {
    if (typeof window === 'undefined') return;
    try {
      const { localDb } = await import('@/lib/storage/indexedDbHelper');
      const localConvs = apiList.map((c: any) => ({
        id: c.id,
        title: c.title || 'Untitled Thread',
        created_at: c.created_at,
        user_id: userId,
        guest_id: guestId,
        last_updated: c.created_at,
      }));
      await localDb.bulkSaveConversations(localConvs);
      const updatedLocal = await localDb.getAllConversations(guestId, userId);
      set({ conversations: updatedLocal });
    } catch (e) {
      console.error('Error in syncConversationsWithBackend:', e);
    }
  },
}));

