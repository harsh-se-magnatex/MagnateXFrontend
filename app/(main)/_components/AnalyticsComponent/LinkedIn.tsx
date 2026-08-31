'use client';

import {
  Crown,
  Eye,
  FileText,
  Heart,
  Linkedin,
  MapPin,
  TrendingUp,
  Trophy,
  Users,
  ExternalLink,
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
import { AnalyticsWeeklyVerdict } from './AnalyticsWeeklyVerdict';
import { SyncErrorBanner } from './SyncErrorBanner';
import {
  buildReplyQueueGroupsLinkedIn,
  GrowthStudioBlock,
} from './growth-studio';
import type { PreloadedReplySuggestions } from './growth-studio/_common';
import {
  classifyPostsAsNudgeOrDud,
  weeklyDeltaFromPostFrequency,
  weeklyDeltaFromTrend,
} from './utils/utils_functions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, '') ?? '';

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
    mediaUrls: p.mediaUrls,
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
      className="rounded-xl border border-default bg-element p-4 text-sm text-default"
      role="region"
      aria-live="polite"
    >
      {metric === 'followers' ? (
        <div className="space-y-2">
          <p className="font-medium text-default">Followers</p>
          <p>
            Followers for your selected LinkedIn organization. The Growth chart
            shows how this changed over reported periods.
          </p>
          {fmtDelta(fd) ? (
            <p className="text-xs text-secondary">
              Latest change vs previous bucket:{' '}
              <span className="font-medium tabular-nums text-default">
                {fmtDelta(fd)}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}
      {metric === 'pageViews' ? (
        <div className="space-y-2">
          <p className="font-medium text-default">Page views</p>
          <p>
            <span className="font-medium tabular-nums text-default">
              {formatCompact(merged.totalPageViews)}
            </span>{' '}
            total LinkedIn organization page views in the current rollup.
          </p>
          {fmtDelta(pd) ? (
            <p className="text-xs text-secondary">
              Page views vs previous period:{' '}
              <span className="font-medium tabular-nums text-default">
                {fmtDelta(pd)}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}
      {metric === 'impressions' ? (
        <div className="space-y-2">
          <p className="font-medium text-default">Impressions</p>
          <p>
            <span className="font-medium tabular-nums text-default">
              {formatCompact(merged.totalImpressions)}
            </span>{' '}
            impressions in your current rollup.
          </p>
          {fmtDelta(id) ? (
            <p className="text-xs text-secondary">
              Impressions vs previous period:{' '}
              <span className="font-medium tabular-nums text-default">
                {fmtDelta(id)}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}
      {metric === 'posts' ? (
        <div className="space-y-2">
          <p className="font-medium text-default">Posts</p>
          <p>
            <span className="font-medium tabular-nums text-default">
              {postCount}
            </span>{' '}
            posts stored for analytics (ranked by engagement below).
          </p>
          {merged.postFrequencyTop.length > 0 ? (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-secondary">
                Recent days by volume
              </p>
              <ul className="flex flex-wrap gap-2">
                {merged.postFrequencyTop.map(({ date, count }) => (
                  <li
                    key={date}
                    className="rounded-lg bg-default px-2.5 py-1 text-xs ring-1 ring-border"
                  >
                    <span className="text-secondary">
                      {formatChartTooltipDate(date)}
                    </span>{' '}
                    <span className="font-medium tabular-nums text-default">
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
          <p className="font-medium text-default">Engagement</p>
          {merged.totalEngagementsPage > 0 ? (
            <p>
              Page-level engagement total:{' '}
              <span className="font-medium tabular-nums text-default">
                {formatCompact(merged.totalEngagementsPage)}
              </span>
              .
            </p>
          ) : (
            <p>
              Sum of engagement scores across stored posts:{' '}
              <span className="font-medium tabular-nums text-default">
                {formatCompact(merged.engagementsFromPosts)}
              </span>
              .
            </p>
          )}
          {fmtDelta(ed) ? (
            <p className="text-xs text-secondary">
              Engagement vs previous period:{' '}
              <span className="font-medium tabular-nums text-default">
                {fmtDelta(ed)}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function WLinkedInAnalyticsView({
  connection,
  li,
  profileUrl,
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
  preloadedReplySuggestions,
}: {
  connection: LinkedInAnalyticsConnection;
  li: LinkedInAnalytics | null;
  profileUrl?: string | null;
  posts: LinkedInPost[];
  merged: LinkedInMerged;
  TOP_POSTS_LIMIT: number;
  topPosts: LinkedInPost[];
  expandedPost: Post | null;
  setExpandedPost: (post: Post | null) => void;
  audienceRanked: {
    countries: { name: string; count: number }[];
    cities: { name: string; count: number }[];
  };
  pageAiContext: Record<string, unknown>;
  followersChartData: { date: string; followers: number }[];
  pageViewsChartData: { date: string; pageViews: number }[];
  impressionsChartData: { date: string; impressions: number }[];
  updatedLabel?: string;
  repliedCommentIds?: string[];
  preloadedReplySuggestions?: PreloadedReplySuggestions;
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

  const replyGroups = useMemo(
    () => buildReplyQueueGroupsLinkedIn(posts, repliedCommentIds),
    [posts, repliedCommentIds]
  );

  /** Slice for the new "Top 3 ranked posts" highlight section. */
  const topThreePosts = useMemo(() => topAsPosts.slice(0, 3), [topAsPosts]);

  /**
   * Splits the full top-posts list into Nudges vs Duds using the 1.5×
   * average-engagement threshold so we can render filter tabs below.
   */
  const nudgeDud = useMemo(
    () =>
      classifyPostsAsNudgeOrDud(
        topAsPosts,
        (p) => p.postId,
        (p) => p.engagementScore ?? 0
      ),
    [topAsPosts]
  );

  /** Weekly +/- deltas surfaced on the five overview StatCards. */
  const followersDelta = useMemo(
    () => weeklyDeltaFromTrend(merged.followersTrend),
    [merged.followersTrend]
  );
  const pageViewsDelta = useMemo(
    () => weeklyDeltaFromTrend(merged.pageViewsTrend),
    [merged.pageViewsTrend]
  );
  const impressionsDelta = useMemo(
    () => weeklyDeltaFromTrend(merged.impressionsTrend),
    [merged.impressionsTrend]
  );
  const engagementDelta = useMemo(
    () => weeklyDeltaFromTrend(merged.engagementsTrend),
    [merged.engagementsTrend]
  );
  const postsDelta = useMemo(
    () => weeklyDeltaFromPostFrequency(li?.postFrequency),
    [li?.postFrequency]
  );

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
      <div className="rounded-xl border border-dashed border-default bg-element px-6 py-14 text-center">
        <Linkedin className="mx-auto h-10 w-10 text-[#0a66c2]" aria-hidden />
        <p className="mt-3 text-sm font-medium text-default">
          Connect LinkedIn analytics
        </p>
        <p className="mt-1 mb-6 text-sm text-secondary">
          We don&apos;t have analytics saved for your selected LinkedIn page
          yet. Connect LinkedIn, select an organization, and sync insights to
          see them here.
        </p>
        {oauthHref ? (
          <Button
            asChild
            className="bg-[#0a66c2] text-white hover:bg-[#004182]"
          >
            <a href={oauthHref}>Connect LinkedIn</a>
          </Button>
        ) : (
          <p className="text-xs text-warning">
            Set <span className="font-mono">NEXT_PUBLIC_BACKEND_URL</span> to
            enable the connect button.
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
        <h1 className="flex items-center gap-3 text-page-title text-default">
          <Linkedin className="h-7 w-7 text-[#0a66c2]" aria-hidden />
          Analytics
        </h1>
        {li?.pageName || li?.displayName ? (
          <p className="text-sm text-secondary">
            {profileUrl ? (
              <a
                href={profileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-default underline decoration-border underline-offset-2 hover:decoration-foreground"
              >
                <span>{li.pageName ?? li.displayName}</span>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            ) : (
              (li.pageName ?? li.displayName)
            )}
          </p>
        ) : null}
        {updatedLabel ? (
          <p className="text-sm text-secondary">Last updated {updatedLabel}</p>
        ) : null}
      </header>

      <AnalyticsWeeklyVerdict platform="linkedin" context={pageAiContext} />

      <section aria-labelledby="li-analytics-cards-heading">
        <h2 id="li-analytics-cards-heading" className="sr-only">
          Overview metrics
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Followers"
            value={formatCompact(metrics.followers)}
            hint="Trend in Growth · tap again to collapse"
            icon={Users}
            selected={focusedMetric === 'followers'}
            onClick={() => handleMetricToggle('followers')}
            delta={followersDelta?.pct ?? null}
          />
          <StatCard
            label="Page views"
            value={formatCompact(metrics.pageViews)}
            hint="From organizationPageStatistics"
            icon={Eye}
            selected={focusedMetric === 'pageViews'}
            onClick={() => handleMetricToggle('pageViews')}
            delta={pageViewsDelta?.pct ?? null}
          />
          <StatCard
            label="Impressions"
            value={formatCompact(metrics.impressions)}
            icon={TrendingUp}
            selected={focusedMetric === 'impressions'}
            onClick={() => handleMetricToggle('impressions')}
            delta={impressionsDelta?.pct ?? null}
          />
          <StatCard
            label="Posts"
            value={formatCompact(metrics.posts)}
            hint={`Up to ${TOP_POSTS_LIMIT} posts, ranked by engagement`}
            icon={FileText}
            selected={focusedMetric === 'posts'}
            onClick={() => handleMetricToggle('posts')}
            delta={postsDelta?.pct ?? null}
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
            delta={engagementDelta?.pct ?? null}
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

      {topThreePosts.length > 0 ? (
        <section
          className="space-y-4 scroll-mt-6"
          aria-labelledby="li-top-three-heading"
        >
          <h2
            id="li-top-three-heading"
            className="text-section text-default flex items-center gap-2"
          >
            <Crown className="h-5 w-5 text-warning" aria-hidden />
            Top 3 ranked posts
            <span className="text-xs font-normal text-secondary">
              best performers in the last 3 weeks
            </span>
          </h2>
          <div className="space-y-4">
            {topThreePosts.map((post, i) => (
              <TopPostCard
                key={`top3-${post.postId}`}
                post={post}
                rank={i + 1}
                onExpandImage={setExpandedPost}
                externalSiteName="LinkedIn"
                classification={nudgeDud.classifications.get(post.postId)}
              />
            ))}
          </div>
        </section>
      ) : null}

      <GrowthStudioBlock
        platform="linkedin"
        replyGroups={replyGroups}
        pageName={li?.pageName ?? li?.displayName}
        preloadedReplySuggestions={preloadedReplySuggestions}
      />

      <section
        ref={growthSectionRef}
        className="space-y-4 scroll-mt-6"
        aria-labelledby="li-growth-heading"
      >
        <h2
          id="li-growth-heading"
          className="text-section text-default flex items-center gap-2"
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
          className="text-section text-default flex items-center gap-2"
        >
          <Trophy className="h-5 w-5 text-warning" aria-hidden />
          Top posts
          <span className="text-xs font-normal text-secondary">
            classified vs. the cohort average (1.5× cutoff)
          </span>
        </h2>
        {topAsPosts.length === 0 ? (
          <p className="rounded-xl border border-default bg-element px-4 py-8 text-center text-sm text-secondary">
            No post data yet. Sync LinkedIn insights to populate this section.
          </p>
        ) : (
          <Tabs defaultValue="nudge" className="space-y-4">
            <TabsList className="grid h-auto w-full max-w-sm grid-cols-2 gap-1">
              <TabsTrigger value="nudge" className="gap-2">
                Nudges
                <span className="rounded-full bg-success px-1.5 text-[10px] font-semibold text-success ring-1 ring-inset ring-[var(--border-success)]">
                  {nudgeDud.nudges.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="dud" className="gap-2">
                Duds
                <span className="rounded-full bg-hover px-1.5 text-[10px] font-semibold text-default ring-1 ring-inset ring-border">
                  {nudgeDud.duds.length}
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="nudge" className="space-y-4 outline-none">
              {nudgeDud.nudges.length === 0 ? (
                <p className="rounded-xl border border-dashed border-default bg-element px-4 py-6 text-center text-sm text-secondary">
                  No nudges yet — nothing in this window scored 1.5× above your
                  average. Recreate the framing of past winners to push one over
                  the bar.
                </p>
              ) : (
                nudgeDud.nudges.map((post, i) => (
                  <TopPostCard
                    key={post.postId}
                    post={post}
                    rank={i + 1}
                    onExpandImage={setExpandedPost}
                    externalSiteName="LinkedIn"
                    classification="nudge"
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="dud" className="space-y-4 outline-none">
              {nudgeDud.duds.length === 0 ? (
                <p className="rounded-xl border border-dashed border-default bg-element px-4 py-6 text-center text-sm text-secondary">
                  No duds — every recent post is performing at or above the
                  nudge bar. Keep the streak going.
                </p>
              ) : (
                nudgeDud.duds.map((post, i) => (
                  <TopPostCard
                    key={post.postId}
                    post={post}
                    rank={i + 1}
                    onExpandImage={setExpandedPost}
                    externalSiteName="LinkedIn"
                    classification="dud"
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </section>

      <section className="space-y-4" aria-labelledby="li-audience-heading">
        <h2
          id="li-audience-heading"
          className="text-section text-default flex items-center gap-2"
        >
          <MapPin className="h-5 w-5 text-[#0a66c2]" aria-hidden />
          Audience
        </h2>
        {audienceRanked.countries.length === 0 &&
        audienceRanked.cities.length === 0 ? (
          <p className="rounded-xl border border-dashed border-default bg-element px-4 py-6 text-center text-sm text-secondary">
            Location breakdown will appear here when your sync includes
            geography.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {audienceRanked.countries.length > 0 ? (
              <div className="rounded-xl border border-default bg-default p-4">
                <h3 className="text-subsection text-default">Top countries</h3>
                <ul className="mt-3 space-y-2 text-sm text-secondary">
                  {audienceRanked.countries.map(({ name, count }) => (
                    <li
                      key={name}
                      className="flex items-center justify-between gap-2 border-b border-default pb-2 last:border-0 last:pb-0"
                    >
                      <span className="font-medium text-default">{name}</span>
                      <span className="tabular-nums text-secondary">
                        {formatCompact(count)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {audienceRanked.cities.length > 0 ? (
              <div className="rounded-xl border border-default bg-default p-4">
                <h3 className="text-subsection text-default">Top cities</h3>
                <ul className="mt-3 space-y-2 text-sm text-secondary">
                  {audienceRanked.cities.map(({ name, count }) => (
                    <li
                      key={name}
                      className="flex items-center justify-between gap-2 border-b border-default pb-2 last:border-0 last:pb-0"
                    >
                      <span className="font-medium text-default">{name}</span>
                      <span className="tabular-nums text-secondary">
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
      />
    </div>
  );
}
