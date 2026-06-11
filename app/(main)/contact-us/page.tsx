'use client';

import { PageLoadingState } from '@/components/shared/PageLoadingState';
import { useAuth } from '@/src/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ContactUsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/sign-in');
      return;
    }
    if (!loading && user) {
      router.replace('/settings/support-legal');
    }
  }, [loading, user, router]);

  if (loading) return <PageLoadingState />;
  return null;
}
