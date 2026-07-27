'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { CalendarRange, Loader2, Share2 } from 'lucide-react';
import { PageLoadingState } from '@/components/shared/PageLoadingState';
import { useAuth } from '@/src/hooks/useAuth';
import { useUserPlanCredits } from '../_components/UserPlanCreditsProvider';
import {
  getContentPlanApi,
  type ContentPlanDay,
  type ContentPlanGeneratedItem,
  type ContentPlanGeneratedKind,
  type ContentPlanPlatform,
  type ContentPlanUpcomingItem,
} from '@/src/service/api/content-plan.service';
import { cn } from '@/lib/utils';

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
      return 'Bulk Creator';
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
      return 'Holiday & Festival Posts';
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
};

function entriesForSlot(args: {
  generated: ContentPlanGeneratedItem[];
  upcoming: ContentPlanUpcomingItem[];
}): CellEntry[] {
  const generated: CellEntry[] = args.generated.map((item) => ({
    kind: item.kind,
    label: kindLabel(item.kind),
    status: statusLabel(item.status),
    note: item.title?.trim() || item.captionPreview?.trim() || undefined,
    href: item.scheduledPostId
      ? '/scheduled-post'
      : item.draftId
        ? '/create-campaign'
        : null,
    source: 'generated',
  }));

  if (generated.length > 0) return generated;

  return args.upcoming.map((item) => ({
    kind: item.kind,
    label: kindLabel(item.kind),
    note: item.note?.trim() || undefined,
    href: null,
    source: 'upcoming',
  }));
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

function PlatformCell({ entries }: { entries: CellEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="flex h-full min-h-[3.25rem] items-center justify-center px-2 py-2 text-[11px] text-muted-foreground/70">
        —
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[3.25rem] flex-col gap-1 px-1.5 py-1.5">
      {entries.map((entry, idx) => {
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
          </div>
        );

        if (!entry.href) {
          return <div key={`${entry.kind}-${idx}`}>{body}</div>;
        }
        return (
          <Link key={`${entry.kind}-${idx}`} href={entry.href} className="block">
            {body}
          </Link>
        );
      })}
    </div>
  );
}

function ContentPlanSheet({
  days,
  platforms,
}: {
  days: ContentPlanDay[];
  platforms: ContentPlanPlatform[];
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
              const zebra = rowIdx % 2 === 1;

              return (
                <tr
                  key={day.date}
                  className={cn(
                    'align-top transition-colors hover:bg-accent/40',
                    zebra && 'bg-muted/20'
                  )}
                >
                  <th
                    scope="row"
                    className={cn(
                      'sticky left-0 z-10 border-b border-r border-border px-3 py-2 text-left font-normal backdrop-blur-sm',
                      zebra ? 'bg-muted/90' : 'bg-card/95'
                    )}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {weekday}
                      </span>
                      <span className="text-[13px] font-semibold text-foreground">
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
                        <PlatformCell entries={entries} />
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
  { kind: 'festival', label: 'Holiday & Festival Posts' },
  { kind: 'empty', label: 'Empty' },
];

export default function ContentPlanPage() {
  const { user, loading: authLoading } = useAuth();
  const { billing, loading: creditsLoading } = useUserPlanCredits();
  const [days, setDays] = useState<ContentPlanDay[]>([]);
  const [range, setRange] = useState<{ from: string; to: string } | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isAuto = billing?.mode === 'auto';

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

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getContentPlanApi();
      setDays(data.days);
      setRange({ from: data.from, to: data.to });
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
      setError(message);
      setDays([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || creditsLoading) return;
    if (!user) return;
    if (!isAuto) {
      setLoading(false);
      return;
    }
    void load();
  }, [authLoading, creditsLoading, user, isAuto, load]);

  if (authLoading || creditsLoading) {
    return <PageLoadingState />;
  }

  if (!isAuto) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <CalendarRange className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Content Plan is for AI plans
        </h1>
        <p className="text-sm text-muted-foreground">
          This overview of upcoming auto-generated posts is available on Auto
          (AI) plans only.
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
            Auto mode
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Content Plan
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Spreadsheet view of your auto calendar — rows are days, columns are
          platforms. Colored cells show what is already set or still planned.
        </p>
        {range?.from && range?.to ? (
          <p className="text-xs text-muted-foreground">
            {range.from} → {range.to}
          </p>
        ) : null}
      </header>

      {platforms.length === 0 && !loading ? (
        <div className="border border-border bg-card px-5 py-8 text-center">
          <Share2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            Connect a platform to see your plan
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Auto-mode only schedules for platforms you have selected.
          </p>
          <Link
            href="/social-media-integration"
            className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Connected Accounts
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

      {!loading && !error && platforms.length > 0 ? (
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
          <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            Tip: hover over a cell to see full details.
          </p>
          <ContentPlanSheet days={visibleDays} platforms={platforms} />
        </div>
      ) : null}
    </div>
  );
}
