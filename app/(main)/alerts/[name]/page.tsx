'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { EmailAlerts } from '../../_components/EmailAlerts';
import { PostSuccessAlerts } from '../../_components/PostSuccessAlert';
import { PostFailureAlerts } from '../../_components/PostFailure';
import { NewReleasesAlerts } from '../../_components/NewReleases';
import {
  useNotificationCounts,
} from '../../_components/NotificationCountsProvider';
import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
} from '@/src/service/api/userService';

function isNotificationCategory(value: string): value is NotificationCategory {
  return (NOTIFICATION_CATEGORIES as readonly string[]).includes(value);
}

export default function AlertsPage() {
  const { name } = useParams<{ name: string }>();
  const { markAsRead } = useNotificationCounts();

  /**
   * Marking the category as read happens as a side-effect of *viewing*
   * the alert list — there is no per-row dismiss action today and these
   * pages render every item (including older ones) so "I've seen them"
   * is the right semantic. The user-doc snapshot listener inside the
   * provider then clears the badge in real time.
   */
  useEffect(() => {
    if (name && isNotificationCategory(name)) {
      void markAsRead(name);
    }
  }, [name, markAsRead]);

  switch (name) {
    case 'email':
      return <EmailAlerts />;
    case 'postSuccess':
      return <PostSuccessAlerts />;
    case 'postFailure':
      return <PostFailureAlerts />;
    case 'newReleases':
      return <NewReleasesAlerts />;
    default:
      return <div>Invalid Alert</div>;
  }
}
