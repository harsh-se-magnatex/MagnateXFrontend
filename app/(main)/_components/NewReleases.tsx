'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getAllNotifications } from '@/src/service/api/userService';
import { useTimestampFormatter } from '@/lib/user-timezone';
import {
  type FirestoreTimestampLike,
  useNotificationUnreadHighlight,
} from './NotificationCountsProvider';
import {
  NotificationListItem,
  NotificationNewBadge,
} from './NotificationListItem';

type NewReleaseAlert = {
  id: string;
  title: string;
  message: string;
  createdAt: FirestoreTimestampLike;
  category: 'feature' | 'security' | 'improvement' | 'product';
};

export function NewReleasesAlerts() {
  const fmtTimestamp = useTimestampFormatter();
  const { isUnread } = useNotificationUnreadHighlight('newReleases');
  const [releases, setReleases] = useState<NewReleaseAlert[]>([]);
  const getData = async () => {
    const response = await getAllNotifications('release');
    setReleases(response.data.notifications as NewReleaseAlert[]);
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
          {releases.map((release) => {
            const isNew = isUnread(release.createdAt);
            return (
              <NotificationListItem key={release.id} isNew={isNew}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {isNew ? <NotificationNewBadge /> : null}
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 bg-[var(--blue-9)] text-default/90 ring-[var(--border-info)]">
                        {release.category === 'feature' && 'Feature'}
                        {release.category === 'security' && 'Security'}
                        {release.category === 'improvement' && 'Improvement'}
                        {release.category === 'product' && 'Product'}
                      </span>
                      <span className="text-xs text-tertiary">
                        {fmtTimestamp(release.createdAt)}
                      </span>
                    </div>
                    <h3 className="text-subsection text-default">
                      {release.title}
                    </h3>
                    <p className="text-sm text-secondary">{release.message}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <Link
                      href={`/home`}
                      className="text-sm font-medium text-preview hover:brightness-110 hover:underline"
                    >
                      View Release
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
