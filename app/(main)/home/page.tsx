'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { useAuth } from '@/src/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { getUserDetailForHomePage } from '@/src/service/api/userService';
import {
  getScheduledPostsInRange,
  getSocialAccountsApi,
} from '@/src/service/api/social.servce';
import {
  getInsightsFaceBook,
  getInsightsInstagram,
  getInsightsLinkedIn,
} from '@/src/service/api/analyticService';
import { PageLoadingState } from '@/components/shared/PageLoadingState';
import {
  ActivityStatusIcon,
  HomeStatBox,
  PlatformIcon,
  formatPlatformLabel,
  type PlatformId,
} from '@/components/home/dashboard-ui';
import {
  Sparkles,
  AlertTriangle,
  ChevronRight,
  Zap,
  Fingerprint,
  CalendarClock,
  TrendingUp,
  Share2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { workspacePageTitleClass } from '@/lib/workspace-ui';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useUserPlanCredits } from '../_components/UserPlanCreditsProvider';
import { useTourState } from '@/src/stores/tourState';
import { EmailVerificationPurchaseAlert } from '@/components/shared/EmailVerificationPurchaseAlert';
import { ExamplePostsCard } from '@/components/home/ExamplePostsCard';
import {
  useTimestampFormatter,
  useUserTimezone,
  parseTimestampInput,
  type TimestampInput,
} from '@/lib/user-timezone';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import {
  generatedByLabel,
  getActivityScheduleState,
  getDisplayStatus,
  isUpcomingScheduledPost,
  type ScheduledPostStatusInput,
} from '@/lib/scheduled-post-status';
import { weeklyDeltaFromTrend } from '../_components/AnalyticsComponent/utils/utils_functions';
import { WORKSPACE_NAV_HREFS, workspacePageTitle } from '@/lib/workspace-nav';

const SOCIAL_INTEGRATION_PATH = WORKSPACE_NAV_HREFS.linkedProfiles;
const ANALYTICS_PATH = WORKSPACE_NAV_HREFS.analytics;
const BILLINGS_PATH = '/settings/billings';
const UPCOMING_RANGE_MS = 365 * 24 * 60 * 60 * 1000;
/** Visible activity rows before scroll; list still renders up to 5 items. */
const ACTIVITY_VISIBLE_ROWS = 3;
const activityListMaxHeightClass = 'max-h-[14.25rem]';

type SocialAccountRow = {
  platform: string;
  expiresAt?: { _seconds: number; _nanoseconds?: number };
};

export type SocialAccountWarning = {
  platform: string;
  type: 'expiring_soon' | 'expired' | string;
  daysLeft: number;
};

type FirestoreTimestamp = {
  _seconds: number;
  _nanoseconds: number;
};

type DashboardPost = {
  postId?: string;
  imageUrl: string | null;
  schedule?: { at?: FirestoreTimestamp };
  platform: string;
  lifecycle?: string;
  approval?: { status?: string; stage?: string; actor?: string };
  publication?: { lastError?: string | null; errors?: string[] | null };
  GeneratedBy?: string;
};

type HomePageData = {
  credits: number;
  totalAnalytics: number;
  totalSocialAccounts: number;
  totalScheduledPosts: number;
  warnings: SocialAccountWarning[];
  brandProfileComplete?: boolean;
  reviewPreferencesComplete?: boolean;
};

const QUICK_SUGGESTIONS = [
  {
    label: workspacePageTitle(WORKSPACE_NAV_HREFS.quickCreate),
    href: WORKSPACE_NAV_HREFS.quickCreate,
  },
  {
    label: workspacePageTitle(WORKSPACE_NAV_HREFS.schedulePost),
    href: WORKSPACE_NAV_HREFS.schedulePost,
  },
] as const;

