'use client';

import Link from 'next/link';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActivityScheduleState } from '@/lib/scheduled-post-status';
import type { ReactNode } from 'react';

export type { ActivityScheduleState };

export type PlatformId = 'facebook' | 'instagram' | 'linkedin';

export const PLATFORM_META: Record<
  PlatformId,
  { label: string; color: string; icon: ReactNode }
> = {
  instagram: {
    label: 'Instagram',
    color: 'bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]',
    icon: (
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    ),
  },
  facebook: {
    label: 'Facebook',
    color: 'bg-[#1877F2]',
    icon: (
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    ),
  },
  linkedin: {
    label: 'LinkedIn',
    color: 'bg-[#0A66C2]',
    icon: (
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    ),
  },
};

export function formatPlatformLabel(platform: string) {
  if (!platform) return 'Account';
  const key = platform.toLowerCase() as PlatformId;
  return (
    PLATFORM_META[key]?.label ??
    platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase()
  );
}

function normalizePlatformId(platform: string): PlatformId | null {
  const key = platform.trim().toLowerCase();
  if (key === 'facebook' || key === 'instagram' || key === 'linkedin') {
    return key;
  }
  return null;
}

export function PlatformIcon({
  platform,
  className,
}: {
  platform: string;
  className?: string;
}) {
  const id = normalizePlatformId(platform);
  const meta = id ? PLATFORM_META[id] : null;
  return (
    <div
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white',
        meta?.color ?? 'bg-element-foreground/70',
        className
      )}
      aria-hidden
    >
      {meta?.icon ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
          {meta.icon}
        </svg>
      ) : (
        <span className="text-xs font-bold uppercase">
          {platform.slice(0, 1) || '?'}
        </span>
      )}
    </div>
  );
}

export function ActivityStatusIcon({
  state,
}: {
  state: ActivityScheduleState | null;
}) {
  if (state === 'posted') {
    return (
      <CheckCircle2
        className="h-5 w-5 shrink-0 text-success dark:text-success"
        aria-label="Posted"
      />
    );
  }
  if (state === 'failed') {
    return (
      <AlertCircle
        className="h-5 w-5 shrink-0 text-danger dark:text-danger"
        aria-label="Failed"
      />
    );
  }
  if (state === 'approved') {
    return (
      <Calendar
        className="h-5 w-5 shrink-0 text-success dark:text-success"
        aria-label="Scheduled"
      />
    );
  }
  if (state === 'pending') {
    return (
      <Clock
        className="h-5 w-5 shrink-0 text-warning dark:text-warning"
        aria-label="Pending"
      />
    );
  }
  return null;
}

export function HomeStatBox({
  label,
  value,
  sublabel,
  icon: Icon,
  href,
}: {
  label: string;
  value: ReactNode;
  sublabel?: string;
  icon: LucideIcon;
  href?: string;
}) {
  const className = cn(
    'rounded-2xl border border-default bg-default p-4 text-left transition-expo h-full',
    href
      ? 'hover:border-primary/40 hover:bg-hover cursor-pointer'
      : 'cursor-default'
  );
  const content = (
    <>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-link">
        <Icon className="size-4 shrink-0" aria-hidden />
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums leading-none text-default">
        {value}
      </p>
      <p className="mt-2 text-xs font-semibold text-default">{label}</p>
      {sublabel ? (
        <p className="mt-0.5 text-[11px] leading-snug text-secondary">
          {sublabel}
        </p>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
