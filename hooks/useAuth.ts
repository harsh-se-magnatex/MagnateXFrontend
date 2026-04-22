'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { onIdTokenChanged, User } from 'firebase/auth';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [accountName, setAccountName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const base = process.env.NEXT_PUBLIC_BACKEND_URL;
        if (!base) {
          setAccountName(null);
        } else {
          try {
            // Use fetch so a missing session cookie does not trigger the axios 401 redirect.
            const res = await fetch(`${base}/api/v1/user/auth/me`, {
              credentials: 'include',
            });
            if (res.ok) {
              const data = (await res.json()) as {
                account?: { name?: string | null };
              };
              const n = data?.account?.name;
              setAccountName(
                typeof n === 'string' && n.trim() ? n.trim() : null
              );
            } else {
              setAccountName(null);
            }
          } catch {
            setAccountName(null);
          }
        }
      } else {
        setAccountName(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, loading, accountName };
}
