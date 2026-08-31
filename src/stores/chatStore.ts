import { create } from 'zustand';

import {
  createAssistantConversation,
  deleteAssistantConversation,
  fetchAssistantConversation,
  getAssistantUsage,
  listAssistantConversations,
  streamAssistantChat,
  type AssistantMessage,
  type AssistantToolResult,
  type AssistantUsage,
  type ConversationSummary,
} from '@/src/service/api/assistant.service';

export interface ChatMessage extends AssistantMessage {
  /** Local placeholder id used while the assistant message is still streaming. */
  pending?: boolean;
}

interface ChatStoreState {
  open: boolean;
  conversations: ConversationSummary[];
  conversationsLoaded: boolean;
  activeConversationId: string | null;
  messages: ChatMessage[];
  usage: AssistantUsage | null;
  isStreaming: boolean;
  streamError: string | null;
  composerDraft: string;
  /**
   * Set of assistant message ids whose tool-result card has been
   * dismissed (manually via the X button, or automatically when the user
   * sends a new message). Purely ephemeral — never persisted server-side.
   */
  dismissedToolResults: Record<string, true>;

  setOpen: (open: boolean) => void;
  setComposerDraft: (value: string) => void;
  refreshUsage: () => Promise<void>;
  refreshConversations: () => Promise<void>;
  loadConversation: (id: string) => Promise<void>;
  startNewConversation: () => Promise<string | null>;
  removeConversation: (id: string) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  dismissToolResult: (messageId: string) => void;
  abortStream: () => void;
  resetTransient: () => void;
}

let activeStreamController: AbortController | null = null;
let streamingMessageBuffer = '';
let pendingMessageId: string | null = null;

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function makeUserMessage(text: string): ChatMessage {
  return {
    id: `local-user-${nowSeconds()}-${Math.random().toString(36).slice(2, 8)}`,
    role: 'user',
    content: text,
    createdAt: { _seconds: nowSeconds() },
  };
}

function makePendingAssistant(): ChatMessage {
  const id = `local-pending-${nowSeconds()}-${Math.random().toString(36).slice(2, 8)}`;
  pendingMessageId = id;
  streamingMessageBuffer = '';
  return {
    id,
    role: 'assistant',
    content: '',
    pending: true,
    createdAt: { _seconds: nowSeconds() },
  };
}

