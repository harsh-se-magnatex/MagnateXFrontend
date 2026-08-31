'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/brand-dna');
  }, [router]);
  return (
    <div className="flex items-center justify-center py-12 text-sm text-secondary">
      Redirecting to Business Profile...
    </div>
  );
}
