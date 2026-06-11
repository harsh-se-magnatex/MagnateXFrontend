import { useCallback, useState } from 'react';
import { useUserPlanCredits } from '@/app/(main)/_components/UserPlanCreditsProvider';
import { useParentJob, type UseParentJobReturn } from './useParentJob';
import type {
  ActiveJobEntry,
  ActivePlatformJob,
  GenerationType,
  Platform,
} from '@/src/types/job';

/**
 * The optional payload the page passes immediately after the POST returns. The
 * user-doc snapshot will eventually deliver the same shape via Firestore, but
 * the API response is faster (no Firestore round-trip), so we let pages prime
 * the hook for instant UI feedback.
 */
export interface FeatureJobGenerateResponse {
  parentJobId: string;
  jobs: ActivePlatformJob[];
}

export interface UseFeatureJobReturn extends UseParentJobReturn {
  parentJobId: string | null;
  /** Same as `entries` — kept for naming symmetry with the API response. */
  platformJobs: ActivePlatformJob[];
  /** Call right after the generate POST returns with `{ parentJobId, jobs }`. */
  onGenerated: (response: FeatureJobGenerateResponse) => void;
}

type AiEnginePlatform = 'instagram' | 'facebook' | 'linkedin';

/**
 * For ai-engine batch runs each platform owns its own activeJobs slot, so
 * pages must subscribe per-platform. Other features remain single-slot. The
 * hook switches behavior based on whether a platform was supplied.
 */
export function useFeatureJob(
  type: 'ai-engine',
  platform: AiEnginePlatform
): UseFeatureJobReturn;
export function useFeatureJob(
  type: Exclude<GenerationType, 'ai-engine'>
): UseFeatureJobReturn;
export function useFeatureJob(
  type: GenerationType,
  platform?: AiEnginePlatform
): UseFeatureJobReturn {
  const { billing } = useUserPlanCredits();

  let docEntry: ActiveJobEntry | undefined;
  if (type === 'ai-engine') {
    const aiEngineSlots = billing?.activeJobs?.['ai-engine'];
    docEntry = platform ? aiEngineSlots?.[platform] : undefined;
  } else {
    docEntry =
      (billing?.activeJobs?.[type as Exclude<GenerationType, 'ai-engine'>] ??
        undefined) as ActiveJobEntry | undefined;
  }

  // Optimistic local cache for the brief window between API 202 and the
  // user-doc snapshot landing. Once Firestore has loaded (`billing != null`)
  // AND its slot diverges from our optimistic prime, the optimistic value is
  // considered superseded and ignored — no setState-in-effect needed.
  const [optimistic, setOptimistic] =
    useState<FeatureJobGenerateResponse | null>(null);

  const onGenerated = useCallback((response: FeatureJobGenerateResponse) => {
    setOptimistic(response);
  }, []);

  // Optimistic wins only when we have one AND it agrees with Firestore (or
  // Firestore hasn't loaded yet). Once Firestore says something different we
  // trust Firestore.
  const useOptimistic =
    !!optimistic &&
    (!billing || docEntry?.parentJobId === optimistic.parentJobId || !docEntry);

  const parentJobId =
    docEntry?.parentJobId ?? (useOptimistic ? optimistic!.parentJobId : null);
  const platformJobs: ActivePlatformJob[] =
    docEntry?.jobs ?? (useOptimistic ? optimistic!.jobs : []);

  const inner = useParentJob(parentJobId, platformJobs);

  return {
    ...inner,
    parentJobId,
    platformJobs,
    onGenerated,
  };
}

/** Convenience type re-export so callers don't need to import `Platform`. */
export type { AiEnginePlatform };
export type { Platform };
