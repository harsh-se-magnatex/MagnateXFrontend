import { useMemo } from "react";
import { AnalyticsAiInsightCard } from "./AnalyticsAiInsightCard";
import { InstagramAnalytics, InstagramPost } from "../types";
import { audienceCounts, formatLastUpdated, igTrendSeries, postFrequencyEntries, rankedRecordEntries } from "./utils/utils_functions";
import { Eye, Film, Heart, ImageIcon, Instagram, Layers, MapPin, PlayCircle, Sparkles, TrendingUp, Trophy, Users } from "lucide-react";
import { formatChartTooltipDate, formatCompact, GrowthAreaChart } from "./utils/facebook_components/util_component";
import { IgMetricTile, InstagramMediaCard, InstagramMediaDialog } from "./utils/instagram_components/utils_components";
import { ChartConfig } from "@/components/ui/chart";

const igReachGrowthChartConfig = {
    reach: { label: 'Reach', color: '#e11d48' },
  } satisfies ChartConfig;
  
  const igViewsGrowthChartConfig = {
    views: { label: 'Views', color: '#9333ea' },
  } satisfies ChartConfig;
  

export function InstagramAnalyticsView({
    ig,
    posts,
    expandedPost,
    IG_MEDIA_LIMIT,
    onExpandedPostChange,
    pageAiContext,
  }: {
    ig: InstagramAnalytics | null;
    posts: InstagramPost[];
    expandedPost: InstagramPost | null;
    IG_MEDIA_LIMIT: number;
    onExpandedPostChange: (p: InstagramPost | null) => void;
    pageAiContext: Record<string, unknown>;
  }) {
    const topMedia = useMemo(
      () =>
        [...posts]
          .sort((a, b) => (b.engagementScore ?? 0) - (a.engagementScore ?? 0))
          .slice(0, IG_MEDIA_LIMIT),
      [posts, IG_MEDIA_LIMIT]
    );
  
    const reachChartData = useMemo(
      () =>
        igTrendSeries(ig, 'reachTrend').map(({ date, value }) => ({
          date,
          reach: value,
        })),
      [ig]
    );
  
    const viewsChartData = useMemo(
      () =>
        igTrendSeries(ig, 'viewsTrend').map(({ date, value }) => ({
          date,
          views: value,
        })),
      [ig]
    );
  
    const igAudience = useMemo(() => {
      return {
        countries: audienceCounts(ig, 'topCountries').slice(0, 12),
        cities: audienceCounts(ig, 'topCities').slice(0, 12),
        ageGender: rankedRecordEntries(ig?.ageGender).slice(0, 16),
        genderSplit: rankedRecordEntries(ig?.genderSplit),
      };
    }, [ig]);
  
    const freqChips = useMemo(() => postFrequencyEntries(ig).slice(0, 7), [ig]);

    const igPostAiContext = useMemo(() => {
      if (!expandedPost) return null;
      const scores = topMedia.map((p) => p.engagementScore ?? 0);
      const avg = scores.length
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0;
      const sorted = [...scores].sort((a, b) => a - b);
      const median = sorted.length
        ? sorted[Math.floor(sorted.length / 2)]
        : 0;
      const rank =
        [...topMedia]
          .sort(
            (a, b) => (b.engagementScore ?? 0) - (a.engagementScore ?? 0)
          )
          .findIndex((p) => p.postId === expandedPost.postId) + 1;
      return {
        post: {
          captionPreview: expandedPost.caption?.slice(0, 600),
          mediaUrl: expandedPost.mediaUrl?.trim() || undefined,
          mediaType: expandedPost.mediaType,
          likes: expandedPost.likes,
          comments: expandedPost.comments,
          saves: expandedPost.saved,
          shares: expandedPost.shares,
          engagementScore: expandedPost.engagementScore,
          engagementRate: expandedPost.engagementRate,
          reach: expandedPost.reach,
          views: expandedPost.views,
        },
        peers: {
          count: topMedia.length,
          avgEngagement: avg,
          medianEngagement: median,
          rankByEngagement: rank || undefined,
        },
      };
    }, [expandedPost, topMedia]);

    if (!ig && posts.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 px-6 py-14 text-center">
          <Instagram className="mx-auto h-10 w-10 text-pink-400" aria-hidden />
          <p className="mt-3 text-sm font-medium text-zinc-800">
            No Instagram analytics yet
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Connect Instagram and sync insights to see reach, views, audience, and
            per-media metrics here.
          </p>
        </div>
      );
    }

    const cb = ig?.contentBreakdown;
  
    return (
      <div className="space-y-10 pb-4">
        <header className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-zinc-900">
            <Instagram className="h-7 w-7 text-pink-600" aria-hidden />
            Analytics
          </h1>
          {ig?.username ? (
            <p className="text-sm text-zinc-600">
              @{ig.username} · {formatCompact(ig.mediaCount)} media
            </p>
          ) : null}
          {ig?.lastUpdated ? (
            <p className="text-sm text-zinc-500">
              Last updated {formatLastUpdated(ig.lastUpdated)}
            </p>
          ) : null}
        </header>
  
        {ig ? (
          <section aria-label="Instagram overview">
            <h2 className="sr-only">Overview metrics</h2>
            <AnalyticsAiInsightCard
              platform="instagram"
              scope="page"
              context={pageAiContext}
              className="mb-4"
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <IgMetricTile
                label="Followers"
                value={formatCompact(ig.followers)}
                icon={Users}
              />
              <IgMetricTile
                label="Following"
                value={formatCompact(ig.following)}
                icon={Users}
              />
              <IgMetricTile
                label="Reach"
                value={formatCompact(ig.reach)}
                icon={Eye}
              />
              <IgMetricTile
                label="Views"
                value={formatCompact(ig.views)}
                icon={PlayCircle}
              />
              <IgMetricTile
                label="Interactions"
                value={formatCompact(ig.interactions)}
                icon={Heart}
              />
              <IgMetricTile
                label="Accounts engaged"
                value={formatCompact(ig.accountsEngaged)}
                icon={Sparkles}
              />
              <IgMetricTile
                label="Media count"
                value={formatCompact(ig.mediaCount)}
                icon={ImageIcon}
              />
            </div>
          </section>
        ) : null}
  
        {cb ? (
          <section className="space-y-3" aria-labelledby="ig-content-mix">
            <h2
              id="ig-content-mix"
              className="text-lg font-semibold text-zinc-900"
            >
              Content mix
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[
                { label: 'Images', n: cb.images, Icon: ImageIcon },
                { label: 'Videos', n: cb.videos, Icon: Film },
                { label: 'Reels', n: cb.reels, Icon: PlayCircle },
                { label: 'Stories', n: cb.stories, Icon: Layers },
                { label: 'Carousels', n: cb.carousels, Icon: Layers },
              ].map(({ label, n, Icon }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-3 shadow-sm"
                >
                  <Icon className="h-5 w-5 text-pink-500" aria-hidden />
                  <div>
                    <p className="text-xs text-zinc-500">{label}</p>
                    <p className="text-lg font-semibold tabular-nums text-zinc-900">
                      {formatCompact(n)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
  
        <section className="space-y-4" aria-labelledby="ig-growth-heading">
          <h2
            id="ig-growth-heading"
            className="flex items-center gap-2 text-lg font-semibold text-zinc-900"
          >
            <TrendingUp className="h-5 w-5 text-pink-600" aria-hidden />
            Growth
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <GrowthAreaChart
              title="Reach"
              data={reachChartData}
              dataKey="reach"
              config={igReachGrowthChartConfig}
            />
            <GrowthAreaChart
              title="Views"
              data={viewsChartData}
              dataKey="views"
              config={igViewsGrowthChartConfig}
            />
          </div>
        </section>
  
        {freqChips.length > 0 ? (
          <section className="space-y-2" aria-label="Post frequency">
            <h2 className="text-sm font-medium text-zinc-700">
              Recent posting days
            </h2>
            <ul className="flex flex-wrap gap-2">
              {freqChips.map(({ date, count }) => (
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
          </section>
        ) : null}
  
        <section className="space-y-4" aria-labelledby="ig-top-media">
          <h2
            id="ig-top-media"
            className="flex items-center gap-2 text-lg font-semibold text-zinc-900"
          >
            <Trophy className="h-5 w-5 text-amber-600" aria-hidden />
            Top media
          </h2>
          {topMedia.length === 0 ? (
            <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600">
              No media loaded yet. Sync Instagram insights to populate this list.
            </p>
          ) : (
            <div className="space-y-4">
              {topMedia.map((post, i) => (
                <InstagramMediaCard
                  key={post.postId}
                  post={post}
                  rank={i + 1}
                  onExpand={onExpandedPostChange}
                />
              ))}
            </div>
          )}
        </section>
  
        <section className="space-y-4" aria-labelledby="ig-audience">
          <h2
            id="ig-audience"
            className="flex items-center gap-2 text-lg font-semibold text-zinc-900"
          >
            <MapPin className="h-5 w-5 text-pink-600" aria-hidden />
            Audience
          </h2>
          {igAudience.countries.length === 0 &&
          igAudience.cities.length === 0 &&
          igAudience.ageGender.length === 0 &&
          igAudience.genderSplit.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-6 text-center text-sm text-zinc-500">
              Demographics will appear after Instagram provides audience
              breakdowns.
            </p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {igAudience.countries.length > 0 ? (
                <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-medium text-zinc-700">
                    Top countries
                  </h3>
                  <ul className="mt-3 space-y-2 text-sm text-zinc-600">
                    {igAudience.countries.map(({ name, count }) => (
                      <li
                        key={name}
                        className="flex justify-between gap-2 border-b border-zinc-100 pb-2 last:border-0 last:pb-0"
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
              {igAudience.cities.length > 0 ? (
                <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-medium text-zinc-700">
                    Top cities
                  </h3>
                  <ul className="mt-3 space-y-2 text-sm text-zinc-600">
                    {igAudience.cities.map(({ name, count }) => (
                      <li
                        key={name}
                        className="flex justify-between gap-2 border-b border-zinc-100 pb-2 last:border-0 last:pb-0"
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
              {igAudience.ageGender.length > 0 ? (
                <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm lg:col-span-2">
                  <h3 className="text-sm font-medium text-zinc-700">
                    Age & gender
                  </h3>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {igAudience.ageGender.map(({ name, value }) => (
                      <li
                        key={name}
                        className="rounded-lg bg-pink-50 px-2.5 py-1 text-xs text-pink-900 ring-1 ring-pink-100"
                      >
                        <span className="font-medium">{name}</span>{' '}
                        <span className="tabular-nums opacity-80">
                          {formatCompact(value)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {igAudience.genderSplit.length > 0 ? (
                <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm lg:col-span-2">
                  <h3 className="text-sm font-medium text-zinc-700">
                    Gender split
                  </h3>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {igAudience.genderSplit.map(({ name, value }) => (
                      <li
                        key={name}
                        className="rounded-lg bg-zinc-50 px-2.5 py-1 text-xs text-zinc-800 ring-1 ring-zinc-200"
                      >
                        <span className="font-medium">{name}</span>{' '}
                        <span className="tabular-nums text-zinc-500">
                          {formatCompact(value)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </section>
  
        <InstagramMediaDialog
          post={expandedPost}
          open={expandedPost !== null && Boolean(expandedPost.mediaUrl)}
          onOpenChange={(next) => {
            if (!next) onExpandedPostChange(null);
          }}
          aiFooter={
            expandedPost && igPostAiContext ? (
              <AnalyticsAiInsightCard
                platform="instagram"
                scope="post"
                context={igPostAiContext}
                compact
                embed
              />
            ) : null
          }
        />
      </div>
    );
  }
  