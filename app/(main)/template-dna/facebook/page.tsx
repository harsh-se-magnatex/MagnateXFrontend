'use client';

import { useEffect } from 'react';
import { useAuth } from '@/src/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { TemplateDNAUpload } from '../TemplateDNAUpload';
import { Facebook } from 'lucide-react';

export default function TemplateDNAFacebookPage() {
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-blue-400 text-white shadow-sm">
             <Facebook className="h-5 w-5" />
          </div>
          Facebook DNA
        </h1>
        <p className="mt-3 max-w-2xl text-base text-slate-500 leading-relaxed">
          Upload a Facebook post image to extract and save its Template DNA
          (colors, layout, typography, mood). It will be stored under your
          Facebook profile.
        </p>
      </header>
      <TemplateDNAUpload platform="facebook" />
    </div>
  );
}
