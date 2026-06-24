import {
  Crown,
  Eye,
  Facebook,
  FileText,
  Heart,
  MapPin,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import {
  formatCompact,
  GrowthAreaChart,
  InsightDetailPanel,
  StatCard,
  TopPostCard,
  TopPostImageDialog,
} from './utils/facebook_components/util_component';
import { useMemo, useRef, useState } from 'react';
import { SyncErrorBanner } from './SyncErrorBanner';
import { AnalyticsWeeklyVerdict } from './AnalyticsWeeklyVerdict';
import { buildReplyQueueGroupsFacebook, GrowthStudioBlock } from './growth-studio';
import { audienceRanked, InsightMetric, Merged, Metrics, PageAnalytics, Post } from '../types';
import { ChartConfig } from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import {
  classifyPostsAsNudgeOrDud,
  weeklyDeltaFromPostFrequency,
  weeklyDeltaFromTrend,
} from './utils/utils_functions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, '') ?? '';

function facebookOAuthAnalyticsHref(): string | null {
  if (!BACKEND_URL) return null;
  return `${BACKEND_URL}/auth/facebook`;
}

const reachGrowthChartConfig = {
  reach: { label: 'Reach', color: '#2563eb' },
} satisfies ChartConfig;

const followersGrowthChartConfig = {
  followers: { label: 'Followers', color: '#15803d' },
} satisfies ChartConfig;


export default function FaceBookAnalytics({
  metrics,
  pageAnalytics,
  merged,
  TOP_POSTS_LIMIT,
  reachChartData,
  followersChartData,
  topPosts,
  expandedPost,
  setExpandedPost,
  audienceRanked,
  pageAiContext,
  repliedCommentIds,
}: {
  metrics: Metrics;
  pageAnalytics: PageAnalytics | null;
  merged: Merged;
  TOP_POSTS_LIMIT: number;
  reachChartData: { date: string; reach: number }[];
  followersChartData: { date: string; followers: number }[];
  topPosts: Post[];
  expandedPost: Post | null;
  setExpandedPost: (post: Post | null) => void;
  audienceRanked: audienceRanked;
  pageAiContext: Record<string, unknown>;
  repliedCommentIds?: string[];
}) {
  const [focusedMetric, setFocusedMetric] = useState<InsightMetric | null>(
    null
  );
  const growthSectionRef = useRef<HTMLElement>(null);
  const topPostsSectionRef = useRef<HTMLElement>(null);

  const replyGroups = useMemo(
    () => buildReplyQueueGroupsFacebook(topPosts, repliedCommentIds),
    [topPosts, repliedCommentIds]
  );

  /** Slice for the new "Top 3 ranked posts" highlight section. */
  const topThreePosts = useMemo(() => topPosts.slice(0, 3), [topPosts]);

  /**
   * Splits the full top-posts list into Nudges vs Duds using the 1.5×
   * average-engagement threshold so we can render two filter tabs below.
   */
  const nudgeDud = useMemo(
    () =>
      classifyPostsAsNudgeOrDud(
        topPosts,
        (p) => p.postId,
        (p) => p.engagementScore ?? 0
      ),
    [topPosts]
  );

  /** Weekly +/- deltas surfaced on the four overview StatCards. */
  const followersDelta = useMemo(
    () => weeklyDeltaFromTrend(merged.followersTrend),
    [merged.followersTrend]
  );
  const reachDelta = useMemo(
    () => weeklyDeltaFromTrend(merged.reachTrend),
    [merged.reachTrend]
  );
  const engagementDelta = useMemo(
    () => weeklyDeltaFromTrend(merged.engagementsTrend),
    [merged.engagementsTrend]
  );
  const postsDelta = useMemo(
    () => weeklyDeltaFromPostFrequency(pageAnalytics?.postFrequency),
    [pageAnalytics?.postFrequency]
  );

  const handleMetricToggle = (id: InsightMetric) => {
    setFocusedMetric((prev) => (prev === id ? null : id));
    requestAnimationFrame(() => {
      if (id === 'followers' || id === 'reach') {
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

  if (!pageAnalytics && topPosts.length === 0) {
    const oauthHref = facebookOAuthAnalyticsHref();
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/40 px-6 py-14 text-center">
        <Facebook className="mx-auto h-10 w-10 text-blue-700" aria-hidden />
        <p className="mt-3 text-sm font-medium text-foreground">
          No Facebook analytics yet
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect Facebook, choose a Page, and sync insights to see reach,
          audience, and post performance here.
        </p>
        {oauthHref ? (
          <Button asChild className="mt-6 bg-blue-700 text-white hover:bg-blue-800">
            <a href={oauthHref}>Connect Facebook</a>
          </Button>
        ) : (
          <p className="mt-6 text-xs text-amber-200">
            Set <span className="font-mono">NEXT_PUBLIC_BACKEND_URL</span> to enable
            the connect button.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <SyncErrorBanner
        platform="Facebook"
        status={pageAnalytics?.lastSyncStatus}
        error={pageAnalytics?.lastSyncError}
        lastSyncAt={pageAnalytics?.lastSyncAt}
      />
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <Facebook className="h-7 w-7 text-blue-700" />
          Analytics
        </h1>
        <p>Page Name: {pageAnalytics?.pageName}</p>
        {metrics.updatedLabel ? (
          <p className="text-sm text-muted-foreground">
            Last updated {metrics.updatedLabel}
          </p>
        ) : null}
      </header>

      <AnalyticsWeeklyVerdict platform="facebook" context={pageAiContext} />

      <section aria-labelledby="analytics-cards-heading">
        <h2 id="analytics-cards-heading" className="sr-only">
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
            label="Reach"
            value={formatCompact(metrics.reach)}
            hint={
              merged.totalUniqueReach > 0
                ? `${formatCompact(merged.totalUniqueReach)} unique views`
                : undefined
            }
            icon={Eye}
            selected={focusedMetric === 'reach'}
            onClick={() => handleMetricToggle('reach')}
            delta={reachDelta?.pct ?? null}
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
                ? 'Page post engagements (Meta)'
                : 'From reactions + comments + shares on posts'
            }
            icon={Heart}
            selected={focusedMetric === 'engagement'}
            onClick={() => handleMetricToggle('engagement')}
            delta={engagementDelta?.pct ?? null}
          />
        </div>
        {focusedMetric ? (
          <InsightDetailPanel
            metric={focusedMetric}
            merged={merged}
            postCount={metrics.posts}
          />
        ) : null}
      </section>

      {topThreePosts.length > 0 ? (
        <section
          className="space-y-4 scroll-mt-6"
          aria-labelledby="top-three-posts-heading"
        >
          <h2
            id="top-three-posts-heading"
            className="flex items-center gap-2 text-lg font-semibold text-foreground"
          >
            <Crown className="h-5 w-5 text-amber-500" aria-hidden />
            Top 3 ranked posts
            <span className="text-xs font-normal text-muted-foreground">
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
                classification={nudgeDud.classifications.get(post.postId)}
              />
            ))}
          </div>
        </section>
      ) : null}

      <GrowthStudioBlock
        platform="facebook"
        replyGroups={replyGroups}
        pageName={pageAnalytics?.pageName}
      />

      <section
        ref={growthSectionRef}
        className="space-y-4 scroll-mt-6"
        aria-labelledby="growth-heading"
      >
        <h2
          id="growth-heading"
          className="flex items-center gap-2 text-lg font-semibold text-foreground"
        >
          <TrendingUp className="h-5 w-5 text-muted-foreground" aria-hidden />
          Growth
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <GrowthAreaChart
            title="Reach"
            data={reachChartData}
            dataKey="reach"
            config={reachGrowthChartConfig}
          />
          <GrowthAreaChart
            title="Followers"
            data={followersChartData}
            dataKey="followers"
            config={followersGrowthChartConfig}
          />
        </div>
      </section>

      <section
        ref={topPostsSectionRef}
        className="space-y-4 scroll-mt-6"
        aria-labelledby="top-posts-heading"
      >
        <h2
          id="top-posts-heading"
          className="flex items-center gap-2 text-lg font-semibold text-foreground"
        >
          <Trophy className="h-5 w-5 text-amber-600" aria-hidden />
          Top posts
          <span className="text-xs font-normal text-muted-foreground">
            classified vs. the cohort average (1.5× cutoff)
          </span>
        </h2>
        {topPosts.length === 0 ? (
          <p className="rounded-xl border border-border bg-muted px-4 py-8 text-center text-sm text-muted-foreground">
            No post data yet. Sync insights from Facebook to populate this
            section.
          </p>
        ) : (
          <Tabs defaultValue="nudge" className="space-y-4">
            <TabsList className="grid h-auto w-full max-w-sm grid-cols-2 gap-1">
              <TabsTrigger value="nudge" className="gap-2">
                Nudges
                <span className="rounded-full bg-emerald-500/20 px-1.5 text-[10px] font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
                  {nudgeDud.nudges.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="dud" className="gap-2">
                Duds
                <span className="rounded-full bg-accent px-1.5 text-[10px] font-semibold text-foreground ring-1 ring-inset ring-border">
                  {nudgeDud.duds.length}
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="nudge" className="space-y-4 outline-none">
              {nudgeDud.nudges.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
                  No nudges yet — nothing in this window scored 1.5× above
                  your average. Recreate the framing of past winners to push
                  one over the bar.
                </p>
              ) : (
                nudgeDud.nudges.map((post, i) => (
                  <TopPostCard
                    key={post.postId}
                    post={post}
                    rank={i + 1}
                    onExpandImage={setExpandedPost}
                    classification="nudge"
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="dud" className="space-y-4 outline-none">
              {nudgeDud.duds.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
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
                    classification="dud"
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </section>

      <section className="space-y-4" aria-labelledby="audience-heading">
        <h2
          id="audience-heading"
          className="flex items-center gap-2 text-lg font-semibold text-foreground"
        >
          <MapPin className="h-5 w-5 text-muted-foreground" aria-hidden />
          Audience
          <span className="text-xs font-normal text-muted-foreground">(optional)</span>
        </h2>
        {audienceRanked.countries.length === 0 &&
        audienceRanked.cities.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
            Location breakdown will appear here when available.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {audienceRanked.countries.length > 0 ? (
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <h3 className="text-sm font-medium text-foreground">
                  Top countries
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {audienceRanked.countries.map(({ name, count }) => (
                    <li
                      key={name}
                      className="flex items-center justify-between gap-2 border-b border-border/60 pb-2 last:border-0 last:pb-0"
                    >
                      <span className="font-medium text-foreground">{name}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatCompact(count)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {audienceRanked.cities.length > 0 ? (
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <h3 className="text-sm font-medium text-foreground">
                  Top cities
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {audienceRanked.cities.map(({ name, count }) => (
                    <li
                      key={name}
                      className="flex items-center justify-between gap-2 border-b border-border/60 pb-2 last:border-0 last:pb-0"
                    >
                      <span className="font-medium text-foreground">{name}</span>
                      <span className="tabular-nums text-muted-foreground">
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
      />
    </div>
  );
}
