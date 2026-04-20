import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getAllNotifications } from '@/src/service/api/userService';

type FirestoreTimestamp = {
  _seconds: number;
  _nanoseconds: number;
};

type NewReleaseAlert = {
  id: string;
  title: string;
  message: string;
  createdAt: FirestoreTimestamp;
  category: 'feature' | 'security' | 'improvement' | 'product';
};

function formatTimestamp(ts: FirestoreTimestamp | null): string {
  if (!ts) return '—';
  const date = new Date(ts._seconds * 1000 + ts._nanoseconds / 1e6);
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function NewReleasesAlerts() {
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
        <h2 className="text-base font-semibold text-zinc-900">
          Messages from SocioGenie
        </h2>
        <p className="text-xs text-zinc-500">
          We&apos;ll email you when something important changes.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <ul className="divide-y divide-zinc-100">
          {releases.map((release) => (
            <li key={release.id} className="p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 bg-blue-50 text-blue-700 ring-blue-100">
                      {release.category === 'feature' && 'Feature'}
                      {release.category === 'security' && 'Security'}
                      {release.category === 'improvement' && 'Improvement'}
                      {release.category === 'product' && 'Product'}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {formatTimestamp(release.createdAt)}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-900">
                    {release.title}
                  </h3>
                  <p className="text-sm text-zinc-600">{release.message}</p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <Link
                    href={`/home`}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                  >
                    View Release
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