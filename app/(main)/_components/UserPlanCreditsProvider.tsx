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
  credits: number;
  creditsExpiresAt: FirestoreTimestamp | null;
  activePlan: string;
  planExpiresAt: FirestoreTimestamp | null;
  planStartedAt: FirestoreTimestamp | null;
  subscription?: string;
  selected?: {
    facebook: boolean;
    instagram: boolean;
    linkedin: boolean;
  };
};

type UserPlanCreditsContextValue = {
  loading: boolean;
  error: Error | null;
  billing: UserPlanCredits | null;
};

type FirestoreTimestamp = {
  seconds: number;
  nanoseconds: number;
};

export function formatTimestamp(ts: FirestoreTimestamp | null): string {
  if (!ts) return '—';
  const date = new Date(ts.seconds * 1000 + ts.nanoseconds / 1e6);
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

const UserPlanCreditsContext =
  createContext<UserPlanCreditsContextValue | null>(null);

function parseBilling(
  data: Record<string, unknown> | undefined
): UserPlanCredits | null {
  if (!data) return null;
  return {
    credits: typeof data.credits === 'number' ? data.credits : 0,
    creditsExpiresAt: (data.creditsExpiresAt as FirestoreTimestamp | null | undefined) ?? null,
    activePlan:
      typeof data.activePlan === 'string' ? data.activePlan : 'non-subscribed',
    planExpiresAt: (data.planExpiresAt as FirestoreTimestamp | null | undefined) ?? null,
    planStartedAt: (data.planStartedAt as FirestoreTimestamp | null | undefined) ?? null,
    subscription:
      typeof data.subscription === 'string' ? data.subscription : undefined,
    selected:
      typeof data.selected === 'object' ? data.selected : {facebook: false, instagram: false, linkedin: false} as {facebook: boolean, instagram: boolean, linkedin: boolean} | undefined,
    } as unknown as UserPlanCredits;
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
