import { useEffect, useMemo, useRef, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ActivePlatformJob, JobDoc } from '@/src/types/job';

/**
 * Opens one `onSnapshot(doc(db, 'jobs', jobId))` per entry in `platformJobs`
 * and exposes the live state keyed by a stable composite key.
 *
 * Keying scheme:
 *   - `${platform}` when `date` is absent (instant, product-advert, events-post)
 *   - `${platform}|${date}` when `date` is set (ai-engine batch — one job per
 *     platform x date can coexist)
 *
 * Listener lifecycle: re-subscribes whenever the joined jobId set changes;
 * unsubscribes on unmount.
 */
export function jobKey(entry: ActivePlatformJob): string {
  return entry.date ? `${entry.platform}|${entry.date}` : entry.platform;
}

export interface UseParentJobReturn {
  /** Live state keyed by `jobKey(entry)`. */
  jobs: Record<string, JobDoc>;
  /** Original entries in input order — useful for stable rendering. */
  entries: ActivePlatformJob[];
  /** True once every sibling has settled (`done` or `failed`). */
  allDone: boolean;
  /** Any sibling failed. */
  anyFailed: boolean;
  /** Average pct across siblings (0 when nothing is in flight). */
  overallPct: number;
  /** True while at least one sibling exists and hasn't settled. */
  isRunning: boolean;
}

/**
 * Per-jobId snapshot state. `loaded=false` means the listener hasn't fired
 * yet (job doc might not exist yet, or just hasn't arrived). `loaded=true`
 * + `data=null` means the doc was confirmed missing — treat as a terminal
 * failure so `allDone` can fire even when Firestore is missing the doc.
 */
type SnapshotState = { loaded: boolean; data: JobDoc | null };

export function useParentJob(
  parentJobId: string | null | undefined,
  platformJobs: ActivePlatformJob[]
): UseParentJobReturn {
  const [snapshots, setSnapshots] = useState<Record<string, SnapshotState>>(
    {}
  );

  /**
   * Stable signature so React's effect dep array doesn't churn on every
   * re-render. The dep is parentJobId + sorted jobIds. We memo `entries`
   * against the same signature so its identity is also stable.
   */
  const signature = useMemo(() => {
    const ids = platformJobs.map((p) => p.jobId).sort().join(',');
    return `${parentJobId ?? ''}::${ids}`;
  }, [parentJobId, platformJobs]);

  // Stable entries snapshot — same identity whenever `signature` is unchanged.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableEntries = useMemo(() => platformJobs, [signature]);

  useEffect(() => {
    if (!parentJobId || stableEntries.length === 0) {
      setSnapshots({});
      return;
    }

    setSnapshots({});

    const unsubs = stableEntries.map((entry) =>
      onSnapshot(
        doc(db, 'jobs', entry.jobId),
        (snap) => {
          const k = jobKey(entry);
          if (!snap.exists()) {
            // Confirmed missing — treat as a terminal failure so `allDone`
            // can fire and pages don't hang on "Generating… 0%".
            setSnapshots((prev) => ({
              ...prev,
              [k]: { loaded: true, data: null },
            }));
            return;
          }
          const data = snap.data() as JobDoc;
          setSnapshots((prev) => ({
            ...prev,
            [k]: { loaded: true, data },
          }));
        },
        (err) => {
          console.error(`[useParentJob][${entry.jobId}]`, err);
          // Treat permission/network errors as missing too — keeps the UI
          // unstuck rather than spinning forever.
          setSnapshots((prev) => ({
            ...prev,
            [jobKey(entry)]: { loaded: true, data: null },
          }));
        }
      )
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [stableEntries, parentJobId]);

  // Surface only present doc data, matching the previous `jobs` shape. Missing
  // entries appear as a synthetic `failed` doc so consumers can show "failed"
  // styling rather than ignoring the slot entirely.
  const jobs = useMemo<Record<string, JobDoc>>(() => {
    const out: Record<string, JobDoc> = {};
    for (const entry of stableEntries) {
      const k = jobKey(entry);
      const st = snapshots[k];
      if (!st) continue;
      if (st.data) {
        out[k] = st.data;
      } else if (st.loaded) {
        out[k] = {
          jobId: entry.jobId,
          parentJobId: parentJobId ?? '',
          userId: '',
          type: 'instant',
          platform: entry.platform,
          status: 'failed',
          pct: 0,
          stage: 'Missing',
          result: null,
          error: { message: 'Job document is missing.', code: 'missing_doc' },
          createdAt: 0,
          updatedAt: 0,
        };
      }
    }
    return out;
  }, [snapshots, stableEntries, parentJobId]);

  const jobList = Object.values(jobs);
  const settledCount = jobList.filter(
    (j) => j.status === 'done' || j.status === 'failed'
  ).length;
  const allDone =
    platformJobs.length > 0 && settledCount === platformJobs.length;
  const anyFailed = jobList.some((j) => j.status === 'failed');

  // Raw average across all siblings. We then clamp this to a monotonically
  // increasing value per `parentJobId` so non-monotonic worker writes (Cloud
  // Tasks retries, parallel pipeline fan-out, etc.) never make the bar walk
  // backwards on the user's screen.
  const rawOverallPct = platformJobs.length
    ? Math.round(
        jobList.reduce((sum, j) => sum + (j.pct ?? 0), 0) / platformJobs.length
      )
    : 0;

  const maxPctByParentRef = useRef<{ parentJobId: string | null; pct: number }>(
    { parentJobId: null, pct: 0 }
  );
  let overallPct = rawOverallPct;
  if (parentJobId) {
    if (maxPctByParentRef.current.parentJobId !== parentJobId) {
      maxPctByParentRef.current = { parentJobId, pct: rawOverallPct };
    } else if (rawOverallPct > maxPctByParentRef.current.pct) {
      maxPctByParentRef.current.pct = rawOverallPct;
    }
    overallPct = maxPctByParentRef.current.pct;
  }
  // Once everyone has settled we always show 100 — covers the edge where
  // siblings settle but some never reported their final pct.
  if (allDone) overallPct = 100;

  const isRunning = !!parentJobId && platformJobs.length > 0 && !allDone;

  return {
    jobs,
    entries: platformJobs,
    allDone,
    anyFailed,
    overallPct,
    isRunning,
  };
}
