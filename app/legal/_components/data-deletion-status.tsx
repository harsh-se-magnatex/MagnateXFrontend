'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';

type DataDeletionStatusProps = {
  platform: 'Facebook' | 'Instagram';
};

function DataDeletionStatusContent({ platform }: DataDeletionStatusProps) {
  const searchParams = useSearchParams();
  const confirmationCode =
    searchParams.get('confirmation_code')?.trim() ?? '';

  if (!confirmationCode) {
    return null;
  }

  const isFacebook = platform === 'Facebook';

  return (
    <div
      className={
        isFacebook
          ? 'overflow-hidden rounded-[1.75rem] border border-blue-200/80 bg-white/95 shadow-[0_24px_64px_-32px_rgba(37,99,235,0.18)]'
          : 'overflow-hidden rounded-[1.75rem] border border-pink-200/80 bg-white/95 shadow-[0_24px_64px_-32px_rgba(219,39,119,0.18)]'
      }
    >
      <div className="flex gap-4 p-6 sm:p-8">
        <div
          className={
            isFacebook
              ? 'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600'
              : 'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-pink-100 bg-pink-50 text-pink-600'
          }
        >
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <h2 className="font-[family-name:var(--font-sora)] text-lg font-semibold text-slate-900">
            Deletion request confirmed
          </h2>
          <p className="mt-2 text-base leading-relaxed text-slate-600">
            We received your {platform} data deletion request. Data linked to
            your {platform} account has been removed from SocioGenie. Your
            confirmation code is{' '}
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-sm font-medium text-slate-800">
              {confirmationCode}
            </span>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

export function DataDeletionStatus({ platform }: DataDeletionStatusProps) {
  return (
    <Suspense fallback={null}>
      <DataDeletionStatusContent platform={platform} />
    </Suspense>
  );
}
