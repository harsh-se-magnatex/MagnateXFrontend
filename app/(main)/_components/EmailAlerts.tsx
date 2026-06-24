'use client';

import Link from 'next/link';
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
  category: 'policy' | 'security' | 'product';
};

const categoryStyles: Record<SystemMessage['category'], string> = {
  policy: 'bg-blue-50 text-blue-700 ring-blue-100',
  security: 'bg-rose-50 text-rose-700 ring-rose-100',
  product: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
};


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

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <ul className="divide-y divide-zinc-100">
          {notifications.map((message) => {
            const isNew = isUnread(message.createdAt);
            return (
            <NotificationListItem key={message.id} isNew={isNew}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {isNew ? <NotificationNewBadge /> : null}
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${categoryStyles[message.category]}`}
                    >
                      {message.category === 'policy' && 'Policy'}
                      {message.category === 'security' && 'Security'}
                      {message.category === 'product' && 'Product'}
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

                <div className="flex shrink-0 items-center gap-3">
                  <Link
                    href={`/home`}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                  >
                    View details
                  </Link>
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
