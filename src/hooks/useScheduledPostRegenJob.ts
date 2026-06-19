import { useCallback, useEffect, useRef, useState } from 'react';
import { useParentJob } from '@/src/hooks/useParentJob';
import type { ActivePlatformJob } from '@/src/types/job';
import { showErrorToast } from '@/lib/show-error-toast';

export type ScheduledPostRegenJobStart = {
  jobId: string;
  parentJobId: string;
  platform: 'instagram' | 'facebook' | 'linkedin';
};

export function parseRegenJobFromResponse(
  data: {
    jobId?: string;
    parentJobId?: string;
    platform?: string;
  } | undefined
): ScheduledPostRegenJobStart | null {
  const { jobId, parentJobId, platform } = data ?? {};
  if (!jobId || !parentJobId || !platform) return null;
  if (
    platform !== 'instagram' &&
    platform !== 'facebook' &&
    platform !== 'linkedin'
  ) {
    return null;
  }
  return { jobId, parentJobId, platform };
}

/**
 * Tracks a single in-flight scheduled-post regeneration the same way
 * create-campaign tracks a draft regen: subscribe to `jobs/{jobId}` via
 * `useParentJob`, refresh authoritative post data when the job settles,
 * then clear the per-card spinner.
 */
export function useScheduledPostRegenJob(
  onJobSettledRef: React.MutableRefObject<() => Promise<void>>
) {
  const [regeneratingPostIds, setRegeneratingPostIds] = useState<Set<string>>(
    () => new Set()
  );
  const [activeJob, setActiveJob] = useState<{
    postId: string;
    parentJobId: string;
    jobs: ActivePlatformJob[];
  } | null>(null);

  const { allDone, anyFailed } = useParentJob(
    activeJob?.parentJobId ?? null,
    activeJob?.jobs ?? []
  );

  const settledParentRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeJob || !allDone) return;
    if (settledParentRef.current === activeJob.parentJobId) return;
    settledParentRef.current = activeJob.parentJobId;

    const postId = activeJob.postId;
    if (anyFailed) {
      showErrorToast('Regeneration failed. Please try again.');
    }

    void onJobSettledRef.current().finally(() => {
      setRegeneratingPostIds((prev) => {
        if (!prev.has(postId)) return prev;
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
      setActiveJob(null);
    });
  }, [allDone, anyFailed, activeJob, onJobSettledRef]);

  const markRegenerating = useCallback((postId: string) => {
    settledParentRef.current = null;
    setRegeneratingPostIds((prev) => {
      const next = new Set(prev);
      next.add(postId);
      return next;
    });
  }, []);

  const attachRegenJob = useCallback(
    (postId: string, job: ScheduledPostRegenJobStart) => {
      setActiveJob({
        postId,
        parentJobId: job.parentJobId,
        jobs: [{ jobId: job.jobId, platform: job.platform }],
      });
    },
    []
  );

  const cancelRegeneration = useCallback((postId: string) => {
    setRegeneratingPostIds((prev) => {
      if (!prev.has(postId)) return prev;
      const next = new Set(prev);
      next.delete(postId);
      return next;
    });
    setActiveJob((current) => (current?.postId === postId ? null : current));
  }, []);

  return {
    regeneratingPostIds,
    markRegenerating,
    attachRegenJob,
    cancelRegeneration,
  };
}
