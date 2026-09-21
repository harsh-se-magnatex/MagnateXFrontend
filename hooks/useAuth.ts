'use client';

import { useCallback, useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { onIdTokenChanged, User } from 'firebase/auth';

const authMeFetchInit: RequestInit = {
  credentials: 'include',
  cache: 'no-store',
};

async function loadAccountNameForSession(): Promise<string | null> {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api/v1/user/auth/me`, authMeFetchInit);
    if (!res.ok) return null;
    const data = (await res.json()) as { account?: { name?: string | null } };
    const n = data?.account?.name;
    return typeof n === 'string' && n.trim() ? n.trim() : null;
  } catch {
    return null;
  }
}

async function refreshServerSession(firebaseUser: User): Promise<void> {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, '');
  if (!base) return;
  try {
    const idToken = await firebaseUser.getIdToken();
    await fetch(`${base}/api/v1/user/auth/refresh-session`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
  } catch {
    // A protected API request will surface a real authentication failure.
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [accountName, setAccountName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAccountName = useCallback(
    async (fallbackIfRequestFails?: string) => {
      const trimmedFallback =
        typeof fallbackIfRequestFails === 'string' && fallbackIfRequestFails.trim()
          ? fallbackIfRequestFails.trim()
          : null;
      const name = await loadAccountNameForSession();
      setAccountName(name ?? trimmedFallback ?? null);
    },
    []
  );

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await refreshServerSession(firebaseUser);
        setAccountName(await loadAccountNameForSession());
      } else {
        setAccountName(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, loading, accountName, refreshAccountName };
}
