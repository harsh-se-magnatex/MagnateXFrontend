'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/template-dna');
  }, [router]);
  return (
    <div className="flex items-center justify-center py-12 text-sm text-zinc-500">
      Redirecting to Business Profile...
    </div>
  );
}
