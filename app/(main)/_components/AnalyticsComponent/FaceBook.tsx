import {
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
import { AnalyticsAiInsightCard } from './AnalyticsAiInsightCard';
import { audienceRanked, InsightMetric, Merged, Metrics, PageAnalytics, Post } from '../types';
import { ChartConfig } from '@/components/ui/chart';


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
}) {
  const [focusedMetric, setFocusedMetric] = useState<InsightMetric | null>(
    null
  );
  const growthSectionRef = useRef<HTMLElement>(null);
  const topPostsSectionRef = useRef<HTMLElement>(null);

  const fbPostAiContext = useMemo(() => {
    if (!expandedPost) return null;
    const scores = topPosts.map((p) => p.engagementScore ?? 0);
    const avg = scores.length
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;
    const sorted = [...scores].sort((a, b) => a - b);
    const median = sorted.length
      ? sorted[Math.floor(sorted.length / 2)]
      : 0;
    const rank =
      [...topPosts]
        .sort(
          (a, b) => (b.engagementScore ?? 0) - (a.engagementScore ?? 0)
        )
        .findIndex((p) => p.postId === expandedPost.postId) + 1;
    return {
      post: {
        messagePreview: expandedPost.message?.slice(0, 600),
        mediaUrl: expandedPost.mediaUrl?.trim() || undefined,
        type: expandedPost.type,
        reactions: expandedPost.reactions,
        comments: expandedPost.comments,
        shares: expandedPost.shares,
        engagementScore: expandedPost.engagementScore,
        impressions: expandedPost.impressions,
        uniqueImpressions: expandedPost.uniqueImpressions,
        clicks: expandedPost.clicks,
        engagementRate: expandedPost.engagementRate,
      },
      peers: {
        count: topPosts.length,
        avgEngagement: avg,
        medianEngagement: median,
        rankByEngagement: rank || undefined,
      },
    };
  }, [expandedPost, topPosts]);

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

  return (
    <div className='space-y-6'>
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-zinc-900">
          <Facebook className="h-7 w-7 text-blue-700" />
          Analytics
        </h1>
        <p>Page Name: {pageAnalytics?.pageName}</p>
        {metrics.updatedLabel ? (
          <p className="text-sm text-zinc-500">
            Last updated {metrics.updatedLabel}
          </p>
        ) : null}
      </header>

      <section aria-labelledby="analytics-cards-heading">
        <h2 id="analytics-cards-heading" className="sr-only">
          Overview metrics
        </h2>
        <AnalyticsAiInsightCard
          platform="facebook"
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
                ? 'Page post engagements (Meta)'
                : 'From reactions + comments + shares on posts'
            }
            icon={Heart}
            selected={focusedMetric === 'engagement'}
            onClick={() => handleMetricToggle('engagement')}
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

      <section
        ref={growthSectionRef}
        className="space-y-4 scroll-mt-6"
        aria-labelledby="growth-heading"
      >
        <h2
          id="growth-heading"
          className="flex items-center gap-2 text-lg font-semibold text-zinc-900"
        >
          <TrendingUp className="h-5 w-5 text-zinc-600" aria-hidden />
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
          className="flex items-center gap-2 text-lg font-semibold text-zinc-900"
        >
          <Trophy className="h-5 w-5 text-amber-600" aria-hidden />
          Top posts
        </h2>
        {topPosts.length === 0 ? (
          <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600">
            No post data yet. Sync insights from Facebook to populate this
            section.
          </p>
        ) : (
          <div className="space-y-4">
            {topPosts.map((post, i) => (
              <TopPostCard
                key={post.postId}
                post={post}
                rank={i + 1}
                onExpandImage={setExpandedPost}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4" aria-labelledby="audience-heading">
        <h2
          id="audience-heading"
          className="flex items-center gap-2 text-lg font-semibold text-zinc-900"
        >
          <MapPin className="h-5 w-5 text-zinc-600" aria-hidden />
          Audience
          <span className="text-xs font-normal text-zinc-400">(optional)</span>
        </h2>
        {audienceRanked.countries.length === 0 &&
        audienceRanked.cities.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-6 text-center text-sm text-zinc-500">
            Location breakdown will appear here when available.
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
                <h3 className="text-sm font-medium text-zinc-700">
                  Top cities
                </h3>
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
        aiFooter={
          expandedPost && fbPostAiContext ? (
            <AnalyticsAiInsightCard
              platform="facebook"
              scope="post"
              context={fbPostAiContext}
              compact
              embed
            />
          ) : null
        }
      />
    </div>
  );
}
