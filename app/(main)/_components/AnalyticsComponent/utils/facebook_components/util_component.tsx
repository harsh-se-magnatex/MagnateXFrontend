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
import { PostMediaPreview } from '@/components/shared/PostMediaPreview';
import { AnalyticsPostMediaCarousel, AnalyticsPostMediaThumbnail } from '@/components/shared/AnalyticsPostMediaCarousel';
import { resolveSchedulableMediaPreview } from '@/lib/post-media-preview';
import {
  collectPostImageUrls,
  isMultiImageAnalyticsPost,
} from '@/lib/analytics-post-media';

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
          'inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-inset ring-border',
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
    ? 'bg-muted text-muted-foreground ring-border'
    : isUp
      ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30'
      : 'bg-red-500/15 text-red-300 ring-red-500/30';
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
        'rounded-xl border bg-card p-4 text-left shadow-sm transition-all',
        'hover:border-border hover:bg-muted/50',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2',
        selected
          ? 'border-primary ring-2 ring-primary/25'
          : 'border-border',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <Icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <p className="text-2xl font-semibold tabular-nums text-foreground">
          {value}
        </p>
        {delta !== undefined ? <DeltaBadge pct={delta} /> : null}
      </div>
      {delta !== undefined ? (
        <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          vs last week
        </p>
      ) : null}
      {hint ? (
        <p className="mt-1.5 text-xs leading-snug text-muted-foreground">{hint}</p>
      ) : (
        <p className="mt-1.5 text-xs text-muted-foreground">Click for details</p>
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
      <div className="flex min-h-[220px] flex-col rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <div className="mt-4 flex flex-1 items-center justify-center rounded-lg border border-dashed border-border bg-muted/60">
          <span className="text-sm text-muted-foreground">{emptyHint}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-sm font-medium text-foreground">{title}</p>
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
          ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30'
          : 'bg-muted text-muted-foreground ring-border',
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

function facebookPostMediaPreview(post: Post) {
  const imageUrls = collectPostImageUrls(post);
  const isMulti = isMultiImageAnalyticsPost(post);
  return resolveSchedulableMediaPreview({
    mediaType:
      post.mediaType === 'video' || post.type === 'video'
        ? 'video'
        : isMulti
          ? 'carousel'
          : 'image',
    imageUrl: imageUrls[0] ?? post.mediaUrl,
    videoUrl: post.videoUrl,
    videoPosterUrl: imageUrls[0] ?? post.mediaUrl,
  });
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
  const mediaPreview = facebookPostMediaPreview(post);
  const imageUrls = collectPostImageUrls(post);
  const isCarousel = isMultiImageAnalyticsPost(post) && imageUrls.length > 1;
  const hasMedia = imageUrls.length > 0 || Boolean(post.videoUrl?.trim());

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-stretch">
        {hasMedia ? (
          <button
            type="button"
            onClick={() => onExpandImage?.(post)}
            className="group relative h-36 w-full shrink-0 cursor-zoom-in overflow-hidden rounded-lg border-0 bg-muted p-0 text-left ring-offset-2 transition-opacity hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-border sm:h-auto sm:w-40"
            aria-label={
              isCarousel
                ? `Open carousel preview, ${imageUrls.length} images`
                : mediaPreview.isVideo
                  ? 'Open video preview'
                  : 'Open image in larger view'
            }
          >
            {isCarousel ? (
              <AnalyticsPostMediaThumbnail urls={imageUrls} className="h-full w-full" />
            ) : (
              <PostMediaPreview
                preview={mediaPreview}
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                videoClassName="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                imageClassName="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                muted
                playsInline
                preload="metadata"
              />
            )}
            <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/50 to-transparent py-2 pl-2 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              {isCarousel
                ? `View carousel (${imageUrls.length})`
                : mediaPreview.isVideo
                  ? 'View video'
                  : 'View larger'}
            </span>
          </button>
        ) : canOpenDetails ? (
          <button
            type="button"
            onClick={() => onExpandImage?.(post)}
            className="flex h-36 w-full shrink-0 cursor-zoom-in items-center justify-center rounded-lg bg-muted text-muted-foreground ring-offset-2 transition-colors hover:bg-accent/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-border sm:h-auto sm:w-40"
            aria-label="Open post details"
          >
            <FileText className="h-10 w-10" aria-hidden />
          </button>
        ) : (
          <div className="flex h-36 w-full shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground sm:h-auto sm:w-40">
            <FileText className="h-10 w-10" aria-hidden />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-amber-300">
              {rank}
            </span>
            <span>
              {fmtTimestamp(post.createdAt as TimestampInput, {
                style: 'date',
              })}
            </span>
            {post.type ? (
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                {post.type}
              </span>
            ) : null}
            {classification ? <NudgeDudBadge kind={classification} /> : null}
            {permalink ? (
              <a
                href={permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex items-center gap-1 text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Open on {externalSiteName}
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            ) : null}
          </div>
          <p className="mt-2 line-clamp-3 text-sm text-foreground">
            {preview}
            {ellipsis}
          </p>
          <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <div>
              <dt className="inline text-muted-foreground">Reactions </dt>
              <dd className="inline font-medium tabular-nums text-foreground">
                {formatCompact(post.reactions)}
              </dd>
            </div>
            <div>
              <dt className="inline text-muted-foreground">Comments </dt>
              <dd className="inline font-medium tabular-nums text-foreground">
                {formatCompact(post.comments)}
              </dd>
            </div>
            <div>
              <dt className="inline text-muted-foreground">Shares </dt>
              <dd className="inline font-medium tabular-nums text-foreground">
                {formatCompact(post.shares)}
              </dd>
            </div>
            <div>
              <dt className="inline text-muted-foreground">Score </dt>
              <dd className="inline font-medium tabular-nums text-foreground">
                {formatCompact(post.engagementScore)}
              </dd>
            </div>
            {post.impressions != null ? (
              <div>
                <dt className="inline text-muted-foreground">Impressions </dt>
                <dd className="inline font-medium tabular-nums text-foreground">
                  {formatCompact(post.impressions)}
                </dd>
              </div>
            ) : null}
            {post.uniqueImpressions != null ? (
              <div>
                <dt className="inline text-muted-foreground">Unique </dt>
                <dd className="inline font-medium tabular-nums text-foreground">
                  {formatCompact(post.uniqueImpressions)}
                </dd>
              </div>
            ) : null}
            {post.clicks != null ? (
              <div>
                <dt className="inline text-muted-foreground">Clicks </dt>
                <dd className="inline font-medium tabular-nums text-foreground">
                  {formatCompact(post.clicks)}
                </dd>
              </div>
            ) : null}
            {post.engagementRate != null ? (
              <div>
                <dt className="inline text-muted-foreground">Eng. rate </dt>
                <dd className="inline font-medium tabular-nums text-foreground">
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
      className="rounded-xl border border-border bg-muted/60 p-4 text-sm text-foreground"
      role="region"
      aria-live="polite"
    >
      {metric === 'followers' ? (
        <div className="space-y-2">
          <p className="font-medium text-foreground">Followers</p>
          <p>
            Followers for your selected Facebook page. The Growth chart below
            shows how this changed over the reported periods.
          </p>
          {fmtDelta(fd) ? (
            <p className="text-xs text-muted-foreground">
              Latest change vs previous bucket:{' '}
              <span className="font-medium tabular-nums text-foreground">
                {fmtDelta(fd)}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}
      {metric === 'reach' ? (
        <div className="space-y-2">
          <p className="font-medium text-foreground">Reach</p>
          <p>
            <span className="font-medium tabular-nums text-foreground">
              {formatCompact(merged.totalReach)}
            </span>{' '}
            media views (reach)
            {merged.totalUniqueReach > 0 ? (
              <>
                {' · '}
                <span className="font-medium tabular-nums text-foreground">
                  {formatCompact(merged.totalUniqueReach)}
                </span>{' '}
                unique media views
              </>
            ) : null}
            .
          </p>
          {fmtDelta(rd) ? (
            <p className="text-xs text-muted-foreground">
              Reach vs previous period:{' '}
              <span className="font-medium tabular-nums text-foreground">
                {fmtDelta(rd)}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}
      {metric === 'posts' ? (
        <div className="space-y-2">
          <p className="font-medium text-foreground">Posts</p>
          <p>
            <span className="font-medium tabular-nums text-foreground">
              {postCount}
            </span>{' '}
            posts stored for analytics for this page.
          </p>
          {merged.postFrequencyTop.length > 0 ? (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Recent days by volume
              </p>
              <ul className="flex flex-wrap gap-2">
                {merged.postFrequencyTop.map(({ date, count }) => (
                  <li
                    key={date}
                    className="rounded-lg bg-card px-2.5 py-1 text-xs ring-1 ring-border"
                  >
                    <span className="text-muted-foreground">
                      {formatChartTooltipDate(date)}
                    </span>{' '}
                    <span className="font-medium tabular-nums text-foreground">
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
          <p className="font-medium text-foreground">Engagement</p>
          {merged.totalEngagementsPage > 0 ? (
            <p>
              Page-level post engagements (Meta insight):{' '}
              <span className="font-medium tabular-nums text-foreground">
                {formatCompact(merged.totalEngagementsPage)}
              </span>
              .
            </p>
          ) : (
            <p>
              Sum of reactions, comments, and shares across stored posts:{' '}
              <span className="font-medium tabular-nums text-foreground">
                {formatCompact(merged.engagementsFromPosts)}
              </span>
              .
            </p>
          )}
          {fmtDelta(ed) ? (
            <p className="text-xs text-muted-foreground">
              Page engagements vs previous period:{' '}
              <span className="font-medium tabular-nums text-foreground">
                {fmtDelta(ed)}
              </span>
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Open <strong className="text-foreground">Top posts</strong> below for
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
  const mediaPreview = facebookPostMediaPreview(post);
  const imageUrls = collectPostImageUrls(post);
  const isCarousel = isMultiImageAnalyticsPost(post) && imageUrls.length > 1;
  const hasMedia = imageUrls.length > 0 || Boolean(post.videoUrl?.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="max-h-[90vh] max-w-[calc(100%-1.5rem)] gap-0 overflow-hidden p-0 sm:max-w-2xl lg:max-w-3xl"
      >
        <div className="max-h-[inherit] overflow-y-auto">
          {hasMedia ? (
            <div className="flex max-h-[min(70vh,720px)] items-center justify-center bg-background/40">
              {isCarousel ? (
                <AnalyticsPostMediaCarousel urls={imageUrls} className="w-full" />
              ) : (
                <PostMediaPreview
                  preview={mediaPreview}
                  className="h-auto max-h-[min(70vh,720px)] w-full object-contain"
                  videoClassName="h-auto max-h-[min(70vh,720px)] w-full object-contain"
                  imageClassName="h-auto max-h-[min(70vh,720px)] w-full object-contain"
                  controls={mediaPreview.isVideo}
                  muted={!mediaPreview.isVideo}
                  playsInline
                  preload="metadata"
                />
              )}
            </div>
          ) : (
            <div className="flex min-h-48 items-center justify-center bg-background/40 text-muted-foreground">
              <FileText className="h-14 w-14" aria-hidden />
            </div>
          )}
          <DialogHeader className="gap-1 border-t border-border p-4 text-left sm:p-5">
            <DialogTitle className="text-base text-foreground">
              {isCarousel ? 'Carousel preview' : 'Top post preview'}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {isCarousel
                ? 'Swipeable carousel with full caption and engagement metrics.'
                : 'Enlarged post image with full caption and engagement metrics.'}
            </DialogDescription>
            {dateLabel ? (
              <p className="text-xs text-muted-foreground">{dateLabel}</p>
            ) : null}
            {permalink ? (
              <a
                href={permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                View on {externalSiteName}
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            ) : null}
            <p className="pt-2 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
              {caption}
            </p>
            <dl className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
              <div>
                <dt className="text-muted-foreground">Reactions</dt>
                <dd className="font-medium tabular-nums text-foreground">
                  {formatCompact(post.reactions)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Comments</dt>
                <dd className="font-medium tabular-nums text-foreground">
                  {formatCompact(post.comments)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Shares</dt>
                <dd className="font-medium tabular-nums text-foreground">
                  {formatCompact(post.shares)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Engagement score</dt>
                <dd className="font-medium tabular-nums text-foreground">
                  {formatCompact(post.engagementScore)}
                </dd>
              </div>
              {post.impressions != null ? (
                <div>
                  <dt className="text-muted-foreground">Impressions</dt>
                  <dd className="font-medium tabular-nums text-foreground">
                    {formatCompact(post.impressions)}
                  </dd>
                </div>
              ) : null}
              {post.uniqueImpressions != null ? (
                <div>
                  <dt className="text-muted-foreground">Unique impressions</dt>
                  <dd className="font-medium tabular-nums text-foreground">
                    {formatCompact(post.uniqueImpressions)}
                  </dd>
                </div>
              ) : null}
              {post.clicks != null ? (
                <div>
                  <dt className="text-muted-foreground">Clicks</dt>
                  <dd className="font-medium tabular-nums text-foreground">
                    {formatCompact(post.clicks)}
                  </dd>
                </div>
              ) : null}
              {post.engagementRate != null ? (
                <div>
                  <dt className="text-muted-foreground">Engagement rate</dt>
                  <dd className="font-medium tabular-nums text-foreground">
                    {post.engagementRate.toFixed(1)}%
                  </dd>
                </div>
              ) : null}
            </dl>
            {aiFooter}
            {post.commentsList && post.commentsList.length > 0 ? (
              <div className="border-t border-border/60 pt-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Recent comments
                </p>
                <ul className="mt-2 space-y-2">
                  {post.commentsList.slice(0, 5).map((comment, index) => (
                    <li
                      key={`${comment.message}-${index}`}
                      className="rounded-lg bg-muted px-3 py-2 text-xs text-foreground"
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

