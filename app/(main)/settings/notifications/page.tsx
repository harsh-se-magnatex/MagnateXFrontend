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
import { workspacePageTitleClass } from '@/lib/workspace-ui';
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
  const hasUnread = !countsLoading && count > 0;
  return (
    <button
      type="button"
      onClick={() => onSelect(href)}
      className={cn(
        'group flex w-full items-start gap-4 py-5 hover:bg-hover px-4 -mx-4 rounded-full transition-expo text-left',
        hasUnread && 'ring-1 ring-strong'
      )}
    >
      <div
        className={cn(
          'p-2 rounded-lg transition-expo mt-0.5',
          'bg-primary/10 text-link group-hover:bg-primary/15'
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-default">{label}</p>
          {badge ? (
            <span className="inline-flex items-center rounded-full bg-danger px-2 py-0.5 text-xs font-semibold text-danger ring-1 ring-[var(--border-danger)]">
              {badge}
            </span>
          ) : (
            !countsLoading && (
              <span className="inline-flex items-center rounded-full bg-element px-2 py-0.5 text-xs font-medium text-secondary ring-1 ring-border">
                0
              </span>
            )
          )}
        </div>
        {description && (
          <p className="mt-1 text-sm text-secondary">{description}</p>
        )}
      </div>
      <div className="self-center text-secondary group-hover:text-default">
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
        <h1 className={workspacePageTitleClass}>Notifications</h1>
        <p className="mt-2 text-sm text-secondary">
          Control how and when you receive alerts from SocioGenie.
        </p>
      </div>

      <div className="space-y-8">
        <section className="glass-card rounded-3xl p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-3 mb-2 border-b border-default pb-4">
            <div className="p-2 bg-primary-purple/10 rounded-lg text-preview">
              <Bell className="h-5 w-5" />
            </div>
            <h2 className="text-section text-default">Alerts</h2>
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={markingAll || total <= 0}
              className={cn(
                'ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-expo',
                total > 0 && !markingAll
                  ? 'bg-primary-purple/10 text-preview hover:bg-element'
                  : 'cursor-not-allowed bg-element text-secondary'
              )}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {markingAll ? 'Marking…' : 'Mark all as read'}
            </button>
          </div>

          <div className="divide-y divide-border/60">
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
