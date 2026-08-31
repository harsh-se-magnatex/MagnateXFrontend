'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export function NotificationNewBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-primary-purple px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
      New
    </span>
  );
}

export function NotificationListItem({
  isNew,
  children,
}: {
  isNew: boolean;
  children: ReactNode;
}) {
  return (
    <li
      className={cn(
        'border-l-4 p-4 sm:p-5 transition-expo',
        isNew ? 'border-l-indigo-400 pl-3 sm:pl-4' : 'border-l-transparent'
      )}
    >
      {children}
    </li>
  );
}
