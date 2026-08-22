'use client';

import { useState } from 'react';
import { getAllNotifications } from '@/src/service/api/userService';
import { useEffect } from 'react';
import { useTimestampFormatter } from '@/lib/user-timezone';
import {
  type FirestoreTimestampLike,
  useNotificationUnreadHighlight,
} from './NotificationCountsProvider';
import {
  NotificationListItem,
  NotificationNewBadge,
} from './NotificationListItem';

type SystemMessage = {
  id: string;
  title: string;
  message: string;
  createdAt: FirestoreTimestampLike;
  /** Matches admin send-notification options (+ legacy `policy`). */
  category: string;
};

const categoryConfig: Record<string, { label: string; className: string }> = {
  product: {
    label: 'Product',
    className: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  },
  security: {
    label: 'Security',
    className: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
  },
  alert: {
    label: 'Alert',
    className: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  },
  policy: {
    label: 'Policy',
    className: 'bg-sky-500/15 text-sky-300 ring-sky-500/30',
  },
};

function resolveCategory(category: string | undefined) {
  const key = (category ?? '').trim().toLowerCase();
  if (key && categoryConfig[key]) return categoryConfig[key];
  const fallbackLabel = key
    ? key.charAt(0).toUpperCase() + key.slice(1)
    : 'General';
  return {
    label: fallbackLabel,
    className: 'bg-muted text-muted-foreground ring-border',
  };
}


export function EmailAlerts() {
  const fmtTimestamp = useTimestampFormatter();
  const { isUnread } = useNotificationUnreadHighlight('email');
  const [notifications, setNotifications] = useState<SystemMessage[]>([]);
  const getData = async () => {
    const response = await getAllNotifications('notification');
    setNotifications(response.data.notifications);
  }
  useEffect(() => {
    getData();
  }, []);
  return (
    <section aria-label="Account and policy messages" className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-zinc-900">
          Messages from SocioGenie
        </h2>
        <p className="text-xs text-zinc-500">
          We&apos;ll email you when something important changes.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <ul className="divide-y divide-zinc-100">
          {notifications.map((message) => {
            const isNew = isUnread(message.createdAt);
            const category = resolveCategory(message.category);
            return (
            <NotificationListItem key={message.id} isNew={isNew}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {isNew ? <NotificationNewBadge /> : null}
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${category.className}`}
                    >
                      {category.label}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {fmtTimestamp(message.createdAt)}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-900">
                    {message.title}
                  </h3>
                  <p className="text-sm text-zinc-600">{message.message}</p>
                </div>
              </div>
            </NotificationListItem>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
