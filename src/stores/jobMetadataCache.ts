import { create } from 'zustand';
import type { Platform } from '@/src/types/job';

/**
 * Per-`parentJobId` snapshot of the client-side selection the user made when
 * they launched a generation. Stored on the API side too (on every sibling
 * job's payload), but the frontend prefers this in-memory cache to avoid a
 * round-trip on the happy path.
 *
 * Non-persistent on purpose — this is "what did I just click to start this
 * run" state, scoped to the current tab session. A hard refresh drops the
 * cache; pages then fall back to `GET /api/v1/jobs/metadata/:parentJobId`.
 */
export type JobMetadata = {
  selectedDates?: string[];
  selectedPlatforms?: Platform[];
};

type JobMetadataCacheState = {
  byParentJobId: Record<string, JobMetadata>;
  setMetadata: (parentJobId: string, meta: JobMetadata) => void;
  mergeMetadata: (parentJobId: string, meta: JobMetadata) => void;
  clearMetadata: (parentJobId: string) => void;
};

export const useJobMetadataCache = create<JobMetadataCacheState>()((set) => ({
  byParentJobId: {},
  setMetadata: (parentJobId, meta) =>
    set((s) => ({
      byParentJobId: { ...s.byParentJobId, [parentJobId]: meta },
    })),
  mergeMetadata: (parentJobId, meta) =>
    set((s) => ({
      byParentJobId: {
        ...s.byParentJobId,
        [parentJobId]: { ...(s.byParentJobId[parentJobId] ?? {}), ...meta },
      },
    })),
  clearMetadata: (parentJobId) =>
    set((s) => {
      if (!s.byParentJobId[parentJobId]) return s;
      const next = { ...s.byParentJobId };
      delete next[parentJobId];
      return { byParentJobId: next };
    }),
}));

/**
 * Read the in-memory snapshot without subscribing. Used by helpers that prefer
 * zustand-first lookup, then API fallback.
 */
export function readJobMetadata(parentJobId: string): JobMetadata | undefined {
  return useJobMetadataCache.getState().byParentJobId[parentJobId];
}
