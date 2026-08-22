'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { reconcilePlanApi } from '@/src/service/api/userService';

export type UserPlanCredits = {
  planCredits: number;
  planCreditsExpiresAt: FirestoreTimestamp | null;
  topupCredits: number;
  credits: number;
  topupCreditsExpiresAt: FirestoreTimestamp | null;
  activePlan: string;
  /**
   * Auto vs Manual half of the plan matrix (3 tiers x 2 modes). Mirrored from
   * `plans/{id}.mode` to `users/{uid}.mode` at payment fulfillment time;
   * `null` while the user is `non-subscribed`. Feature gates branch on this.
   */
  mode: 'auto' | 'manual' | null;
  isAccountFrozen: boolean;
  planExpiresAt: FirestoreTimestamp | null;
  planStartedAt: FirestoreTimestamp | null;
  isTopupCreditsExpired: boolean;
  preferences: {
    approvalMode?: 'manual' | 'auto';
    preferredTime?: string;
    /**
     * IANA timezone name (e.g. `Asia/Kolkata`, `America/New_York`). Drives
     * how timestamps render throughout the app — see `lib/user-timezone.tsx`.
     */
    timeZone?: string;
    analyticsOptimalPosting?: boolean;
    optimalFacebookTime?: string;
    optimalInstagramTime?: string;
    optimalLinkedinTime?: string;
  };
  subscription?: string;
  selected?: {
    facebook: boolean;
    instagram: boolean;
    linkedin: boolean;
  };
  connected?: {
    facebook: boolean;
    instagram: boolean;
    linkedin: boolean;
  };
  aiPlanSelected?: {
    facebook: boolean;
    instagram: boolean;
    linkedin: boolean;
  };
  /** After first platform save in a billing period; cleared on cap-change renew. */
  selectedPlatformsLocked?: boolean;
  campaignSeedPendingPlatformConfirm?: boolean;
  /** Platforms chosen for the next billing cycle (applied on renew). */
  pendingSelected?: {
    facebook: boolean;
    instagram: boolean;
    linkedin: boolean;
  } | null;
  pendingSelectedForPlan?: string | null;
  usesSplitCreditPools: boolean;
};

export type UserPlanCreditsContextValue = {
  loading: boolean;
  error: Error | null;
  billing: UserPlanCredits | null;
};

type FirestoreTimestamp = {
  seconds: number;
  nanoseconds: number;
};

function normalizeTimestamp(value: unknown): FirestoreTimestamp | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown> & { toDate?: () => Date };
  if (typeof row.toDate === 'function') {
    try {
      const date = row.toDate();
      if (date instanceof Date && !Number.isNaN(date.getTime())) {
        const millis = date.getTime();
        return {
          seconds: Math.floor(millis / 1000),
          nanoseconds: (millis % 1000) * 1e6,
        };
      }
    } catch {
      return null;
    }
  }
  const seconds =
    typeof row.seconds === 'number'
      ? row.seconds
      : typeof row._seconds === 'number'
        ? row._seconds
        : null;
  if (seconds == null || !Number.isFinite(seconds)) return null;
  const nanoseconds =
    typeof row.nanoseconds === 'number'
      ? row.nanoseconds
      : typeof row._nanoseconds === 'number'
        ? row._nanoseconds
        : 0;
  return { seconds, nanoseconds };
}

function timestampMillis(value: unknown): number | null {
  const ts = normalizeTimestamp(value);
  if (!ts) return null;
  return ts.seconds * 1000 + ts.nanoseconds / 1e6;
}

/** 24-hour display helper (UTC). Prefer `useTimestampFormatter` in UI. */
export function formatTimestamp(ts: FirestoreTimestamp | null): string {
  if (!ts) return '—';
  const date = new Date(ts.seconds * 1000 + ts.nanoseconds / 1e6);
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
    timeZone: 'UTC',
  });
}

export const UserPlanCreditsContext =
  createContext<UserPlanCreditsContextValue | null>(null);

function numField(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function parseSelectedPlatforms(
  raw: unknown
): NonNullable<UserPlanCredits['selected']> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { facebook: false, instagram: false, linkedin: false };
  }
  const s = raw as Record<string, unknown>;
  return {
    facebook: s.facebook === true,
    instagram: s.instagram === true,
    linkedin: s.linkedin === true,
  };
}

