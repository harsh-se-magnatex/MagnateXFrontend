import { create } from 'zustand';

import type {
  WeeklyVerdictPayload,
  WhereToSpendPlatform,
} from '@/src/service/api/analyticService';

/**
 * In-memory cache for the analytics page weekly verdict card.
 *
 * The endpoint fires an OpenAI call on each request. Without a cache,
 * every page visit and platform tab switch re-pays that latency + cost.
 *
 * Seeded from the cron-built analytics snapshot on page load; unpersisted
 * so a full page reload can pick up a newer snapshot.
 */

type Entry = {
  payload: WeeklyVerdictPayload;
  source: 'openai' | 'fallback';
  fetchedAt: number;
};

type WeeklyVerdictCache = {
  entries: Partial<Record<WhereToSpendPlatform, Entry>>;
  getFresh: (platform: WhereToSpendPlatform) => Entry | null;
  set: (
    platform: WhereToSpendPlatform,
    payload: WeeklyVerdictPayload,
    source: 'openai' | 'fallback'
  ) => void;
  invalidate: (platform?: WhereToSpendPlatform) => void;
};

/** Match the 24h analytics snapshot refresh cadence. */
export const WEEKLY_VERDICT_TTL_MS = 24 * 60 * 60 * 1000;

export const useWeeklyVerdictCache = create<WeeklyVerdictCache>()(
  (set, get) => ({
    entries: {},
    getFresh: (platform) => {
      const entry = get().entries[platform];
      if (!entry) return null;
      if (Date.now() - entry.fetchedAt > WEEKLY_VERDICT_TTL_MS) return null;
      return entry;
    },
    set: (platform, payload, source) =>
      set((state) => ({
        entries: {
          ...state.entries,
          [platform]: { payload, source, fetchedAt: Date.now() },
        },
      })),
    invalidate: (platform) =>
      set((state) => {
        if (!platform) return { entries: {} };
        const next = { ...state.entries };
        delete next[platform];
        return { entries: next };
      }),
  })
);
