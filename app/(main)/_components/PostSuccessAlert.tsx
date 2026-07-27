'use client';

import { getSuccessNotifications } from '@/features/user/api';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTimestampFormatter } from '@/lib/user-timezone';
import {
  type FirestoreTimestampLike,
  useNotificationUnreadHighlight,
} from './NotificationCountsProvider';
import {
  NotificationListItem,
  NotificationNewBadge,
} from './NotificationListItem';

type PostSuccessAlert = {
  postId: string;
  message: string;
  postedAt: FirestoreTimestampLike;
  platform: string;
  createdAt?: FirestoreTimestampLike;
};

/**
 * The backend bakes a 12-hour locale date into `notification.message`
 * (`...posted on linkedin on Jun 3, 2026, 5:30 PM`). Strip that trailing
 * "on <date>" portion so we can re-append our own 24-hour, timezone-aware
 * label. Falls back to the original text if the pattern doesn't match.
 */
function stripBakedDate(message: string): string {
  return message.replace(/\s+on\s+[A-Za-z]{3,9}\s+\d{1,2},\s+\d{4},\s+\d{1,2}:\d{2}\s*(?:AM|PM)\s*$/i, '').trim();
}

export function PostSuccessAlerts() {
  const fmtTimestamp = useTimestampFormatter();
  const { isUnread } = useNotificationUnreadHighlight('postSuccess');
  const [successNotifications, setSuccessNotifications] = useState<PostSuccessAlert[]>([]);
  const getData = async () => {
    const response = await getSuccessNotifications();
    setSuccessNotifications(response.data.successNotifications);
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

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <ul className="divide-y divide-zinc-100">
          {successNotifications.map((notification) => {
            const isNew = isUnread(
              notification.createdAt ?? notification.postedAt
            );
            return (
            <NotificationListItem
              key={notification.postId + notification.postedAt._seconds}
              isNew={isNew}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {isNew ? <NotificationNewBadge /> : null}
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 bg-blue-50 text-blue-700 ring-blue-100">
                      {notification.platform}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {fmtTimestamp(notification.postedAt, { style: 'datetime-short' })}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-900">
                    {stripBakedDate(notification.message.split(' on ')[0])} on{' '}
                    {fmtTimestamp(notification.postedAt)}
                  </h3>
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