export const useChatStore = create<ChatStoreState>((set, get) => ({
  open: false,
  conversations: [],
  conversationsLoaded: false,
  activeConversationId: null,
  messages: [],
  usage: null,
  isStreaming: false,
  streamError: null,
  composerDraft: '',
  dismissedToolResults: {},

  setOpen: (open) => {
    set({ open });
    if (open && !get().conversationsLoaded) {
      void get().refreshConversations();
    }
    if (open) {
      void get().refreshUsage();
    }
  },

  setComposerDraft: (value) => set({ composerDraft: value }),

  refreshUsage: async () => {
    try {
      const usage = await getAssistantUsage();
      set({ usage });
    } catch {
      /* non-fatal */
    }
  },

  refreshConversations: async () => {
    try {
      const conversations = await listAssistantConversations();
      set({ conversations, conversationsLoaded: true });
    } catch {
      set({ conversationsLoaded: true });
    }
  },

  loadConversation: async (id) => {
    try {
      const detail = await fetchAssistantConversation(id);
      set({
        activeConversationId: id,
        messages: detail.messages as ChatMessage[],
        streamError: null,
        dismissedToolResults: {},
      });
    } catch (err) {
      set({
        streamError:
          err instanceof Error ? err.message : 'Failed to load conversation.',
      });
    }
  },

  startNewConversation: async () => {
    try {
      const conv = await createAssistantConversation();
      set((state) => ({
        activeConversationId: conv.id,
        conversations: [conv, ...state.conversations],
        messages: [],
        streamError: null,
        dismissedToolResults: {},
      }));
      return conv.id;
    } catch (err) {
      set({
        streamError:
          err instanceof Error
            ? err.message
            : 'Could not start a new conversation.',
      });
      return null;
    }
  },

  removeConversation: async (id) => {
    try {
      await deleteAssistantConversation(id);
      set((state) => ({
        conversations: state.conversations.filter((c) => c.id !== id),
        ...(state.activeConversationId === id
          ? { activeConversationId: null, messages: [] }
          : null),
      }));
    } catch {
      /* swallow */
    }
  },

  sendMessage: async (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (get().isStreaming) return;

    const userMessage = makeUserMessage(trimmed);
    const pendingAssistant = makePendingAssistant();

    // Auto-dismiss every existing assistant message's tool-result card. The
    // new pending message has a fresh id so its incoming card will render
    // normally; only the historical cards collapse to their text summary.
    set((state) => {
      const dismissedToolResults: Record<string, true> = {
        ...state.dismissedToolResults,
      };
      for (const m of state.messages) {
        if (m.role === 'assistant' && m.toolResult) {
          dismissedToolResults[m.id] = true;
        }
      }
      return {
        messages: [...state.messages, userMessage, pendingAssistant],
        composerDraft: '',
        isStreaming: true,
        streamError: null,
        dismissedToolResults,
      };
    });

    const conversationId = get().activeConversationId ?? undefined;
    const localPendingId = pendingAssistant.id;
    let toolResult: AssistantToolResult | undefined;
    let toolName: string | undefined;

    activeStreamController = streamAssistantChat(
      { message: trimmed, conversationId },
      (event) => {
        if (event.type === 'meta') {
          set({
            activeConversationId: event.conversationId,
            usage: event.usage,
          });
        } else if (event.type === 'token') {
          streamingMessageBuffer += event.delta;
          const buffer = streamingMessageBuffer;
          set((state) => ({
            messages: state.messages.map((m) =>
              m.id === localPendingId ? { ...m, content: buffer } : m
            ),
          }));
        } else if (event.type === 'tool_call') {
          toolName = event.name;
        } else if (event.type === 'tool_result') {
          toolResult = event.result;
          toolName = event.name;
          set((state) => ({
            messages: state.messages.map((m) =>
              m.id === localPendingId
                ? { ...m, toolName, toolResult: event.result }
                : m
            ),
          }));
        } else if (event.type === 'refused') {
          set((state) => ({
            messages: state.messages.map((m) =>
              m.id === localPendingId
                ? {
                    ...m,
                    content: event.message,
                    pending: false,
                    meta: { refused: true, refusedReason: event.reason },
                  }
                : m
            ),
          }));
        } else if (event.type === 'error') {
          set((state) => ({
            streamError: event.message,
            isStreaming: false,
            messages: state.messages.map((m) =>
              m.id === localPendingId
                ? {
                    ...m,
                    pending: false,
                    content:
                      m.content ||
                      'Sorry, I ran into an issue. Please try again.',
                  }
                : m
            ),
          }));
        } else if (event.type === 'done') {
          set((state) => ({
            isStreaming: false,
            messages: state.messages.map((m) =>
              m.id === localPendingId
                ? {
                    ...m,
                    id: event.messageId,
                    pending: false,
                    toolName,
                    toolResult,
                  }
                : m
            ),
          }));
          pendingMessageId = null;
          streamingMessageBuffer = '';
          activeStreamController = null;
          void get().refreshUsage();
          void get().refreshConversations();
        }
      }
    );
  },

  dismissToolResult: (messageId) => {
    if (!messageId) return;
    set((state) =>
      state.dismissedToolResults[messageId]
        ? state
        : {
            dismissedToolResults: {
              ...state.dismissedToolResults,
              [messageId]: true,
            },
          }
    );
  },

  abortStream: () => {
    if (activeStreamController) {
      activeStreamController.abort();
      activeStreamController = null;
    }
    set((state) => ({
      isStreaming: false,
      messages: state.messages.map((m) =>
        m.id === pendingMessageId
          ? {
              ...m,
              pending: false,
              content: m.content || '(cancelled)',
            }
          : m
      ),
    }));
    pendingMessageId = null;
    streamingMessageBuffer = '';
  },

  resetTransient: () => {
    if (activeStreamController) activeStreamController.abort();
    activeStreamController = null;
    streamingMessageBuffer = '';
    pendingMessageId = null;
    set({
      isStreaming: false,
      streamError: null,
    });
  },
}));
