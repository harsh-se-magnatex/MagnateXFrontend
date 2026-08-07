'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { CalendarRange, Loader2, Play, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageLoadingState } from '@/components/shared/PageLoadingState';
import { useAuth } from '@/src/hooks/useAuth';
import { useUserPlanCredits } from '../_components/UserPlanCreditsProvider';
import { useUserTimezone } from '@/lib/user-timezone';
import {
  forceRunContentPlanApi,
  generateContentPlanApi,
  getContentPlanApi,
  type ContentPlanDay,
  type ContentPlanGeneratedItem,
  type ContentPlanGeneratedKind,
  type ContentPlanPlatform,
  type ContentPlanUpcomingItem,
} from '@/src/service/api/content-plan.service';
import { cn } from '@/lib/utils';
import {
  WORKSPACE_NAV_HREFS,
  workspacePageTitle,
} from '@/lib/workspace-nav';

const PLATFORM_LABEL: Record<ContentPlanPlatform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
};

const PLATFORM_SHORT: Record<ContentPlanPlatform, string> = {
  facebook: 'FB',
  instagram: 'IG',
  linkedin: 'LI',
};

function kindLabel(kind: ContentPlanGeneratedKind | string): string {
  switch (kind) {
    case 'campaign':
      return 'Campaigns';
    case 'ai-engine':
      return 'AI Engine';
    case 'bulk-create':
      return 'Automated posts';
    case 'quick-create':
      return 'Content Studio';
    case 'product-advert':
      return 'Product Ads';
    case 'video-generation':
      return 'Video Generator';
    case 'carousel':
      return 'Carousel Posts';
    case 'festive':
    case 'festival':
      return 'Event Studio';
    case 'empty':
      return '—';
    default:
      if (typeof kind === 'string' && kind.toLowerCase().includes('campaign')) {
        return 'Campaign';
      }
      return 'Planned';
  }
}

function statusLabel(status: ContentPlanGeneratedItem['status']): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'queued':
      return 'Generating';
    case 'scheduled':
      return 'Scheduled';
    case 'removed':
      return 'Removed by user';
    case 'rejected':
      return 'Rejected by user';
    default:
      return status;
  }
}

function cellToneClass(kind: string): string {
  switch (kind) {
    case 'campaign':
      return 'bg-emerald-500/25 text-emerald-700 dark:text-emerald-300';
    case 'festival':
    case 'festive':
      return 'bg-amber-500/30 text-amber-700 dark:text-amber-300';
    case 'quick-create':
      return 'bg-sky-500/25 text-sky-500 dark:text-sky-400';
    case 'product-advert':
      return 'bg-fuchsia-500/25 text-fuchsia-700 dark:text-fuchsia-300';
    case 'video-generation':
      return 'bg-cyan-500/25 text-cyan-500 dark:text-cyan-400';
    case 'carousel':
      return 'bg-teal-500/25 text-teal-500 dark:text-teal-400';
    case 'bulk-create':
    case 'ai-engine':
      return 'bg-indigo-500/25 text-indigo-700 dark:text-indigo-300';
    case 'empty':
      return 'bg-muted/50 text-foreground';
    default:
      return 'bg-orange-500/20 text-orange-700 dark:text-orange-300';
  }
}

type CellEntry = {
  kind: string;
  label: string;
  status?: string;
  note?: string;
  href?: string | null;
  source: 'generated' | 'upcoming';
  eventId?: string;
};

/** Kinds that Force Run can enqueue (including campaign). */
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

function entriesForSlot(args: {
  generated: ContentPlanGeneratedItem[];
  upcoming: ContentPlanUpcomingItem[];
}): CellEntry[] {
  const generated: CellEntry[] = args.generated.map((item) => {
    const isTerminal =
      item.status === 'removed' || item.status === 'rejected';
    return {
      kind: item.kind,
      label: kindLabel(item.kind),
      status: statusLabel(item.status),
      note: isTerminal
        ? undefined
        : item.title?.trim() || item.captionPreview?.trim() || undefined,
      href: isTerminal
        ? null
        : item.scheduledPostId
          ? WORKSPACE_NAV_HREFS.postQueue
          : item.draftId
            ? WORKSPACE_NAV_HREFS.createCampaign
            : null,
      source: 'generated' as const,
    };
  });

  // Keep sibling upcoming cards visible (e.g. festival still pending after a
  // planned Force Run on the same date).
  const upcoming: CellEntry[] = args.upcoming.map((item) => ({
    kind: item.kind,
    label: kindLabel(item.kind),
    note: item.note?.trim() || undefined,
    href: null,
    source: 'upcoming' as const,
    ...(item.eventId ? { eventId: item.eventId } : {}),
  }));

  if (generated.length === 0) return upcoming;
  if (upcoming.length === 0) return generated;
  return [...generated, ...upcoming];
}