/** Today boundaries in the user's timezone, as UTC epoch ms for range queries. */
function computeTodayBounds(tz: string): {
  todayStartMs: number;
  todayEndMs: number;
} {
  const now = new Date();
  const todayStr = formatInTimeZone(now, tz, 'yyyy-MM-dd');
  const todayStart = fromZonedTime(`${todayStr} 00:00:00`, tz);
  const [y, m, d] = todayStr.split('-').map(Number);
  const tomorrowLocal = new Date(y, m - 1, d + 1);
  const yy = tomorrowLocal.getFullYear();
  const mm = String(tomorrowLocal.getMonth() + 1).padStart(2, '0');
  const dd = String(tomorrowLocal.getDate()).padStart(2, '0');
  const todayEnd = fromZonedTime(`${yy}-${mm}-${dd} 00:00:00`, tz);
  return { todayStartMs: todayStart.getTime(), todayEndMs: todayEnd.getTime() };
}

function getActivityDescription(
  post: ScheduledPostStatusInput & {
    GeneratedBy?: string;
    schedule?: { at?: FirestoreTimestamp };
  },
  fmtTimestamp: (input: TimestampInput, options?: { style?: 'time' }) => string
): string {
  const feature = generatedByLabel(post.GeneratedBy) ?? 'Post';
  const time = fmtTimestamp(post.schedule?.at, { style: 'time' });
  const status = getDisplayStatus(post);

  switch (status.variant) {
    case 'posted':
      return `${feature} · Posted at ${time}`;
    case 'approved':
      return `${feature} · Scheduled for ${time}`;
    case 'processing':
      return `${feature} · Publishing at ${time}`;
    case 'pendingByYou':
      return `${feature} · Awaiting your review`;
    case 'pendingByAdmin':
      return `${feature} · Awaiting admin review`;
    case 'failed':
      return `${feature} · Failed to publish`;
    case 'rejected':
      return `${feature} · Rejected`;
    case 'removedByYou':
      return `${feature} · Removed by you`;
    case 'removedByAdmin':
      return `${feature} · Removed by admin`;
    default:
      return time && time !== '—' ? `${feature} · ${time}` : feature;
  }
}

function warningMessage(w: SocialAccountWarning) {
  if (w.type === 'expired') {
    return 'Connection expired — reconnect to keep posting.';
  }
  if (w.type === 'expiring_soon') {
    const n = w.daysLeft;
    const dayWord = n === 1 ? 'day' : 'days';
    return `Expires in ${n} ${dayWord} — reconnect before access is lost.`;
  }
  return 'Action may be required for this connection.';
}

function isPostScheduledToday(
  post: DashboardPost,
  todayStartMs: number,
  todayEndMs: number
): boolean {
  const scheduledAt = parseTimestampInput(post.schedule?.at);
  if (!scheduledAt) return false;
  const t = scheduledAt.getTime();
  return t >= todayStartMs && t < todayEndMs;
}

function formatActivityScheduleLabel(
  scheduleAt: FirestoreTimestamp | undefined,
  isToday: boolean,
  fmtTimestamp: (
    input: TimestampInput,
    options?: { style?: 'time' | 'date' }
  ) => string
): string | null {
  if (!scheduleAt) return null;
  const time = fmtTimestamp(scheduleAt, { style: 'time' });
  if (!time || time === '—') return null;
  if (isToday) return `Today · ${time}`;
  const date = fmtTimestamp(scheduleAt, { style: 'date' });
  return `${date} · ${time}`;
}

function isUpcomingPost(post: DashboardPost): boolean {
  return isUpcomingScheduledPost(post);
}

function isPlatformConnected(
  accounts: SocialAccountRow[],
  platformId: PlatformId
): boolean {
  const acc = accounts.find((a) => a.platform === platformId);
  if (!acc?.expiresAt?._seconds) return false;
  return acc.expiresAt._seconds * 1000 > Date.now();
}

function countConnectedPlatforms(accounts: SocialAccountRow[]): number {
  return (['facebook', 'instagram', 'linkedin'] as const).filter((id) =>
    isPlatformConnected(accounts, id)
  ).length;
}

