import { create } from 'zustand';

import type {
  WhereToSpendPayload,
  WhereToSpendPlatform,
} from '@/src/service/api/analyticService';

/**
 * In-memory cache for the Where-to-Spend boost recommendation payload.
 *
 * The endpoint fires an OpenAI call on each request to tailor audience
 * targeting + rationale. Switching between platform tabs unmounts the
 * section, so without a cache every tab-switch re-pays that latency + cost.
 *
 * Unpersisted (no `persist` middleware): a page refresh re-fetches, so a
 * user who explicitly reloads the page always gets a fresh recommendation.
 * Within a single session, tab-switches inside the TTL window are free.
 */

type Entry = {
  payload: WhereToSpendPayload;
  fetchedAt: number;
};

type WhereToSpendCache = {
  entries: Partial<Record<WhereToSpendPlatform, Entry>>;
  /** Returns the cached payload only if it's within TTL; otherwise null. */
  getFresh: (platform: WhereToSpendPlatform) => WhereToSpendPayload | null;
  set: (platform: WhereToSpendPlatform, payload: WhereToSpendPayload) => void;
  /** Drop a single platform's entry, or the whole map when omitted. */
  invalidate: (platform?: WhereToSpendPlatform) => void;
};

export const WHERE_TO_SPEND_TTL_MS = 15 * 60 * 1000;

export const useWhereToSpendCache = create<WhereToSpendCache>()((set, get) => ({
  entries: {},
  getFresh: (platform) => {
    const entry = get().entries[platform];
    if (!entry) return null;
    if (Date.now() - entry.fetchedAt > WHERE_TO_SPEND_TTL_MS) return null;
    return entry.payload;
  },
  set: (platform, payload) =>
    set((state) => ({
      entries: {
        ...state.entries,
        [platform]: { payload, fetchedAt: Date.now() },
      },
    })),
  invalidate: (platform) =>
    set((state) => {
      if (!platform) return { entries: {} };
      const next = { ...state.entries };
      delete next[platform];
      return { entries: next };
    }),
}));
