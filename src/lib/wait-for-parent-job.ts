import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

const DEFAULT_TIMEOUT_MS = 45 * 60 * 1000;

export type GenerationWaitOutcome = 'generated' | 'failed' | 'timedOut';

export type WaitForParentJobResult = {
  docIds: string[];
  matchedDocs: Array<{ id: string; data: Record<string, unknown> }>;
  timedOut: boolean;
  /** `generated` if every slot succeeded; `failed` if any failure stub; `timedOut` otherwise. */
  outcome: GenerationWaitOutcome;
  failedCount: number;
  successCount: number;
};

function slotWeight(data: Record<string, unknown>): {
  slots: number;
  failed: boolean;
} {
  const status = String(data.generationStatus ?? '').toLowerCase();
  const failed = status === 'failed' || status === 'error';
  const rawSlots = Number(data.resultSlots ?? 1);
  const slots = Number.isFinite(rawSlots) ? Math.max(1, Math.floor(rawSlots)) : 1;
  return { slots, failed };
}

/**
 * Resolves when enough docs with `parentJobId` appear under
 * `users/{uid}/{collectionName}` to cover `expectedCount` slots.
 * Failure stubs (`generationStatus: 'failed'`) count via `resultSlots`.
 */
export function waitForParentJobDocs(args: {
  uid: string;
  collectionName: string;
  parentJobId: string;
  expectedCount: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}): Promise<WaitForParentJobResult> {
  const {
    uid,
    collectionName,
    parentJobId,
    expectedCount,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal,
  } = args;

  if (!parentJobId || expectedCount <= 0) {
    return Promise.resolve({
      docIds: [],
      matchedDocs: [],
      timedOut: false,
      outcome: 'generated',
      failedCount: 0,
      successCount: 0,
    });
  }

  return new Promise((resolve, reject) => {
    let unsub: Unsubscribe | null = null;
    let settled = false;

    const finish = (result: WaitForParentJobResult) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    const fail = (err: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    };

    const onAbort = () => {
      fail(new DOMException('Aborted', 'AbortError'));
    };

    const cleanup = () => {
      window.clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      unsub?.();
      unsub = null;
    };

    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener('abort', onAbort);

    const timer = window.setTimeout(() => {
      finish({
        docIds: [],
        matchedDocs: [],
        timedOut: true,
        outcome: 'timedOut',
        failedCount: 0,
        successCount: 0,
      });
    }, timeoutMs);

    try {
      const q = query(
        collection(db, 'users', uid, collectionName),
        where('parentJobId', '==', parentJobId)
      );
      unsub = onSnapshot(
        q,
        (snap) => {
          let successCount = 0;
          let failedCount = 0;
          let totalSlots = 0;
          const docIds: string[] = [];
          const matchedDocs: Array<{ id: string; data: Record<string, unknown> }> = [];
          for (const d of snap.docs) {
            docIds.push(d.id);
            const data = d.data() as Record<string, unknown>;
            matchedDocs.push({ id: d.id, data });
            const { slots, failed } = slotWeight(data);
            totalSlots += slots;
            if (failed) failedCount += slots;
            else successCount += slots;
          }
          if (totalSlots >= expectedCount) {
            finish({
              docIds,
              matchedDocs,
              timedOut: false,
              outcome: failedCount > 0 ? 'failed' : 'generated',
              failedCount,
              successCount,
            });
          }
        },
        (err) => fail(err)
      );
    } catch (err) {
      fail(err);
    }
  });
}

/**
 * Video runs create the Firestore doc before enqueue. Listen to that doc
 * until `videoStatus` is ready (or failed).
 */
export function waitForVideoGenerationDoc(args: {
  uid: string;
  docId: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}): Promise<{
  timedOut: boolean;
  outcome: GenerationWaitOutcome;
  status: string | null;
  data: Record<string, unknown> | null;
}> {
  const {
    uid,
    docId,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal,
  } = args;

  if (!docId) {
    return Promise.resolve({
      timedOut: false,
      outcome: 'failed',
      status: null,
      data: null,
    });
  }

  return new Promise((resolve, reject) => {
    let unsub: Unsubscribe | null = null;
    let settled = false;

    const finish = (result: {
      timedOut: boolean;
      outcome: GenerationWaitOutcome;
      status: string | null;
      data: Record<string, unknown> | null;
    }) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    const fail = (err: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    };

    const onAbort = () => {
      fail(new DOMException('Aborted', 'AbortError'));
    };

    const cleanup = () => {
      window.clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      unsub?.();
      unsub = null;
    };

    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener('abort', onAbort);

    const timer = window.setTimeout(() => {
      finish({
        timedOut: true,
        outcome: 'timedOut',
        status: null,
        data: null,
      });
    }, timeoutMs);

    try {
      unsub = onSnapshot(
        doc(db, 'users', uid, 'videoGeneration', docId),
        (snap) => {
          if (!snap.exists()) return;
          const data = snap.data() as Record<string, unknown>;
          const status = String(data.videoStatus ?? '').toLowerCase();
          if (status === 'ready') {
            finish({
              timedOut: false,
              outcome: 'generated',
              status,
              data,
            });
          } else if (status === 'failed' || status === 'error') {
            finish({
              timedOut: false,
              outcome: 'failed',
              status,
              data,
            });
          }
        },
        (err) => fail(err)
      );
    } catch (err) {
      fail(err);
    }
  });
}

/** Map wait outcome to the three user-facing generation states. */
export function applyGenerationOutcome(
  outcome: GenerationWaitOutcome,
  handlers: {
    onGenerated: () => void;
    onFailed: () => void;
  }
): void {
  if (outcome === 'generated') handlers.onGenerated();
  else handlers.onFailed();
}
