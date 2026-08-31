'use client';

import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import {
  getNotificationCounts,
  markNotificationsRead as markNotificationsReadApi,
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
  type NotificationCounts,
} from '@/src/service/api/userService';

/**
 * All four counts come from `GET /api/v1/user/get-notification-counts`.
 * The backend uses Admin SDK for global/system and per-user notification
 * sources, so the browser never needs access to backend-owned collections.
 * Counts refresh on mount, focus/visibility, a 30s safety-net interval, and
 * whenever `notificationsReadAt` changes (i.e. after mark-as-read).
 *
 * `notificationsReadAt` (from `users/{uid}`) is the cutoff for "unread"* across both halves; subscribed once and reused by everything.
 *
 * Mark-as-read is optimistic: the bell zeros instantly for the
 * targeted categories; the backend write + user-doc snapshot then
 * land the authoritative value.
 */

const COUNT_CAP = 100;
const POLL_INTERVAL_MS = 30_000;
const EPOCH_MS = 0;

const EMPTY_COUNTS: NotificationCounts = {
  email: 0,
  postSuccess: 0,
  postFailure: 0,
  newReleases: 0,
};

export type NotificationCountsContextValue = {
  loading: boolean;
  error: Error | null;
  counts: NotificationCounts;
  total: number;
  /** Backend caps individual category counts at this value; display as "{cap-1}+". */
  cap: number;
  /** Per-category read cutoff (ms since epoch) from `users/{uid}.notificationsReadAt`. */
  readAt: Record<NotificationCategory, number>;
  /**
   * Optimistic + persistent mark-as-read. The badge clears instantly;
   * the user-doc snapshot then confirms with the server timestamp.
   */
  markAsRead: (category: NotificationCategory | 'all') => Promise<void>;
  /** Force a manual refresh of the API-sourced counts. */
  refresh: () => Promise<void>;
};

const NotificationCountsContext =
  createContext<NotificationCountsContextValue | null>(null);

const EMPTY_VALUE: NotificationCountsContextValue = {
  loading: false,
  error: null,
  counts: EMPTY_COUNTS,
  total: 0,
  cap: COUNT_CAP,
  readAt: {
    email: EPOCH_MS,
    postSuccess: EPOCH_MS,
    postFailure: EPOCH_MS,
    newReleases: EPOCH_MS,
  },
  markAsRead: async () => {
    /* no-op for unauthenticated sessions */
  },
  refresh: async () => {
    /* no-op for unauthenticated sessions */
  },
};

function tsToMillis(v: unknown): number {
  if (v instanceof Timestamp) return v.toMillis();
  if (v && typeof v === 'object') {
    const obj = v as { seconds?: unknown; nanoseconds?: unknown };
    if (typeof obj.seconds === 'number') {
      const nanos = typeof obj.nanoseconds === 'number' ? obj.nanoseconds : 0;
      return obj.seconds * 1000 + Math.floor(nanos / 1e6);
    }
  }
  return EPOCH_MS;
}

export function NotificationCountsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const uid = user?.uid ?? null;

  if (authLoading) {
    return (
      <NotificationCountsContext.Provider
        value={{ ...EMPTY_VALUE, loading: true }}
      >
        {children}
      </NotificationCountsContext.Provider>
    );
  }

  if (!uid) {
    return (
      <NotificationCountsContext.Provider value={EMPTY_VALUE}>
        {children}
      </NotificationCountsContext.Provider>
    );
  }

  return (
    <NotificationCountsScope key={uid} uid={uid}>
      {children}
    </NotificationCountsScope>
  );
}

