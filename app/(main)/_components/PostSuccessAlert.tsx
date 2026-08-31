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
 * Backend may bake a date into `notification.message` (legacy 12h AM/PM or
 * 24h). Prefer the structured `postedAt` field for display; this strips a
 * trailing "on <date>" if present. Falls back to the original text if the
 * pattern doesn't match.
 */
function stripBakedDate(message: string): string {
  return message
    .replace(
      /\s+on\s+(?:[A-Za-z]{3,9}\s+\d{1,2},\s+\d{4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}),\s+\d{1,2}:\d{2}(?:\s*(?:AM|PM))?\s*$/i,
      ''
    )
    .trim();
}

export function PostSuccessAlerts() {
  const fmtTimestamp = useTimestampFormatter();
  const { isUnread } = useNotificationUnreadHighlight('postSuccess');
  const [successNotifications, setSuccessNotifications] = useState<
    PostSuccessAlert[]
  >([]);
  const getData = async () => {
    const response = await getSuccessNotifications();
    setSuccessNotifications(response.data.successNotifications);
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
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 bg-info text-info ring-[var(--border-info)]">
                        {notification.platform}
                      </span>
                      <span className="text-xs text-tertiary">
                        {fmtTimestamp(notification.postedAt, {
                          style: 'datetime-short',
                        })}
                      </span>
                    </div>
                    <h3 className="text-subsection text-default">
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
