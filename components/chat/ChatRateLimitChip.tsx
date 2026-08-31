'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';
import type { AssistantUsage } from '@/src/service/api/assistant.service';

interface ChatRateLimitChipProps {
  usage: AssistantUsage | null;
}

function formatReset(diffMs: number): string {
  if (diffMs <= 0) return 'now';
  const totalSeconds = Math.floor(diffMs / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remMin = minutes - hours * 60;
  if (remMin === 0) return `${hours}h`;
  return `${hours}h ${remMin}m`;
}

export function ChatRateLimitChip({ usage }: ChatRateLimitChipProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!usage) return;
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, [usage]);

  if (!usage) return null;
  // Paid users get a much higher cap that's enforced server-side only; we
  // intentionally don't show the count in the UI so it doesn't feel like a
  // small allowance. Only show the chip when the cap actually matters
  // (free tier, or paid users who've somehow run out — which shouldn't
  // happen in practice but we handle it just in case).
  const isPaid = usage.tier === 'paid';
  const remaining = Math.max(0, usage.cap - usage.used);
  const atCap = remaining <= 0;

  if (isPaid && !atCap) return null;

  const resetIn = formatReset(usage.resetsAt - now);

  return (
    <div
      className={cn(
        'rounded-full px-2 py-0.5 text-[11px] font-medium leading-none',
        atCap
          ? 'bg-destructive/10 text-destructive'
          : 'bg-element text-secondary'
      )}
      title="Resets daily at midnight"
    >
      {atCap
        ? `Limit reached · resets in ${resetIn}`
        : `${remaining} of ${usage.cap} messages left · resets in ${resetIn}`}
    </div>
  );
}
