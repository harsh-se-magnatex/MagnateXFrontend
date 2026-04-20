'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/src/hooks/useAuth';
import { useRouter } from 'next/navigation';
import {
  getUserDetailForHomePage,
  logoutUser,
} from '@/src/service/api/userService';
import { getScheduledPosts } from '@/src/service/api/social.servce';
import {
  Sparkles,
  CalendarDays,
  LogOut,
  AlertTriangle,
  ChevronRight,
  Users,
  Zap,
  TrendingUp,
  ArrowRight,
  LayoutGrid,
  RefreshCw,
  CalendarRange,
  Inbox,
  Fingerprint,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useUserPlanCredits } from '../_components/UserPlanCreditsProvider';
import Cookies from 'js-cookie';

export type SocialAccountWarning = {
  platform: string;
  type: 'expiring_soon' | 'expired' | string;
  daysLeft: number;
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

type FirestoreTimestamp = {
  _seconds: number;
  _nanoseconds: number;
};

type DashboardPost = {
  postId?: string;
  imageUrl: string | null;
  scheduleAt?: FirestoreTimestamp;
  platform: string;
  postStatus?: string;
  UserApprovalStatus?: string;
};

const SOCIAL_INTEGRATION_PATH = '/social-media-integration';

const QUICK_SUGGESTIONS = [
  {
    label: 'Generate a post',
    href: '/instant-generation',
  },
  {
    label: 'Build a week of content',
    href: '/batch-generation',
  },
  {
    label: 'Schedule this campaign',
    href: '/post-scheduler',
  },
] as const;

function formatPlatformLabel(platform: string) {
  if (!platform) return 'Account';
  return platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase();
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

function formatScheduleTimeOnly(
  ts: FirestoreTimestamp | null | undefined
): string {
  if (!ts || !('_seconds' in ts)) return '—';
  const date = new Date(ts._seconds * 1000 + (ts._nanoseconds ?? 0) / 1e6);
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function isScheduledToday(ts: FirestoreTimestamp | null | undefined): boolean {
  if (!ts || !('_seconds' in ts)) return false;
  const d = new Date(ts._seconds * 1000 + (ts._nanoseconds ?? 0) / 1e6);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const { billing, loading: billingLoading } = useUserPlanCredits();
  const [loading, setLoading] = useState(true);
  const [userDetail, setUserDetail] = useState<HomePageData | null>(null);
  const [scheduledPosts, setScheduledPosts] = useState<DashboardPost[]>([]);
  const [pendingCursorHint, setPendingCursorHint] = useState(false);
  const [command, setCommand] = useState('');
  const [isNeedApproval, setIsNeedApproval] = useState(false);
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
    setIsNeedApproval(Cookies.get('needed_approval') === 'true');
  }, []);

  useEffect(() => {
    const handleApprovalChange = (e: CustomEvent) => {
      setIsNeedApproval(e.detail);
    };

    window.addEventListener(
      'approvalChanged',
      handleApprovalChange as EventListener
    );
    return () =>
      window.removeEventListener(
        'approvalChanged',
        handleApprovalChange as EventListener
      );
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [homeResult, postsResult] = await Promise.allSettled([
        getUserDetailForHomePage(),
        getScheduledPosts(),
      ]);

      if (homeResult.status === 'fulfilled') {
        const homePayload = homeResult.value?.data as
          | { data?: HomePageData }
          | undefined;
        if (homePayload?.data) setUserDetail(homePayload.data);
      }

      if (postsResult.status === 'fulfilled') {
        const postsData = postsResult.value?.data as
          | { posts?: DashboardPost[]; nextCursor?: unknown }
          | undefined;
        const posts = postsData?.posts ?? [];
        setScheduledPosts(Array.isArray(posts) ? posts : []);
        setPendingCursorHint(Boolean(postsData?.nextCursor));
      } else {
        setScheduledPosts([]);
        setPendingCursorHint(false);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const { pendingReviewCount, pendingReviewIsSingular } = useMemo(() => {
    const n = scheduledPosts.filter(
      (p) => p.UserApprovalStatus === 'pending'
    ).length;
    const plus = pendingCursorHint && n >= 10;
    return {
      pendingReviewCount: plus ? `${n}+` : String(n),
      pendingReviewIsSingular: !plus && n === 1,
    };
  }, [scheduledPosts, pendingCursorHint]);

  const creditRemaining = billing?.credits ?? userDetail?.credits ?? 0;
  const creditLabel = `${creditRemaining}`;

  const todaysCalendarItems = useMemo(() => {
    return scheduledPosts
      .filter((p) => isScheduledToday(p.scheduleAt))
      .map((post) => ({
        key: post.postId ?? `${post.platform}-${post.scheduleAt?._seconds}`,
        post,
        platform: formatPlatformLabel(post.platform),
        time: formatScheduleTimeOnly(post.scheduleAt),
        pending: post.UserApprovalStatus === 'pending',
      }))
      .sort((a, b) => {
        const sa = a.post.scheduleAt?._seconds ?? 0;
        const sb = b.post.scheduleAt?._seconds ?? 0;
        return sa - sb;
      });
  }, [scheduledPosts]);

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
    router.push(`/instant-generation?prompt=${encodeURIComponent(q)}`);
  };

  function timeGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  if (loading || authLoading || billingLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-lg shadow-primary-blue/20 animate-pulse">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            Loading dashboard...
          </span>
        </div>
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto page-enter pb-24 space-y-12">
      {userDetail?.warnings && userDetail.warnings.length > 0 ? (
        <Card className="rounded-2xl border-amber-500/30 bg-amber-500/5 p-1 overflow-hidden">
          <Alert
            variant="default"
            className="rounded-xl border-0 bg-transparent px-4 py-4 sm:px-5 sm:py-5"
          >
            <AlertTriangle className="size-5 text-amber-600 dark:text-amber-500" />
            <AlertTitle className="text-foreground">
              Social accounts need attention
            </AlertTitle>
            <AlertDescription className="mt-2 space-y-3">
              <p>
                A connection is expiring or has expired. Reconnect in social
                settings so scheduling and posting keep working.
              </p>
              <ul className="list-none space-y-2 text-foreground/90">
                {userDetail.warnings.map((w, i) => (
                  <li
                    key={`${w.platform}-${w.type}-${i}`}
                    className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm"
                  >
                    <span className="font-semibold">
                      {formatPlatformLabel(w.platform)}
                    </span>
                    <span className="text-muted-foreground">
                      — {warningMessage(w)}
                    </span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                size="sm"
                className="mt-1 rounded-lg bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500"
              >
                <Link href={SOCIAL_INTEGRATION_PATH}>
                  Manage social accounts
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
            <span className="text-muted-foreground">{timeGreeting()},</span>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight text-balance">
              What do you want to create today?
            </h1>
          </div>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card/80 shadow-sm p-1.5 sm:p-2 flex flex-col sm:flex-row gap-2 sm:items-center">
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
            className="h-11 flex-1 rounded-xl border-0 bg-background/80 shadow-none focus-visible:ring-2 focus-visible:ring-primary/25 text-base px-4"
            aria-label="What do you want to create?"
          />
          <Button
            type="button"
            onClick={submitCommand}
            className="h-11 rounded-xl shrink-0 px-5 gap-2"
            disabled={!command.trim()}
          >
            <Sparkles className="size-4" />
            Create
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Quick suggestions
          </p>
          <div className="flex flex-wrap gap-2">
            {QUICK_SUGGESTIONS.map((s) => (
              <Link
                key={s.label}
                href={s.href}
                className={cn(
                  'inline-flex items-center rounded-full border border-border/60 bg-background/60 px-3.5 py-1.5 text-sm font-medium text-foreground transition-all',
                  'hover:border-primary/30 hover:bg-primary/5 hover:text-primary'
                )}
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Today’s calendar */}
      <section className="space-y-3" aria-label="Today on your calendar">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">
            Today&rsquo;s calendar
          </h2>
        </div>
        <Card className="rounded-2xl border-border/40 overflow-hidden divide-y divide-border/40">
          {todaysCalendarItems.length === 0 ? (
            <div className="p-5 text-sm text-muted-foreground">
              Nothing scheduled for today.{' '}
              <Link
                href="/post-scheduler"
                className="font-medium text-primary hover:underline"
              >
                Plan a post
              </Link>
            </div>
          ) : (
            todaysCalendarItems.map(
              ({ key, post, platform, time, pending }) => (
                <div key={key} className="flex items-center gap-3 p-4 sm:p-4">
                  <div className="h-12 w-12 shrink-0 rounded-xl bg-muted overflow-hidden border border-border/50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.imageUrl || '/logo.png'}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground text-sm">
                      {platform}
                      <span className="text-muted-foreground font-normal">
                        {' '}
                        · {time}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {pending ? (
                        <>
                          Pending review ·{' '}
                          <Link
                            href="/approval"
                            className="text-primary font-medium hover:underline"
                          >
                            Review
                          </Link>
                        </>
                      ) : (
                        'Scheduled'
                      )}
                    </p>
                  </div>
                </div>
              )
            )
          )}
        </Card>
      </section>

      {/* Connected accounts */}
      {/* <section className="space-y-3" aria-label="Connected accounts">
        <h2 className="text-lg font-semibold text-foreground">
          Connected accounts
        </h2>
        <Card className="rounded-2xl border-border/40 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-linear-to-br from-primary-purple to-violet-400 p-2.5 text-white shadow-sm">
              <Users className="size-5" />
            </div>
            <div>
              <p className="font-medium text-foreground">
                {userDetail?.totalSocialAccounts ?? '—'} connected
              </p>
              <p className="text-sm text-muted-foreground">
                Instagram, Facebook, and LinkedIn from one workspace.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" className="rounded-xl shrink-0">
            <Link href={SOCIAL_INTEGRATION_PATH}>
              Manage
              <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
        </Card>
      </section> */}

      {/* Drafts waiting */}
      <section className="space-y-3" aria-label="Drafts waiting">
        <h2 className="text-lg font-semibold text-foreground">
          {isNeedApproval ? 'Drafts waiting' : 'Scheduled posts'}
        </h2>
        <Card className="rounded-2xl border-border/40 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-linear-to-br from-primary-blue to-blue-400 p-2.5 text-white shadow-sm">
              <Inbox className="size-5" />
            </div>
            <div>
              {isNeedApproval && (
                <p className="font-medium text-foreground">
                  <span className="tabular-nums">{pendingReviewCount}</span>{' '}
                  {pendingReviewIsSingular ? 'post' : 'posts'} need review
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {isNeedApproval
                  ? 'Approve or edit before they go live.'
                  : 'View your scheduled posts.'}
              </p>
            </div>
          </div>
          <Button asChild className="rounded-xl shrink-0">
            <Link href={isNeedApproval ? '/approval' : '/scheduled-post'}>
              Open queue
            </Link>
          </Button>
        </Card>
      </section>

      {/* Performance summary */}
      <section className="space-y-3" aria-label="Performance summary">
        <h2 className="text-lg font-semibold text-foreground">
          Performance summary
        </h2>
        <Card className="rounded-2xl border-border/40 p-5 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">AI credits</p>
              <p className="text-2xl font-bold text-foreground tabular-nums mt-0.5 flex items-center gap-1.5 justify-end">
                <Zap className="size-5 text-amber-500 shrink-0" />
                {creditLabel}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild variant="outline" size="sm" className="rounded-lg">
              <Link href="/settings/billings">Billing &amp; credits</Link>
            </Button>
          </div>
        </Card>
      </section>

      {/* Brand voice health */}
      <section className="space-y-3" aria-label="Brand voice health">
        <h2 className="text-lg font-semibold text-foreground">
          Brand voice & consistency
        </h2>
        <Card className="rounded-2xl border-border/40 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-linear-to-br from-emerald-500 to-teal-400 p-2.5 text-white shadow-sm shrink-0">
              <Fingerprint className="size-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-foreground">
                  {brandVoiceHealth.label}
                </span>
                <span
                  className={cn(
                    'text-xs font-medium rounded-full px-2 py-0.5',
                    brandVoiceHealth.tone === 'positive' &&
                      'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
                    brandVoiceHealth.tone === 'warning' &&
                      'bg-amber-500/15 text-amber-800 dark:text-amber-400',
                    brandVoiceHealth.tone === 'muted' &&
                      'bg-muted text-muted-foreground'
                  )}
                >
                  {brandVoiceHealth.percent}% profile
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {brandVoiceHealth.hint}
              </p>
              <div
                className="h-2 rounded-full bg-muted overflow-hidden"
                role="presentation"
              >
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    brandVoiceHealth.tone === 'positive' &&
                      'bg-linear-to-r from-emerald-500 to-teal-400',
                    brandVoiceHealth.tone === 'warning' &&
                      'bg-linear-to-r from-amber-500 to-orange-400',
                    brandVoiceHealth.tone === 'muted' &&
                      'bg-muted-foreground/30'
                  )}
                  style={{ width: `${brandVoiceHealth.percent}%` }}
                />
              </div>
              <ul className="text-sm space-y-1.5 pt-1">
                <li className="flex items-center gap-2">
                  {userDetail?.brandProfileComplete ? (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      ✓
                    </span>
                  ) : (
                    <span className="text-muted-foreground">○</span>
                  )}
                  <span
                    className={
                      userDetail?.brandProfileComplete
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    }
                  >
                    Brand profile{' '}
                    {userDetail?.brandProfileComplete
                      ? 'complete'
                      : 'incomplete'}
                  </span>
                  {!userDetail?.brandProfileComplete ? (
                    <Link
                      href="/template-dna"
                      className="text-primary text-xs font-medium hover:underline ml-auto"
                    >
                      Set up
                    </Link>
                  ) : null}
                </li>
                <li className="flex items-center gap-2">
                  {userDetail?.reviewPreferencesComplete ? (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      ✓
                    </span>
                  ) : (
                    <span className="text-muted-foreground">○</span>
                  )}
                  <span
                    className={
                      userDetail?.reviewPreferencesComplete
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    }
                  >
                    Review preferences{' '}
                    {userDetail?.reviewPreferencesComplete
                      ? 'saved'
                      : 'not set'}
                  </span>
                  {!userDetail?.reviewPreferencesComplete ? (
                    <Link
                      href="/settings/automation"
                      className="text-primary text-xs font-medium hover:underline ml-auto"
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
