'use client';

import { useEffect, useState } from 'react';
import axiosClient from '@/lib/axios';
import { useUser } from './useUser';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { setUser } = useUser();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await axiosClient.get('/api/v1/user/auth/me');
        setUser(res.data.user);
        setLoading(false);
      } catch {
        // 401 interceptor clears the session cookie and sends the user to
        // /sign-in once — do not also router.push here (redirect loop).
      }
    };

    checkSession();
  }, [setUser]);

  if (loading) return null;

  return <>{children}</>;
}
