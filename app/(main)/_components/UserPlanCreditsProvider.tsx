'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';

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
    Need_Approval?: boolean;
    preferredTime?: string;
    /**
     * IANA timezone name (e.g. `Asia/Kolkata`, `America/New_York`). Drives
     * how timestamps render throughout the app — see `lib/user-timezone.tsx`.
     */
    TimeZone?: string;
    useAnalyticsOptimalPostingTime?: boolean;
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

function timestampMillis(ts: FirestoreTimestamp | null | undefined): number | null {
  if (!ts || typeof ts.seconds !== 'number') return null;
  return ts.seconds * 1000 + (ts.nanoseconds ?? 0) / 1e6;
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
  const planCredits = numField(data.planCredits);
  const topupCredits = numField(data.topupCredits);
  const hasNumericPoolField =
    typeof data.planCredits === 'number' || typeof data.topupCredits === 'number';
  const hasPoolExpiry =
    data.planCreditsExpiresAt != null || data.topupCreditsExpiresAt != null;
  const usesSplitCreditPools =
    hasNumericPoolField &&
    (planCredits + topupCredits > 0 || hasPoolExpiry);
  const topupExpiresMs = timestampMillis(
    data.topupCreditsExpiresAt as FirestoreTimestamp | null
  );
  const planExpiresMs = timestampMillis(
    data.planCreditsExpiresAt as FirestoreTimestamp | null
  );
  const now = Date.now();
  const isTopupCreditsExpired =
    topupCredits > 0 ? topupExpiresMs == null || topupExpiresMs < now : true;
  const isPlanCreditsExpired =
    planExpiresMs == null || planExpiresMs < now;
  const credits =
    numField(isPlanCreditsExpired ? 0 : planCredits) +
    numField(isTopupCreditsExpired ? 0 : topupCredits);

  return {
    usesSplitCreditPools,
    isTopupCreditsExpired,
    credits,
    planCredits,
    planCreditsExpiresAt:
      (data.planCreditsExpiresAt as FirestoreTimestamp | null | undefined) ?? null,
    topupCredits: isTopupCreditsExpired ? 0 : topupCredits,
    topupCreditsExpiresAt:
      (data.topupCreditsExpiresAt as FirestoreTimestamp | null | undefined) ?? null,
    activePlan:
      typeof data.activePlan === 'string' ? data.activePlan : 'non-subscribed',
    mode:
      data.mode === 'auto' || data.mode === 'manual' ? data.mode : null,
    isAccountFrozen: data.isAccountFrozen === true,
    planExpiresAt: (data.planExpiresAt as FirestoreTimestamp | null | undefined) ?? null,
    planStartedAt: (data.planStartedAt as FirestoreTimestamp | null | undefined) ?? null,
    preferences:
      (data.preferences as UserPlanCredits['preferences'] | null | undefined) ??
      { Need_Approval: false },
    subscription:
      typeof data.subscription === 'string' ? data.subscription : undefined,
    selected: parseSelectedPlatforms(data.selected),
    selectedPlatformsLocked: data.selectedPlatformsLocked === true,
    campaignSeedPendingPlatformConfirm:
      data.campaignSeedPendingPlatformConfirm === true,
    pendingSelected:
      data.pendingSelected == null
        ? null
        : parseSelectedPlatforms(data.pendingSelected),
    pendingSelectedForPlan:
      typeof data.pendingSelectedForPlan === 'string'
        ? data.pendingSelectedForPlan
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
