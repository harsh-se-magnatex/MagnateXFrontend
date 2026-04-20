import { getFailureNotifications } from '@/features/user/api';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type FirestoreTimestamp = {
  _seconds: number;
  _nanoseconds: number;
};

type PostFailureAlert = {
  postId: string;
  message: string;
  failedAt: FirestoreTimestamp;
  platform: string;
  createdAt: string;
  errors: string[];
};

export function PostFailureAlerts() {
  const [failureNotifications, setFailureNotifications] = useState<PostFailureAlert[]>([]);
  const getData = async () => {
    const response = await getFailureNotifications();
    setFailureNotifications(response.data.failureNotifications);
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
          {failureNotifications.map((notification) => (
            <li key={notification.postId + notification.failedAt._seconds} className="p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 bg-red-50 text-red-700 ring-red-100">
                      {notification.platform}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {new Date(notification.failedAt._seconds * 1000).toLocaleDateString("en-gb", { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-900">
                    {notification.message}
                  </h3>
                  <p className="text-sm text-zinc-600">{notification.errors.join(', ')}</p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <Link
                    href={`/scheduled-post`}
                    className="text-sm font-medium text-red-600 hover:text-red-700 hover:underline"
                  >
                    View Post
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
