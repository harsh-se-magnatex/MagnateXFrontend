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

type LiFocusMetric = 'followers' | 'impressions' | 'posts' | 'engagement';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, '') ?? '';

function linkedInOAuthAnalyticsHref(): string | null {
  if (!BACKEND_URL) return null;
  return `${BACKEND_URL}/auth/linkedin/analytics`;
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
            Followers for your synced LinkedIn profile. The Growth chart shows
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
  impressionsChartData,
  updatedLabel,
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
  impressionsChartData: { date: string; impressions: number }[];
  updatedLabel?: string;
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
      if (id === 'followers' || id === 'impressions') {
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
          We don&apos;t have analytics saved for your account yet. Connect
          LinkedIn so we can store your insights—then they will show up here.
        </p>
        {oauthHref ? (
          <Button
            asChild
            className="bg-[#0a66c2] text-white hover:bg-[#004182]"
          >
            <a href={oauthHref}>Connect LinkedIn analytics</a>
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
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-zinc-900">
          <Linkedin className="h-7 w-7 text-[#0a66c2]" aria-hidden />
          Analytics
        </h1>
        {li?.displayName ? (
          <p className="text-sm text-zinc-600">{li.displayName}</p>
        ) : null}
        {li?.headline ? (
          <p className="text-sm text-zinc-500 line-clamp-2">{li.headline}</p>
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
            label="Impressions"
            value={formatCompact(metrics.impressions)}
            icon={Eye}
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
        open={expandedPost !== null && Boolean(expandedPost.mediaUrl)}
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
