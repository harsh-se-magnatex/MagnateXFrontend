import { ComponentType, useId, type ReactNode } from 'react';
import {
  FileText,
  ExternalLink,
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  Sparkles,
  Snowflake,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { InsightMetric, PageAnalytics, PageTrendKey, Post } from '../../../types';
import { cn } from '@/lib/utils';
import {
  useTimestampFormatter,
  type TimestampInput,
} from '@/lib/user-timezone';

export function formatChartTooltipDate(raw: string): string {
  const d = new Date(raw.includes('T') ? raw : `${raw}T12:00:00`);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Compact +/-% pill rendered next to a stat value, comparing the current
 * 7-day window to the prior 7 days. Green for growth, red for drops,
 * zinc for "flat" or unknown. The "vs last week" hint is intentionally
 * subtle so the badge reads at a glance.
 */
export function DeltaBadge({
  pct,
  className,
}: {
  /** Signed percent change vs the prior 7-day window, or null when unknown. */
  pct: number | null | undefined;
  className?: string;
}) {
  if (pct === null || pct === undefined || !Number.isFinite(pct)) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-0.5 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 ring-1 ring-inset ring-zinc-200',
          className
        )}
        title="Not enough recent data to compare to last week"
      >
        <Minus className="h-3 w-3" aria-hidden /> n/a
      </span>
    );
  }
  const rounded = Math.round(pct * 10) / 10;
  const isFlat = Math.abs(rounded) < 0.05;
  const isUp = rounded > 0;
  const Icon = isFlat ? Minus : isUp ? ArrowUpRight : ArrowDownRight;
  const tone = isFlat
    ? 'bg-zinc-100 text-zinc-600 ring-zinc-200'
    : isUp
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : 'bg-red-50 text-red-700 ring-red-200';
  const sign = isFlat ? '' : isUp ? '+' : '';
  const displayPct = Math.abs(rounded) >= 1000
    ? `${(rounded / 1000).toFixed(1)}k`
    : rounded.toFixed(Math.abs(rounded) < 10 ? 1 : 0);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums ring-1 ring-inset',
        tone,
        className
      )}
      title="Versus the previous 7-day window"
    >
      <Icon className="h-3 w-3" aria-hidden />
      {`${sign}${displayPct}%`}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  className,
  selected,
  onClick,
  delta,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: ComponentType<{ className?: string }>;
  className?: string;
  selected?: boolean;
  onClick?: () => void;
  /** Signed % vs previous 7-day window; `null` renders an "n/a" badge. */
  delta?: number | null;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border bg-white p-4 text-left shadow-sm transition-all',
        'hover:border-zinc-300 hover:bg-zinc-50/90',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2',
        selected
          ? 'border-zinc-900 ring-2 ring-zinc-900/15'
          : 'border-zinc-200',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-zinc-500">{label}</p>
        <Icon className="h-5 w-5 shrink-0 text-zinc-400" aria-hidden />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <p className="text-2xl font-semibold tabular-nums text-zinc-900">
          {value}
        </p>
        {delta !== undefined ? <DeltaBadge pct={delta} /> : null}
      </div>
      {delta !== undefined ? (
        <p className="mt-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
          vs last week
        </p>
      ) : null}
      {hint ? (
        <p className="mt-1.5 text-xs leading-snug text-zinc-400">{hint}</p>
      ) : (
        <p className="mt-1.5 text-xs text-zinc-400">Click for details</p>
      )}
    </button>
  );
}

