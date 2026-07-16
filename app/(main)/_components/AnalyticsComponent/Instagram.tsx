import { useMemo } from "react";
import { AnalyticsWeeklyVerdict } from "./AnalyticsWeeklyVerdict";
import { SyncErrorBanner } from "./SyncErrorBanner";
import {
  buildReplyQueueGroupsInstagram,
  GrowthStudioBlock,
  replyQueueLoadStatsInstagram,
} from "./growth-studio";
import type { PreloadedReplySuggestions } from "./growth-studio/_common";
import { InstagramAnalytics, InstagramPost } from "../types";
import {
  audienceCounts,
  formatLastUpdated,
  igTrendSeries,
  classifyPostsAsNudgeOrDud,
  postFrequencyEntries,
  rankedRecordEntries,
  weeklyDeltaFromPostFrequency,
  weeklyDeltaFromTrend,
} from "./utils/utils_functions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Crown, Eye, Film, Heart, ImageIcon, Instagram, Layers, MapPin, PlayCircle, Sparkles, TrendingUp, Trophy, Users } from "lucide-react";
import { formatChartTooltipDate, formatCompact, GrowthAreaChart } from "./utils/facebook_components/util_component";
import { IgMetricTile, InstagramMediaCard, InstagramMediaDialog } from "./utils/instagram_components/utils_components";
import { ChartConfig } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, '') ?? '';

