import { create } from 'zustand';

import type {
  WhatToPostNextPayload,
  WhatToPostNextPlatform,
} from '@/src/service/api/analyticService';

/**
 * In-memory cache for the Growth Studio A1 "What to post next" briefs.
 *
 * The endpoint fires an OpenAI call on each request to author three
 * platform-aware briefs. Switching between platform tabs unmounts the
 * section, so without a cache every tab-switch re-pays that latency + cost.
 *
 * Mirrors `whereToSpendCache.ts`: unpersisted, with a 15-minute TTL so a
 * page reload always re-fetches but in-session tab-switches are free.
 */

type Entry = {
  payload: WhatToPostNextPayload;
  fetchedAt: number;
};

type WhatToPostNextCache = {
  entries: Partial<Record<WhatToPostNextPlatform, Entry>>;
  getFresh: (platform: WhatToPostNextPlatform) => WhatToPostNextPayload | null;
  set: (
    platform: WhatToPostNextPlatform,
    payload: WhatToPostNextPayload
  ) => void;
  invalidate: (platform?: WhatToPostNextPlatform) => void;
};

export const WHAT_TO_POST_NEXT_TTL_MS = 15 * 60 * 1000;

export const useWhatToPostNextCache = create<WhatToPostNextCache>()(
  (set, get) => ({
    entries: {},
    getFresh: (platform) => {
      const entry = get().entries[platform];
      if (!entry) return null;
      if (Date.now() - entry.fetchedAt > WHAT_TO_POST_NEXT_TTL_MS) return null;
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
  })
);
