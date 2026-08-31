'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';

type DataDeletionStatusProps = {
  platform: 'Facebook' | 'Instagram';
};

function DataDeletionStatusContent({ platform }: DataDeletionStatusProps) {
  const searchParams = useSearchParams();
  const confirmationCode = searchParams.get('confirmation_code')?.trim() ?? '';

  if (!confirmationCode) {
    return null;
  }

  const isFacebook = platform === 'Facebook';

  return (
    <div
      className={
        isFacebook
          ? 'overflow-hidden rounded-[1.75rem] border border-info bg-default shadow-[0_24px_64px_-32px_rgba(37,99,235,0.18)]'
          : 'overflow-hidden rounded-[1.75rem] border border-preview bg-default shadow-[0_24px_64px_-32px_rgba(219,39,119,0.18)]'
      }
    >
      <div className="flex gap-4 p-6 sm:p-8">
        <div
          className={
            isFacebook
              ? 'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-info bg-info text-info'
              : 'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-preview bg-preview text-preview'
          }
        >
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-section text-default font-[family-name:var(--font-sora)]">
            Deletion request confirmed
          </h2>
          <p className="mt-2 text-base leading-relaxed text-secondary">
            We received your {platform} data deletion request. Data linked to
            your {platform} account has been removed from SocioGenie. Your
            confirmation code is{' '}
            <span className="rounded-md border border-default bg-element px-2 py-0.5 font-mono text-sm font-medium text-default">
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