function NotificationCountsScope({
  uid,
  children,
}: {
  uid: string;
  children: ReactNode;
}) {
  // All 4 counts from the API. Used directly for the global pair
  // (email, newReleases) and as a fallback for the per-user pair when
  // Firestore snapshots are denied.
  const [apiCounts, setApiCounts] = useState<NotificationCounts>(EMPTY_COUNTS);

  const [readAt, setReadAt] = useState<Record<NotificationCategory, number>>(
    () => ({
      email: EPOCH_MS,
      postSuccess: EPOCH_MS,
      postFailure: EPOCH_MS,
      newReleases: EPOCH_MS,
    })
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [optimisticOverrides, setOptimisticOverrides] = useState<
    Partial<NotificationCounts>
  >({});

  const refresh = useCallback(async () => {
    try {
      const res = await getNotificationCounts();
      const data = res?.data;
      if (data?.counts) {
        setApiCounts(data.counts);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
      setOptimisticOverrides({});
    }
  }, []);

  // API polling.
  useEffect(() => {
    void refresh();

    const onFocus = () => {
      void refresh();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    const interval = window.setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(interval);
    };
  }, [refresh]);

  // User-doc snapshot → readAt cutoffs + cross-tab mark-as-read sync.
  useEffect(() => {
    let lastReadAtSignature: string | null = null;
    let isFirstSnapshot = true;

    const unsub = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        const data = snap.data();
        const raw =
          (data?.notificationsReadAt as Record<string, unknown> | undefined) ??
          {};
        const userCreatedAtMs = tsToMillis(data?.createdAt);
        const effectiveReadAt = (
          cat: NotificationCategory,
          value: unknown
        ): number => {
          const readMs = tsToMillis(value);
          if (cat === 'email' || cat === 'newReleases') {
            return Math.max(readMs, userCreatedAtMs);
          }
          return readMs;
        };
        const next: Record<NotificationCategory, number> = {
          email: effectiveReadAt('email', raw.email),
          postSuccess: effectiveReadAt('postSuccess', raw.postSuccess),
          postFailure: effectiveReadAt('postFailure', raw.postFailure),
          newReleases: effectiveReadAt('newReleases', raw.newReleases),
        };
        setReadAt(next);

        const sig = NOTIFICATION_CATEGORIES.map(
          (cat) => `${cat}:${next[cat]}`
        ).join('|');
        if (isFirstSnapshot) {
          isFirstSnapshot = false;
          lastReadAtSignature = sig;
          return;
        }
        if (sig !== lastReadAtSignature) {
          lastReadAtSignature = sig;
          void refresh();
        }
      },
      (err) => {
        console.error('[NotificationCounts] user doc snapshot failed', err);
      }
    );

    return () => unsub();
  }, [uid, refresh]);

  const counts = useMemo<NotificationCounts>(() => {
    const out: NotificationCounts = { ...apiCounts };

    for (const cat of NOTIFICATION_CATEGORIES) {
      const override = optimisticOverrides[cat];
      if (typeof override === 'number') out[cat] = override;
    }
    return out;
  }, [apiCounts, optimisticOverrides]);

  const total = useMemo(
    () =>
      counts.email +
      counts.postSuccess +
      counts.postFailure +
      counts.newReleases,
    [counts]
  );

  const markAsRead = useCallback(
    async (category: NotificationCategory | 'all') => {
      const targets =
        category === 'all'
          ? NOTIFICATION_CATEGORIES
          : ([category] as readonly NotificationCategory[]);
      setOptimisticOverrides((prev) => {
        const next = { ...prev };
        for (const cat of targets) next[cat] = 0;
        return next;
      });
      try {
        await markNotificationsReadApi(category);
        await refresh();
      } catch (err) {
        setOptimisticOverrides((prev) => {
          const next = { ...prev };
          for (const cat of targets) delete next[cat];
          return next;
        });
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [refresh]
  );

  const value = useMemo<NotificationCountsContextValue>(
    () => ({
      loading,
      error,
      counts,
      total,
      cap: COUNT_CAP,
      readAt,
      markAsRead,
      refresh,
    }),
    [loading, error, counts, total, readAt, markAsRead, refresh]
  );

  return (
    <NotificationCountsContext.Provider value={value}>
      {children}
    </NotificationCountsContext.Provider>
  );
}

export function useNotificationCounts() {
  const ctx = useContext(NotificationCountsContext);
  if (!ctx) {
    throw new Error(
      'useNotificationCounts must be used within NotificationCountsProvider'
    );
  }
  return ctx;
}

/**
 * Convert a raw category count into a display label, honoring the
 * server-side cap (e.g. 100 → "99+"). Returns `null` when there is
 * nothing to show so callers can skip rendering the badge entirely.
 */
export function formatNotificationCount(
  count: number,
  cap: number = COUNT_CAP
): string | null {
  if (!Number.isFinite(count) || count <= 0) return null;
  if (count >= cap) return `${cap - 1}+`;
  return String(count);
}

export type FirestoreTimestampLike = {
  _seconds: number;
  _nanoseconds?: number;
};

export function firestoreTimestampToMs(
  ts: FirestoreTimestampLike | undefined | null
): number {
  if (!ts || typeof ts._seconds !== 'number') return 0;
  return ts._seconds * 1000 + Math.floor((ts._nanoseconds ?? 0) / 1e6);
}

/**
 * Snapshot of the category read cutoff when the list first mounted — keeps
 * "New" highlighting visible for the session even after mark-as-read clears
 * the sidebar badge.
 */
export function useNotificationUnreadHighlight(category: NotificationCategory) {
  const { readAt } = useNotificationCounts();
  const cutoffRef = useRef<number | null>(null);
  if (cutoffRef.current === null) {
    cutoffRef.current = readAt[category];
  }

  const isUnread = useCallback(
    (ts: FirestoreTimestampLike | undefined | null) => {
      const ms = firestoreTimestampToMs(ts);
      if (!ms) return false;
      return ms > (cutoffRef.current ?? readAt[category]);
    },
    [readAt, category]
  );

  return { isUnread };
}