function formatDateParts(isoDate: string): { weekday: string; day: string } {
  try {
    const d = parseISO(`${isoDate}T12:00:00`);
    return {
      weekday: format(d, 'EEE'),
      day: format(d, 'MMM d'),
    };
  } catch {
    return { weekday: '', day: isoDate };
  }
}

function forceRunVisualKey(args: {
  date: string;
  platform: ContentPlanPlatform;
  kind: string;
  idx: number;
}): string {
  return `${args.date}::${args.platform}::${args.kind}::${args.idx}`;
}

function PlatformCell({
  date,
  platform,
  entries,
  todayIso,
  forceRunEnabled,
  forceRunKey,
  onForceRun,
}: {
  date: string;
  platform: ContentPlanPlatform;
  entries: CellEntry[];
  todayIso: string;
  forceRunEnabled: boolean;
  forceRunKey: string | null;
  onForceRun: (
    date: string,
    platform: ContentPlanPlatform,
    visualKey: string,
    kind: ContentPlanUpcomingItem['kind'],
    eventId?: string
  ) => void;
}) {
  if (entries.length === 0) {
    return (
      <div className="flex h-full min-h-[3.25rem] items-center justify-center px-2 py-2 text-[11px] text-muted-foreground/70">
        —
      </div>
    );
  }

  const isPast = date < todayIso;
  return (
    <div className="flex h-full min-h-[3.25rem] flex-col gap-1 px-1.5 py-1.5">
      {entries.map((entry, idx) => {
        const runKey = forceRunVisualKey({
          date,
          platform,
          kind: entry.kind,
          idx,
        });
        const isRunning = forceRunKey === runKey;
        const body = (
          <div
            className={cn(
              'cursor-default rounded-md px-1.5 py-1 text-left leading-tight transition hover:brightness-110 hover:ring-2 hover:ring-white/50',
              cellToneClass(entry.kind),
              entry.href && 'hover:ring-primary/60'
            )}
            title={[entry.label, entry.status, entry.note]
              .filter(Boolean)
              .join(' · ')}
          >
            <div className="text-[11px] font-bold tracking-tight">
              {entry.label}
            </div>
            {entry.status ? (
              <div className="text-[10px] font-medium opacity-90">{entry.status}</div>
            ) : entry.source === 'upcoming' && entry.kind !== 'empty' ? (
              <div className="text-[10px] font-medium opacity-90">Planned</div>
            ) : null}
            {entry.note ? (
              <div
                className="mt-0.5 line-clamp-3 text-[10px] font-medium leading-snug opacity-85"
                title={entry.note}
              >
                {entry.note}
              </div>
            ) : null}
          </div>
        );

        const showForceRun =
          forceRunEnabled &&
          !isPast &&
          entry.source === 'upcoming' &&
          canForceRunKind(entry.kind);

        const card = !entry.href ? (
          body
        ) : (
          <Link href={entry.href} className="block">
            {body}
          </Link>
        );

        return (
          <div key={`${entry.kind}-${entry.eventId ?? ''}-${idx}`} className="flex flex-col gap-1">
            {card}
            {showForceRun ? (
              <button
                type="button"
                disabled={Boolean(forceRunKey)}
                onClick={() =>
                  onForceRun(
                    date,
                    platform,
                    runKey,
                    entry.kind as ContentPlanUpcomingItem['kind'],
                    entry.eventId
                  )
                }
                className={cn(
                  'inline-flex items-center justify-center gap-1 rounded-md border border-border/80 bg-background/80 px-1.5 py-1 text-[10px] font-semibold text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60'
                )}
              >
                {isRunning ? (
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                ) : (
                  <Play className="h-3 w-3" aria-hidden />
                )}
                {isRunning ? 'Running…' : 'Force Run'}
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function ContentPlanSheet({
  days,
  platforms,
  todayIso,
  forceRunEnabled,
  forceRunKey,
  onForceRun,
}: {
  days: ContentPlanDay[];
  platforms: ContentPlanPlatform[];
  /** YYYY-MM-DD in the user's timezone — highlighted as Today. */
  todayIso: string;
  forceRunEnabled: boolean;
  forceRunKey: string | null;
  onForceRun: (
    date: string,
    platform: ContentPlanPlatform,
    visualKey: string,
    kind: ContentPlanUpcomingItem['kind'],
    eventId?: string
  ) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-sm">
          <thead>
            <tr className="bg-muted/60">
              <th
                scope="col"
                className="sticky left-0 z-20 w-[7.5rem] border-b border-r border-border bg-muted/95 px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground backdrop-blur-sm"
              >
                Date
              </th>
              {platforms.map((platform) => (
                <th
                  key={platform}
                  scope="col"
                  className="border-b border-r border-border px-2 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground last:border-r-0"
                >
                  <span className="hidden sm:inline">
                    {PLATFORM_LABEL[platform]}
                  </span>
                  <span className="sm:hidden">{PLATFORM_SHORT[platform]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day, rowIdx) => {
              const { weekday, day: dayLabel } = formatDateParts(day.date);
              const festivalNames = day.festivals.map((f) => f.name).join(' · ');
              const isToday = day.date === todayIso;
              const zebra = rowIdx % 2 === 1;

              return (
                <tr
                  key={day.date}
                  className={cn(
                    'align-top transition-colors hover:bg-accent/40',
                    isToday
                      ? 'bg-primary/10 ring-1 ring-inset ring-primary/30'
                      : zebra && 'bg-muted/20'
                  )}
                >
                  <th
                    scope="row"
                    className={cn(
                      'sticky left-0 z-10 border-b border-r border-border px-3 py-2 text-left font-normal backdrop-blur-sm',
                      isToday
                        ? 'bg-primary/15'
                        : zebra
                          ? 'bg-muted/90'
                          : 'bg-card/95'
                    )}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {weekday}
                        {isToday ? (
                          <span className="ml-1 rounded bg-primary px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-foreground">
                            Today
                          </span>
                        ) : null}
                      </span>
                      <span
                        className={cn(
                          'text-[13px] font-semibold',
                          isToday ? 'text-primary' : 'text-foreground'
                        )}
                      >
                        {dayLabel}
                      </span>
                      {festivalNames ? (
                        <span
                          className="mt-0.5 line-clamp-2 text-[10px] font-medium text-amber-700 dark:text-amber-300"
                          title={festivalNames}
                        >
                          {festivalNames}
                        </span>
                      ) : null}
                    </div>
                  </th>
                  {platforms.map((platform) => {
                    const slot = day.byPlatform[platform] ?? {
                      generated: [],
                      upcoming: [],
                    };
                    const entries = entriesForSlot(slot);
                    return (
                      <td
                        key={platform}
                        className="border-b border-r border-border last:border-r-0"
                      >
                        <PlatformCell
                          date={day.date}
                          platform={platform}
                          entries={entries}
                          todayIso={todayIso}
                          forceRunEnabled={forceRunEnabled}
                          forceRunKey={forceRunKey}
                          onForceRun={onForceRun}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const LEGEND: Array<{ kind: string; label: string }> = [
  { kind: 'campaign', label: 'Campaigns' },
  { kind: 'ai-engine', label: 'AI Engine' },
  { kind: 'quick-create', label: 'Content Studio' },
  { kind: 'video-generation', label: 'Video Generator' },
  { kind: 'carousel', label: 'Carousel Posts' },
  { kind: 'festival', label: 'Event Studio' },
  { kind: 'empty', label: 'Empty' },
];

export default function ContentPlanPage() {
  const { user, loading: authLoading } = useAuth();
  const { billing, loading: creditsLoading } = useUserPlanCredits();
  const timeZone = useUserTimezone();
  const todayIso = useMemo(
    () => formatInTimeZone(new Date(), timeZone, 'yyyy-MM-dd'),
    [timeZone]
  );
  const [days, setDays] = useState<ContentPlanDay[]>([]);
  const [range, setRange] = useState<{ from: string; to: string } | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forceRunKey, setForceRunKey] = useState<string | null>(null);
  const [calendarSeeded, setCalendarSeeded] = useState(false);
  const [initialGenerationPending, setInitialGenerationPending] =
    useState(false);
  const [canGenerateCalendar, setCanGenerateCalendar] = useState(false);
  const [generatingCalendar, setGeneratingCalendar] = useState(false);

  const isAuto = billing?.mode === 'auto';
  const hasAccess = isAuto || billing?.mode === 'manual';

  const selectedPlatforms = useMemo((): ContentPlanPlatform[] => {
    const selected = billing?.selected;
    if (!selected) return [];
    const order: ContentPlanPlatform[] = [
      'facebook',
      'instagram',
      'linkedin',
    ];
    return order.filter((p) => selected[p] === true);
  }, [billing?.selected]);

  const platforms = selectedPlatforms;

  const visibleDays = useMemo(() => {
    if (platforms.length === 0) return [];
    return days.map((day) => {
      const byPlatform: ContentPlanDay['byPlatform'] = {};
      for (const platform of platforms) {
        byPlatform[platform] = day.byPlatform[platform] ?? {
          generated: [],
          upcoming: [],
        };
      }
      return { ...day, byPlatform };
    });
  }, [days, platforms]);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      const data = await getContentPlanApi();
      setDays(data.days);
      setRange({ from: data.from, to: data.to });
      setCalendarSeeded(data.calendarSeeded);
      setInitialGenerationPending(data.initialCalendarGenerationPending);
      setCanGenerateCalendar(data.canGenerateCalendar);
      if (silent) setError('');
    } catch (err) {
      const message =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message
          ? String(
              (err as { response?: { data?: { message?: string } } }).response
                ?.data?.message
            )
          : err instanceof Error
            ? err.message
            : 'Failed to load content plan';
      if (!silent) {
        setError(message);
        setDays([]);
      } else {
        toast.error(`Could not refresh calendar: ${message}`);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const handleGenerateCalendar = useCallback(async () => {
    setGeneratingCalendar(true);
    try {
      await generateContentPlanApi();
      toast.success('Your content calendar is ready');
      await load({ silent: true });
    } catch (err) {
      const message =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message
          ? String(
              (err as { response?: { data?: { message?: string } } }).response
                ?.data?.message
            )
          : err instanceof Error
            ? err.message
            : 'Failed to generate content calendar';
      toast.error(message);
    } finally {
      setGeneratingCalendar(false);
    }
  }, [load]);

  const handleForceRun = useCallback(
    async (
      date: string,
      platform: ContentPlanPlatform,
      visualKey: string,
      kind: ContentPlanUpcomingItem['kind'],
      eventId?: string
    ) => {
      if (date < todayIso) {
        toast.error('Force Run is not available for past dates');
        return;
      }
      if (kind === 'empty') {
        toast.error('No planned generation on this date');
        return;
      }
      setForceRunKey(visualKey);
      try {
        await forceRunContentPlanApi({
          date,
          platform,
          kind,
          ...(eventId ? { eventId } : {}),
        });
        toast.success(`Generating for ${platform} on ${date}`);
        // Optimistic: mark only the clicked card as queued; keep sibling
        // upcoming cards (e.g. festival + planned on the same date).
        setDays((prev) =>
          prev.map((day) => {
            if (day.date !== date) return day;
            const slot = day.byPlatform[platform];
            if (!slot) return day;
            const matchesClicked = (u: ContentPlanUpcomingItem) => {
              if (u.kind !== kind) return false;
              if (kind === 'festival' && eventId) {
                return u.eventId === eventId;
              }
              return true;
            };
            const remainingUpcoming = slot.upcoming.filter(
              (u) => !matchesClicked(u)
            );
            const queuedItem = slot.upcoming.find(matchesClicked);
            const queuedGenerated: ContentPlanGeneratedItem[] = queuedItem
              ? [
                  {
                    kind:
                      queuedItem.kind === 'festival'
                        ? 'festive'
                        : (queuedItem.kind as ContentPlanGeneratedItem['kind']),
                    status: 'queued',
                    title: queuedItem.label,
                    captionPreview: queuedItem.note,
                  },
                ]
              : [
                  {
                    kind:
                      kind === 'festival'
                        ? 'festive'
                        : (kind as ContentPlanGeneratedItem['kind']),
                    status: 'queued',
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
          })
        );
        void load({ silent: true });
      } catch (err) {
        const message =
          err &&
          typeof err === 'object' &&
          'response' in err &&
          (err as { response?: { data?: { message?: string } } }).response?.data
            ?.message
            ? String(
                (err as { response?: { data?: { message?: string } } }).response
                  ?.data?.message
              )
            : err instanceof Error
              ? err.message
              : 'Force Run failed';
        toast.error(message);
      } finally {
        setForceRunKey(null);
      }
    },
    [load, todayIso]
  );

  useEffect(() => {
    if (authLoading || creditsLoading) return;
    if (!user) return;
    if (!hasAccess) return;
    // Initial API hydration intentionally owns this page's loading state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [authLoading, creditsLoading, user, hasAccess, load]);

  if (authLoading || creditsLoading) {
    return <PageLoadingState />;
  }

  if (!hasAccess) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <CalendarRange className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Content Calendar needs a plan
        </h1>
        <p className="text-sm text-muted-foreground">
          This overview is available on Auto (AI) and Studio plans.
        </p>
        <Link
          href="/settings/billings"
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          View plans
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-primary">
          <CalendarRange className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-wider">
            {isAuto ? 'Auto mode' : 'Studio mode'}
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Content Calendar
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {isAuto
            ? 'Your plan calendar from start to end — rows are days, columns are platforms. Colored cells show what is already set or still planned.'
            : 'Your plan calendar from start to end — rows are days, columns are platforms. Colored cells show content you have created and scheduled.'}
        </p>
        {range?.from && range?.to ? (
          <p className="text-xs font-medium text-foreground">
            Plan period:{' '}
            <span className="tabular-nums text-muted-foreground">
              {formatDateParts(range.from).day} → {formatDateParts(range.to).day}
            </span>
          </p>
        ) : null}
      </header>

      {platforms.length === 0 && !loading ? (
        <div className="border border-border bg-card px-5 py-8 text-center">
          <Share2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            Select a platform to see your plan
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            The calendar only shows platforms you have selected.
          </p>
          <Link
            href="/ai-engine"
            className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Select Platforms
          </Link>
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading your content plan…
        </div>
      ) : null}

      {error ? (
        <div className="border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
          <button
            type="button"
            onClick={() => void load()}
            className="ml-3 font-semibold underline"
          >
            Retry
          </button>
        </div>
      ) : null}

      {!loading &&
      !error &&
      isAuto &&
      initialGenerationPending &&
      platforms.length > 0 ? (
        <div className="flex min-h-[360px] flex-col items-center justify-center border border-border bg-card px-6 text-center">
          <CalendarRange className="mb-4 h-10 w-10 text-primary" />
          <h2 className="text-xl font-bold text-foreground">
            Generate your content calendar
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            We’ll allocate AI Engine, Content Studio, Video, Carousel, Event,
            and Campaign days across your current plan.
          </p>
          <button
            type="button"
            onClick={() => void handleGenerateCalendar()}
            disabled={!canGenerateCalendar || generatingCalendar}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generatingCalendar ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            {generatingCalendar
              ? 'Generating content calendar…'
              : 'Generate Content Calendar'}
          </button>
          {!canGenerateCalendar ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Complete your business profile and platform selection first.
            </p>
          ) : null}
        </div>
      ) : null}

      {!loading &&
      !error &&
      platforms.length > 0 &&
      (!isAuto || calendarSeeded) ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 px-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Legend
            </span>
            {LEGEND.map((item) => (
              <span
                key={item.kind}
                className={cn(
                  'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold',
                  cellToneClass(item.kind)
                )}
              >
                {item.label}
              </span>
            ))}
          </div>
          {isAuto ? (
            <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              Tip: hover over a cell for details. Force Run appears on planned
              Campaign, Content Studio, AI Engine, Video, Carousel, or Event
              Studio cells — it hides after Force Run, when content is already
              generating/generated, or when the post was removed or rejected by
              the user.
            </p>
          ) : (
            <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              Tip: hover over a cell for details. Empty cells mean no content is
              scheduled yet for that day and platform.
            </p>
          )}
          <ContentPlanSheet
            days={visibleDays}
            platforms={platforms}
            todayIso={todayIso}
            forceRunEnabled={isAuto}
            forceRunKey={forceRunKey}
            onForceRun={handleForceRun}
          />
        </div>
      ) : null}
    </div>
  );
}