function analyticsTrendSeries(
  analytics: Record<string, unknown> | null | undefined,
  trendKey: string
): { date: string; value: number }[] {
  const trend = analytics?.[trendKey];
  if (!Array.isArray(trend)) return [];
  return [...trend]
    .filter((point) => point && typeof point === 'object' && 'date' in point)
    .map((point) => ({
      date: String((point as { date: string }).date),
      value: Number((point as { value: number }).value) || 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function platformGrowthPct(
  analytics: Record<string, unknown> | null | undefined,
  primaryKey: string,
  fallbackKey?: string
): number | null {
  const primary = weeklyDeltaFromTrend(
    analyticsTrendSeries(analytics, primaryKey)
  );
  if (primary) return primary.pct;
  if (fallbackKey) {
    return (
      weeklyDeltaFromTrend(analyticsTrendSeries(analytics, fallbackKey))?.pct ??
      null
    );
  }
  return null;
}

function averageGrowthOverviewPct(
  fbAnalytics: Record<string, unknown> | null,
  igAnalytics: Record<string, unknown> | null,
  liAnalytics: Record<string, unknown> | null
): number | null {
  const deltas = [
    platformGrowthPct(fbAnalytics, 'reachTrend', 'engagementsTrend'),
    platformGrowthPct(igAnalytics, 'reachTrend', 'interactionsTrend'),
    platformGrowthPct(liAnalytics, 'pageViewsTrend', 'engagementsTrend'),
  ].filter(
    (value): value is number => value !== null && Number.isFinite(value)
  );

  if (deltas.length === 0) return null;
  return (
    Math.round((deltas.reduce((sum, n) => sum + n, 0) / deltas.length) * 10) /
    10
  );
}

function formatGrowthValue(pct: number | null): ReactNode {
  if (pct === null || !Number.isFinite(pct)) return '—';
  const sign = pct > 0 ? '+' : '';
  return (
    <span
      className={cn(
        pct > 0 && 'text-success',
        pct < 0 && 'text-danger',
        Math.abs(pct) < 0.05 && 'text-secondary'
      )}
    >
      {sign}
      {pct}%
    </span>
  );
}

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const { billing, loading: billingLoading } = useUserPlanCredits();
  const fmtTimestamp = useTimestampFormatter();
  const userTz = useUserTimezone();
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [userDetail, setUserDetail] = useState<HomePageData | null>(null);
  const [upcomingRangePosts, setUpcomingRangePosts] = useState<DashboardPost[]>(
    []
  );
  const [todaysActivityPosts, setTodaysActivityPosts] = useState<
    DashboardPost[]
  >([]);
  const [connectedPlatformCount, setConnectedPlatformCount] = useState(0);
  const [growthOverviewPct, setGrowthOverviewPct] = useState<number | null>(
    null
  );
  const [command, setCommand] = useState('');
  const router = useRouter();
  const isNewUser = localStorage.getItem('isNewUser');

  useEffect(() => {
    if (!loading && !user) router.replace('/sign-in');
  }, [loading, user, router]);

  useEffect(() => {
    if (isNewUser === 'true') {
      router.push('/onBoarding');
      localStorage.removeItem('isNewUser');
    }
  }, [isNewUser, router]);

  useEffect(() => {
    if (loading || authLoading || billingLoading || !user) return;
    const { doneTours, requestTour } = useTourState.getState();
    if (!doneTours['brand-memory'] || doneTours.platform) return;
    // First visit after onboarding / Business Data — full cross-page walkthrough.
    requestTour({ tour: 'platform', startIndex: 0 });
  }, [loading, authLoading, billingLoading, user]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setActivityLoading(true);
    setStatsLoading(true);
    const { todayStartMs: startMs, todayEndMs } = computeTodayBounds(userTz);

    const [
      homeOutcome,
      todayActivityOutcome,
      rangeOutcome,
      socialOutcome,
      fbOutcome,
      igOutcome,
      liOutcome,
    ] = await Promise.allSettled([
      getUserDetailForHomePage(),
      getScheduledPostsInRange({
        fromMs: startMs,
        toMs: todayEndMs - 1,
        excludeRemovedRejected: true,
      }),
      getScheduledPostsInRange({
        fromMs: startMs,
        toMs: startMs + UPCOMING_RANGE_MS,
        excludeRemovedRejected: true,
      }),
      getSocialAccountsApi(),
      getInsightsFaceBook(),
      getInsightsInstagram(),
      getInsightsLinkedIn(),
    ]);

    if (homeOutcome.status === 'fulfilled') {
      const homePayload = homeOutcome.value?.data as
        | { data?: HomePageData }
        | undefined;
      setUserDetail(homePayload?.data ?? null);
    } else {
      console.error(
        '[home] getUserDetailForHomePage failed',
        homeOutcome.reason
      );
      setUserDetail(null);
    }

    if (todayActivityOutcome.status === 'fulfilled') {
      const todayPosts = (todayActivityOutcome.value?.data?.posts ??
        []) as DashboardPost[];
      setTodaysActivityPosts(todayPosts);
    } else {
      console.error(
        '[home] today activity fetch failed',
        todayActivityOutcome.reason
      );
      setTodaysActivityPosts([]);
    }

    if (rangeOutcome.status === 'fulfilled') {
      const rangePosts = (rangeOutcome.value?.data?.posts ??
        []) as DashboardPost[];
      setUpcomingRangePosts(rangePosts);
    } else {
      console.error(
        '[home] getScheduledPostsInRange failed',
        rangeOutcome.reason
      );
      setUpcomingRangePosts([]);
    }

    if (socialOutcome.status === 'fulfilled') {
      const socialRows = socialOutcome.value?.data?.data;
      setConnectedPlatformCount(
        countConnectedPlatforms(Array.isArray(socialRows) ? socialRows : [])
      );
    } else {
      console.error('[home] getSocialAccountsApi failed', socialOutcome.reason);
      setConnectedPlatformCount(0);
    }

    const fbAnalytics =
      fbOutcome.status === 'fulfilled'
        ? (fbOutcome.value.data.pageAnalytics as Record<string, unknown> | null)
        : null;
    const igAnalytics =
      igOutcome.status === 'fulfilled'
        ? (igOutcome.value.data.igAnalytics as Record<string, unknown> | null)
        : null;
    const liAnalytics =
      liOutcome.status === 'fulfilled'
        ? (liOutcome.value.data.liAnalytics as Record<string, unknown> | null)
        : null;

    if (fbOutcome.status === 'rejected') {
      console.warn('[home] Facebook insights unavailable', fbOutcome.reason);
    }
    if (igOutcome.status === 'rejected') {
      console.warn('[home] Instagram insights unavailable', igOutcome.reason);
    }
    if (liOutcome.status === 'rejected') {
      console.warn('[home] LinkedIn insights unavailable', liOutcome.reason);
    }

    setGrowthOverviewPct(
      averageGrowthOverviewPct(fbAnalytics, igAnalytics, liAnalytics)
    );

    setLoading(false);
    setActivityLoading(false);
    setStatsLoading(false);
  }, [userTz]);

  useEffect(() => {
    // Initial dashboard hydration intentionally owns this page's loading state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDashboard();
  }, [loadDashboard]);

  const creditRemaining = billing?.credits ?? userDetail?.credits ?? 0;
  const creditLabel = `${creditRemaining}`;

  const upcomingCount = useMemo(() => {
    return upcomingRangePosts.filter((p) => isUpcomingPost(p)).length;
  }, [upcomingRangePosts]);

  const activityItems = useMemo(() => {
    const { todayStartMs: startMs, todayEndMs } = computeTodayBounds(userTz);
    const byKey = new Map<string, DashboardPost>();
    for (const post of todaysActivityPosts) {
      if (post.lifecycle === 'removed') continue;
      const key =
        post.postId ?? `${post.platform}-${post.schedule?.at?._seconds}`;
      byKey.set(key, post);
    }
    for (const post of upcomingRangePosts) {
      if (post.lifecycle === 'removed') continue;
      if (isPostScheduledToday(post, startMs, todayEndMs)) continue;
      if (!isUpcomingPost(post)) continue;
      const key =
        post.postId ?? `${post.platform}-${post.schedule?.at?._seconds}`;
      byKey.set(key, post);
    }

    return [...byKey.values()]
      .map((post) => {
        const isToday = isPostScheduledToday(post, startMs, todayEndMs);
        return {
          key: post.postId ?? `${post.platform}-${post.schedule?.at?._seconds}`,
          post,
          description: getActivityDescription(post, fmtTimestamp),
          scheduleState: getActivityScheduleState(post),
          isToday,
          scheduleLabel: formatActivityScheduleLabel(
            post.schedule?.at,
            isToday,
            fmtTimestamp
          ),
        };
      })
      .sort((a, b) => {
        if (a.isToday !== b.isToday) return a.isToday ? -1 : 1;
        const sa = a.post.schedule?.at?._seconds ?? 0;
        const sb = b.post.schedule?.at?._seconds ?? 0;
        return sa - sb;
      })
      .slice(0, 5);
  }, [todaysActivityPosts, upcomingRangePosts, fmtTimestamp, userTz]);

  const brandVoiceHealth = useMemo(() => {
    const brandOk = userDetail?.brandProfileComplete === true;
    const prefsOk = userDetail?.reviewPreferencesComplete === true;
    const score = (brandOk ? 1 : 0) + (prefsOk ? 1 : 0);
    if (score === 2) {
      return {
        label: 'Strong',
        hint: 'Brand profile and review preferences are set. Content should stay on-voice.',
        tone: 'positive' as const,
        percent: 100,
      };
    }
    if (score === 1) {
      return {
        label: 'Needs attention',
        hint: 'Finish the missing piece so tone and approvals stay consistent.',
        tone: 'warning' as const,
        percent: 50,
      };
    }
    return {
      label: 'Not set up',
      hint: 'Define your brand voice and review preferences to improve consistency.',
      tone: 'muted' as const,
      percent: userDetail == null ? 0 : 0,
    };
  }, [userDetail]);

  const submitCommand = () => {
    const q = command.trim();
    if (!q) return;
    router.push(
      `${WORKSPACE_NAV_HREFS.quickCreate}?prompt=${encodeURIComponent(q)}`
    );
  };

  function timeGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  const displayName = useMemo(() => {
    return user?.displayName?.split(' ')[0] ?? 'there';
  }, [user]);

  if (loading || authLoading || billingLoading) {
    return <PageLoadingState />;
  }
  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto page-enter pb-24 space-y-12">
      <EmailVerificationPurchaseAlert user={user} />

      {userDetail?.warnings && userDetail.warnings.length > 0 ? (
        <Card className="rounded-2xl border-warning bg-warning p-1 overflow-hidden">
          <Alert
            variant="default"
            className="rounded-xl border-0 bg-transparent px-4 py-4 sm:px-5 sm:py-5"
          >
            <AlertTriangle className="size-5 text-warning" />
            <AlertTitle className="text-default">
              Social accounts need attention
            </AlertTitle>
            <AlertDescription className="mt-2 space-y-3">
              <p>
                A connection is expiring or has expired. Reconnect in social
                settings so scheduling and posting keep working.
              </p>
              <ul className="list-none space-y-2 text-secondary">
                {userDetail.warnings.map((w, i) => (
                  <li
                    key={`${w.platform}-${w.type}-${i}`}
                    className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm"
                  >
                    <span className="font-semibold">
                      {formatPlatformLabel(w.platform)}
                    </span>
                    <span className="text-secondary">
                      — {warningMessage(w)}
                    </span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                size="sm"
                className="mt-1 rounded-full bg-[var(--amber-9)] text-white hover:bg-warning"
              >
                <Link href={SOCIAL_INTEGRATION_PATH}>
                  {workspacePageTitle(WORKSPACE_NAV_HREFS.linkedProfiles)}
                  <ChevronRight className="ml-1 size-4" />
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        </Card>
      ) : null}

      <section className="space-y-6" aria-label="Create">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <span className="text-secondary">
              {timeGreeting()}, {displayName}
            </span>
            <h1 className={cn(workspacePageTitleClass, 'text-balance')}>
              What do you want to create today?
            </h1>
          </div>
        </div>

        <div
          id="tour-home-command"
          className="rounded-2xl border border-default bg-default p-1.5 sm:p-2 flex flex-col sm:flex-row gap-2 sm:items-center"
        >
          <Input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submitCommand();
              }
            }}
            placeholder="Describe a post, campaign, or idea…"
            className="h-11 flex-1 rounded-lg border border-default bg-element focus-visible:ring-2 focus-visible:ring-strong text-base px-4"
            aria-label="What do you want to create?"
          />
          <Button
            type="button"
            onClick={submitCommand}
            className="h-11 rounded-full shrink-0 px-5 gap-2"
            disabled={!command.trim()}
          >
            <Sparkles className="size-4" />
            Create
          </Button>
        </div>

        <div
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
          aria-label="Home overview stats"
        >
          <HomeStatBox
            label="Upcoming"
            sublabel="Today and future"
            icon={CalendarClock}
            value={statsLoading ? '…' : upcomingCount}
          />
          <HomeStatBox
            label="Analytics"
            sublabel="Growth overview · avg across platforms"
            icon={TrendingUp}
            href={ANALYTICS_PATH}
            value={statsLoading ? '…' : formatGrowthValue(growthOverviewPct)}
          />
          <HomeStatBox
            label="Credits"
            sublabel="Total Credits remaining"
            icon={Zap}
            href={BILLINGS_PATH}
            value={statsLoading ? '…' : creditLabel}
          />
          <HomeStatBox
            label="Platforms"
            sublabel="Connected profiles"
            icon={Share2}
            href={SOCIAL_INTEGRATION_PATH}
            value={statsLoading ? '…' : connectedPlatformCount}
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-secondary">
            Quick suggestions
          </p>
          <div className="flex flex-wrap gap-2">
            {QUICK_SUGGESTIONS.map((s) => (
              <Link
                key={s.label}
                href={s.href}
                className={cn(
                  'inline-flex items-center rounded-full border border-default bg-element px-3.5 py-1.5 text-sm font-medium text-default transition-expo',
                  'hover:border-primary/30 hover:bg-primary/5 hover:text-link'
                )}
              >
                {s.label}
              </Link>
            ))}
            <ExamplePostsCard />
          </div>
        </div>
      </section>

      {/* Activity */}
      <section className="space-y-3" aria-label="Activity">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-subsection text-default">Activity</h2>
        </div>
        <Card className="rounded-2xl border-default overflow-hidden">
          {activityLoading ? (
            <div
              className={cn(
                activityListMaxHeightClass,
                'overflow-y-auto custom-scrollbar p-5 space-y-3'
              )}
            >
              {Array.from({ length: ACTIVITY_VISIBLE_ROWS }, (_, i) => i).map(
                (i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 animate-pulse"
                  >
                    <div className="h-9 w-9 rounded-full bg-element" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-3/4 rounded bg-element" />
                      <div className="h-3 w-1/2 rounded bg-element" />
                    </div>
                    <div className="h-5 w-5 rounded-full bg-element" />
                  </div>
                )
              )}
            </div>
          ) : activityItems.length === 0 ? (
            <div className="p-5 text-sm text-secondary">
              No activity to show.{' '}
            </div>
          ) : (
            <div
              className={cn(
                activityListMaxHeightClass,
                'overflow-y-auto overscroll-y-contain custom-scrollbar divide-y divide-border/40'
              )}
              role="list"
              aria-label="Recent activity"
            >
              {activityItems.map(
                ({ key, post, description, scheduleState, scheduleLabel }) => {
                  return (
                    <div
                      key={key}
                      role="listitem"
                      className="flex items-center cursor-default gap-3 p-4 sm:px-5 transition-expo hover:bg-hover"
                    >
                      <PlatformIcon platform={post.platform} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-default text-pretty leading-snug">
                          {description}
                        </p>
                        <p className="text-xs text-secondary mt-0.5">
                          {formatPlatformLabel(post.platform)}
                          {scheduleLabel ? <> · {scheduleLabel}</> : null}
                        </p>
                      </div>
                      <ActivityStatusIcon state={scheduleState} />
                    </div>
                  );
                }
              )}
            </div>
          )}
        </Card>
      </section>

      {/* Brand voice health */}
      <section className="space-y-3" aria-label="Brand voice health">
        <h2 className="text-subsection text-default">
          Brand voice & consistency
        </h2>
        <Card className="rounded-2xl border-default p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-linear-to-br from-[var(--green-9)] to-[var(--green-9)] p-2.5 text-white shrink-0">
              <Fingerprint className="size-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-default">
                  {brandVoiceHealth.label}
                </span>
                <span
                  className={cn(
                    'text-xs font-medium rounded-full px-2 py-0.5',
                    brandVoiceHealth.tone === 'positive' &&
                      'bg-success text-success',
                    brandVoiceHealth.tone === 'warning' &&
                      'bg-warning text-warning',
                    brandVoiceHealth.tone === 'muted' &&
                      'bg-element text-secondary'
                  )}
                >
                  {brandVoiceHealth.percent}% profile
                </span>
              </div>
              <p className="text-sm text-secondary leading-relaxed">
                {brandVoiceHealth.hint}
              </p>
              <div
                className="h-2 rounded-full bg-element overflow-hidden"
                role="presentation"
              >
                <div
                  className={cn(
                    'h-full rounded-full transition-expo',
                    brandVoiceHealth.tone === 'positive' &&
                      'bg-linear-to-r from-[var(--green-9)] to-[var(--green-9)]',
                    brandVoiceHealth.tone === 'warning' &&
                      'bg-linear-to-r from-[var(--amber-9)] to-[var(--amber-9)]',
                    brandVoiceHealth.tone === 'muted' &&
                      'bg-element-foreground/30'
                  )}
                  style={{ width: `${brandVoiceHealth.percent}%` }}
                />
              </div>
              <ul className="text-sm space-y-1.5 pt-1">
                <li className="flex items-center gap-2">
                  {userDetail?.brandProfileComplete ? (
                    <span className="text-success">✓</span>
                  ) : (
                    <span className="text-secondary">○</span>
                  )}
                  <span
                    className={
                      userDetail?.brandProfileComplete
                        ? 'text-default'
                        : 'text-secondary'
                    }
                  >
                    Brand profile{' '}
                    {userDetail?.brandProfileComplete
                      ? 'complete'
                      : 'incomplete'}
                  </span>
                  {!userDetail?.brandProfileComplete ? (
                    <Link
                      href="/brand-dna"
                      className="text-link text-xs font-medium hover:underline ml-auto"
                    >
                      Set up
                    </Link>
                  ) : null}
                </li>
                <li className="flex items-center gap-2">
                  {userDetail?.reviewPreferencesComplete ? (
                    <span className="text-success">✓</span>
                  ) : (
                    <span className="text-secondary">○</span>
                  )}
                  <span
                    className={
                      userDetail?.reviewPreferencesComplete
                        ? 'text-default'
                        : 'text-secondary'
                    }
                  >
                    Review preferences{' '}
                    {userDetail?.reviewPreferencesComplete
                      ? 'saved'
                      : 'not set'}
                  </span>
                  {!userDetail?.reviewPreferencesComplete ? (
                    <Link
                      href="/settings/autopilot-preference"
                      className="text-link text-xs font-medium hover:underline ml-auto"
                    >
                      Complete
                    </Link>
                  ) : null}
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
