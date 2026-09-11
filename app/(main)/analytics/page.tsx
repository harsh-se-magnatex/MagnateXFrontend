'use client';

import { PageLoadingState } from '@/components/shared/PageLoadingState';
import { NonSubscribedFeatureBlock } from '@/components/shared/NonSubscribedFeatureBlock';
import { isPlanInactive } from '@/lib/plan-access';
import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import {
  getInsightsFaceBook,
  getInsightsInstagram,
  getInsightsLinkedIn,
} from '@/src/service/api/analyticService';
import {
  getInsightsSnapshot,
  type AnalyticsSnapshotDocument,
} from '@/src/service/api/insights-snapshot.service';
import { useWhatToPostNextCache } from '@/src/stores/whatToPostNextCache';
import { useWhereToSpendCache } from '@/src/stores/whereToSpendCache';
import { useWeeklyVerdictCache } from '@/src/stores/weeklyVerdictCache';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FaceBookAnalytics from '../_components/AnalyticsComponent/FaceBook';
import { InstagramAnalyticsView } from '../_components/AnalyticsComponent/Instagram';
import LinkedInAnalyticsView from '../_components/AnalyticsComponent/LinkedIn';
import {
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
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { useTimestampFormatter } from '@/lib/user-timezone';
import {
  countEnabledPlatforms,
  isPlatformSelectionComplete,
} from '@/lib/platform-selection';
import { buildBusinessSocialProfileUrl } from '@/lib/business-social-profile-url';

function formatRefreshedAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return 'recently';
  const diffMin = Math.max(0, Math.round((Date.now() - then) / 60_000));
  if (diffMin < 1) return 'moments ago';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
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
  const [fbRepliedCommentIds, setFbRepliedCommentIds] = useState<string[]>([]);
  const [igRepliedCommentIds, setIgRepliedCommentIds] = useState<string[]>([]);
  const [liRepliedCommentIds, setLiRepliedCommentIds] = useState<string[]>([]);
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
  const { billing, loading: billingLoading } = useUserPlanCredits();
  const fmtTimestamp = useTimestampFormatter();
  const router = useRouter();
  const activePlan = billing?.activePlan ?? 'non-subscribed';

  // Tracks the cron snapshot for the "Refreshed Xh ago" badge. Null
  // means either no snapshot exists yet (brand-new user / first run) or
  // the read itself failed; either way the UI degrades to the existing
  // live OpenAI calls inside each Growth Studio section.
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshotDocument | null>(
    null
  );
  const [manualRefreshByPlatform, setManualRefreshByPlatform] = useState<
    Record<PlatformTab, { used: number; limit: number; remaining: number }> 
  >({
    facebook: { used: 0, limit: 2, remaining: 2 },
    instagram: { used: 0, limit: 2, remaining: 2 },
    linkedin: { used: 0, limit: 2, remaining: 2 },
  });
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const seedSnapshot = useCallback((latest: AnalyticsSnapshotDocument) => {
    setSnapshot(latest);
    const wtnCache = useWhatToPostNextCache.getState();
    const wtsCache = useWhereToSpendCache.getState();
    const verdictCache = useWeeklyVerdictCache.getState();
    (['facebook', 'instagram', 'linkedin'] as const).forEach((p) => {
      const wtn = latest.whatToPostNext[p];
      if (wtn) wtnCache.set(p, wtn);
      const wts = latest.whereToSpend[p];
      if (wts) wtsCache.set(p, wts);
      const verdict = latest.weeklyVerdict?.[p];
      if (verdict) verdictCache.set(p, verdict.verdict, verdict.source);
    });
  }, []);

  const loadPlatformAnalytics = useCallback(async (
    isCancelled: () => boolean,
    onlyPlatform?: PlatformTab
  ) => {
    const [fbOutcome, igOutcome, liOutcome] = await Promise.allSettled([
      !onlyPlatform || onlyPlatform === 'facebook'
        ? getInsightsFaceBook()
        : Promise.resolve(null),
      !onlyPlatform || onlyPlatform === 'instagram'
        ? getInsightsInstagram()
        : Promise.resolve(null),
      !onlyPlatform || onlyPlatform === 'linkedin'
        ? getInsightsLinkedIn()
        : Promise.resolve(null),
    ]);
    if (isCancelled()) return;

    if (fbOutcome.status === 'fulfilled' && fbOutcome.value) {
      const response = fbOutcome.value;
      const paUnknown: unknown = response.data.pageAnalytics;
      setPageAnalytics(
        paUnknown != null && typeof paUnknown === 'object' && !Array.isArray(paUnknown)
          ? (paUnknown as PageAnalytics)
          : null
      );
      const postsUnknown: unknown = response.data.allPosts;
      setAllPosts(Array.isArray(postsUnknown) ? (postsUnknown as Post[]) : []);
      setFbRepliedCommentIds(response.data.repliedCommentIds ?? []);
    }

    if (igOutcome.status === 'fulfilled' && igOutcome.value) {
      const response = igOutcome.value;
      const igUnknown: unknown = response.data.igAnalytics;
      setIgAnalytics(
        igUnknown != null && typeof igUnknown === 'object' && !Array.isArray(igUnknown)
          ? (igUnknown as InstagramAnalytics)
          : null
      );
      const igPostsUnknown: unknown = response.data.allPosts;
      setAllIgPosts(
        Array.isArray(igPostsUnknown) ? (igPostsUnknown as InstagramPost[]) : []
      );
      setIgRepliedCommentIds(response.data.repliedCommentIds ?? []);
    }

    if (liOutcome.status === 'fulfilled' && liOutcome.value) {
      const response = liOutcome.value;
      const liUnknown: unknown = response.data.liAnalytics;
      setLiAnalytics(
        liUnknown != null && typeof liUnknown === 'object' && !Array.isArray(liUnknown)
          ? (liUnknown as LinkedInAnalytics)
          : null
      );
      const liPostsUnknown: unknown = response.data.allPosts;
      setAllLiPosts(
        Array.isArray(liPostsUnknown) ? (liPostsUnknown as LinkedInPost[]) : []
      );
      setLiRepliedCommentIds(response.data.repliedCommentIds ?? []);
      setLiConnection({ connected: Boolean(response.data.linkedinAnalyticsConnected) });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Pull the cron-built snapshot first so we can seed the
        // What-to-post-next + Where-to-spend + weekly verdict Zustand caches
        // BEFORE the per-platform sections mount. Each cache hit skips an OpenAI
        // call (3 + 3 + 3 = 9 saved per page view). syncInsights is
        // intentionally NOT called here \u2014 it's expensive (Meta /
        // LinkedIn round-trips) and now runs once per 24h via
        // `/cron/sync-analytics` on the API.
        try {
          const { snapshot: latest, manualRefreshByPlatform: quotas } =
            await getInsightsSnapshot();
          if (!cancelled && latest) {
            seedSnapshot(latest);
          }
          if (!cancelled && quotas) {
            setManualRefreshByPlatform((current) => ({ ...current, ...quotas }));
          }
        } catch (e) {
          console.warn('[analytics] snapshot read failed', e);
        }
        if (cancelled) return;

        await loadPlatformAnalytics(() => cancelled);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadPlatformAnalytics, seedSnapshot]);

  async function handleManualRefresh() {
    if (refreshing || manualRefreshByPlatform[platform].remaining === 0) return;
    setRefreshing(true);
    setRefreshError(null);
    try {
      const { snapshot: latest, manualRefresh: quota } =
        await getInsightsSnapshot({ build: true, platform });
      if (latest) seedSnapshot(latest);
      if (quota) {
        setManualRefreshByPlatform((current) => ({
          ...current,
          [platform]: quota,
        }));
      }
      await loadPlatformAnalytics(() => false, platform);
      setRefreshing(false);
    } catch (error) {
      setRefreshing(false);
      setRefreshError(
        error instanceof Error
          ? error.message
          : 'Could not refresh analytics right now.'
      );
    }
  }

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
      updatedLabel: fmtTimestamp(pageAnalytics?.lastUpdated, {
        placeholder: '',
      }),
    };
  }, [merged, allPosts.length, pageAnalytics?.lastUpdated, fmtTimestamp]);

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

  const facebookProfileUrl = useMemo(
    () =>
      pageAnalytics
        ? buildBusinessSocialProfileUrl('facebook', {
            selectedPageId: pageAnalytics.pageId,
            pageName: pageAnalytics.pageName,
          })
        : null,
    [pageAnalytics]
  );

  const instagramProfileUrl = useMemo(
    () =>
      igAnalytics
        ? buildBusinessSocialProfileUrl('instagram', {
            pageName: igAnalytics.username,
          })
        : null,
    [igAnalytics]
  );

  const liMerged = useMemo((): LinkedInMerged => {
    if (!liAnalytics) {
      const engagementsFromPosts = allLiPosts.reduce(
        (s, p) => s + (Number(p.engagementScore) || 0),
        0
      );
      return {
        followersTrend: [],
        pageViewsTrend: [],
        impressionsTrend: [],
        engagementsTrend: [],
        totalFollowers: 0,
        totalPageViews: 0,
        totalImpressions: 0,
        totalEngagementsPage: 0,
        engagementsFromPosts,
        postFrequencyTop: [],
      };
    }
    const followersTrend = liTrendSeries(liAnalytics, 'followersTrend');
    const pageViewsTrend = liTrendSeries(liAnalytics, 'pageViewsTrend');
    const impressionsTrend = liTrendSeries(liAnalytics, 'impressionsTrend');
    const engagementsTrend = liTrendSeries(liAnalytics, 'engagementsTrend');
    const totalFollowers = Number(liAnalytics.followers) || 0;
    const totalPageViews = Number(liAnalytics.pageViews) || 0;
    const totalImpressions = Number(liAnalytics.impressions) || 0;
    const totalEngagementsPage = Number(liAnalytics.engagements) || 0;
    const engagementsFromPosts = allLiPosts.reduce(
      (s, p) => s + (Number(p.engagementScore) || 0),
      0
    );
    const postFrequencyTop = postFrequencyEntries(liAnalytics).slice(0, 7);
    return {
      followersTrend,
      pageViewsTrend,
      impressionsTrend,
      engagementsTrend,
      totalFollowers,
      totalPageViews,
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
      pageName: liAnalytics?.pageName,
      organizationUrn: liAnalytics?.organizationUrn,
      headline: liAnalytics?.headline,
      followers: liMerged.totalFollowers,
      pageViews: liMerged.totalPageViews,
      impressions,
      uniqueImpressions: liAnalytics?.uniqueImpressions,
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
    liAnalytics?.pageName,
    liAnalytics?.organizationUrn,
    liAnalytics?.headline,
    liAnalytics?.uniqueImpressions,
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

  const liPageViewsChartData = useMemo(
    () =>
      liTrendSeries(liAnalytics, 'pageViewsTrend').map(({ date, value }) => ({
        date,
        pageViews: value,
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

  const linkedInProfileUrl = useMemo(
    () =>
      liAnalytics
        ? buildBusinessSocialProfileUrl('linkedin', {
            selectedPageId: liAnalytics.organizationUrn,
            pageName: liAnalytics.pageName ?? liAnalytics.displayName,
          })
        : null,
    [liAnalytics]
  );

  if (billingLoading && !billing) {
    return <PageLoadingState />;
  }

  if (isPlanInactive(billing)) {
    return <NonSubscribedFeatureBlock />;
  }

  if (loading) {
    return <PageLoadingState />;
  }

  const refreshControl = (
    <div className="flex items-center gap-2">
      {refreshError ? (
        <span className="text-[11px] text-danger">{refreshError}</span>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleManualRefresh}
        disabled={refreshing || manualRefreshByPlatform[platform].remaining === 0}
        title={
          manualRefreshByPlatform[platform].remaining === 0
            ? 'You have used both manual refreshes for today.'
            : undefined
        }
      >
        {refreshing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
        {`Refresh (${manualRefreshByPlatform[platform].remaining}/2)`}
      </Button>
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl pb-8">
      <p className="mb-3 flex flex-wrap items-center gap-1.5 text-[11px] text-secondary">
        <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--green-9)] text-white" />
        <span>Insights refresh automatically once every 24 hours.</span>
      </p>
      <Tabs
        value={platform}
        onValueChange={(v) => setPlatform(v as PlatformTab)}
        className="space-y-6"
      >
        <TabsList
          className={`grid h-auto w-full mx-auto max-w-md gap-1 
          grid-cols-3`}
        >
          <TabsTrigger value="facebook">Facebook</TabsTrigger>
          <TabsTrigger value="instagram">Instagram</TabsTrigger>
          <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
        </TabsList>

        <TabsContent value="facebook" className="mt-0 space-y-10 outline-none">
          <FaceBookAnalytics
            key={`facebook-${snapshot?.meta.generatedAt ?? 'initial'}`}
            TOP_POSTS_LIMIT={TOP_POSTS_LIMIT}
            metrics={metrics}
            pageAnalytics={pageAnalytics}
            profileUrl={facebookProfileUrl}
            merged={merged}
            reachChartData={reachChartData}
            followersChartData={followersChartData}
            audienceRanked={audienceRanked}
            expandedPost={expandedPost}
            setExpandedPost={setExpandedPost}
            topPosts={topPosts}
            pageAiContext={fbPageAiContext}
            repliedCommentIds={fbRepliedCommentIds}
            preloadedReplySuggestions={snapshot?.replySuggestions?.facebook}
            refreshControl={refreshControl}
          />
        </TabsContent>

        <TabsContent value="instagram" className="mt-0 outline-none">
          <InstagramAnalyticsView
            key={`instagram-${snapshot?.meta.generatedAt ?? 'initial'}`}
            IG_MEDIA_LIMIT={IG_MEDIA_LIMIT}
            ig={igAnalytics}
            profileUrl={instagramProfileUrl}
            posts={allIgPosts}
            expandedPost={expandedIgPost}
            onExpandedPostChange={setExpandedIgPost}
            pageAiContext={igPageAiContext}
            repliedCommentIds={igRepliedCommentIds}
            preloadedReplySuggestions={snapshot?.replySuggestions?.instagram}
            refreshControl={refreshControl}
          />
        </TabsContent>

        <TabsContent value="linkedin" className="mt-0 outline-none">
          <LinkedInAnalyticsView
            key={`linkedin-${snapshot?.meta.generatedAt ?? 'initial'}`}
            TOP_POSTS_LIMIT={TOP_POSTS_LIMIT}
            connection={liConnection}
            li={liAnalytics}
            profileUrl={linkedInProfileUrl}
            posts={allLiPosts}
            merged={liMerged}
            topPosts={topLiPosts}
            expandedPost={expandedLiPost}
            setExpandedPost={setExpandedLiPost}
            audienceRanked={liAudienceRanked}
            pageAiContext={liPageAiContext}
            followersChartData={liFollowersChartData}
            pageViewsChartData={liPageViewsChartData}
            impressionsChartData={liImpressionsChartData}
            updatedLabel={fmtTimestamp(liAnalytics?.lastUpdated, {
              placeholder: '',
            })}
            repliedCommentIds={liRepliedCommentIds}
            preloadedReplySuggestions={snapshot?.replySuggestions?.linkedin}
            refreshControl={refreshControl}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
