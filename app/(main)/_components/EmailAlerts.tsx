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
    className: 'bg-success text-success ring-[var(--border-success)]',
  },
  security: {
    label: 'Security',
    className: 'bg-danger text-danger ring-[var(--border-danger)]',
  },
  alert: {
    label: 'Alert',
    className: 'bg-warning text-warning ring-[var(--border-warning)]',
  },
  policy: {
    label: 'Policy',
    className: 'bg-info text-info ring-[var(--border-info)]',
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
    className: 'bg-element text-secondary ring-border',
  };
}

export function EmailAlerts() {
  const fmtTimestamp = useTimestampFormatter();
  const { isUnread } = useNotificationUnreadHighlight('email');
  const [notifications, setNotifications] = useState<SystemMessage[]>([]);
  const getData = async () => {
    const response = await getAllNotifications('notification');
    setNotifications(response.data.notifications);
  };
  useEffect(() => {
    getData();
  }, []);
  return (
    <section aria-label="Account and policy messages" className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-section text-default">Messages from SocioGenie</h2>
        <p className="text-xs text-secondary">
          We&apos;ll email you when something important changes.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-default bg-default">
        <ul className="divide-y divide-[var(--border-default)]">
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
                      <span className="text-xs text-tertiary">
                        {fmtTimestamp(message.createdAt)}
                      </span>
                    </div>
                    <h3 className="text-subsection text-default">
                      {message.title}
                    </h3>
                    <p className="text-sm text-secondary">{message.message}</p>
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
