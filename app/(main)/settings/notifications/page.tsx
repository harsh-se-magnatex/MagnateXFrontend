'use client';

import { PageLoadingState } from '@/components/shared/PageLoadingState';
import { useAuth } from '@/src/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ComponentType } from 'react';
import {
  Bell,
  Mail,
  Activity,
  AlertCircle,
  CheckCheck,
  Sparkles,
  type LucideProps,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  formatNotificationCount,
  useNotificationCounts,
} from '@/app/(main)/_components/NotificationCountsProvider';

type AlertItemProps = {
  label: string;
  description?: string;
  icon: ComponentType<LucideProps>;
  href: string;
  count: number;
  cap: number;
  countsLoading: boolean;
  onSelect: (href: string) => void;
};

function AlertItem({
  label,
  description,
  icon: Icon,
  href,
  count,
  cap,
  countsLoading,
  onSelect,
}: AlertItemProps) {
  const badge = formatNotificationCount(count, cap);
  return (
    <button
      type="button"
      onClick={() => onSelect(href)}
      className="group flex w-full items-start gap-4 py-5 hover:bg-slate-50/80 px-4 -mx-4 rounded-2xl transition-colors text-left"
    >
      <div
        className={cn(
          'p-2 rounded-lg transition-colors mt-0.5',
          'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100'
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-slate-900">{label}</p>
          {badge ? (
            <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-100">
              {badge}
            </span>
          ) : (
            !countsLoading && (
              <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-slate-100">
                0
              </span>
            )
          )}
        </div>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>
      <div className="self-center text-slate-300 group-hover:text-slate-400">
        <span className="inline-block h-5 w-5">↗</span>
      </div>
    </button>
  );
}

export default function NotificationsSettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const {
    counts,
    total,
    cap: notificationCap,
    loading: countsLoading,
    markAsRead,
  } = useNotificationCounts();
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/sign-in');
  }, [loading, user, router]);

  if (loading) return <PageLoadingState />;
  if (!user) return null;

  const goTo = (href: string) => router.push(href);

  const handleMarkAllRead = async () => {
    if (markingAll || total <= 0) return;
    setMarkingAll(true);
    try {
      await markAsRead('all');
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Notifications
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Control how and when you receive alerts from SocioGenie.
        </p>
      </div>

      <div className="space-y-8">
        <section className="glass-card rounded-3xl p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-3 mb-2 border-b border-slate-100 pb-4">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <Bell className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">Alerts</h2>
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={markingAll || total <= 0}
              className={cn(
                'ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                total > 0 && !markingAll
                  ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  : 'cursor-not-allowed bg-slate-50 text-slate-400'
              )}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {markingAll ? 'Marking…' : 'Mark all as read'}
            </button>
          </div>

          <div className="divide-y divide-slate-100/80">
            <AlertItem
              icon={Mail}
              label="Account alerts"
              description="View critical account updates, billing info, and security alerts directly in SocioGenie."
              href="/alerts/email"
              count={counts.email}
              cap={notificationCap}
              countsLoading={countsLoading}
              onSelect={goTo}
            />
            <AlertItem
              icon={Activity}
              label="Post success alerts"
              description="See when your scheduled campaigns are published successfully in your in-app alerts."
              href="/alerts/postSuccess"
              count={counts.postSuccess}
              cap={notificationCap}
              countsLoading={countsLoading}
              onSelect={goTo}
            />
            <AlertItem
              icon={AlertCircle}
              label="Post failure alerts"
              description="Review alerts when an error prevents a post from publishing."
              href="/alerts/postFailure"
              count={counts.postFailure}
              cap={notificationCap}
              countsLoading={countsLoading}
              onSelect={goTo}
            />
            <AlertItem
              icon={Sparkles}
              label="New releases"
              description="Catch up on new features, AI models, and SocioGenie news inside the app."
              href="/alerts/newReleases"
              count={counts.newReleases}
              cap={notificationCap}
              countsLoading={countsLoading}
              onSelect={goTo}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
