import { getSuccessNotifications } from '@/features/user/api';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type FirestoreTimestamp = {
  _seconds: number;
  _nanoseconds: number;
};

type PostSuccessAlert = {
  postId: string;
  message: string;
  postedAt: FirestoreTimestamp;
  platform: string;
  createdAt: string;
};



export function PostSuccessAlerts() {
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
          {successNotifications.map((notification) => (
            <li key={notification.postId + notification.postedAt._seconds} className="p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 bg-blue-50 text-blue-700 ring-blue-100">
                      {notification.platform}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {new Date(notification.postedAt._seconds * 1000).toLocaleDateString("en-gb", { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-900">
                    {notification.message}
                  </h3>
                  <p className="text-sm text-zinc-600">{notification.message}</p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <Link
                    href={`/scheduled-post`}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
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

