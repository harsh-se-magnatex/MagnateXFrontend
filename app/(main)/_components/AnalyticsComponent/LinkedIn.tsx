'use client';

import {
  Eye,
  FileText,
  Heart,
  Linkedin,
  MapPin,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import {
  formatCompact,
  GrowthAreaChart,
  formatChartTooltipDate,
  StatCard,
  TopPostCard,
  TopPostImageDialog,
  trendDelta,
} from './utils/facebook_components/util_component';
import { useMemo, useRef, useState } from 'react';
import { AnalyticsAiInsightCard } from './AnalyticsAiInsightCard';
import { SyncErrorBanner } from './SyncErrorBanner';
import {
  buildReplyQueueGroupsLinkedIn,
  GrowthStudioBlock,
  mostRecentLinkedInPost,
} from './growth-studio';
import {
  LinkedInAnalytics,
  LinkedInAnalyticsConnection,
  LinkedInMerged,
  LinkedInPost,
  Post,
} from '../types';
import { ChartConfig } from '@/components/ui/chart';
import { Button } from '@/components/ui/button';

const liImpressionsChartConfig = {
  impressions: { label: 'Impressions', color: '#0a66c2' },
} satisfies ChartConfig;

const liFollowersChartConfig = {
  followers: { label: 'Followers', color: '#004182' },
} satisfies ChartConfig;

const liPageViewsChartConfig = {
  pageViews: { label: 'Page views', color: '#2563eb' },
} satisfies ChartConfig;

type LiFocusMetric =
  | 'followers'
  | 'pageViews'
  | 'impressions'
  | 'posts'
  | 'engagement';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, '') ?? '';

function linkedInOAuthAnalyticsHref(): string | null {
  if (!BACKEND_URL) return null;
  return `${BACKEND_URL}/auth/linkedin`;
}

function linkedInPostToPost(p: LinkedInPost): Post {
  const text = p.commentary?.trim() || p.message?.trim() || '';
  return {
    postId: p.postId,
    message: text,
    mediaUrl: p.mediaUrl ?? '',
    permalinkUrl: p.permalinkUrl,
    type: p.type,
    reactions: p.reactions ?? p.likes ?? 0,
    comments: p.comments ?? 0,
    commentsList: p.commentsList,
    shares: p.shares ?? 0,
    engagementScore: p.engagementScore ?? 0,
    engagementRate: p.engagementRate,
    impressions: p.impressions,
    uniqueImpressions: p.uniqueImpressions,
    clicks: p.clicks,
    createdAt: p.createdAt ?? '',
  };
}

