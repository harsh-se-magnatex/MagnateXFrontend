import axiosClient from '@/lib/axios';
import { apiGet, apiPost, apiDelete } from '@/lib/api-client';

export type AssistantToolResultKind =
  | 'text'
  | 'analytics_summary'
  | 'error_explanation'
  | 'draft_quick'
  | 'draft_advert'
  | 'festival_info';

export interface AssistantToolResult {
  kind: AssistantToolResultKind;
  payload: Record<string, unknown>;
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolResult?: AssistantToolResult;
  meta?: {
    refused?: boolean;
    refusedReason?: string;
    modelUsed?: string;
  };
  createdAt: number | { _seconds: number };
}

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  lastMessagePreview?: string;
}

export interface ConversationDetail {
  id: string;
  title: string;
  messages: AssistantMessage[];
}

export interface AssistantUsage {
  used: number;
  cap: number;
  windowStart: number;
  resetsAt: number;
  windowHours: number;
  /**
   * `'paid'` for active subscribers, `'free'` otherwise. Older backends
   * may not send this field — treat missing as `'free'` to stay safe.
   */
  tier?: 'free' | 'paid';
}

type AssistantStreamEvent =
  | { type: 'meta'; conversationId: string; usage: AssistantUsage }
  | { type: 'token'; delta: string }
  | { type: 'tool_call'; name: string; args: unknown }
  | { type: 'tool_result'; name: string; result: AssistantToolResult }
  | { type: 'refused'; reason: string; message: string }
  | { type: 'error'; message: string }
  | { type: 'done'; messageId: string };

export type AssistantStreamHandler = (event: AssistantStreamEvent) => void;

export async function getAssistantUsage(): Promise<AssistantUsage> {
  const res = await apiGet<{ data: AssistantUsage }>('/api/v1/assistant/usage');
  return (res as { data: AssistantUsage }).data;
}

export async function listAssistantConversations(): Promise<
  ConversationSummary[]
> {
  const res = await apiGet<{ data: { conversations: ConversationSummary[] } }>(
    '/api/v1/assistant/conversations'
  );
  return res.data.conversations;
}

export async function fetchAssistantConversation(
  id: string
): Promise<ConversationDetail> {
  const res = await apiGet<{ data: ConversationDetail }>(
    `/api/v1/assistant/conversations/${encodeURIComponent(id)}`
  );
  return res.data;
}

export async function createAssistantConversation(): Promise<ConversationSummary> {
  const res = await apiPost<{ data: ConversationSummary }>(
    '/api/v1/assistant/conversations'
  );
  return res.data;
}

export async function deleteAssistantConversation(id: string): Promise<void> {
  await apiDelete(`/api/v1/assistant/conversations/${encodeURIComponent(id)}`);
}

/**
 * Stream a chat turn over SSE. Returns an AbortController so the caller can
 * cancel mid-stream (e.g. on widget close or component unmount).
 *
 * We use `fetch` directly (not axios) because axios doesn't expose the body
 * stream for incremental reads. Credentials are included so the session
 * cookie travels with the request.
 */
export function streamAssistantChat(
  params: { message: string; conversationId?: string },
  onEvent: AssistantStreamHandler
): AbortController {
  const controller = new AbortController();
  const url = (axiosClient.defaults.baseURL ?? '') + '/api/v1/assistant/chat';

  (async () => {
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(params),
        signal: controller.signal,
      });
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return;
      onEvent({
        type: 'error',
        message: 'Network error reaching the assistant. Please try again.',
      });
      return;
    }

    if (!response.ok || !response.body) {
      let message = `Assistant request failed (${response.status})`;
      try {
        const body = await response.json();
        if (body && typeof body.message === 'string') message = body.message;
      } catch {
        /* swallow */
      }
      onEvent({ type: 'error', message });
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() ?? '';
        for (const block of blocks) {
          const line = block.split('\n').find((l) => l.startsWith('data:'));
          if (!line) continue;
          const raw = line.slice(5).trim();
          if (!raw) continue;
          try {
            const parsed = JSON.parse(raw) as AssistantStreamEvent;
            onEvent(parsed);
          } catch {
            /* ignore malformed chunk */
          }
        }
      }
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return;
      onEvent({
        type: 'error',
        message: 'The assistant stream was interrupted. Please try again.',
      });
    }
  })();

  return controller;
}
