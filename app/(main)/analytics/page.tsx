'use client';

import { PageLoadingState } from '@/components/shared/PageLoadingState';
import { useEffect, useState, useMemo, useRef } from 'react';
import {
  getInsightsFaceBook,
  getInsightsInstagram,
  getInsightsLinkedIn,
  syncInsights,
} from '@/src/service/api/analyticService';
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
import { AlertCircle } from 'lucide-react';
import { useTimestampFormatter } from '@/lib/user-timezone';

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
  const [fbFirstCommentSentPostIds, setFbFirstCommentSentPostIds] = useState<
    string[]
  >([]);
  const [igFirstCommentSentPostIds, setIgFirstCommentSentPostIds] = useState<
    string[]
  >([]);
  const [liFirstCommentSentPostIds, setLiFirstCommentSentPostIds] = useState<
    string[]
  >([]);
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
  const selected = billing?.selected;
  const activePlan = billing?.activePlan ?? 'non-subscribed';
  const selectedCount = Object.values(selected ?? {}).filter(Boolean).length;
  const PLAN_MAX_SOCIAL: Record<string, number> = {
    prime: 1,
    elite: 2,
    legacy: 3,
  };
  const maxPlatforms = PLAN_MAX_SOCIAL[activePlan] ?? 0;

  const showSelectionIncompleteNotice =
    !billingLoading &&
    activePlan !== 'non-subscribed' &&
    maxPlatforms > 0 &&
    selectedCount < maxPlatforms;


  useEffect(() => {
    if (!selected) return;
    const available: PlatformTab[] = [];
    if (selected.facebook) available.push('facebook');
    if (selected.instagram) available.push('instagram');
    if (selected.linkedin) available.push('linkedin');
    if (available.length === 0) return;
    setPlatform((prev) => (available.includes(prev) ? prev : available[0]));
  }, [selected]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        try {
          await syncInsights();
        } catch (e) {
          console.error('[analytics] sync failed', e);
        }
        if (cancelled) return;

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
          setFbRepliedCommentIds(response.data.repliedCommentIds ?? []);
          setFbFirstCommentSentPostIds(
            response.data.firstCommentSentPostIds ?? []
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
          setIgRepliedCommentIds(response.data.repliedCommentIds ?? []);
          setIgFirstCommentSentPostIds(
            response.data.firstCommentSentPostIds ?? []
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
          setLiRepliedCommentIds(response.data.repliedCommentIds ?? []);
          setLiFirstCommentSentPostIds(
            response.data.firstCommentSentPostIds ?? []
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

  if (loading) {
    return <PageLoadingState />;
  }

  if (showSelectionIncompleteNotice) {
    return (
      <>
        <div
          className="mb-6 flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50/90 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          role="status"
        >
          <div className="flex items-start gap-3">
            <AlertCircle
              className="mt-0.5 h-5 w-5 shrink-0 text-blue-600"
              aria-hidden
            />
            <p className="text-sm text-blue-900">
              Your{' '}
              <span className="font-semibold capitalize">{activePlan}</span>{' '}
              plan supports{' '}
              <span className="font-semibold">{maxPlatforms}</span> platform
              {maxPlatforms === 1 ? '' : 's'}, but you&apos;ve only selected{' '}
              <span className="font-semibold">{selectedCount}</span>. Complete
              your platform selection to unlock all your slots.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            className="shrink-0 self-start sm:self-auto"
            onClick={() => router.push('/ai-engine')}
          >
            Select platforms
          </Button>
        </div>
      </>
    );
  }

  return (
    <div className="mx-auto max-w-5xl pb-8">
      <Tabs
        value={platform}
        onValueChange={(v) => setPlatform(v as PlatformTab)}
        className="space-y-6"
      >
        <TabsList className={`grid h-auto w-full mx-auto max-w-md gap-1 
          ${selectedCount === 1 ? 'grid-cols-0 ' : selectedCount === 2 ? "grid-cols-2 " : 'grid-cols-3'}`}>
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
            repliedCommentIds={fbRepliedCommentIds}
            firstCommentSentPostIds={fbFirstCommentSentPostIds}
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
            repliedCommentIds={igRepliedCommentIds}
            firstCommentSentPostIds={igFirstCommentSentPostIds}
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
            pageViewsChartData={liPageViewsChartData}
            impressionsChartData={liImpressionsChartData}
            updatedLabel={fmtTimestamp(liAnalytics?.lastUpdated, {
              placeholder: '',
            })}
            repliedCommentIds={liRepliedCommentIds}
            firstCommentSentPostIds={liFirstCommentSentPostIds}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