export function trendSeries(
  page: PageAnalytics | null | undefined,
  trendKey: PageTrendKey
): { date: string; value: number }[] {
  const trend = page?.[trendKey];
  if (!Array.isArray(trend)) return [];
  return [...trend]
    .filter((point) => point?.date)
    .map((point) => ({
      date: String(point.date),
      value: Number(point.value) || 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function trendDelta(
  points: { date: string; value: number }[]
): { change: number; pct: number | null } | null {
  if (points.length < 2) return null;
  const a = points[points.length - 2]?.value ?? 0;
  const b = points[points.length - 1]?.value ?? 0;
  const change = b - a;
  const pct = a !== 0 ? (change / a) * 100 : null;
  return { change, pct };
}

export function formatChartAxisDate(raw: string): string {
  const d = new Date(raw.includes('T') ? raw : `${raw}T12:00:00`);
  if (Number.isNaN(d.getTime())) return raw.slice(5);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

export function GrowthAreaChart({
  title,
  data,
  dataKey,
  config,
  emptyHint = 'No daily data yet — refresh insights from Facebook.',
}: {
  title: string;
  data: { date: string; [key: string]: string | number }[];
  dataKey: string;
  config: ChartConfig;
  /** Shown when `data` is empty (platform-specific messaging). */
  emptyHint?: string;
}) {
  const gradientId = useId().replace(/:/g, '');

  if (data.length === 0) {
    return (
      <div className="flex min-h-[220px] flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-medium text-zinc-700">{title}</p>
        <div className="mt-4 flex flex-1 items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80">
          <span className="text-sm text-zinc-500">{emptyHint}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-zinc-700">{title}</p>
      <ChartContainer
        config={config}
        className="mt-2 aspect-auto h-[260px] w-full sm:h-[280px]"
      >
        <AreaChart
          accessibilityLayer
          data={data}
          margin={{ left: 4, right: 8, top: 8, bottom: 0 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={`var(--color-${dataKey})`}
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor={`var(--color-${dataKey})`}
                stopOpacity={0.02}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            strokeDasharray="4 4"
            className="stroke-zinc-200"
          />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            minTickGap={24}
            tickFormatter={formatChartAxisDate}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={44}
            tickFormatter={(v) => formatCompact(Number(v))}
          />
          <ChartTooltip
            cursor={{ stroke: '#a1a1aa', strokeWidth: 1 }}
            content={
              <ChartTooltipContent
                indicator="line"
                labelFormatter={(label) =>
                  label != null && label !== ''
                    ? formatChartTooltipDate(String(label))
                    : null
                }
                formatter={(value, name) => (
                  <div className="flex w-full min-w-48 items-center justify-between gap-4">
                    <span className="text-muted-foreground capitalize">
                      {String(name)}
                    </span>
                    <span className="font-mono font-medium tabular-nums text-foreground">
                      {Number(value).toLocaleString()}
                    </span>
                  </div>
                )}
              />
            }
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={`var(--color-${dataKey})`}
            fill={`url(#${gradientId})`}
            strokeWidth={2}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

/**
 * Compact pill that classifies an individual post as either a "Nudge"
 * (engagement ≥ 1.5× the visible cohort average) or a "Dud" (everything
 * else). Rendered inline at the top of `TopPostCard` / `InstagramMediaCard`
 * so a quick scan tells the user which posts are worth recreating.
 */
export function NudgeDudBadge({
  kind,
  className,
}: {
  kind: 'nudge' | 'dud';
  className?: string;
}) {
  const isNudge = kind === 'nudge';
  const Icon = isNudge ? Sparkles : Snowflake;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset',
        isNudge
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
          : 'bg-zinc-100 text-zinc-600 ring-zinc-200',
        className
      )}
      title={
        isNudge
          ? 'Outperformer — at least 1.5× the average engagement in this window'
          : 'Below the 1.5× engagement bar — review and iterate'
      }
    >
      <Icon className="h-3 w-3" aria-hidden />
      {isNudge ? 'Nudge' : 'Dud'}
    </span>
  );
}

export function TopPostCard({
  post,
  rank,
  onExpandImage,
  externalSiteName = 'Facebook',
  classification,
}: {
  post: Post;
  rank: number;
  onExpandImage?: (post: Post) => void;
  /** e.g. "LinkedIn" for permalink label */
  externalSiteName?: string;
  /** Nudge/Dud classification (computed in the parent against the cohort). */
  classification?: 'nudge' | 'dud';
}) {
  const fmtTimestamp = useTimestampFormatter();
  const preview = post.message?.trim().slice(0, 160) || 'No caption';
  const ellipsis = post.message && post.message.length > 160 ? '…' : '';
  const permalink = post.permalinkUrl?.trim();
  const canOpenDetails = Boolean(onExpandImage) && externalSiteName === 'LinkedIn';

  return (
    <article className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-stretch">
        {post.mediaUrl ? (
          <button
            type="button"
            onClick={() => onExpandImage?.(post)}
            className="group relative h-36 w-full shrink-0 cursor-zoom-in overflow-hidden rounded-lg border-0 bg-zinc-100 p-0 text-left ring-offset-2 transition-opacity hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 sm:h-auto sm:w-40"
            aria-label="Open image in larger view"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.mediaUrl}
              alt=""
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            />
            <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/50 to-transparent py-2 pl-2 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              View larger
            </span>
          </button>
        ) : canOpenDetails ? (
          <button
            type="button"
            onClick={() => onExpandImage?.(post)}
            className="flex h-36 w-full shrink-0 cursor-zoom-in items-center justify-center rounded-lg bg-zinc-100 text-zinc-400 ring-offset-2 transition-colors hover:bg-zinc-200/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 sm:h-auto sm:w-40"
            aria-label="Open post details"
          >
            <FileText className="h-10 w-10" aria-hidden />
          </button>
        ) : (
          <div className="flex h-36 w-full shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400 sm:h-auto sm:w-40">
            <FileText className="h-10 w-10" aria-hidden />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-500">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-800">
              {rank}
            </span>
            <span>
              {fmtTimestamp(post.createdAt as TimestampInput, {
                style: 'date',
              })}
            </span>
            {post.type ? (
              <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-600">
                {post.type}
              </span>
            ) : null}
            {classification ? <NudgeDudBadge kind={classification} /> : null}
            {permalink ? (
              <a
                href={permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex items-center gap-1 text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
              >
                Open on {externalSiteName}
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            ) : null}
          </div>
          <p className="mt-2 line-clamp-3 text-sm text-zinc-800">
            {preview}
            {ellipsis}
          </p>
          <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600">
            <div>
              <dt className="inline text-zinc-500">Reactions </dt>
              <dd className="inline font-medium tabular-nums text-zinc-800">
                {formatCompact(post.reactions)}
              </dd>
            </div>
            <div>
              <dt className="inline text-zinc-500">Comments </dt>
              <dd className="inline font-medium tabular-nums text-zinc-800">
                {formatCompact(post.comments)}
              </dd>
            </div>
            <div>
              <dt className="inline text-zinc-500">Shares </dt>
              <dd className="inline font-medium tabular-nums text-zinc-800">
                {formatCompact(post.shares)}
              </dd>
            </div>
            <div>
              <dt className="inline text-zinc-500">Score </dt>
              <dd className="inline font-medium tabular-nums text-zinc-800">
                {formatCompact(post.engagementScore)}
              </dd>
            </div>
            {post.impressions != null ? (
              <div>
                <dt className="inline text-zinc-500">Impressions </dt>
                <dd className="inline font-medium tabular-nums text-zinc-800">
                  {formatCompact(post.impressions)}
                </dd>
              </div>
            ) : null}
            {post.uniqueImpressions != null ? (
              <div>
                <dt className="inline text-zinc-500">Unique </dt>
                <dd className="inline font-medium tabular-nums text-zinc-800">
                  {formatCompact(post.uniqueImpressions)}
                </dd>
              </div>
            ) : null}
            {post.clicks != null ? (
              <div>
                <dt className="inline text-zinc-500">Clicks </dt>
                <dd className="inline font-medium tabular-nums text-zinc-800">
                  {formatCompact(post.clicks)}
                </dd>
              </div>
            ) : null}
            {post.engagementRate != null ? (
              <div>
                <dt className="inline text-zinc-500">Eng. rate </dt>
                <dd className="inline font-medium tabular-nums text-zinc-800">
                  {post.engagementRate.toFixed(1)}%
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>
    </article>
  );
}

export function InsightDetailPanel({
  metric,
  merged,
  postCount,
}: {
  metric: InsightMetric;
  merged: {
    followersTrend: { date: string; value: number }[];
    reachTrend: { date: string; value: number }[];
    uniqueReachTrend: { date: string; value: number }[];
    engagementsTrend: { date: string; value: number }[];
    totalReach: number;
    totalUniqueReach: number;
    totalEngagementsPage: number;
    engagementsFromPosts: number;
    postFrequencyTop: { date: string; count: number }[];
  };
  postCount: number;
}) {
  const fd = trendDelta(merged.followersTrend);
  const rd = trendDelta(merged.reachTrend);
  const ed = trendDelta(merged.engagementsTrend);

  const fmtDelta = (d: { change: number; pct: number | null } | null) => {
    if (!d) return null;
    const sign = d.change > 0 ? '+' : '';
    const pct =
      d.pct != null && Number.isFinite(d.pct)
        ? ` (${sign}${d.pct.toFixed(1)}% vs prior period)`
        : '';
    return `${sign}${formatCompact(d.change)}${pct}`;
  };

  return (
    <div
      className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 text-sm text-zinc-700"
      role="region"
      aria-live="polite"
    >
      {metric === 'followers' ? (
        <div className="space-y-2">
          <p className="font-medium text-zinc-900">Followers</p>
          <p>
            Followers for your selected Facebook page. The Growth chart below
            shows how this changed over the reported periods.
          </p>
          {fmtDelta(fd) ? (
            <p className="text-xs text-zinc-600">
              Latest change vs previous bucket:{' '}
              <span className="font-medium tabular-nums text-zinc-800">
                {fmtDelta(fd)}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}
      {metric === 'reach' ? (
        <div className="space-y-2">
          <p className="font-medium text-zinc-900">Reach</p>
          <p>
            <span className="font-medium tabular-nums text-zinc-900">
              {formatCompact(merged.totalReach)}
            </span>{' '}
            media views (reach)
            {merged.totalUniqueReach > 0 ? (
              <>
                {' · '}
                <span className="font-medium tabular-nums text-zinc-900">
                  {formatCompact(merged.totalUniqueReach)}
                </span>{' '}
                unique media views
              </>
            ) : null}
            .
          </p>
          {fmtDelta(rd) ? (
            <p className="text-xs text-zinc-600">
              Reach vs previous period:{' '}
              <span className="font-medium tabular-nums text-zinc-800">
                {fmtDelta(rd)}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}
      {metric === 'posts' ? (
        <div className="space-y-2">
          <p className="font-medium text-zinc-900">Posts</p>
          <p>
            <span className="font-medium tabular-nums text-zinc-900">
              {postCount}
            </span>{' '}
            posts stored for analytics for this page.
          </p>
          {merged.postFrequencyTop.length > 0 ? (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Recent days by volume
              </p>
              <ul className="flex flex-wrap gap-2">
                {merged.postFrequencyTop.map(({ date, count }) => (
                  <li
                    key={date}
                    className="rounded-lg bg-white px-2.5 py-1 text-xs ring-1 ring-zinc-200"
                  >
                    <span className="text-zinc-500">
                      {formatChartTooltipDate(date)}
                    </span>{' '}
                    <span className="font-medium tabular-nums text-zinc-900">
                      ×{count}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
      {metric === 'engagement' ? (
        <div className="space-y-2">
          <p className="font-medium text-zinc-900">Engagement</p>
          {merged.totalEngagementsPage > 0 ? (
            <p>
              Page-level post engagements (Meta insight):{' '}
              <span className="font-medium tabular-nums text-zinc-900">
                {formatCompact(merged.totalEngagementsPage)}
              </span>
              .
            </p>
          ) : (
            <p>
              Sum of reactions, comments, and shares across stored posts:{' '}
              <span className="font-medium tabular-nums text-zinc-900">
                {formatCompact(merged.engagementsFromPosts)}
              </span>
              .
            </p>
          )}
          {fmtDelta(ed) ? (
            <p className="text-xs text-zinc-600">
              Page engagements vs previous period:{' '}
              <span className="font-medium tabular-nums text-zinc-800">
                {fmtDelta(ed)}
              </span>
            </p>
          ) : null}
          <p className="text-xs text-zinc-500">
            Open <strong className="text-zinc-700">Top posts</strong> below for
            per-post breakdown (impressions, clicks, rate).
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function TopPostImageDialog({
  post,
  open,
  onOpenChange,
  aiFooter,
  externalSiteName = 'Facebook',
}: {
  post: Post | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aiFooter?: ReactNode;
  externalSiteName?: string;
}) {
  const fmtTimestamp = useTimestampFormatter();
  if (!post) return null;

  const caption = post.message?.trim() || 'No caption';
  const dateLabel = post.createdAt
    ? fmtTimestamp(post.createdAt as TimestampInput)
    : null;
  const permalink = post.permalinkUrl?.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="max-h-[90vh] max-w-[calc(100%-1.5rem)] gap-0 overflow-hidden p-0 sm:max-w-2xl lg:max-w-3xl"
      >
        <div className="max-h-[inherit] overflow-y-auto">
          {post.mediaUrl ? (
            <div className="flex max-h-[min(70vh,720px)] items-center justify-center bg-zinc-950/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.mediaUrl}
                alt=""
                className="h-auto max-h-[min(70vh,720px)] w-full object-contain"
              />
            </div>
          ) : (
            <div className="flex min-h-48 items-center justify-center bg-zinc-950/5 text-zinc-400">
              <FileText className="h-14 w-14" aria-hidden />
            </div>
          )}
          <DialogHeader className="gap-1 border-t border-zinc-200 p-4 text-left sm:p-5">
            <DialogTitle className="text-base text-zinc-900">
              Top post preview
            </DialogTitle>
            <DialogDescription className="sr-only">
              Enlarged post image with full caption and engagement metrics.
            </DialogDescription>
            {dateLabel ? (
              <p className="text-xs text-zinc-500">{dateLabel}</p>
            ) : null}
            {permalink ? (
              <a
                href={permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
              >
                View on {externalSiteName}
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            ) : null}
            <p className="pt-2 text-sm leading-relaxed text-zinc-800 whitespace-pre-wrap">
              {caption}
            </p>
            <dl className="flex flex-wrap gap-x-5 gap-y-2 border-t border-zinc-100 pt-3 text-xs text-zinc-600">
              <div>
                <dt className="text-zinc-500">Reactions</dt>
                <dd className="font-medium tabular-nums text-zinc-900">
                  {formatCompact(post.reactions)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Comments</dt>
                <dd className="font-medium tabular-nums text-zinc-900">
                  {formatCompact(post.comments)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Shares</dt>
                <dd className="font-medium tabular-nums text-zinc-900">
                  {formatCompact(post.shares)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Engagement score</dt>
                <dd className="font-medium tabular-nums text-zinc-900">
                  {formatCompact(post.engagementScore)}
                </dd>
              </div>
              {post.impressions != null ? (
                <div>
                  <dt className="text-zinc-500">Impressions</dt>
                  <dd className="font-medium tabular-nums text-zinc-900">
                    {formatCompact(post.impressions)}
                  </dd>
                </div>
              ) : null}
              {post.uniqueImpressions != null ? (
                <div>
                  <dt className="text-zinc-500">Unique impressions</dt>
                  <dd className="font-medium tabular-nums text-zinc-900">
                    {formatCompact(post.uniqueImpressions)}
                  </dd>
                </div>
              ) : null}
              {post.clicks != null ? (
                <div>
                  <dt className="text-zinc-500">Clicks</dt>
                  <dd className="font-medium tabular-nums text-zinc-900">
                    {formatCompact(post.clicks)}
                  </dd>
                </div>
              ) : null}
              {post.engagementRate != null ? (
                <div>
                  <dt className="text-zinc-500">Engagement rate</dt>
                  <dd className="font-medium tabular-nums text-zinc-900">
                    {post.engagementRate.toFixed(1)}%
                  </dd>
                </div>
              ) : null}
            </dl>
            {aiFooter}
            {post.commentsList && post.commentsList.length > 0 ? (
              <div className="border-t border-zinc-100 pt-3">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Recent comments
                </p>
                <ul className="mt-2 space-y-2">
                  {post.commentsList.slice(0, 5).map((comment, index) => (
                    <li
                      key={`${comment.message}-${index}`}
                      className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-700"
                    >
                      {comment.message || 'Empty comment'}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </DialogHeader>
        </div>
      </DialogContent>
    </Dialog>
  );
}

