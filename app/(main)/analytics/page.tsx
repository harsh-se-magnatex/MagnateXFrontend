'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import {
  getInsightsFaceBook,
  getInsightsInstagram,
  getInsightsLinkedIn,
} from '@/src/service/api/analyticService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FaceBookAnalytics from '../_components/AnalyticsComponent/FaceBook';
import { InstagramAnalyticsView } from '../_components/AnalyticsComponent/Instagram';
import LinkedInAnalyticsView from '../_components/AnalyticsComponent/LinkedIn';
import {
  FirestoreTimestamp,
  InstagramAnalytics,
  InstagramPost,
  LiTrendKey,
  LinkedInAnalytics,
  LinkedInAnalyticsConnection,
  LinkedInMerged,
  LinkedInPost,
  PageAnalytics,
  PageTrendKey,
  Post,
} from '../_components/types';
import {
  UserPlanCreditsProvider,
  useUserPlanCredits,
} from '../_components/UserPlanCreditsProvider';

function formatLastUpdated(
  ts: FirestoreTimestamp | Date | undefined | null
): string {
  if (!ts) return '';
  const ms =
    ts instanceof Date
      ? ts.getTime()
      : '_seconds' in ts
        ? ts._seconds * 1000 + (ts._nanoseconds ?? 0) / 1e6
        : NaN;
  if (!Number.isFinite(ms)) return '';
  return new Date(ms).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function trendSeries(
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

function postFrequencyEntries(
  page:
    | Pick<PageAnalytics, 'postFrequency'>
    | Pick<InstagramAnalytics, 'postFrequency'>
    | Pick<LinkedInAnalytics, 'postFrequency'>
    | null
    | undefined
): { date: string; count: number }[] {
  const pf = page?.postFrequency;
  if (!pf || typeof pf !== 'object' || Array.isArray(pf)) return [];
  return [...Object.entries(pf)]
    .map(([date, n]) => ({ date, count: Number(n) || 0 }))
    .sort((x, y) => y.date.localeCompare(x.date));
}

function audienceCounts(
  page:
    | Pick<PageAnalytics, 'topCountries' | 'topCities'>
    | Pick<InstagramAnalytics, 'topCountries' | 'topCities'>
    | Pick<LinkedInAnalytics, 'topCountries' | 'topCities'>
    | null
    | undefined,
  key: 'topCountries' | 'topCities'
): { name: string; count: number }[] {
  const map = new Map<string, number>();
  const raw = page?.[key];
  if (!raw) {
    return [];
  }
  if (Array.isArray(raw)) {
    for (const name of raw) {
      if (typeof name === 'string' && name)
        map.set(name, (map.get(name) ?? 0) + 1);
    }
  } else if (typeof raw === 'object') {
    for (const [name, n] of Object.entries(raw)) {
      const v = Number(n) || 0;
      if (v > 0) map.set(name, (map.get(name) ?? 0) + v);
    }
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
}

function liTrendSeries(
  li: LinkedInAnalytics | null | undefined,
  trendKey: LiTrendKey
): { date: string; value: number }[] {
  const trend = li?.[trendKey];
  if (!Array.isArray(trend)) return [];
  return [...trend]
    .filter((point) => point?.date)
    .map((point) => ({
      date: String(point.date),
      value: Number(point.value) || 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

const TOP_POSTS_LIMIT = 25;
const IG_MEDIA_LIMIT = 25;

type PlatformTab = 'facebook' | 'instagram' | 'linkedin';

export default function AnalyticsPage() {
  const [pageAnalytics, setPageAnalytics] = useState<PageAnalytics | null>(
    null
  );
  const [igAnalytics, setIgAnalytics] = useState<InstagramAnalytics | null>(
    null
  );
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [allIgPosts, setAllIgPosts] = useState<InstagramPost[]>([]);
  const [liAnalytics, setLiAnalytics] = useState<LinkedInAnalytics | null>(
    null
  );
  const [allLiPosts, setAllLiPosts] = useState<LinkedInPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState<PlatformTab>('facebook');
  const [expandedPost, setExpandedPost] = useState<Post | null>(null);
  const [expandedIgPost, setExpandedIgPost] = useState<InstagramPost | null>(
    null
  );
  const [expandedLiPost, setExpandedLiPost] = useState<Post | null>(null);
  const [liConnection, setLiConnection] = useState<LinkedInAnalyticsConnection>(
    { connected: false }
  );
  const { billing } = useUserPlanCredits();
  const selected = billing?.selected;
  
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [fbOutcome, igOutcome, liOutcome] = await Promise.allSettled([
          getInsightsFaceBook(),
          getInsightsInstagram(),
          getInsightsLinkedIn(),
        ]);
        if (cancelled) return;

        if (fbOutcome.status === 'fulfilled') {
          const response = fbOutcome.value;
          const paUnknown: unknown = response.data.pageAnalytics;
          const pageAnalyticsPayload: PageAnalytics | null =
            paUnknown != null &&
            typeof paUnknown === 'object' &&
            !Array.isArray(paUnknown)
              ? (paUnknown as PageAnalytics)
              : null;
          setPageAnalytics(pageAnalyticsPayload);
          const postsUnknown: unknown = response.data.allPosts;
          setAllPosts(
            Array.isArray(postsUnknown) ? (postsUnknown as Post[]) : []
          );
        }

        if (igOutcome.status === 'fulfilled') {
          const response = igOutcome.value;
          const igUnknown: unknown = response.data.igAnalytics;
          const igPayload: InstagramAnalytics | null =
            igUnknown != null &&
            typeof igUnknown === 'object' &&
            !Array.isArray(igUnknown)
              ? (igUnknown as InstagramAnalytics)
              : null;
          setIgAnalytics(igPayload);
          const igPostsUnknown: unknown = response.data.allPosts;
          setAllIgPosts(
            Array.isArray(igPostsUnknown)
              ? (igPostsUnknown as InstagramPost[])
              : []
          );
        }

        if (liOutcome.status === 'fulfilled') {
          const response = liOutcome.value;

          const liUnknown: unknown = response.data.liAnalytics;
          const liPayload: LinkedInAnalytics | null =
            liUnknown != null &&
            typeof liUnknown === 'object' &&
            !Array.isArray(liUnknown)
              ? (liUnknown as LinkedInAnalytics)
              : null;
          setLiAnalytics(liPayload);
          const liPostsUnknown: unknown = response.data.allPosts;
          setAllLiPosts(
            Array.isArray(liPostsUnknown)
              ? (liPostsUnknown as LinkedInPost[])
              : []
          );
          setLiConnection({
            connected: Boolean(response.data.linkedinAnalyticsConnected),
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const merged = useMemo(() => {
    if (!pageAnalytics) {
      const engagementsFromPosts = allPosts.reduce(
        (s, p) => s + (Number(p.engagementScore) || 0),
        0
      );
      return {
        followersTrend: [] as { date: string; value: number }[],
        reachTrend: [] as { date: string; value: number }[],
        uniqueReachTrend: [] as { date: string; value: number }[],
        engagementsTrend: [] as { date: string; value: number }[],
        totalFollowers: 0,
        totalReach: 0,
        totalUniqueReach: 0,
        totalEngagementsPage: 0,
        engagementsFromPosts,
        postFrequencyTop: [] as { date: string; count: number }[],
      };
    }
    const followersTrend = trendSeries(pageAnalytics, 'followersTrend');
    const reachTrend = trendSeries(pageAnalytics, 'reachTrend');
    const uniqueReachTrend = trendSeries(pageAnalytics, 'uniqueReachTrend');
    const engagementsTrend = trendSeries(pageAnalytics, 'engagementsTrend');
    const totalFollowers = Number(pageAnalytics.followers) || 0;
    const totalReach = Number(pageAnalytics.reach) || 0;
    const totalUniqueReach = Number(pageAnalytics.uniqueReach) || 0;
    const totalEngagementsPage = Number(pageAnalytics.engagements) || 0;
    const engagementsFromPosts = allPosts.reduce(
      (s, p) => s + (Number(p.engagementScore) || 0),
      0
    );
    const postFrequencyTop = postFrequencyEntries(pageAnalytics).slice(0, 7);
    return {
      followersTrend,
      reachTrend,
      uniqueReachTrend,
      engagementsTrend,
      totalFollowers,
      totalReach,
      totalUniqueReach,
      totalEngagementsPage,
      engagementsFromPosts,
      postFrequencyTop,
    };
  }, [pageAnalytics, allPosts]);

  const metrics = useMemo(() => {
    const posts = allPosts.length;
    const engagementValue =
      merged.totalEngagementsPage > 0
        ? merged.totalEngagementsPage
        : merged.engagementsFromPosts;
    return {
      followers: merged.totalFollowers,
      reach: merged.totalReach,
      posts,
      engagement: engagementValue,
      engagementFromPage: merged.totalEngagementsPage > 0,
      updatedLabel: formatLastUpdated(pageAnalytics?.lastUpdated),
    };
  }, [merged, allPosts.length, pageAnalytics?.lastUpdated]);

  const topPosts = useMemo(() => {
    return [...allPosts]
      .sort((a, b) => (b.engagementScore ?? 0) - (a.engagementScore ?? 0))
      .slice(0, TOP_POSTS_LIMIT);
  }, [allPosts]);

  const audienceRanked = useMemo(() => {
    return {
      countries: audienceCounts(pageAnalytics, 'topCountries').slice(0, 12),
      cities: audienceCounts(pageAnalytics, 'topCities').slice(0, 12),
    };
  }, [pageAnalytics]);

  const fbPageAiContext = useMemo(
    () => ({
      pageName: pageAnalytics?.pageName,
      commentsList: pageAnalytics?.commentsList,
      followers: metrics.followers,
      reach: metrics.reach,
      uniqueReach: merged.totalUniqueReach,
      postsAnalyzed: metrics.posts,
      engagementTotal: metrics.engagement,
      engagementSource: metrics.engagementFromPage ? 'page' : 'posts_sum',
      postFrequencyRecent: merged.postFrequencyTop,
      topCountries: audienceRanked.countries.slice(0, 5),
      topPostsSnapshot: topPosts.slice(0, 10).map((p) => ({
        type: p.type,
        engagementScore: p.engagementScore,
        mediaUrl: p.mediaUrl?.trim() || undefined,
      })),
    }),
    [
      pageAnalytics?.pageName,
      metrics.followers,
      metrics.reach,
      metrics.posts,
      metrics.engagement,
      metrics.engagementFromPage,
      merged.totalUniqueReach,
      merged.postFrequencyTop,
      audienceRanked.countries,
      topPosts,
    ]
  );

  const igFreqChipsForAi = useMemo(
    () => postFrequencyEntries(igAnalytics).slice(0, 7),
    [igAnalytics]
  );

  const igCountriesForAi = useMemo(
    () => audienceCounts(igAnalytics, 'topCountries').slice(0, 5),
    [igAnalytics]
  );

  const topIgPostsForAi = useMemo(
    () =>
      [...allIgPosts]
        .sort((a, b) => (b.engagementScore ?? 0) - (a.engagementScore ?? 0))
        .slice(0, 10)
        .map((p) => ({
          mediaType: p.mediaType,
          engagementScore: p.engagementScore,
          mediaUrl: p.mediaUrl?.trim() || undefined,
        })),
    [allIgPosts]
  );

  const igPageAiContext = useMemo(() => {
    if (!igAnalytics) return {};
    return {
      username: igAnalytics.username,
      followers: igAnalytics.followers,
      following: igAnalytics.following,
      reach: igAnalytics.reach,
      views: igAnalytics.views,
      interactions: igAnalytics.interactions,
      accountsEngaged: igAnalytics.accountsEngaged,
      mediaCount: igAnalytics.mediaCount,
      contentBreakdown: igAnalytics.contentBreakdown,
      postFrequencyRecent: igFreqChipsForAi,
      topCountries: igCountriesForAi,
      topPostsSnapshot: topIgPostsForAi,
    };
  }, [igAnalytics, igFreqChipsForAi, igCountriesForAi, topIgPostsForAi]);

  const reachChartData = useMemo(
    () =>
      trendSeries(pageAnalytics, 'reachTrend').map(({ date, value }) => ({
        date,
        reach: value,
      })),
    [pageAnalytics]
  );

  const followersChartData = useMemo(
    () =>
      trendSeries(pageAnalytics, 'followersTrend').map(({ date, value }) => ({
        date,
        followers: value,
      })),
    [pageAnalytics]
  );

  const liMerged = useMemo((): LinkedInMerged => {
    if (!liAnalytics) {
      const engagementsFromPosts = allLiPosts.reduce(
        (s, p) => s + (Number(p.engagementScore) || 0),
        0
      );
      return {
        followersTrend: [],
        impressionsTrend: [],
        engagementsTrend: [],
        totalFollowers: 0,
        totalImpressions: 0,
        totalEngagementsPage: 0,
        engagementsFromPosts,
        postFrequencyTop: [],
      };
    }
    const followersTrend = liTrendSeries(liAnalytics, 'followersTrend');
    const impressionsTrend = liTrendSeries(liAnalytics, 'impressionsTrend');
    const engagementsTrend = liTrendSeries(liAnalytics, 'engagementsTrend');
    const totalFollowers = Number(liAnalytics.followers) || 0;
    const totalImpressions = Number(liAnalytics.impressions) || 0;
    const totalEngagementsPage = Number(liAnalytics.engagements) || 0;
    const engagementsFromPosts = allLiPosts.reduce(
      (s, p) => s + (Number(p.engagementScore) || 0),
      0
    );
    const postFrequencyTop = postFrequencyEntries(liAnalytics).slice(0, 7);
    return {
      followersTrend,
      impressionsTrend,
      engagementsTrend,
      totalFollowers,
      totalImpressions,
      totalEngagementsPage,
      engagementsFromPosts,
      postFrequencyTop,
    };
  }, [liAnalytics, allLiPosts]);

  const topLiPosts = useMemo(() => {
    return [...allLiPosts]
      .sort((a, b) => (b.engagementScore ?? 0) - (a.engagementScore ?? 0))
      .slice(0, TOP_POSTS_LIMIT);
  }, [allLiPosts]);

  const liAudienceRanked = useMemo(() => {
    return {
      countries: audienceCounts(liAnalytics, 'topCountries').slice(0, 12),
      cities: audienceCounts(liAnalytics, 'topCities').slice(0, 12),
    };
  }, [liAnalytics]);

  const liFreqForAi = useMemo(
    () => postFrequencyEntries(liAnalytics).slice(0, 7),
    [liAnalytics]
  );

  const liCountriesForAi = useMemo(
    () => audienceCounts(liAnalytics, 'topCountries').slice(0, 5),
    [liAnalytics]
  );

  const topLiPostsForAi = useMemo(
    () =>
      [...allLiPosts]
        .sort((a, b) => (b.engagementScore ?? 0) - (a.engagementScore ?? 0))
        .slice(0, 10)
        .map((p) => ({
          type: p.type,
          engagementScore: p.engagementScore,
          mediaUrl: p.mediaUrl?.trim() || undefined,
        })),
    [allLiPosts]
  );

  const liPageAiContext = useMemo(() => {
    const impressions = liMerged.totalImpressions;
    const postsCount = allLiPosts.length;
    const engagementVal =
      liMerged.totalEngagementsPage > 0
        ? liMerged.totalEngagementsPage
        : liMerged.engagementsFromPosts;
    return {
      displayName: liAnalytics?.displayName,
      headline: liAnalytics?.headline,
      followers: liMerged.totalFollowers,
      impressions,
      reach: impressions,
      postsAnalyzed: postsCount,
      engagementTotal: engagementVal,
      engagementSource:
        liMerged.totalEngagementsPage > 0 ? 'page' : 'posts_sum',
      postFrequencyRecent: liFreqForAi,
      topCountries: liCountriesForAi,
      topPostsSnapshot: topLiPostsForAi,
    };
  }, [
    liAnalytics?.displayName,
    liAnalytics?.headline,
    liMerged,
    allLiPosts.length,
    liFreqForAi,
    liCountriesForAi,
    topLiPostsForAi,
  ]);

  const liFollowersChartData = useMemo(
    () =>
      liTrendSeries(liAnalytics, 'followersTrend').map(({ date, value }) => ({
        date,
        followers: value,
      })),
    [liAnalytics]
  );

  const liImpressionsChartData = useMemo(
    () =>
      liTrendSeries(liAnalytics, 'impressionsTrend').map(({ date, value }) => ({
        date,
        impressions: value,
      })),
    [liAnalytics]
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-zinc-200" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-zinc-200"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl pb-8">
      <Tabs
        value={platform}
        onValueChange={(v) => setPlatform(v as PlatformTab)}
        className="space-y-6"
      >
        <TabsList className="grid h-auto w-full mx-auto max-w-md grid-cols-3 gap-1">
          {selected?.facebook && <TabsTrigger value="facebook">Facebook</TabsTrigger>}
          {selected?.instagram && <TabsTrigger value="instagram">Instagram</TabsTrigger>}
          {selected?.linkedin && <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>}
        </TabsList>

        <TabsContent value="facebook" className="mt-0 space-y-10 outline-none">
          <FaceBookAnalytics
            TOP_POSTS_LIMIT={TOP_POSTS_LIMIT}
            metrics={metrics}
            pageAnalytics={pageAnalytics}
            merged={merged}
            reachChartData={reachChartData}
            followersChartData={followersChartData}
            audienceRanked={audienceRanked}
            expandedPost={expandedPost}
            setExpandedPost={setExpandedPost}
            topPosts={topPosts}
            pageAiContext={fbPageAiContext}
          />
        </TabsContent>

        <TabsContent value="instagram" className="mt-0 outline-none">
          <InstagramAnalyticsView
            IG_MEDIA_LIMIT={IG_MEDIA_LIMIT}
            ig={igAnalytics}
            posts={allIgPosts}
            expandedPost={expandedIgPost}
            onExpandedPostChange={setExpandedIgPost}
            pageAiContext={igPageAiContext}
          />
        </TabsContent>

        <TabsContent value="linkedin" className="mt-0 outline-none">
          <LinkedInAnalyticsView
            TOP_POSTS_LIMIT={TOP_POSTS_LIMIT}
            connection={liConnection}
            li={liAnalytics}
            posts={allLiPosts}
            merged={liMerged}
            topPosts={topLiPosts}
            expandedPost={expandedLiPost}
            setExpandedPost={setExpandedLiPost}
            audienceRanked={liAudienceRanked}
            pageAiContext={liPageAiContext}
            followersChartData={liFollowersChartData}
            impressionsChartData={liImpressionsChartData}
            updatedLabel={formatLastUpdated(liAnalytics?.lastUpdated)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
