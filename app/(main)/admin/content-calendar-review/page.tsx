'use client';

import {
  getAdminContentCalendarReviewDetail,
  getAdminContentCalendarReviewUsers,
  postAdminContentCalendarForceRun,
  type AdminContentPlanDay,
  type AdminContentPlanGeneratedItem,
  type AdminContentPlanUpcomingItem,
  type ContentCalendarReviewDetail,
  type ContentCalendarReviewPlatform,
  type ContentCalendarReviewPreferences,
  type ContentCalendarReviewUser,
} from '@/src/service/api/adminService';
import { performActionOnScheduledPost } from '@/src/service/api/social.servce';
import { useUser } from '../../_components/useUser';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { showErrorToast } from '@/lib/show-error-toast';
import { toast } from 'sonner';
import {
  CalendarDays,
  CheckCircle2,
  Facebook,
  Film,
  Image as ImageIcon,
  Instagram,
  Layers,
  Linkedin,
  Loader2,
  Play,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { lockBodyScroll } from '@/lib/body-scroll-lock';
import {
  adminForceRunLockKey,
  isForceRunTargetComplete,
  parseAdminForceRunLockKey,
} from '@/lib/content-plan-force-run';
import {
  ImagePreviewButton,
  ImagePreviewOverlay,
  useImagePreview,
} from '@/components/image-preview';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatTimestampInTz, getBrowserTimeZone } from '@/lib/user-timezone';
import { resolveSchedulableMediaPreview } from '@/lib/post-media-preview';
import { PostMediaPreview } from '@/components/shared/PostMediaPreview';
import { CarouselSwipePreview } from '@/components/shared/CarouselSwipePreview';
import { DownloadVideoButton } from '@/components/download-video-button';

const PLATFORM_LABEL: Record<ContentCalendarReviewPlatform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
};

const PLATFORM_SHORT: Record<ContentCalendarReviewPlatform, string> = {
  instagram: 'IG',
  facebook: 'FB',
  linkedin: 'LI',
};

const PLATFORM_ICON: Record<
  ContentCalendarReviewPlatform,
  React.ComponentType<{ className?: string }>
> = {
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
};

function kindLabel(kind: string): string {
  switch (kind) {
    case 'campaign':
      return 'Campaigns';
    case 'ai-engine':
      return 'AI Manager';
    case 'bulk-create':
      return 'Automated';
    case 'quick-create':
      return 'Create Post';
    case 'product-advert':
      return 'Product Posts';
    case 'video-generation':
      return 'Videos';
    case 'carousel':
      return 'Carousel Posts';
    case 'festive':
    case 'festival':
      return 'Occasion Posts';
    case 'empty':
      return '—';
    default:
      return kind === 'other' ? 'Manual post' : kind || 'Planned';
  }
}

function statusLabel(status: AdminContentPlanGeneratedItem['status']): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'queued':
      return 'Generating';
    case 'failed':
      return 'Failed';
    case 'scheduled':
      return 'Scheduled';
    case 'removed':
      return 'Removed by user';
    case 'rejected-by-admin':
      return 'Rejected by admin';
    case 'rejected-by-user':
    case 'rejected':
      return 'Rejected by user';
    default:
      return status;
  }
}

function cellToneClass(kind: string): string {
  switch (kind) {
    case 'campaign':
      return 'bg-success text-success';
    case 'festival':
    case 'festive':
      return 'bg-warning text-warning';
    case 'quick-create':
      return 'bg-info text-info';
    case 'product-advert':
      return 'bg-preview text-preview';
    case 'video-generation':
      return 'bg-info text-info';
    case 'carousel':
      return 'bg-success text-success';
    case 'bulk-create':
    case 'ai-engine':
      return 'bg-primary-purple/20 text-preview';
    case 'empty':
      return 'bg-element text-secondary';
    default:
      return 'bg-warning text-warning dark:text-warning';
  }
}

function formatDay(date: string): string {
  try {
    return format(parseISO(date), 'EEE d MMM');
  } catch {
    return date;
  }
}

function canForceRunKind(kind: string): boolean {
  return (
    kind === 'campaign' ||
    kind === 'ai-engine' ||
    kind === 'quick-create' ||
    kind === 'video-generation' ||
    kind === 'carousel' ||
    kind === 'festival' ||
    kind === 'festive'
  );
}

function optimalTimeForPlatform(
  prefs: ContentCalendarReviewPreferences,
  platform: ContentCalendarReviewPlatform
): string | null {
  if (platform === 'facebook') return prefs.optimalFacebookTime;
  if (platform === 'instagram') return prefs.optimalInstagramTime;
  return prefs.optimalLinkedinTime;
}

type PreviewTarget = {
  userId: string;
  name: string;
  email: string;
  platform: ContentCalendarReviewPlatform;
  date: string;
  item: AdminContentPlanGeneratedItem;
  preferences: ContentCalendarReviewPreferences;
};

function itemRegenKey(
  userId: string,
  platform: ContentCalendarReviewPlatform,
  item: Pick<AdminContentPlanGeneratedItem, 'scheduledPostId' | 'draftId'>
): string {
  return `${userId}::${item.scheduledPostId || item.draftId || ''}::${platform}`;
}