function LinkedInMetricDetailPanel({
  metric,
  merged,
  postCount,
}: {
  metric: LiFocusMetric;
  merged: LinkedInMerged;
  postCount: number;
}) {
  const fd = trendDelta(merged.followersTrend);
  const pd = trendDelta(merged.pageViewsTrend);
  const id = trendDelta(merged.impressionsTrend);
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
            Followers for your selected LinkedIn organization. The Growth chart shows
            how this changed over reported periods.
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
      {metric === 'pageViews' ? (
        <div className="space-y-2">
          <p className="font-medium text-zinc-900">Page views</p>
          <p>
            <span className="font-medium tabular-nums text-zinc-900">
              {formatCompact(merged.totalPageViews)}
            </span>{' '}
            total LinkedIn organization page views in the current rollup.
          </p>
          {fmtDelta(pd) ? (
            <p className="text-xs text-zinc-600">
              Page views vs previous period:{' '}
              <span className="font-medium tabular-nums text-zinc-800">
                {fmtDelta(pd)}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}
      {metric === 'impressions' ? (
        <div className="space-y-2">
          <p className="font-medium text-zinc-900">Impressions</p>
          <p>
            <span className="font-medium tabular-nums text-zinc-900">
              {formatCompact(merged.totalImpressions)}
            </span>{' '}
            impressions in your current rollup.
          </p>
          {fmtDelta(id) ? (
            <p className="text-xs text-zinc-600">
              Impressions vs previous period:{' '}
              <span className="font-medium tabular-nums text-zinc-800">
                {fmtDelta(id)}
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
            posts stored for analytics (ranked by engagement below).
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
              Page-level engagement total:{' '}
              <span className="font-medium tabular-nums text-zinc-900">
                {formatCompact(merged.totalEngagementsPage)}
              </span>
              .
            </p>
          ) : (
            <p>
              Sum of engagement scores across stored posts:{' '}
              <span className="font-medium tabular-nums text-zinc-900">
                {formatCompact(merged.engagementsFromPosts)}
              </span>
              .
            </p>
          )}
          {fmtDelta(ed) ? (
            <p className="text-xs text-zinc-600">
              Engagement vs previous period:{' '}
              <span className="font-medium tabular-nums text-zinc-800">
                {fmtDelta(ed)}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function LinkedInAnalyticsView({
  connection,
  li,
  posts,
  merged,
  TOP_POSTS_LIMIT,
  topPosts,
  expandedPost,
  setExpandedPost,
  audienceRanked,
  pageAiContext,
  followersChartData,
  pageViewsChartData,
  impressionsChartData,
  updatedLabel,
  repliedCommentIds,
  firstCommentSentPostIds,
}: {
  connection: LinkedInAnalyticsConnection;
  li: LinkedInAnalytics | null;
  posts: LinkedInPost[];
  merged: LinkedInMerged;
  TOP_POSTS_LIMIT: number;
  topPosts: LinkedInPost[];
  expandedPost: Post | null;
  setExpandedPost: (post: Post | null) => void;
  audienceRanked: { countries: { name: string; count: number }[]; cities: { name: string; count: number }[] };
  pageAiContext: Record<string, unknown>;
  followersChartData: { date: string; followers: number }[];
  pageViewsChartData: { date: string; pageViews: number }[];
  impressionsChartData: { date: string; impressions: number }[];
  updatedLabel?: string;
  repliedCommentIds?: string[];
  firstCommentSentPostIds?: string[];
}) {
  const growthSectionRef = useRef<HTMLElement>(null);
  const topPostsSectionRef = useRef<HTMLElement>(null);
  const [focusedMetric, setFocusedMetric] = useState<LiFocusMetric | null>(
    null
  );

  const topAsPosts = useMemo(
    () => topPosts.map(linkedInPostToPost),
    [topPosts]
  );

  const expandedLinkedIn = useMemo(() => {
    if (!expandedPost) return null;
    return topPosts.find((p) => p.postId === expandedPost.postId) ?? null;
  }, [expandedPost, topPosts]);

  const replyGroups = useMemo(
    () => buildReplyQueueGroupsLinkedIn(posts, repliedCommentIds),
    [posts, repliedCommentIds]
  );
  const recentPost = useMemo(
    () => mostRecentLinkedInPost(posts),
    [posts]
  );

  const liPostAiContext = useMemo(() => {
    if (!expandedLinkedIn) return null;
    const asPost = linkedInPostToPost(expandedLinkedIn);
    const scores = topAsPosts.map((p) => p.engagementScore ?? 0);
    const avg = scores.length
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;
    const sorted = [...scores].sort((a, b) => a - b);
    const median = sorted.length
      ? sorted[Math.floor(sorted.length / 2)]
      : 0;
    const rank =
      [...topAsPosts]
        .sort((a, b) => (b.engagementScore ?? 0) - (a.engagementScore ?? 0))
        .findIndex((p) => p.postId === asPost.postId) + 1;
    return {
      post: {
        messagePreview: asPost.message?.slice(0, 600),
        mediaUrl: asPost.mediaUrl?.trim() || undefined,
        type: asPost.type,
        reactions: asPost.reactions,
        comments: asPost.comments,
        shares: asPost.shares,
        engagementScore: asPost.engagementScore,
        impressions: asPost.impressions,
        uniqueImpressions: asPost.uniqueImpressions,
        clicks: asPost.clicks,
        engagementRate: asPost.engagementRate,
      },
      peers: {
        count: topAsPosts.length,
        avgEngagement: avg,
        medianEngagement: median,
        rankByEngagement: rank || undefined,
      },
    };
  }, [expandedLinkedIn, topAsPosts]);

  const handleMetricToggle = (id: LiFocusMetric) => {
    setFocusedMetric((prev) => (prev === id ? null : id));
    requestAnimationFrame(() => {
      if (id === 'followers' || id === 'pageViews' || id === 'impressions') {
        growthSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      } else if (id === 'posts' || id === 'engagement') {
        topPostsSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    });
  };

  if (!connection.connected) {
    const oauthHref = linkedInOAuthAnalyticsHref();
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 px-6 py-14 text-center">
        <Linkedin className="mx-auto h-10 w-10 text-[#0a66c2]" aria-hidden />
        <p className="mt-3 text-sm font-medium text-zinc-800">
          Connect LinkedIn analytics
        </p>
        <p className="mt-1 mb-6 text-sm text-zinc-500">
          We don&apos;t have analytics saved for your selected LinkedIn page yet.
          Connect LinkedIn, select an organization, and sync insights to see
          them here.
        </p>
        {oauthHref ? (
          <Button
            asChild
            className="bg-[#0a66c2] text-white hover:bg-[#004182]"
          >
            <a href={oauthHref}>Connect LinkedIn</a>
          </Button>
        ) : (
          <p className="text-xs text-amber-800">
            Set <span className="font-mono">NEXT_PUBLIC_BACKEND_URL</span> to enable
            the connect button.
          </p>
        )}
      </div>
    );
  }

  const metrics = {
    followers: merged.totalFollowers,
    pageViews: merged.totalPageViews,
    impressions: merged.totalImpressions,
    posts: posts.length,
    engagement:
      merged.totalEngagementsPage > 0
        ? merged.totalEngagementsPage
        : merged.engagementsFromPosts,
    engagementFromPage: merged.totalEngagementsPage > 0,
  };

  return (
    <div className="space-y-6">
      <SyncErrorBanner
        platform="LinkedIn"
        status={li?.lastSyncStatus}
        error={li?.lastSyncError}
        lastSyncAt={li?.lastSyncAt}
      />
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-zinc-900">
          <Linkedin className="h-7 w-7 text-[#0a66c2]" aria-hidden />
          Analytics
        </h1>
        {li?.pageName || li?.displayName ? (
          <p className="text-sm text-zinc-600">
            {li.pageName ?? li.displayName}
          </p>
        ) : null}
        {li?.organizationUrn ? (
          <p className="text-sm text-zinc-500 line-clamp-2">
            {li.organizationUrn}
          </p>
        ) : null}
        {updatedLabel ? (
          <p className="text-sm text-zinc-500">Last updated {updatedLabel}</p>
        ) : null}
      </header>

      <section aria-labelledby="li-analytics-cards-heading">
        <h2 id="li-analytics-cards-heading" className="sr-only">
          Overview metrics
        </h2>
        <AnalyticsAiInsightCard
          platform="linkedin"
          scope="page"
          context={pageAiContext}
          className="mb-4"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Followers"
            value={formatCompact(metrics.followers)}
            hint="Trend in Growth · tap again to collapse"
            icon={Users}
            selected={focusedMetric === 'followers'}
            onClick={() => handleMetricToggle('followers')}
          />
          <StatCard
            label="Page views"
            value={formatCompact(metrics.pageViews)}
            hint="From organizationPageStatistics"
            icon={Eye}
            selected={focusedMetric === 'pageViews'}
            onClick={() => handleMetricToggle('pageViews')}
          />
          <StatCard
            label="Impressions"
            value={formatCompact(metrics.impressions)}
            icon={TrendingUp}
            selected={focusedMetric === 'impressions'}
            onClick={() => handleMetricToggle('impressions')}
          />
          <StatCard
            label="Posts"
            value={formatCompact(metrics.posts)}
            hint={`Up to ${TOP_POSTS_LIMIT} posts, ranked by engagement`}
            icon={FileText}
            selected={focusedMetric === 'posts'}
            onClick={() => handleMetricToggle('posts')}
          />
          <StatCard
            label="Engagement"
            value={formatCompact(metrics.engagement)}
            hint={
              metrics.engagementFromPage
                ? 'Rollup total from synced page analytics'
                : 'From reactions, comments, and shares on posts'
            }
            icon={Heart}
            selected={focusedMetric === 'engagement'}
            onClick={() => handleMetricToggle('engagement')}
          />
        </div>
        {focusedMetric ? (
          <LinkedInMetricDetailPanel
            metric={focusedMetric}
            merged={merged}
            postCount={metrics.posts}
          />
        ) : null}
      </section>

      <GrowthStudioBlock
        platform="linkedin"
        recentPost={recentPost}
        replyGroups={replyGroups}
        pageName={li?.pageName ?? li?.displayName}
        firstCommentSentPostIds={firstCommentSentPostIds}
      />

      <section
        ref={growthSectionRef}
        className="space-y-4 scroll-mt-6"
        aria-labelledby="li-growth-heading"
      >
        <h2
          id="li-growth-heading"
          className="flex items-center gap-2 text-lg font-semibold text-zinc-900"
        >
          <TrendingUp className="h-5 w-5 text-[#0a66c2]" aria-hidden />
          Growth
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <GrowthAreaChart
            title="Followers"
            data={followersChartData}
            dataKey="followers"
            config={liFollowersChartConfig}
            emptyHint="No daily data yet — sync LinkedIn insights."
          />
          <GrowthAreaChart
            title="Page views"
            data={pageViewsChartData}
            dataKey="pageViews"
            config={liPageViewsChartConfig}
            emptyHint="No daily page view data yet — sync LinkedIn insights."
          />
          <GrowthAreaChart
            title="Impressions"
            data={impressionsChartData}
            dataKey="impressions"
            config={liImpressionsChartConfig}
            emptyHint="No daily data yet — sync LinkedIn insights."
          />
        </div>
      </section>

      <section
        ref={topPostsSectionRef}
        className="space-y-4 scroll-mt-6"
        aria-labelledby="li-top-posts-heading"
      >
        <h2
          id="li-top-posts-heading"
          className="flex items-center gap-2 text-lg font-semibold text-zinc-900"
        >
          <Trophy className="h-5 w-5 text-amber-600" aria-hidden />
          Top posts
        </h2>
        {topAsPosts.length === 0 ? (
          <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600">
            No post data yet. Sync LinkedIn insights to populate this section.
          </p>
        ) : (
          <div className="space-y-4">
            {topAsPosts.map((post, i) => (
              <TopPostCard
                key={post.postId}
                post={post}
                rank={i + 1}
                onExpandImage={setExpandedPost}
                externalSiteName="LinkedIn"
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4" aria-labelledby="li-audience-heading">
        <h2
          id="li-audience-heading"
          className="flex items-center gap-2 text-lg font-semibold text-zinc-900"
        >
          <MapPin className="h-5 w-5 text-[#0a66c2]" aria-hidden />
          Audience
        </h2>
        {audienceRanked.countries.length === 0 &&
        audienceRanked.cities.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-6 text-center text-sm text-zinc-500">
            Location breakdown will appear here when your sync includes geography.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {audienceRanked.countries.length > 0 ? (
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-medium text-zinc-700">
                  Top countries
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-zinc-600">
                  {audienceRanked.countries.map(({ name, count }) => (
                    <li
                      key={name}
                      className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-2 last:border-0 last:pb-0"
                    >
                      <span className="font-medium text-zinc-800">{name}</span>
                      <span className="tabular-nums text-zinc-500">
                        {formatCompact(count)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {audienceRanked.cities.length > 0 ? (
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-medium text-zinc-700">Top cities</h3>
                <ul className="mt-3 space-y-2 text-sm text-zinc-600">
                  {audienceRanked.cities.map(({ name, count }) => (
                    <li
                      key={name}
                      className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-2 last:border-0 last:pb-0"
                    >
                      <span className="font-medium text-zinc-800">{name}</span>
                      <span className="tabular-nums text-zinc-500">
                        {formatCompact(count)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </section>

      <TopPostImageDialog
        post={expandedPost}
        open={expandedPost !== null}
        onOpenChange={(next) => {
          if (!next) setExpandedPost(null);
        }}
        externalSiteName="LinkedIn"
        aiFooter={
          expandedPost && liPostAiContext ? (
            <AnalyticsAiInsightCard
              platform="linkedin"
              scope="post"
              context={liPostAiContext}
              compact
              embed
            />
          ) : null
        }
      />
    </div>
  );
}
