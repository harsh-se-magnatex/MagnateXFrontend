'use client';

import { useEffect, useState } from 'react';

const authMeFetchInit: RequestInit = {
  credentials: 'include',
  cache: 'no-store',
};

let sharedPromise: Promise<boolean> | null = null;
let sharedResult: boolean | null = null;
let sharedAt = 0;
const SHARED_TTL_MS = 10_000;

async function fetchHasServerSession(): Promise<boolean> {
  const now = Date.now();
  if (sharedResult !== null && now - sharedAt < SHARED_TTL_MS) {
    return sharedResult;
  }
  if (sharedPromise) return sharedPromise;

  const base = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, '');
  if (!base) {
    sharedResult = false;
    sharedAt = now;
    return false;
  }

  sharedPromise = (async () => {
    try {
      const res = await fetch(`${base}/api/v1/user/auth/me`, authMeFetchInit);
      return res.ok;
    } catch {
      return false;
    }
  })();

  try {
    const ok = await sharedPromise;
    sharedResult = ok;
    sharedAt = Date.now();
    return ok;
  } finally {
    sharedPromise = null;
  }
}

/**
 * True when the httpOnly session cookie is valid (`/auth/me` succeeds).
 * Uses fetch (not axios) so a 401 never triggers the global sign-in redirect.
 * `null` while the check is in flight.
 */
export function useServerSession(): boolean | null {
  const [hasSession, setHasSession] = useState<boolean | null>(sharedResult);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await fetchHasServerSession();
      if (!cancelled) setHasSession(ok);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return hasSession;
}
