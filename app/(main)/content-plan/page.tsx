'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import {
  CalendarRange,
  Loader2,
  PartyPopper,
  Sparkles,
  Share2,
} from 'lucide-react';
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

function kindLabel(kind: ContentPlanGeneratedKind | string): string {
  switch (kind) {
    case 'campaign':
      return 'Campaign';
    case 'ai-engine':
      return 'AI Engine';
    case 'bulk-create':
      return 'Bulk Create';
    case 'quick-create':
      return 'Quick Create';
    case 'product-advert':
      return 'Product Advert';
    case 'video-generation':
      return 'Video Generation';
    case 'carousel':
      return 'Carousel';
    case 'festive':
      return 'Festive';
    default:
      if (typeof kind === 'string' && kind.toLowerCase().includes('campaign')) {
        return 'Campaign';
      }
      return 'Generated';
  }
}

function statusLabel(status: ContentPlanGeneratedItem['status']): string {
  switch (status) {
    case 'draft':
      return 'Will schedule';
    case 'queued':
      return 'Generating';
    case 'scheduled':
      return 'Scheduled';
    default:
      return status;
  }
}

function kindBadgeClass(kind: ContentPlanGeneratedKind): string {
  switch (kind) {
    case 'campaign':
      return 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300';
    case 'festive':
      return 'bg-amber-500/15 text-amber-800 border-amber-500/30 dark:text-amber-300';
    case 'quick-create':
      return 'bg-sky-500/15 text-sky-800 border-sky-500/30 dark:text-sky-300';
    case 'product-advert':
      return 'bg-violet-500/15 text-violet-800 border-violet-500/30 dark:text-violet-300';
    case 'video-generation':
      return 'bg-cyan-500/15 text-cyan-800 border-cyan-500/30 dark:text-cyan-300';
    case 'carousel':
      return 'bg-teal-500/15 text-teal-800 border-teal-500/30 dark:text-teal-300';
    case 'bulk-create':
    case 'ai-engine':
      return 'bg-primary/15 text-primary border-primary/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

function GeneratedRow({ item }: { item: ContentPlanGeneratedItem }) {
  const href = item.scheduledPostId
    ? '/scheduled-post'
    : item.draftId
      ? '/create-campaign'
      : null;
  const body = (
    <div className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2.5">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              'inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
              kindBadgeClass(item.kind)
            )}
          >
            {kindLabel(item.kind)}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {statusLabel(item.status)}
          </span>
        </div>
        {item.title ? (
          <p className="text-sm font-medium text-foreground">{item.title}</p>
        ) : item.kind === 'campaign' ? (
          <p className="text-sm font-medium text-foreground">Campaign post</p>
        ) : item.kind === 'video-generation' ? (
          <p className="text-sm font-medium text-foreground">Video post</p>
        ) : item.kind === 'carousel' ? (
          <p className="text-sm font-medium text-foreground">Carousel post</p>
        ) : null}
        {item.captionPreview ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {item.captionPreview}
          </p>
        ) : null}
      </div>
      {href ? (
        <span className="shrink-0 text-[11px] font-semibold text-primary">
          View →
        </span>
      ) : null}
    </div>
  );
  if (!href) return body;
  return (
    <Link href={href} className="block transition hover:opacity-90">
      {body}
    </Link>
  );
}

function UpcomingRow({ item }: { item: ContentPlanUpcomingItem }) {
  const isFestival = item.kind === 'festival';
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs',
        isFestival
          ? 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200'
          : 'border-dashed border-primary/40 bg-primary/10 text-foreground'
      )}
    >
      {isFestival ? (
        <PartyPopper className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-300" />
      ) : (
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
      )}
      <span className="font-medium leading-snug">{item.label}</span>
    </div>
  );
}

function DayCard({ day }: { day: ContentPlanDay }) {
  const dateLabel = useMemo(() => {
    try {
      return format(parseISO(`${day.date}T12:00:00`), 'EEE, MMM d, yyyy');
    } catch {
      return day.date;
    }
  }, [day.date]);

  const platforms = Object.keys(day.byPlatform) as ContentPlanPlatform[];

  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">{dateLabel}</h2>
        {day.festivals.length > 0 ? (
          <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
            {day.festivals.map((f) => f.name).join(' · ')}
          </p>
        ) : null}
      </header>
      <div className="space-y-4">
        {platforms.map((platform) => {
          const slot = day.byPlatform[platform];
          if (!slot) return null;
          return (
            <section key={platform} className="space-y-2">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {PLATFORM_LABEL[platform]}
              </h3>
              {slot.generated.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Already set
                  </p>
                  {slot.generated.map((item, idx) => (
                    <GeneratedRow
                      key={`${item.kind}-${item.draftId ?? item.scheduledPostId ?? idx}`}
                      item={item}
                    />
                  ))}
                </div>
              ) : null}
              {slot.upcoming.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Coming from auto
                  </p>
                  {slot.upcoming.map((item, idx) => (
                    <UpcomingRow
                      key={`${item.kind}-${idx}-${item.label}`}
                      item={item}
                    />
                  ))}
                </div>
              ) : null}
              {slot.generated.length === 0 && slot.upcoming.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nothing planned.</p>
              ) : null}
            </section>
          );
        })}
      </div>
    </article>
  );
}

export default function ContentPlanPage() {
  const { user, loading: authLoading } = useAuth();
  const { billing, loading: creditsLoading } = useUserPlanCredits();
  const [days, setDays] = useState<ContentPlanDay[]>([]);
  const [platforms, setPlatforms] = useState<ContentPlanPlatform[]>([]);
  const [range, setRange] = useState<{ from: string; to: string } | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isAuto = billing?.mode === 'auto';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getContentPlanApi();
      setDays(data.days);
      setPlatforms(data.platforms);
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
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
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
        <p className="max-w-xl text-sm text-muted-foreground">
          What is already set for each day, and what auto-mode will still
          generate (festive posts always run when the calendar has a festival;
          AI fills empty days).
        </p>
        {range?.from && range?.to ? (
          <p className="text-xs text-muted-foreground">
            Showing {range.from} → {range.to}
          </p>
        ) : null}
      </header>

      {platforms.length === 0 && !loading ? (
        <div className="rounded-2xl border border-border bg-card px-5 py-8 text-center">
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
            Linked Profiles
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
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
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
        <div className="space-y-4">
          {days.map((day) => (
            <DayCard key={day.date} day={day} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