function forceRunVisualKey(args: {
  userId: string;
  platform: ContentCalendarReviewPlatform;
  date: string;
  kind: string;
  eventId?: string;
}): string {
  return adminForceRunLockKey({
    userId: args.userId,
    date: args.date,
    platform: args.platform,
    kind: args.kind,
    eventId: args.eventId,
  });
}

export default function AdminContentCalendarReviewPage() {
  const { user } = useUser();
  const router = useRouter();

  const [users, setUsers] = useState<ContentCalendarReviewUser[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ContentCalendarReviewDetail | null>(
    null
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewTarget | null>(null);
  const [runningForceRunKeys, setRunningForceRunKeys] = useState<Set<string>>(
    () => new Set()
  );
  /** Keys currently queuing the regenerate API call. */
  const [pendingRegenKeys, setPendingRegenKeys] = useState<Set<string>>(
    () => new Set()
  );
  /** Keys with a regenerate job in flight (kept until content refreshes). */
  const [regeneratingKeys, setRegeneratingKeys] = useState<Set<string>>(
    () => new Set()
  );
  /** updatedAtMs snapshot when regen was queued — used to detect completion. */
  const [regenBaselineMs, setRegenBaselineMs] = useState<
    Record<string, number>
  >({});

  const now = useMemo(() => new Date(), []);

  useEffect(() => {
    if (user && !user.admin) {
      router.replace('/home');
    }
  }, [user, router]);

  const loadUsers = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await getAdminContentCalendarReviewUsers();
      setUsers(res.data.users ?? []);
    } catch {
      showErrorToast(
        'Failed to load content calendar users. Please try again later.'
      );
      setUsers([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.admin) return;
    void loadUsers();
  }, [user?.admin, loadUsers]);

  const loadDetail = useCallback(async (userId: string) => {
    setSelectedUserId(userId);
    setDetailLoading(true);
    setDetail(null);
    setPreview(null);
    setRegeneratingKeys(new Set());
    setPendingRegenKeys(new Set());
    setRegenBaselineMs({});
    try {
      const res = await getAdminContentCalendarReviewDetail(userId);
      setDetail(res.data);
    } catch {
      showErrorToast(
        'Failed to load content calendar. Please try again later.'
      );
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const clearRegenKey = useCallback((key: string) => {
    setRegeneratingKeys((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setRegenBaselineMs((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const refreshDetail = useCallback(async () => {
    if (!selectedUserId) return;
    try {
      const res = await getAdminContentCalendarReviewDetail(selectedUserId);
      setDetail(res.data);
      setRunningForceRunKeys((prev) => {
        if (prev.size === 0) return prev;
        const next = new Set(prev);
        for (const key of prev) {
          const target = parseAdminForceRunLockKey(key);
          if (target && isForceRunTargetComplete(res.data.days, target)) {
            next.delete(key);
          }
        }
        return next.size === prev.size ? prev : next;
      });
      setPreview((prev) => {
        if (!prev) return prev;
        for (const day of res.data.days) {
          if (day.date !== prev.date) continue;
          const slot = day.byPlatform[prev.platform];
          const match = slot?.generated.find(
            (g) =>
              (prev.item.scheduledPostId &&
                g.scheduledPostId === prev.item.scheduledPostId) ||
              (prev.item.draftId && g.draftId === prev.item.draftId)
          );
          if (match) {
            return {
              ...prev,
              item: match,
              preferences: res.data.preferences,
              name: res.data.name,
              email: res.data.email,
            };
          }
        }
        return prev;
      });

      // Detect finished regenerations by comparing updatedAtMs to baseline.
      setRegenBaselineMs((baselines) => {
        const keys = Object.keys(baselines);
        if (keys.length === 0) return baselines;
        const finished: Array<{
          key: string;
          platform: ContentCalendarReviewPlatform;
        }> = [];
        const nextBaselines = { ...baselines };
        for (const key of keys) {
          const baseline = baselines[key] ?? 0;
          for (const day of res.data.days) {
            for (const platform of res.data.platforms) {
              const slot = day.byPlatform[platform];
              if (!slot) continue;
              for (const item of slot.generated) {
                const k = itemRegenKey(selectedUserId, platform, item);
                if (k !== key) continue;
                if ((item.updatedAtMs ?? 0) > baseline) {
                  finished.push({ key, platform });
                  delete nextBaselines[key];
                }
              }
            }
          }
        }
        if (finished.length > 0) {
          queueMicrotask(() => {
            setRegeneratingKeys((prev) => {
              const next = new Set(prev);
              for (const f of finished) next.delete(f.key);
              return next;
            });
            for (const f of finished) {
              toast.success(
                `Regeneration finished for ${PLATFORM_LABEL[f.platform]}`
              );
            }
          });
          return nextBaselines;
        }
        return baselines;
      });
    } catch {
      // silent refresh
    }
  }, [selectedUserId]);

  // Poll while regenerations are in flight so cards/modals clear when done.
  useEffect(() => {
    if (regeneratingKeys.size === 0) return;
    const id = window.setInterval(() => {
      void refreshDetail();
    }, 4000);
    return () => window.clearInterval(id);
  }, [regeneratingKeys.size, refreshDetail]);

  // Poll while force runs are in flight so cards unlock when generation finishes.
  useEffect(() => {
    if (runningForceRunKeys.size === 0) return;
    const id = window.setInterval(() => {
      void refreshDetail();
    }, 4000);
    return () => window.clearInterval(id);
  }, [runningForceRunKeys.size, refreshDetail]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.userId.toLowerCase().includes(q) ||
        u.activePlan.toLowerCase().includes(q)
    );
  }, [users, search]);

  const handleForceRun = async (
    platform: ContentCalendarReviewPlatform,
    date: string,
    kind: string,
    eventId?: string
  ) => {
    if (!detail) return;
    if (
      String(detail.mode ?? '')
        .trim()
        .toLowerCase() !== 'auto'
    ) {
      showErrorToast('Force Run is available on Auto (AI) plans only');
      return;
    }
    if (date < detail.today) {
      showErrorToast('Force Run is not available for past dates');
      return;
    }
    const lockKey = adminForceRunLockKey({
      userId: detail.userId,
      date,
      platform,
      kind,
      eventId,
    });
    setRunningForceRunKeys((prev) => new Set(prev).add(lockKey));
    try {
      await postAdminContentCalendarForceRun({
        userId: detail.userId,
        date,
        platform,
        kind,
        ...(eventId ? { eventId } : {}),
      });
      toast.success(
        `Force Run queued for ${PLATFORM_LABEL[platform]} on ${date}`
      );
      // Optimistic: queue only the clicked card; keep sibling upcoming.
      setDetail((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          days: prev.days.map((day) => {
            if (day.date !== date) return day;
            const slot = day.byPlatform[platform];
            if (!slot) return day;
            const matchesClicked = (u: AdminContentPlanUpcomingItem) => {
              if (u.kind !== kind) return false;
              if ((kind === 'festival' || kind === 'festive') && eventId) {
                return u.eventId === eventId;
              }
              return true;
            };
            const remainingUpcoming = slot.upcoming.filter(
              (u) => !matchesClicked(u)
            );
            const queuedItem = slot.upcoming.find(matchesClicked);
            const queuedGenerated = queuedItem
              ? [
                  {
                    kind:
                      queuedItem.kind === 'festival'
                        ? 'festive'
                        : queuedItem.kind,
                    status: 'queued' as const,
                    title: queuedItem.label,
                    captionPreview: queuedItem.note,
                  },
                ]
              : [
                  {
                    kind: kind === 'festival' ? 'festive' : kind,
                    status: 'queued' as const,
                    title: 'Queued',
                  },
                ];
            return {
              ...day,
              byPlatform: {
                ...day.byPlatform,
                [platform]: {
                  generated: [...slot.generated, ...queuedGenerated],
                  upcoming: remainingUpcoming,
                },
              },
            };
          }),
        };
      });
      await refreshDetail();
    } catch (err: unknown) {
      setRunningForceRunKeys((prev) => {
        const next = new Set(prev);
        next.delete(lockKey);
        return next;
      });
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : undefined;
      showErrorToast(message || 'Force Run failed. Please try again later.');
    }
  };

  const handleRegenerate = async (
    regenerationMode: 'image' | 'fresh-context' = 'image'
  ) => {
    if (!preview || !detail) return;
    if (
      String(detail.mode ?? '')
        .trim()
        .toLowerCase() !== 'auto'
    ) {
      showErrorToast('Regenerate is available on Auto (AI) plans only');
      return;
    }
    const scheduledPostId = preview.item.scheduledPostId?.trim() || '';
    const draftId = preview.item.draftId?.trim() || '';
    if (!scheduledPostId && !draftId) {
      showErrorToast('No draft or scheduled post to regenerate');
      return;
    }
    const regenKey = itemRegenKey(
      preview.userId,
      preview.platform,
      preview.item
    );
    setPendingRegenKeys((prev) => {
      const next = new Set(prev);
      next.add(regenKey);
      return next;
    });
    try {
      await performActionOnScheduledPost(
        scheduledPostId || null,
        'regenerate',
        preview.userId,
        preview.platform,
        draftId || null,
        regenerationMode
      );
      setRegeneratingKeys((prev) => {
        const next = new Set(prev);
        next.add(regenKey);
        return next;
      });
      setRegenBaselineMs((prev) => ({
        ...prev,
        [regenKey]: preview.item.updatedAtMs ?? Date.now(),
      }));
      toast.success(
        `Regeneration started for ${PLATFORM_LABEL[preview.platform]}`
      );
      void refreshDetail();
    } catch (err: unknown) {
      clearRegenKey(regenKey);
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : undefined;
      showErrorToast(
        message || 'Failed to regenerate. Please try again later.'
      );
    } finally {
      setPendingRegenKeys((prev) => {
        const next = new Set(prev);
        next.delete(regenKey);
        return next;
      });
    }
  };

  if (!user?.admin) return null;
  const contentDateIsPast =
    now.getTime() > new Date(preview?.date ?? '').getTime();

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16 page-enter">
      <header className="space-y-1">
        <h1 className="flex items-center gap-3 text-page-title text-default">
          <CalendarDays className="h-6 w-6 text-link" aria-hidden />
          Content Calendar Review
        </h1>
        <p className="text-sm text-secondary">
          Browse every auto-mode user&apos;s content plan, including generated
          images and full post status.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <aside className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 icon-tertiary" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, id…"
              className="pl-9"
            />
          </div>
          <div className="max-h-[70vh] overflow-y-auto rounded-xl border border-default bg-default">
            {listLoading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-secondary">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading users…
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-secondary">
                No matching users.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {filteredUsers.map((u) => {
                  const active = selectedUserId === u.userId;
                  return (
                    <li key={u.userId}>
                      <button
                        type="button"
                        onClick={() => void loadDetail(u.userId)}
                        className={cn(
                          'w-full px-3 py-3 text-left transition-expo',
                          active ? 'bg-primary/10' : 'hover:bg-element'
                        )}
                      >
                        <p className="truncate text-sm font-semibold text-default">
                          {u.name}
                        </p>
                        <p className="truncate text-xs text-secondary">
                          {u.email}
                        </p>
                        <p className="mt-1 truncate text-[11px] text-secondary">
                          {u.activePlan}
                          {u.mode ? ` · ${u.mode}` : ''}
                          {u.autoModeCalendarGenerated ? ' · calendar' : ''}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <p className="text-[11px] text-secondary">
            {filteredUsers.length} of {users.length} users
          </p>
        </aside>

        <section className="min-w-0 space-y-4">
          {!selectedUserId ? (
            <div className="flex min-h-[40vh] items-center justify-center rounded-xl border border-dashed border-default bg-element px-6 text-center text-sm text-secondary">
              Select a user to view their content calendar.
            </div>
          ) : detailLoading ? (
            <div className="flex min-h-[40vh] items-center justify-center gap-2 rounded-xl border border-default bg-default text-sm text-secondary">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading calendar…
            </div>
          ) : !detail ? (
            <div className="rounded-xl border border-warning bg-warning px-4 py-3 text-sm text-warning">
              Could not load this user&apos;s content calendar.
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-default bg-default p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-subsection text-default">
                      {detail.name}
                    </h2>
                    <p className="text-sm text-secondary">{detail.email}</p>
                    <p className="mt-1 text-xs text-secondary">
                      {detail.activePlan}
                      {detail.mode ? ` · ${detail.mode}` : ''} ·{' '}
                      <span className="font-mono">{detail.userId}</span>
                    </p>
                  </div>
                  <div className="text-right text-xs text-secondary">
                    <p>
                      Plan window:{' '}
                      <span className="font-medium text-default">
                        {detail.from}
                      </span>{' '}
                      →{' '}
                      <span className="font-medium text-default">
                        {detail.to}
                      </span>
                    </p>
                    <p className="mt-1">
                      Today ({detail.preferences.timeZone || 'UTC'}):{' '}
                      <span className="font-medium text-default">
                        {detail.today}
                      </span>
                    </p>
                  </div>
                </div>
                <PreferencesStrip
                  preferences={detail.preferences}
                  platforms={detail.platforms}
                />
              </div>

              {detail.platforms.length === 0 ? (
                <p className="rounded-lg border border-default bg-element px-3 py-3 text-sm text-secondary">
                  This user has no selected platforms.
                </p>
              ) : (
                <div className="space-y-3">
                  {String(detail.mode ?? '')
                    .trim()
                    .toLowerCase() === 'auto' ? (
                    <p className="rounded-md border border-default bg-element px-3 py-2 text-sm text-secondary">
                      Force Run appears on planned Campaigns, Create Post, AI
                      Manager, Videos, Carousel Posts, or Occasion Posts cells for today
                      and future dates — it hides after Force Run, when content
                      is already generating/generated, or when the post was
                      removed or rejected by the user.
                    </p>
                  ) : (
                    <p className="rounded-md border border-default bg-element px-3 py-2 text-sm text-secondary">
                      Force Run is available on Auto (AI) plans only.
                    </p>
                  )}
                  <div className="overflow-x-auto rounded-xl border border-default">
                    <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-default bg-element">
                          <th className="sticky left-0 z-10 bg-element px-3 py-2 text-xs font-semibold uppercase tracking-wide text-secondary">
                            Date
                          </th>
                          {detail.platforms.map((platform) => {
                            const Icon = PLATFORM_ICON[platform];
                            return (
                              <th
                                key={platform}
                                className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-secondary"
                              >
                                <span className="inline-flex items-center gap-1.5">
                                  <Icon className="h-3.5 w-3.5" />
                                  {PLATFORM_SHORT[platform]}
                                </span>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {detail.days.map((day) => (
                          <DayRow
                            key={day.date}
                            day={day}
                            platforms={detail.platforms}
                            todayIso={detail.today}
                            forceRunEnabled={
                              String(detail.mode ?? '')
                                .trim()
                                .toLowerCase() === 'auto'
                            }
                            runningForceRunKeys={runningForceRunKeys}
                            regeneratingKeys={regeneratingKeys}
                            userId={detail.userId}
                            onOpenPreview={(platform, item) =>
                              setPreview({
                                userId: detail.userId,
                                name: detail.name,
                                email: detail.email,
                                platform,
                                date: day.date,
                                item,
                                preferences: detail.preferences,
                              })
                            }
                            onForceRun={(platform, kind, eventId) =>
                              void handleForceRun(
                                platform,
                                day.date,
                                kind,
                                eventId
                              )
                            }
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {preview ? (
        <PreviewModal
          target={preview}
          regenerateEnabled={
            String(detail?.mode ?? '')
              .trim()
              .toLowerCase() === 'auto' && !contentDateIsPast
          }
          isRegenerating={
            pendingRegenKeys.has(
              itemRegenKey(preview.userId, preview.platform, preview.item)
            ) ||
            regeneratingKeys.has(
              itemRegenKey(preview.userId, preview.platform, preview.item)
            )
          }
          onClose={() => setPreview(null)}
          onRegenerate={(mode) => void handleRegenerate(mode)}
        />
      ) : null}
    </div>
  );
}

function PreferencesStrip({
  preferences,
  platforms,
}: {
  preferences: ContentCalendarReviewPreferences;
  platforms: ContentCalendarReviewPlatform[];
}) {
  const rows = platforms.map((platform) => {
    const optimal = optimalTimeForPlatform(preferences, platform);
    const preferred =
      preferences.preferredTime && !optimal ? preferences.preferredTime : null;
    return { platform, optimal, preferred };
  });

  if (
    rows.every((r) => !r.optimal && !r.preferred) &&
    preferences.analyticsOptimalPosting == null
  ) {
    return null;
  }

  return (
    <div className="mt-3 grid gap-2 rounded-lg border border-default bg-element px-3 py-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
      {rows.map(({ platform, optimal, preferred }) => (
        <div key={platform}>
          <span className="font-semibold text-default">
            {PLATFORM_LABEL[platform]}
          </span>
          <span className="text-secondary">
            {': '}
            {optimal
              ? `Optimal ${optimal}`
              : preferred
                ? `Preferred ${preferred}`
                : '—'}
          </span>
        </div>
      ))}
      {preferences.analyticsOptimalPosting != null ? (
        <div className="text-secondary sm:col-span-2 lg:col-span-3">
          Use analytics optimal posting time:{' '}
          <span className="font-medium text-default">
            {preferences.analyticsOptimalPosting ? 'Yes' : 'No'}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function DayRow({
  day,
  platforms,
  todayIso,
  forceRunEnabled,
  runningForceRunKeys,
  regeneratingKeys,
  userId,
  onOpenPreview,
  onForceRun,
}: {
  day: AdminContentPlanDay;
  platforms: ContentCalendarReviewPlatform[];
  todayIso: string;
  forceRunEnabled: boolean;
  runningForceRunKeys: Set<string>;
  regeneratingKeys: Set<string>;
  userId: string;
  onOpenPreview: (
    platform: ContentCalendarReviewPlatform,
    item: AdminContentPlanGeneratedItem
  ) => void;
  onForceRun: (
    platform: ContentCalendarReviewPlatform,
    kind: string,
    eventId?: string
  ) => void;
}) {
  const isToday = day.date === todayIso;
  const isPast = day.date < todayIso;

  return (
    <tr
      className={cn(
        'border-b border-default align-top last:border-b-0',
        isToday && 'bg-primary/5'
      )}
    >
      <td className="sticky left-0 z-10 bg-background/95 px-3 py-3 text-xs font-medium text-default backdrop-blur">
        <div className="flex items-center gap-1.5">
          {formatDay(day.date)}
          {isToday ? (
            <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-link">
              Today
            </span>
          ) : null}
        </div>
        <div className="font-mono text-[10px] text-secondary">{day.date}</div>
        {day.festivals.length > 0 ? (
          <div className="mt-1 space-y-0.5">
            {day.festivals.map((f) => (
              <span
                key={f.id}
                className="block text-[10px] text-warning dark:text-warning"
              >
                {f.name}
              </span>
            ))}
          </div>
        ) : null}
      </td>
      {platforms.map((platform) => {
        const slot = day.byPlatform[platform];
        const generated = slot?.generated ?? [];
        const upcoming = slot?.upcoming ?? [];

        return (
          <td key={platform} className="px-2 py-2">
            <div className="space-y-2">
              {generated.map((item, idx) => (
                <GeneratedCard
                  key={`${item.scheduledPostId ?? item.draftId ?? item.kind}-${idx}`}
                  item={item}
                  isRegenerating={regeneratingKeys.has(
                    itemRegenKey(userId, platform, item)
                  )}
                  onOpen={() => onOpenPreview(platform, item)}
                />
              ))}
              {upcoming.map((item, idx) => {
                const runKey = forceRunVisualKey({
                  userId,
                  platform,
                  date: day.date,
                  kind: item.kind,
                  eventId: item.eventId,
                });
                const runPending = runningForceRunKeys.has(runKey);
                const showForceRun =
                  forceRunEnabled &&
                  !isPast &&
                  !runPending &&
                  canForceRunKind(item.kind);
                return (
                  <div
                    key={`${item.kind}-${item.eventId ?? ''}-${idx}`}
                    className="flex flex-col gap-1.5"
                  >
                    <UpcomingCard item={item} pending={runPending} />
                    {showForceRun ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1.5 text-[11px]"
                        onClick={() =>
                          onForceRun(platform, item.kind, item.eventId)
                        }
                      >
                        {runPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                        {runPending ? 'Running…' : 'Force Run'}
                      </Button>
                    ) : null}
                  </div>
                );
              })}
              {generated.length === 0 && upcoming.length === 0 ? (
                <span className="text-[11px] text-secondary">—</span>
              ) : null}
            </div>
          </td>
        );
      })}
    </tr>
  );
}

function UpcomingCard({
  item,
  pending = false,
}: {
  item: AdminContentPlanUpcomingItem;
  pending?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-lg px-2 py-1.5 text-[11px]',
        cellToneClass(item.kind)
      )}
    >
      <p className="font-semibold">{kindLabel(item.kind)}</p>
      <p className="mt-0.5 opacity-90">
        {pending ? 'Generating…' : item.label}
      </p>
      {item.note ? (
        <p className="mt-0.5 text-[10px] opacity-80">{item.note}</p>
      ) : null}
    </div>
  );
}

function GeneratedCard({
  item,
  isRegenerating,
  onOpen,
}: {
  item: AdminContentPlanGeneratedItem;
  isRegenerating?: boolean;
  onOpen: () => void;
}) {
  const isTerminal =
    item.status === 'removed' ||
    item.status === 'rejected' ||
    item.status === 'rejected-by-user' ||
    item.status === 'rejected-by-admin';
  const title =
    item.title?.trim() || item.captionPreview?.trim() || kindLabel(item.kind);
  const carouselSlides = Array.isArray(item.carouselSlides)
    ? item.carouselSlides.filter((s) => String(s.imageUrl ?? '').trim())
    : [];
  const isCarousel =
    item.mediaType === 'carousel' ||
    item.kind === 'carousel' ||
    carouselSlides.length >= 2;
  const isVideo =
    !isCarousel &&
    (item.mediaType === 'video' ||
      item.kind === 'video-generation' ||
      Boolean(item.videoUrl));
  const thumbUrl =
    item.imageUrl || item.videoPosterUrl || carouselSlides[0]?.imageUrl || null;
  const slideCount =
    item.slideCount ??
    (carouselSlides.length > 0 ? carouselSlides.length : null);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'relative w-full rounded-sm border border-default bg-default p-2 text-left transition hover:ring-1 hover:ring-strong',
        cellToneClass(item.kind),
        isRegenerating && 'ring-1 ring-[var(--border-warning)]'
      )}
    >
      {isRegenerating ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 rounded-lg bg-background/75 backdrop-blur-[1px]">
          <Loader2 className="h-4 w-4 animate-spin text-warning dark:text-warning" />
          <span className="text-[10px] font-semibold text-warning dark:text-warning">
            Regenerating…
          </span>
        </div>
      ) : null}
      <div className="flex gap-2">
        {thumbUrl ? (
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-default bg-background">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
            {isVideo ? (
              <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                <Play className="h-4 w-4 text-white" fill="currentColor" />
              </span>
            ) : null}
            {isCarousel && slideCount && slideCount > 1 ? (
              <span className="absolute bottom-0.5 right-0.5 inline-flex items-center gap-0.5 rounded bg-black/70 px-1 py-0.5 text-[9px] font-semibold text-white">
                <Layers className="h-2.5 w-2.5" />
                {slideCount}
              </span>
            ) : null}
            {isVideo ? (
              <span className="absolute bottom-0.5 left-0.5 rounded bg-black/70 px-1 py-0.5 text-[9px] font-semibold text-white">
                <Film className="h-2.5 w-2.5" />
              </span>
            ) : null}
          </div>
        ) : (
          <div
            aria-hidden
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-default bg-element"
          >
            {isVideo ? (
              <Film className="h-4 w-4 text-secondary" />
            ) : isCarousel ? (
              <Layers className="h-4 w-4 text-secondary" />
            ) : (
              <ImageIcon className="h-4 w-4 text-secondary" />
            )}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold leading-tight">
            {kindLabel(item.kind)}
            <span className="ml-1.5 font-normal opacity-80">
              · {isRegenerating ? 'Regenerating' : statusLabel(item.status)}
              {item.origin === 'manual' ? ' · Manual' : ''}
            </span>
          </p>
          {!isTerminal ? (
            <p className="mt-0.5 line-clamp-2 text-[11px] opacity-90">
              {title}
            </p>
          ) : null}
          {isCarousel && slideCount && slideCount > 1 ? (
            <p className="mt-0.5 text-[10px] opacity-70">{slideCount} slides</p>
          ) : null}
          {isVideo ? (
            <p className="mt-0.5 text-[10px] opacity-70">Video</p>
          ) : null}
          {item.postStatus ? (
            <p className="mt-0.5 text-[10px] opacity-70">
              Admin: {item.postStatus}
            </p>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function PreviewModal({
  target,
  regenerateEnabled,
  isRegenerating,
  onClose,
  onRegenerate,
}: {
  target: PreviewTarget;
  regenerateEnabled: boolean;
  isRegenerating: boolean;
  onClose: () => void;
  onRegenerate: (mode: 'image' | 'fresh-context') => void;
}) {
  const { item, platform, preferences } = target;
  const Icon = PLATFORM_ICON[platform];
  const imagePreview = useImagePreview();
  const optimal = optimalTimeForPlatform(preferences, platform);
  const showPreferred = Boolean(preferences.preferredTime) && !optimal;
  const isQueued = item.status === 'queued';
  const isTerminal =
    item.status === 'removed' ||
    item.status === 'rejected' ||
    item.status === 'rejected-by-user' ||
    item.status === 'rejected-by-admin';
  // Admin regenerate is Auto-plan only (manual users own their own review).
  const canRegenerate =
    regenerateEnabled &&
    !isQueued &&
    !isTerminal &&
    !isRegenerating &&
    (Boolean(item.scheduledPostId) ||
      (item.kind === 'campaign' && Boolean(item.draftId)));
  const carouselSlides = Array.isArray(item.carouselSlides)
    ? item.carouselSlides
        .map((s, i) => ({
          index: s.index ?? i + 1,
          imageUrl: String(s.imageUrl ?? '').trim(),
          headline: s.headline ?? null,
        }))
        .filter((s) => s.imageUrl)
    : [];
  const isCarousel =
    item.mediaType === 'carousel' ||
    item.kind === 'carousel' ||
    carouselSlides.length >= 2;
  const mediaPreview = resolveSchedulableMediaPreview({
    mediaType: item.mediaType,
    imageUrl: item.imageUrl,
    videoUrl: item.videoUrl,
    videoPosterUrl: item.videoPosterUrl,
  });
  const isVideo =
    !isCarousel && mediaPreview.isVideo && Boolean(mediaPreview.videoUrl);
  const [mounted, setMounted] = useState(false);
  const [showRegenerationOptions, setShowRegenerationOptions] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const releaseBodyScroll = lockBodyScroll();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      releaseBodyScroll();
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [onClose]);

  if (!mounted) return null;

  const modal = (
    <div
      className="pointer-events-auto fixed inset-0 z-[9998] flex items-center justify-center p-4"
      style={{ minHeight: '100dvh' }}
      role="dialog"
      aria-modal="true"
      aria-label="Post details"
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute inset-0 z-0 h-full w-full border-0 bg-black/75 p-0 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0F162E] text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <Icon className="h-5 w-5 text-[#00D1FF]" />
            <div>
              <div className="text-base font-semibold">
                {target.name} · {PLATFORM_LABEL[platform]}
              </div>
              <div className="text-xs text-white/50">
                {target.email} · {target.date}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-white/60 transition hover:bg-default hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div
            className={cn(
              'grid gap-6 p-6',
              isCarousel || isVideo
                ? 'md:grid-cols-1'
                : 'md:grid-cols-[260px_1fr]'
            )}
          >
            <div
              className={cn(
                'relative overflow-hidden rounded-xl border border-white/10 bg-black/40',
                isCarousel || isVideo ? 'w-full' : 'relative aspect-square'
              )}
            >
              {isRegenerating ? (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black/55 backdrop-blur-[2px]">
                  <Loader2 className="h-8 w-8 animate-spin text-warning" />
                  <p className="text-sm font-semibold text-warning">
                    Regenerating content…
                  </p>
                  <p className="text-xs text-white/60">
                    This may take a minute. You can close this and keep
                    browsing.
                  </p>
                </div>
              ) : null}
              {isCarousel && carouselSlides.length > 0 ? (
                <div className="p-3">
                  <p className="mb-2 text-xs font-medium text-white/60">
                    Carousel
                    {item.slideCount
                      ? ` · ${item.slideCount} slides`
                      : ` · ${carouselSlides.length} slides`}
                  </p>
                  <CarouselSwipePreview
                    slides={carouselSlides}
                    showCaptions
                    imageClassName="bg-black/40"
                    onImageClick={(url, alt) => imagePreview.open(url, alt)}
                  />
                </div>
              ) : isVideo && mediaPreview.videoUrl ? (
                <div className="p-3">
                  <p className="mb-2 text-xs font-medium text-white/60">
                    Video
                  </p>
                  <PostMediaPreview
                    preview={mediaPreview}
                    controls
                    muted={false}
                    videoClassName="w-full max-h-[28rem] rounded-xl bg-black"
                  />
                  <DownloadVideoButton
                    url={mediaPreview.videoUrl}
                    getFilename={() =>
                      `admin-calendar-${item.scheduledPostId ?? 'post'}.mp4`
                    }
                    className="mt-3 inline-flex items-center justify-center rounded-lg border border-white/20 bg-default px-3 py-1.5 text-xs font-medium text-white/90 transition hover:bg-default disabled:text-quaternary"
                  />
                </div>
              ) : item.imageUrl ? (
                <div className="relative h-full w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageUrl}
                    alt="Generated post"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute bottom-2 right-2">
                    <ImagePreviewButton
                      variant="overlay-icon"
                      stopPropagation
                      onClick={() => imagePreview.open(item.imageUrl as string)}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex aspect-square h-full w-full items-center justify-center text-white/40">
                  <ImageIcon className="h-10 w-10" />
                </div>
              )}
            </div>

            <div className="space-y-4 text-sm">
              <div>
                {isRegenerating ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-warning bg-warning px-2.5 py-1 text-xs font-semibold text-warning">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Regenerating
                  </span>
                ) : (
                  <StatusBadge
                    status={item.status}
                    postStatus={item.postStatus}
                  />
                )}
              </div>
              <KV label="Type" value={kindLabel(item.kind)} />
              {item.origin === 'manual' ? (
                <KV label="Created by" value="Manual" />
              ) : null}
              <KV
                label="Scheduled post id"
                value={item.scheduledPostId ?? null}
              />
              <KV label="Admin status" value={item.postStatus ?? null} />
              <KV
                label="User approval"
                value={item.UserApprovalStatus ?? null}
              />
              {showPreferred ? (
                <KV label="Preferred time" value={preferences.preferredTime} />
              ) : null}
              {platform === 'facebook' && optimal ? (
                <KV label="Optimal Facebook time" value={optimal} />
              ) : null}
              {platform === 'instagram' && optimal ? (
                <KV label="Optimal Instagram time" value={optimal} />
              ) : null}
              {platform === 'linkedin' && optimal ? (
                <KV label="Optimal LinkedIn time" value={optimal} />
              ) : null}
              <Timestamp label="Scheduled at" ms={item.scheduleAtMs ?? null} />
              <KV
                label="Content description"
                value={item.contentDescription ?? item.title ?? null}
                multiline
              />
              <KV
                label="Caption"
                value={item.caption ?? item.captionPreview ?? null}
                multiline
              />
              {item.error ? (
                <div>
                  <div className="text-xs uppercase tracking-wider text-white/50">
                    Error
                  </div>
                  <div className="mt-1 whitespace-pre-wrap rounded-md border border-danger bg-danger p-2 text-[12px] text-danger">
                    {item.error}
                  </div>
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-3 text-[11px] text-white/50">
                <Timestamp label="Created" ms={item.createdAtMs ?? null} />
                <Timestamp label="Updated" ms={item.updatedAtMs ?? null} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-white/10 bg-black/20 px-6 py-4">
          {isQueued ? (
            <span className="inline-flex items-center gap-2 text-sm text-info">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generation in progress…
            </span>
          ) : isRegenerating ? (
            <span className="inline-flex items-center gap-2 text-sm text-warning">
              <Loader2 className="h-4 w-4 animate-spin" />
              Regenerating…
            </span>
          ) : canRegenerate ? (
            <button
              type="button"
              onClick={() => setShowRegenerationOptions(true)}
              className="inline-flex items-center gap-2 rounded-full border border-warning bg-warning px-4 py-2 text-sm font-semibold text-warning transition hover:bg-warning disabled:text-quaternary"
            >
              <RefreshCw className="h-4 w-4" />
              Regenerate
            </button>
          ) : null}
        </div>
        {showRegenerationOptions ? (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Choose regeneration type" onClick={() => setShowRegenerationOptions(false)}>
            <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#0F162E] p-5 text-white shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold">Choose regeneration type</h3>
              <div className="mt-5 grid gap-3">
                <button type="button" className="rounded-lg border border-white/15 p-3 text-left hover:bg-white/5" onClick={() => { setShowRegenerationOptions(false); onRegenerate('image'); }}>
                  <span className="block font-semibold">Image regeneration</span>
                  <span className="mt-1 block text-xs text-white/60">Keep the existing context and prompt; create a new image.</span>
                </button>
                <button type="button" className="rounded-lg border border-warning p-3 text-left hover:bg-white/5" onClick={() => { setShowRegenerationOptions(false); onRegenerate('fresh-context'); }}>
                  <span className="block font-semibold">Whole new context &amp; prompt</span>
                  <span className="mt-1 block text-xs text-white/60">Start fresh and replace this scheduled post in place.</span>
                </button>
              </div>
              <button type="button" className="mt-4 w-full rounded-lg border border-white/15 px-3 py-2 text-sm text-white/70" onClick={() => setShowRegenerationOptions(false)}>Cancel</button>
            </div>
          </div>
        ) : null}
      </div>
      <ImagePreviewOverlay
        src={imagePreview.previewUrl}
        alt={imagePreview.previewAlt}
        onClose={imagePreview.close}
      />
    </div>
  );

  return createPortal(modal, document.body);
}

function StatusBadge({
  status,
  postStatus,
}: {
  status: AdminContentPlanGeneratedItem['status'];
  postStatus?: string | null;
}) {
  if (status === 'removed') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-danger bg-danger px-2.5 py-1 text-xs font-semibold text-danger">
        Removed by user
      </span>
    );
  }
  if (status === 'rejected-by-admin') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-danger bg-danger px-2.5 py-1 text-xs font-semibold text-danger">
        Rejected by admin
      </span>
    );
  }
  if (status === 'rejected' || status === 'rejected-by-user') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-danger bg-danger px-2.5 py-1 text-xs font-semibold text-danger">
        Rejected by user
      </span>
    );
  }
  if (status === 'queued') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-info bg-info px-2.5 py-1 text-xs font-semibold text-info">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Generating
      </span>
    );
  }
  if (status === 'draft') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-warning bg-warning px-2.5 py-1 text-xs font-semibold text-warning">
        Draft
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-success bg-success px-2.5 py-1 text-xs font-semibold text-success">
      <CheckCircle2 className="h-3.5 w-3.5" />
      {postStatus ? `Generated · ${postStatus}` : 'Generated'}
    </span>
  );
}

function KV({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string | null;
  multiline?: boolean;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-white/50">
        {label}
      </div>
      <div
        className={`mt-1 text-sm text-white/90 ${
          multiline ? 'whitespace-pre-wrap' : 'truncate'
        }`}
        title={!multiline && value ? value : undefined}
      >
        {value || <span className="text-white/30">—</span>}
      </div>
    </div>
  );
}

function Timestamp({ label, ms }: { label: string; ms: number | null }) {
  if (ms == null) {
    return (
      <div>
        <div className="uppercase tracking-wider">{label}</div>
        <div className="mt-0.5 text-white/30">—</div>
      </div>
    );
  }
  return (
    <div>
      <div className="uppercase tracking-wider">{label}</div>
      <div className="mt-0.5 text-white/80">
        {formatTimestampInTz(ms, getBrowserTimeZone(), {
          style: 'datetime',
        })}
      </div>
    </div>
  );
}
