'use client';

import { AlertTriangle } from 'lucide-react';
import type { FirestoreTimestamp, SyncStatus } from '../types';

type Props = {
  platform: 'Facebook' | 'Instagram' | 'LinkedIn';
  status?: SyncStatus | null;
  error?: string | null;
  lastSyncAt?: FirestoreTimestamp | Date | null;
};

function toMs(ts: FirestoreTimestamp | Date | null | undefined): number | null {
  if (!ts) return null;
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === 'object' && '_seconds' in ts) {
    return ts._seconds * 1000 + (ts._nanoseconds ?? 0) / 1e6;
  }
  return null;
}

function formatRelative(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'moments ago';
  const minutes = Math.round(diff / 60_000);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/**
 * Yellow banner shown at the top of a platform tab when the latest background
 * sync failed. Renders nothing when status is missing or `'ok'`.
 */
export function SyncErrorBanner({ platform, status, error, lastSyncAt }: Props) {
  if (status !== 'error') return null;

  const ms = toMs(lastSyncAt);
  const when = ms ? formatRelative(ms) : null;
  const message =
    typeof error === 'string' && error.trim().length > 0
      ? error.trim()
      : `We couldn’t refresh your ${platform} analytics on the last attempt.`;

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm"
    >
      <AlertTriangle
        className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
        aria-hidden
      />
      <div className="space-y-1">
        <p className="font-medium">
          {platform} analytics didn’t refresh
          {when ? <span className="font-normal"> · last tried {when}</span> : null}
        </p>
        <p className="font-mono text-xs leading-relaxed text-amber-800 break-all">
          {message}
        </p>
      </div>
    </div>
  );
}
