/**
 * Client-side prefill store for assistant-generated drafts. The chatbot
 * never writes to the database; instead each draft is delivered inline on
 * the SSE stream. When the user clicks "Open in Quick Create" (or any of
 * the other destination CTAs) in chat, we tuck the draft payload into
 * sessionStorage keyed by a short random id and navigate. The destination
 * page reads it once on mount via `consumeAssistantPrefill`.
 *
 * No server endpoint is needed: drafts also persist on the chat message
 * itself (server-side conversation history), so the user can re-trigger
 * any historical CTA at any time.
 */

const STORAGE_PREFIX = 'assistant.prefill.';
const TTL_MS = 30 * 60 * 1000; // 30 minutes — long enough to navigate.

export type AssistantPrefillKind = 'draft_quick' | 'draft_advert';

export interface AssistantPrefillEntry {
  kind: AssistantPrefillKind;
  payload: Record<string, unknown>;
  createdAt: number;
}

function inBrowser(): boolean {
  return typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';
}

function randomId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function putAssistantPrefill(entry: Omit<AssistantPrefillEntry, 'createdAt'>): string | null {
  if (!inBrowser()) return null;
  const id = randomId();
  const full: AssistantPrefillEntry = { ...entry, createdAt: Date.now() };
  try {
    sessionStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(full));
  } catch {
    return null;
  }
  return id;
}

export function consumeAssistantPrefill(id: string): AssistantPrefillEntry | null {
  if (!inBrowser()) return null;
  const key = STORAGE_PREFIX + id;
  const raw = sessionStorage.getItem(key);
  if (!raw) return null;
  sessionStorage.removeItem(key);
  try {
    const parsed = JSON.parse(raw) as AssistantPrefillEntry;
    if (
      !parsed ||
      typeof parsed.kind !== 'string' ||
      typeof parsed.createdAt !== 'number'
    ) {
      return null;
    }
    if (Date.now() - parsed.createdAt > TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function peekAssistantPrefill(id: string): AssistantPrefillEntry | null {
  if (!inBrowser()) return null;
  const raw = sessionStorage.getItem(STORAGE_PREFIX + id);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AssistantPrefillEntry;
  } catch {
    return null;
  }
}
