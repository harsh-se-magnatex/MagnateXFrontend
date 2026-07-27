'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSafeAppReturnTo } from '@/lib/safeAppReturnTo';

/**
 * When the browser already has a valid session, leave /sign-in and /sign-up.
 * Verifies via `/auth/me` (not cookie presence alone) to avoid stale-session loops.
 */
export function RedirectIfAuthenticated({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const base = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, '');

    (async () => {
      if (!base) {
        if (!cancelled) setReady(true);
        return;
      }
      try {
        const res = await fetch(`${base}/api/v1/user/auth/me`, {
          credentials: 'include',
          cache: 'no-store',
        });
        if (cancelled) return;
        if (res.ok) {
          const returnTo = getSafeAppReturnTo(
            new URLSearchParams(window.location.search).get('returnTo')
          );
          router.replace(returnTo && !returnTo.startsWith('/sign-in') ? returnTo : '/home');
          return;
        }
      } catch {
        // stay on auth page
      }
      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) return null;
  return <>{children}</>;
}
