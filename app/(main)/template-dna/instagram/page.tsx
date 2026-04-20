'use client';

import { useEffect } from 'react';
import { useAuth } from '@/src/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { TemplateDNAUpload } from '../TemplateDNAUpload';
import { Hash } from 'lucide-react';

export default function TemplateDNAInstagramPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/sign-in');
  }, [loading, user, router]);

  if (loading || !user) return null;

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500 pb-20">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lineaar-to-tr from-pink-500 to-amber-500 text-white shadow-sm">
             <Hash className="h-5 w-5" />
          </div>
          Instagram DNA
        </h1>
        <p className="mt-3 max-w-2xl text-base text-slate-500 leading-relaxed">
          Upload an Instagram post image to extract and save its Template DNA
          (colors, layout, typography, mood). It will be stored under your
          Instagram profile.
        </p>
      </header>
      <TemplateDNAUpload platform="instagram" />
    </div>
  );
}