function instagramOAuthAnalyticsHref(): string | null {
  if (!BACKEND_URL) return null;
  return `${BACKEND_URL}/auth/instagram`;
}

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
    repliedCommentIds,
    preloadedReplySuggestions,
  }: {
    ig: InstagramAnalytics | null;
    posts: InstagramPost[];
    expandedPost: InstagramPost | null;
    IG_MEDIA_LIMIT: number;
    onExpandedPostChange: (p: InstagramPost | null) => void;
    pageAiContext: Record<string, unknown>;
    repliedCommentIds?: string[];
    preloadedReplySuggestions?: PreloadedReplySuggestions;
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

    const replyGroups = useMemo(
      () => buildReplyQueueGroupsInstagram(posts, repliedCommentIds),
      [posts, repliedCommentIds]
    );
    const replyLoadStats = useMemo(
      () => replyQueueLoadStatsInstagram(posts),
      [posts]
    );

    /** Slice for the new "Top 3 ranked posts" highlight section. */
    const topThreeMedia = useMemo(() => topMedia.slice(0, 3), [topMedia]);

    /**
     * Splits the full top-media list into Nudges vs Duds using the 1.5×
     * average-engagement threshold so we can render filter tabs below.
     */
    const nudgeDud = useMemo(
      () =>
        classifyPostsAsNudgeOrDud(
          topMedia,
          (p) => p.postId,
          (p) => p.engagementScore ?? 0
        ),
      [topMedia]
    );

    /** Weekly deltas for the overview tiles. */
    const reachDelta = useMemo(
      () => weeklyDeltaFromTrend(igTrendSeries(ig, 'reachTrend')),
      [ig]
    );
    const viewsDelta = useMemo(
      () => weeklyDeltaFromTrend(igTrendSeries(ig, 'viewsTrend')),
      [ig]
    );
    const interactionsDelta = useMemo(
      () => weeklyDeltaFromTrend(igTrendSeries(ig, 'interactionsTrend')),
      [ig]
    );
    const engagedDelta = useMemo(
      () => weeklyDeltaFromTrend(igTrendSeries(ig, 'engagedTrend')),
      [ig]
    );
    const followersDelta = useMemo(
      () => weeklyDeltaFromTrend(igTrendSeries(ig, 'followsTrend')),
      [ig]
    );
    const postsDelta = useMemo(
      () => weeklyDeltaFromPostFrequency(ig?.postFrequency),
      [ig?.postFrequency]
    );

    if (!ig && posts.length === 0) {
      const oauthHref = instagramOAuthAnalyticsHref();
      return (
        <div className="rounded-xl border border-dashed border-border bg-muted/40 px-6 py-14 text-center">
          <Instagram className="mx-auto h-10 w-10 text-pink-400" aria-hidden />
          <p className="mt-3 text-sm font-medium text-foreground">
            No Instagram analytics yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect Instagram and sync insights to see reach, views, audience, and
            per-media metrics here.
          </p>
          {oauthHref ? (
            <Button
              asChild
              className="mt-6 bg-pink-600 text-white hover:bg-pink-700"
            >
              <a href={oauthHref}>Connect Instagram</a>
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

    const cb = ig?.contentBreakdown;
  
    return (
      <div className="space-y-10 pb-4">
        <SyncErrorBanner
          platform="Instagram"
          status={ig?.lastSyncStatus}
          error={ig?.lastSyncError}
          lastSyncAt={ig?.lastSyncAt}
        />
        <header className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            <Instagram className="h-7 w-7 text-pink-600" aria-hidden />
            Analytics
          </h1>
          {ig?.username ? (
            <p className="text-sm text-muted-foreground">
              @{ig.username} · {formatCompact(ig.mediaCount)} media
            </p>
          ) : null}
          {ig?.lastUpdated ? (
            <p className="text-sm text-muted-foreground">
              Last updated {formatLastUpdated(ig.lastUpdated)}
            </p>
          ) : null}
        </header>
  
        <AnalyticsWeeklyVerdict
          platform="instagram"
          context={pageAiContext}
        />

        {ig ? (
          <section aria-label="Instagram overview">
            <h2 className="sr-only">Overview metrics</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <IgMetricTile
                label="Followers"
                value={formatCompact(ig.followers)}
                icon={Users}
                delta={followersDelta?.pct ?? null}
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
                delta={reachDelta?.pct ?? null}
              />
              <IgMetricTile
                label="Views"
                value={formatCompact(ig.views)}
                icon={PlayCircle}
                delta={viewsDelta?.pct ?? null}
              />
              <IgMetricTile
                label="Interactions"
                value={formatCompact(ig.interactions)}
                icon={Heart}
                delta={interactionsDelta?.pct ?? null}
              />
              <IgMetricTile
                label="Accounts engaged"
                value={formatCompact(ig.accountsEngaged)}
                icon={Sparkles}
                delta={engagedDelta?.pct ?? null}
              />
              <IgMetricTile
                label="Posts"
                value={formatCompact(posts.length)}
                icon={ImageIcon}
                delta={postsDelta?.pct ?? null}
              />
              <IgMetricTile
                label="Media count"
                value={formatCompact(ig.mediaCount)}
                icon={ImageIcon}
              />
            </div>
          </section>
        ) : null}

        {topThreeMedia.length > 0 ? (
          <section
            className="space-y-4 scroll-mt-6"
            aria-labelledby="ig-top-three-heading"
          >
            <h2
              id="ig-top-three-heading"
              className="flex items-center gap-2 text-lg font-semibold text-foreground"
            >
              <Crown className="h-5 w-5 text-amber-500" aria-hidden />
              Top 3 ranked posts
              <span className="text-xs font-normal text-muted-foreground">
                best performers in the last 3 weeks
              </span>
            </h2>
            <div className="space-y-4">
              {topThreeMedia.map((post, i) => (
                <InstagramMediaCard
                  key={`top3-${post.postId}`}
                  post={post}
                  rank={i + 1}
                  onExpand={onExpandedPostChange}
                  classification={nudgeDud.classifications.get(post.postId)}
                />
              ))}
            </div>
          </section>
        ) : null}

        <GrowthStudioBlock
          platform="instagram"
          replyGroups={replyGroups}
          replyLoadStats={replyLoadStats}
          pageName={ig?.username}
          preloadedReplySuggestions={preloadedReplySuggestions}
        />

        {cb ? (
          <section className="space-y-3" aria-labelledby="ig-content-mix">
            <h2
              id="ig-content-mix"
              className="text-lg font-semibold text-foreground"
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
                  className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-3 shadow-sm"
                >
                  <Icon className="h-5 w-5 text-pink-500" aria-hidden />
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-lg font-semibold tabular-nums text-foreground">
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
            className="flex items-center gap-2 text-lg font-semibold text-foreground"
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
            <h2 className="text-sm font-medium text-foreground">
              Recent posting days
            </h2>
            <ul className="flex flex-wrap gap-2">
              {freqChips.map(({ date, count }) => (
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
          </section>
        ) : null}
  
        <section className="space-y-4" aria-labelledby="ig-top-media">
          <h2
            id="ig-top-media"
            className="flex items-center gap-2 text-lg font-semibold text-foreground"
          >
            <Trophy className="h-5 w-5 text-amber-600" aria-hidden />
            Top media
            <span className="text-xs font-normal text-muted-foreground">
              classified vs. the cohort average (1.5× cutoff)
            </span>
          </h2>
          {topMedia.length === 0 ? (
            <p className="rounded-xl border border-border bg-muted px-4 py-8 text-center text-sm text-muted-foreground">
              No media loaded yet. Sync Instagram insights to populate this list.
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
                    your average. Recreate the framing of past winners to
                    push one over the bar.
                  </p>
                ) : (
                  nudgeDud.nudges.map((post, i) => (
                    <InstagramMediaCard
                      key={post.postId}
                      post={post}
                      rank={i + 1}
                      onExpand={onExpandedPostChange}
                      classification="nudge"
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="dud" className="space-y-4 outline-none">
                {nudgeDud.duds.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
                    No duds — every recent post is performing at or above
                    the nudge bar. Keep the streak going.
                  </p>
                ) : (
                  nudgeDud.duds.map((post, i) => (
                    <InstagramMediaCard
                      key={post.postId}
                      post={post}
                      rank={i + 1}
                      onExpand={onExpandedPostChange}
                      classification="dud"
                    />
                  ))
                )}
              </TabsContent>
            </Tabs>
          )}
        </section>
  
        <section className="space-y-4" aria-labelledby="ig-audience">
          <h2
            id="ig-audience"
            className="flex items-center gap-2 text-lg font-semibold text-foreground"
          >
            <MapPin className="h-5 w-5 text-pink-600" aria-hidden />
            Audience
          </h2>
          {igAudience.countries.length === 0 &&
          igAudience.cities.length === 0 &&
          igAudience.ageGender.length === 0 &&
          igAudience.genderSplit.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
              Demographics will appear after Instagram provides audience
              breakdowns.
            </p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {igAudience.countries.length > 0 ? (
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <h3 className="text-sm font-medium text-foreground">
                    Top countries
                  </h3>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {igAudience.countries.map(({ name, count }) => (
                      <li
                        key={name}
                        className="flex justify-between gap-2 border-b border-border/60 pb-2 last:border-0 last:pb-0"
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
              {igAudience.cities.length > 0 ? (
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <h3 className="text-sm font-medium text-foreground">
                    Top cities
                  </h3>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {igAudience.cities.map(({ name, count }) => (
                      <li
                        key={name}
                        className="flex justify-between gap-2 border-b border-border/60 pb-2 last:border-0 last:pb-0"
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
              {igAudience.ageGender.length > 0 ? (
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm lg:col-span-2">
                  <h3 className="text-sm font-medium text-foreground">
                    Age & gender
                  </h3>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {igAudience.ageGender.map(({ name, value }) => (
                      <li
                        key={name}
                        className="rounded-lg bg-pink-50 px-2.5 py-1 text-xs text-pink-900 ring-1 ring-secondary/20"
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
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm lg:col-span-2">
                  <h3 className="text-sm font-medium text-foreground">
                    Gender split
                  </h3>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {igAudience.genderSplit.map(({ name, value }) => (
                      <li
                        key={name}
                        className="rounded-lg bg-muted px-2.5 py-1 text-xs text-foreground ring-1 ring-border"
                      >
                        <span className="font-medium">{name}</span>{' '}
                        <span className="tabular-nums text-muted-foreground">
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
        />
      </div>
    );
  }
  