function parseBilling(
  data: Record<string, unknown> | undefined
): UserPlanCredits | null {
  if (!data) return null;
  const plan = (data.plan && typeof data.plan === 'object' ? data.plan : {}) as Record<string, unknown>;
  const creditsData = (data.credits && typeof data.credits === 'object' ? data.credits : {}) as Record<string, unknown>;
  const account = (data.account && typeof data.account === 'object' ? data.account : {}) as Record<string, unknown>;
  const aiPlan = (data.aiPlan && typeof data.aiPlan === 'object' ? data.aiPlan : {}) as Record<string, unknown>;
  const rawPreferences = (data.preferences && typeof data.preferences === 'object'
    ? data.preferences
    : {}) as Record<string, unknown>;
  const socialSummary = (data.socialSummary && typeof data.socialSummary === 'object' ? data.socialSummary : {}) as Record<string, { connected?: unknown }>;
  const planCredits = numField(creditsData.planBalance);
  const topupCredits = numField(creditsData.topupBalance);
  const usesSplitCreditPools = true;
  const normalizedPlanExpiresAt = normalizeTimestamp(
    plan.expiresAt ?? creditsData.planExpiresAt ?? data.planExpiresAt
  );
  const normalizedPlanStartedAt = normalizeTimestamp(
    plan.startedAt ?? data.planStartedAt
  );
  const normalizedPlanCreditsExpiresAt = normalizeTimestamp(
    creditsData.planExpiresAt ?? plan.expiresAt ?? data.planExpiresAt
  );
  const normalizedTopupExpiresAt = normalizeTimestamp(creditsData.topupExpiresAt);
  const topupExpiresMs = timestampMillis(normalizedTopupExpiresAt);
  const planExpiresMs = timestampMillis(normalizedPlanCreditsExpiresAt);
  const now = Date.now();
  const isTopupCreditsExpired =
    topupCredits > 0 ? topupExpiresMs == null || topupExpiresMs < now : true;
  const isPlanCreditsExpired =
    planExpiresMs == null || planExpiresMs < now;
  const credits =
    numField(isPlanCreditsExpired ? 0 : planCredits) +
    numField(isTopupCreditsExpired ? 0 : topupCredits);
  const paidPlanActive =
    typeof plan.id === 'string' &&
    plan.id !== '' &&
    plan.id !== 'non-subscribed' &&
    plan.status === 'active' &&
    account.frozen !== true;
  const connected = parseSelectedPlatforms(Object.fromEntries(
    ['facebook', 'instagram', 'linkedin'].map((platform) => [
      platform,
      socialSummary[platform]?.connected === true,
    ])
  ));

  return {
    usesSplitCreditPools,
    isTopupCreditsExpired,
    credits,
    planCredits,
    planCreditsExpiresAt: normalizedPlanCreditsExpiresAt,
    topupCredits: isTopupCreditsExpired ? 0 : topupCredits,
    topupCreditsExpiresAt: normalizedTopupExpiresAt,
    activePlan:
      typeof plan.id === 'string' ? plan.id : 'non-subscribed',
    mode:
      plan.mode === 'auto' || plan.mode === 'manual' ? plan.mode : null,
    isAccountFrozen: account.frozen === true,
    planExpiresAt: normalizedPlanExpiresAt,
    planStartedAt: normalizedPlanStartedAt,
    preferences: {
      approvalMode:
        rawPreferences.approvalMode === 'manual' ? 'manual' : 'auto',
      preferredTime:
        typeof rawPreferences.preferredTime === 'string'
          ? rawPreferences.preferredTime
          : undefined,
      timeZone:
        typeof rawPreferences.timeZone === 'string'
          ? rawPreferences.timeZone
          : undefined,
      analyticsOptimalPosting:
        rawPreferences.analyticsOptimalPosting === true,
      optimalFacebookTime: rawPreferences.optimalFacebookTime as string | undefined,
      optimalInstagramTime: rawPreferences.optimalInstagramTime as string | undefined,
      optimalLinkedinTime: rawPreferences.optimalLinkedinTime as string | undefined,
    },
    subscription:
      typeof data.subscription === 'string' ? data.subscription : undefined,
    // Every active paid plan unlocks all platforms for manual generation.
    selected: paidPlanActive
      ? { facebook: true, instagram: true, linkedin: true }
      : { facebook: false, instagram: false, linkedin: false },
    connected,
    aiPlanSelected: parseSelectedPlatforms(
      Array.isArray(aiPlan.selectedPlatforms)
        ? Object.fromEntries((aiPlan.selectedPlatforms as string[]).map((platform) => [platform, true]))
        : null
    ),
    selectedPlatformsLocked: aiPlan.lockedAt != null,
    campaignSeedPendingPlatformConfirm: aiPlan.status === 'awaiting_selection',
    pendingSelected: aiPlan.nextCycle && typeof aiPlan.nextCycle === 'object'
      ? parseSelectedPlatforms(Object.fromEntries(
          (((aiPlan.nextCycle as Record<string, unknown>).selectedPlatforms as string[] | undefined) ?? [])
            .map((platform) => [platform, true])
        ))
      : null,
    pendingSelectedForPlan:
      aiPlan.nextCycle && typeof aiPlan.nextCycle === 'object' && typeof (aiPlan.nextCycle as Record<string, unknown>).planId === 'string'
        ? String((aiPlan.nextCycle as Record<string, unknown>).planId)
        : null,
  };
}

export function UserPlanCreditsProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [billing, setBilling] = useState<UserPlanCredits | null>(null);
  const [firestoreReady, setFirestoreReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user?.uid) {
      setBilling(null);
      setFirestoreReady(false);
      setError(null);
      return;
    }

    setFirestoreReady(false);
    setError(null);

    const ref = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        setFirestoreReady(true);
        if (!snap.exists()) {
          setBilling(null);
          return;
        }
        setBilling(parseBilling(snap.data() as Record<string, unknown>));
      },
      (err) => {
        setFirestoreReady(true);
        setError(err);
        setBilling(null);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, authLoading]);

  // Backend-only write: clear expired plan fields if the expire webhook
  // was missed. Snapshot above picks up the result. Deduped per uid.
  const reconciledUidRef = useRef<string | null>(null);
  useEffect(() => {
    if (authLoading || !user?.uid) return;
    if (reconciledUidRef.current === user.uid) return;
    reconciledUidRef.current = user.uid;
    void reconcilePlanApi().catch(() => {
      // Non-fatal — /auth/me and checkCredits also run the same guard.
      reconciledUidRef.current = null;
    });
  }, [user?.uid, authLoading]);

  const loading =
    authLoading || (!!user?.uid && !firestoreReady && error === null);

  const value = useMemo<UserPlanCreditsContextValue>(
    () => ({ loading, error, billing }),
    [loading, error, billing]
  );

  return (
    <UserPlanCreditsContext.Provider value={value}>
      {children}
    </UserPlanCreditsContext.Provider>
  );
}

export function useUserPlanCredits() {
  const ctx = useContext(UserPlanCreditsContext);
  if (!ctx) {
    throw new Error(
      'useUserPlanCredits must be used within UserPlanCreditsProvider'
    );
  }
  return ctx;
}
