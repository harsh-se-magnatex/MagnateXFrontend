'use client';

import { PageLoadingState } from '@/components/shared/PageLoadingState';
import { NonSubscribedFeatureBlock } from '@/components/shared/NonSubscribedFeatureBlock';
import { isPlanInactive } from '@/lib/plan-access';
import { useAuth } from '@/src/hooks/useAuth';
import Link from 'next/link';
import { DownloadPngButton } from '@/components/download-png-button';
import { SharePostButton } from '@/components/share-post-button';
import { useRouter } from 'next/navigation';
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarCheck2, CreditCard, Expand, Loader2, Sparkles } from 'lucide-react';
import {
  ImagePreviewButton,
  ImagePreviewOverlay,
  useImagePreview,
} from '@/components/image-preview';
import { addDays, format, startOfToday } from 'date-fns';
import {
  generateInstantPostsBatchApi,
  getAiEngineDateStatusApi,
  type AiEngineDateStatusRow,
  type InstantGenerationPlatform,
} from '@/src/service/api/instant-generation.service';
import type { BatchDayResult } from '@/src/stores/batchGenerationState';
import { useUserPlanCredits } from '../_components/UserPlanCreditsProvider';
import { useTimestampFormatter } from '@/lib/user-timezone';
import { useBatchGenerationState } from '@/src/stores/batchGenerationState';
import {
  WORKSPACE_NAV_HREFS,
  workspacePageTitle,
} from '@/lib/workspace-nav';
import { useTourDemo } from '@/src/stores/tourState';
import { cn } from '@/lib/utils';

const MAX_DATES = 5;
const DATE_WINDOW_DAYS = 45;

const PLATFORM_ORDER = ['instagram', 'facebook', 'linkedin'] as const;

function totalBatchSelectedDates(
  selectedByPlatform: Partial<Record<InstantGenerationPlatform, string[]>>
): number {
  return PLATFORM_ORDER.reduce(
    (sum, platform) => sum + (selectedByPlatform[platform]?.length ?? 0),
    0
  );
}

/** Scheduled post with preview — running/orchestrating locks report exists=true but post=null. */
function isAiEngineContentReady(row: AiEngineDateStatusRow): boolean {
  if (!row.exists || (row.source ?? 'ai-engine') !== 'ai-engine') return false;
  return row.post != null;
}

const PLATFORMS: {
  id: InstantGenerationPlatform;
  label: string;
  hint: string;
}[] = [
    {
      id: 'instagram',
      label: 'Instagram',
      hint: 'Square-friendly visuals and punchy captions.',
    },
    {
      id: 'facebook',
      label: 'Facebook',
      hint: 'Conversational tone with room for longer copy.',
    },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      hint: 'Professional, insight-led hooks.',
    },
  ];

export default function BatchGenerationPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Transient-only: errors (cleared on each run), API status (fetched on mount).
  const [errorsByPlatform, setErrorsByPlatform] = useState<
    Partial<Record<InstantGenerationPlatform, string>>
  >({});
  const [statusByPlatform, setStatusByPlatform] = useState<
    Partial<Record<InstantGenerationPlatform, AiEngineDateStatusRow[]>>
  >({});
  const [statusLoadingByPlatform, setStatusLoadingByPlatform] = useState<
    Partial<Record<InstantGenerationPlatform, boolean>>
  >({});

  const selectedByPlatform = useBatchGenerationState(
    (s) => s.selectedByPlatform
  );
  const toggleDate = useBatchGenerationState((s) => s.toggleDate);
  const setSelectedDates = useBatchGenerationState((s) => s.setSelectedDates);
  const generatingByPlatform = useBatchGenerationState(
    (s) => s.generatingByPlatform
  );
  const setGenerating = useBatchGenerationState((s) => s.setGenerating);
  const batchResultsByPlatform = useBatchGenerationState(
    (s) => s.batchResultsByPlatform
  );
  const setResults = useBatchGenerationState((s) => s.setResults);
  const activePreviewDateByPlatform = useBatchGenerationState(
    (s) => s.activePreviewDateByPlatform
  );
  const setActivePreviewDate = useBatchGenerationState(
    (s) => s.setActivePreviewDate
  );

  const { billing, loading: creditsLoading } = useUserPlanCredits();
  const fmtTimestamp = useTimestampFormatter();
  const isTourDemo = useTourDemo();
  const selectedAccounts = billing?.selected;
  const planExpiresAt = billing?.planExpiresAt;
  const formattedPlanExpiresAt = planExpiresAt
    ? fmtTimestamp(planExpiresAt)
    : '—';

  const hasSelectablePlatforms = useMemo(() => {
    if (isTourDemo) return true;
    return PLATFORM_ORDER.some((p) => !!selectedAccounts?.[p]);
  }, [selectedAccounts, isTourDemo]);

  const selectedPlatforms = useMemo(() => {
    if (isTourDemo) return [...PLATFORM_ORDER];
    return PLATFORM_ORDER.filter((p) => !!selectedAccounts?.[p]);
  }, [selectedAccounts, isTourDemo]);

  const platformsForDisplay = useMemo(() => {
    if (isTourDemo) return PLATFORMS;
    const connected = PLATFORMS.filter((m) => !!selectedAccounts?.[m.id]);
    const unconnected = PLATFORMS.filter((m) => !selectedAccounts?.[m.id]);
    return [...connected, ...unconnected];
  }, [selectedAccounts, isTourDemo]);

  const showSelectAccountsFirst =
    !isTourDemo &&
    !creditsLoading &&
    billing != null &&
    !hasSelectablePlatforms;

  const todayStart = useMemo(() => startOfToday(), []);
  const planExpiresAtDate = useMemo(() => {
    if (!planExpiresAt) return undefined;
    return new Date(
      planExpiresAt.seconds * 1000 + planExpiresAt.nanoseconds / 1e6
    );
  }, [planExpiresAt]);

  const dateKeys = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < DATE_WINDOW_DAYS; i += 1) {
      const d = addDays(todayStart, i + 1);
      if (planExpiresAtDate && d > planExpiresAtDate) break;
      out.push(format(d, 'yyyy-MM-dd'));
    }
    return out;
  }, [todayStart, planExpiresAtDate]);

  useEffect(() => {
    const keySet = new Set(dateKeys);
    const {
      selectedByPlatform,
      setSelectedDates,
      activePreviewDateByPlatform,
      setActivePreviewDate,
    } = useBatchGenerationState.getState();
    PLATFORM_ORDER.forEach((platform) => {
      const sel = selectedByPlatform[platform] ?? [];
      const pruned = sel.filter((d) => keySet.has(d));
      if (pruned.length !== sel.length) setSelectedDates(platform, pruned);
      const preview = activePreviewDateByPlatform[platform];
      if (preview && !keySet.has(preview)) setActivePreviewDate(platform, null);
    });
  }, [dateKeys]);

  const fetchStatusForPlatform = useCallback(
    async (platform: InstantGenerationPlatform) => {
      if (!user?.uid || dateKeys.length === 0) return;
      try {
        setStatusLoadingByPlatform((prev) => ({ ...prev, [platform]: true }));
        const rows = await getAiEngineDateStatusApi({
          userId: user.uid,
          dates: dateKeys,
          platform,
          includePostPreview: true,
        });
        setStatusByPlatform((prev) => ({ ...prev, [platform]: rows }));
      } finally {
        setStatusLoadingByPlatform((prev) => ({ ...prev, [platform]: false }));
      }
    },
    [user?.uid, dateKeys]
  );

  useEffect(() => {
    if (!user?.uid || dateKeys.length === 0) return;
    let cancelled = false;
    const loadingMap: Partial<Record<InstantGenerationPlatform, boolean>> = {};
    PLATFORM_ORDER.forEach((p) => {
      loadingMap[p] = selectedPlatforms.includes(p);
    });
    setStatusLoadingByPlatform(loadingMap);

    if (selectedPlatforms.length === 0) {
      setStatusByPlatform({});
      setStatusLoadingByPlatform({
        instagram: false,
        facebook: false,
        linkedin: false,
      });
      return;
    }

    (async () => {
      try {
        const rows = await Promise.all(
          selectedPlatforms.map((platform) =>
            getAiEngineDateStatusApi({
              userId: user.uid,
              dates: dateKeys,
              platform,
              includePostPreview: true,
            })
          )
        );
        if (cancelled) return;
        const next: Partial<
          Record<InstantGenerationPlatform, AiEngineDateStatusRow[]>
        > = {};
        selectedPlatforms.forEach((p, i) => {
          next[p] = rows[i];
        });
        setStatusByPlatform((prev) => {
          const merged = { ...prev };
          PLATFORM_ORDER.forEach((p) => {
            if (!selectedPlatforms.includes(p)) delete merged[p];
          });
          return { ...merged, ...next };
        });
      } catch {
        if (!cancelled) setStatusByPlatform({});
      } finally {
        if (!cancelled) {
          setStatusLoadingByPlatform({
            instagram: false,
            facebook: false,
            linkedin: false,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, dateKeys, selectedPlatforms]);

  const handleToggleDate = useCallback(
    (platform: InstantGenerationPlatform, dateKey: string) => {
      if (isTourDemo) return;
      const platformRows = statusByPlatform[platform] || [];
      const isBlocked = platformRows.some(
        (r) => r.date === dateKey && r.exists
      );
      toggleDate(platform, dateKey, isBlocked);
      if (!isBlocked) {
        setErrorsByPlatform((prev) => ({ ...prev, [platform]: '' }));
      }
    },
    [statusByPlatform, toggleDate, isTourDemo]
  );

  if (creditsLoading && !billing) {
    return <PageLoadingState message="Loading your account..." />;
  }

  if (!isTourDemo && isPlanInactive(billing)) {
    return <NonSubscribedFeatureBlock />;
  }

  return (
    <BatchGenerationPageBody
      authLoading={authLoading}
      user={user}
      router={router}
      billing={billing}
      creditsLoading={creditsLoading}
      showSelectAccountsFirst={showSelectAccountsFirst}
      platformsForDisplay={platformsForDisplay}
      dateKeys={dateKeys}
      selectedByPlatform={selectedByPlatform}
      generatingByPlatform={generatingByPlatform}
      batchResultsByPlatform={batchResultsByPlatform}
      activePreviewDateByPlatform={activePreviewDateByPlatform}
      statusByPlatform={statusByPlatform}
      statusLoadingByPlatform={statusLoadingByPlatform}
      errorsByPlatform={errorsByPlatform}
      selectedAccounts={selectedAccounts}
      handleToggleDate={handleToggleDate}
      setActivePreviewDate={setActivePreviewDate}
      setErrorsByPlatform={setErrorsByPlatform}
      setSelectedDates={setSelectedDates}
      setGenerating={setGenerating}
      setResults={setResults}
      fetchStatusForPlatform={fetchStatusForPlatform}
    />
  );
}

type BatchPlatformAccounts =
  | {
    facebook: boolean;
    instagram: boolean;
    linkedin: boolean;
  }
  | undefined;

type BatchGenerationPageBodyProps = {
  authLoading: boolean;
  user: { uid: string } | null;
  router: ReturnType<typeof useRouter>;
  billing: ReturnType<typeof useUserPlanCredits>['billing'];
  creditsLoading: boolean;
  showSelectAccountsFirst: boolean;
  platformsForDisplay: {
    id: InstantGenerationPlatform;
    label: string;
    hint: string;
  }[];
  dateKeys: string[];
  selectedByPlatform: Record<InstantGenerationPlatform, string[]>;
  generatingByPlatform: Partial<Record<InstantGenerationPlatform, boolean>>;
  batchResultsByPlatform: Partial<
    Record<InstantGenerationPlatform, BatchDayResult[]>
  >;
  activePreviewDateByPlatform: Partial<
    Record<InstantGenerationPlatform, string | null>
  >;
  statusByPlatform: Partial<
    Record<InstantGenerationPlatform, AiEngineDateStatusRow[]>
  >;
  statusLoadingByPlatform: Partial<Record<InstantGenerationPlatform, boolean>>;
  errorsByPlatform: Partial<Record<InstantGenerationPlatform, string>>;
  selectedAccounts: BatchPlatformAccounts;
  handleToggleDate: (
    platform: InstantGenerationPlatform,
    dateKey: string
  ) => void;
  setActivePreviewDate: (
    platform: InstantGenerationPlatform,
    date: string | null
  ) => void;
  setErrorsByPlatform: React.Dispatch<
    React.SetStateAction<Partial<Record<InstantGenerationPlatform, string>>>
  >;
  setSelectedDates: (
    platform: InstantGenerationPlatform,
    dates: string[]
  ) => void;
  setGenerating: (platform: InstantGenerationPlatform, value: boolean) => void;
  setResults: (
    platform: InstantGenerationPlatform,
    results: BatchDayResult[]
  ) => void;
  fetchStatusForPlatform: (platform: InstantGenerationPlatform) => Promise<void>;
};

function BatchGenerationPageBody(props: BatchGenerationPageBodyProps) {
  const {
    authLoading,
    user,
    router,
    billing,
    creditsLoading,
    showSelectAccountsFirst,
    platformsForDisplay,
    selectedAccounts,
  } = props;
  const isTourDemo = useTourDemo();
  const userCredits = billing?.credits ?? 0;
  const isManualMode = billing?.mode === 'manual';
  const bulkCreditPerPost = isManualMode ? 2 : 0;
  const totalSelectedDates = useMemo(
    () => totalBatchSelectedDates(props.selectedByPlatform),
    [props.selectedByPlatform]
  );
  const totalCreditCost = bulkCreditPerPost * totalSelectedDates;
  const insufficientCredits =
    bulkCreditPerPost > 0 &&
    totalSelectedDates > 0 &&
    userCredits < totalCreditCost;

  if (authLoading) {
    return <PageLoadingState />;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg animate-in fade-in duration-500 pb-20">
        <div className="glass-card rounded-3xl p-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {workspacePageTitle(WORKSPACE_NAV_HREFS.bulkCreate)}
          </h1>
          <p className="mt-3 text-slate-600 leading-relaxed">
            Login to draft and schedule multiple days of content for your
            connected accounts.
          </p>
          <button
            type="button"
            onClick={() => router.push('/sign-in')}
            className="mt-6 w-full rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 sm:w-auto"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  if (!isTourDemo && isPlanInactive(billing)) {
    return <NonSubscribedFeatureBlock />;
  }

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in duration-500 pb-20 px-2">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {workspacePageTitle(WORKSPACE_NAV_HREFS.bulkCreate)}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
            Pick up to {MAX_DATES} days per platform. We use your{' '}
            <Link
              href="/template-dna"
              className="font-semibold text-indigo-600 underline-offset-2 hover:underline"
            >
              brand profile
            </Link>{' '}
            and posting preferences to create each post and schedule it
            automatically.
          </p>
        </div>
        </header>

      <div className="mt-6 grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        {platformsForDisplay.map((meta, idx) => (
          <BatchGenerationPlatformCard
            key={meta.id}
            meta={meta}
            connected={isTourDemo || !!selectedAccounts?.[meta.id]}
            uid={user.uid}
            isFirstCard={idx === 0}
            {...props}
          />
        ))}
      </div>

      {showSelectAccountsFirst && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          Select your platform accounts first in{' '}
          <Link
            href="/social-media-integration"
            className="font-semibold underline"
          >
            social setup
          </Link>{' '}
          to enable batch generation.
        </div>
      )}

      <Link
        href="/scheduled-post"
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
      >
        <CalendarCheck2 className="h-4 w-4" aria-hidden />
        View scheduled posts
      </Link>
    </div>
  );
}

type BatchGenerationPlatformCardProps = BatchGenerationPageBodyProps & {
  meta: { id: InstantGenerationPlatform; label: string; hint: string };
  connected: boolean;
  uid: string;
  isFirstCard?: boolean;
};

export type PlatformId = 'facebook' | 'instagram' | 'linkedin';

function normalizePlatformId(platform: string): PlatformId | null {
  const key = platform.trim().toLowerCase();
  if (key === 'facebook' || key === 'instagram' || key === 'linkedin') {
    return key;
  }
  return null;
}

export const PLATFORM_META: Record<
  PlatformId,
  { label: string; color: string; icon: ReactNode }
> = {
  instagram: {
    label: 'Instagram',
    color: 'bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]',
    icon: (
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    ),
  },
  facebook: {
    label: 'Facebook',
    color: 'bg-[#1877F2]',
    icon: (
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    ),
  },
  linkedin: {
    label: 'LinkedIn',
    color: 'bg-[#0A66C2]',
    icon: (
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    ),
  },
};

function PlatformIcon({
  platform,
  className,
}: {
  platform: string;
  className?: string;
}) {
  const id = normalizePlatformId(platform);
  const meta = id ? PLATFORM_META[id] : null;
  return (
    <div
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white shadow-sm',
        meta?.color ?? 'bg-muted-foreground/70',
        className
      )}
      aria-hidden
    >
      {meta?.icon ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
          {meta.icon}
        </svg>
      ) : (
        <span className="text-xs font-bold uppercase">
          {platform.slice(0, 1) || '?'}
        </span>
      )}
    </div>
  );
}

function BatchGenerationPlatformCard(props: BatchGenerationPlatformCardProps) {
  const isTourDemo = useTourDemo();
  const {
    meta,
    connected,
    uid,
    isFirstCard = false,
    billing,
    creditsLoading,
    selectedByPlatform,
    generatingByPlatform,
    activePreviewDateByPlatform,
    statusByPlatform,
    statusLoadingByPlatform,
    errorsByPlatform,
    handleToggleDate,
    setActivePreviewDate,
    setErrorsByPlatform,
    setSelectedDates,
    setGenerating,
    setResults,
    fetchStatusForPlatform,
    dateKeys,
  } = props;
  const platform = meta.id;
  // Credit cost mirrors the backend `bulkCreateChargePerPost` helper in
  // `ai-engine.controller.ts`: manual-mode users pay 2 credits per post,
  // auto-mode users pay nothing on bulk-create (the daily orchestrator
  // covers their generation budget). Surfacing the cost up-front matches
  // the campaign / product-advert flows so users aren't surprised.
  const isManualMode = billing?.mode === 'manual';
  const bulkCreditPerPost = isManualMode ? 2 : 0;
  const userCredits = billing?.credits ?? 0;
  const generatingDatesRef = useRef<string[]>([]);

  const selected = selectedByPlatform[platform] || [];
  const platformCreditCost = bulkCreditPerPost * selected.length;
  const totalSelectedDates = useMemo(
    () => totalBatchSelectedDates(selectedByPlatform),
    [selectedByPlatform]
  );
  const totalCreditCost = bulkCreditPerPost * totalSelectedDates;
  const insufficientCredits =
    bulkCreditPerPost > 0 &&
    selected.length > 0 &&
    totalSelectedDates > 0 &&
    userCredits < totalCreditCost;
  const rows = statusByPlatform[platform] || [];
  // Green only when post preview is ready (not while a run is in-flight).
  const aiEngineRows = rows.filter(isAiEngineContentReady);
  const campaignRows = rows.filter((r) => r.exists && r.source === 'campaign');
  const campaignSet = new Set(campaignRows.map((r) => r.date));
  const activePreviewDate = activePreviewDateByPlatform[platform] || null;
  const activePreviewRow = aiEngineRows.find(
    (r) => r.date === activePreviewDate
  );
  const activePreviewCampaign = activePreviewDate
    ? campaignRows.find((r) => r.date === activePreviewDate) ?? null
    : null;
  const selectedSet = new Set(selected);
  const blockedSet = new Set([
    ...rows
      .filter(
        (r) => r.exists && (r.source ?? 'ai-engine') === 'ai-engine'
      )
      .map((r) => r.date),
    ...campaignSet,
  ]);
  const openDatesCount = dateKeys.filter((d) => !blockedSet.has(d)).length;
  const isGenerating = !!generatingByPlatform[platform];
  const statusLoading = !!statusLoadingByPlatform[platform];
  const platformError = errorsByPlatform[platform];

  const generatingDateSet = useMemo(() => {
    if (!isGenerating || !generatingDatesRef.current.length) return new Set<string>();
    return new Set(generatingDatesRef.current);
  }, [isGenerating, generatingByPlatform[platform]]);

  const imagePreview = useImagePreview();

  const handleGenerate = useCallback(async () => {
    if (isTourDemo) return;
    setErrorsByPlatform((prev) => ({ ...prev, [platform]: '' }));
    setResults(platform, []);
    const selectedDates = selectedByPlatform[platform] || [];
    if (!uid) {
      setErrorsByPlatform((prev) => ({
        ...prev,
        [platform]: 'You must be signed in to generate posts.',
      }));
      return;
    }
    if (!selectedDates.length) {
      setErrorsByPlatform((prev) => ({
        ...prev,
        [platform]: `Select at least one day (up to ${MAX_DATES}).`,
      }));
      return;
    }
    const cost = bulkCreditPerPost * selectedDates.length;
    const pendingTotalCost =
      bulkCreditPerPost * totalBatchSelectedDates(selectedByPlatform);
    if (pendingTotalCost > userCredits) {
      setErrorsByPlatform((prev) => ({
        ...prev,
        [platform]:
          'Not enough credits for all selected days across platforms. Please top up your account or deselect some dates.',
      }));
      return;
    }
    if (cost > userCredits) {
      setErrorsByPlatform((prev) => ({
        ...prev,
        [platform]: 'Not enough credits. Please top up your account.',
      }));
      return;
    }
    try {
      setGenerating(platform, true);
      generatingDatesRef.current = selectedDates;
      const response = await generateInstantPostsBatchApi({
        userId: uid,
        platform,
        dates: selectedDates,
      });
      const finalResults = (response.results ?? [])
        .filter((row): row is BatchDayResult => !!row?.date)
        .sort((a, b) => a.date.localeCompare(b.date));
      setResults(platform, finalResults);
      setSelectedDates(platform, []);
      void fetchStatusForPlatform(platform);
    } catch (e: unknown) {
      const message = 'Something went wrong.';
      setErrorsByPlatform((prev) => ({
        ...prev,
        [platform]: message,
      }));
    } finally {
      generatingDatesRef.current = [];
      setGenerating(platform, false);
    }
  }, [
    platform,
    selectedByPlatform,
    uid,
    setResults,
    setSelectedDates,
    setErrorsByPlatform,
    setGenerating,
    fetchStatusForPlatform,
    isTourDemo,
    bulkCreditPerPost,
    userCredits,
  ]);

  return (
    <section className="glass-card rounded-3xl p-5 sm:p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <PlatformIcon platform={platform} />
        <h2 className="text-xl font-semibold text-slate-900">{meta.label}</h2>
      </div>

      {!connected ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 leading-relaxed">
          Connect this platform in social settings to enable generation.{' '}
          <Link
            href="/settings/billings"
            className="font-semibold text-indigo-700 underline underline-offset-2 hover:text-indigo-800"
          >
            Upgrade your plan
          </Link>{' '}
          to add this platform.
        </div>
      ) : (
        <>
          {bulkCreditPerPost > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl border border-amber-200 bg-amber-500/20 px-3 py-2 text-xs text-amber-900">
              <span>
                <span className="font-semibold">{bulkCreditPerPost} credits</span>
                {' per post'}
                {selected.length > 0 && (
                  <>
                    {' \u00b7 '}
                    <span
                      className={cn(
                        'font-semibold',
                        insufficientCredits && 'text-rose-700'
                      )}
                    >
                      {platformCreditCost} credits
                    </span>
                    {' for '}
                    {selected.length} day
                    {selected.length === 1 ? '' : 's'} here
                    {totalSelectedDates > selected.length ? (
                      <>
                        {' \u00b7 '}
                        <span
                          className={cn(
                            'font-semibold',
                            insufficientCredits && 'text-rose-700'
                          )}
                        >
                          {totalCreditCost} credits
                        </span>
                        {' total across platforms'}
                      </>
                    ) : null}
                  </>
                )}
              </span>
              {!creditsLoading &&
                insufficientCredits &&
                selected.length > 0 && (
                  <span className="whitespace-nowrap rounded-full border border-rose-100 bg-rose-50 px-2 text-[10px] font-medium text-rose-600">
                    Need {totalCreditCost}
                  </span>
                )}
            </div>
          ) : billing?.mode === 'auto' ? (
            <>
            </>
          ) : null}
          <div
            id={isFirstCard ? 'tour-bulk-dates' : undefined}
            className="rounded-2xl border border-slate-200 bg-white p-3"
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Dates ({selected.length}/{MAX_DATES} selected)
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium">
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-sm bg-emerald-200 ring-1 ring-emerald-300"
                  />
                  Generated
                </span>
              </div>
            </div>
            {statusLoading ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-2 text-xs text-indigo-900 animate-pulse">
                  Finding occupied dates for {meta.label}...
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 9 }).map((_, idx) => (
                    <div
                      key={`${platform}-skeleton-${idx}`}
                      className="h-14 rounded-lg border border-slate-200 bg-slate-100 animate-pulse"
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {dateKeys.map((dateKey) => {
                  const statusRow = rows.find((r) => r.date === dateKey);
                  const isCampaign = campaignSet.has(dateKey);
                  const blocked = blockedSet.has(dateKey);
                  const hasGeneratedContent =
                    isCampaign ||
                    (statusRow ? isAiEngineContentReady(statusRow) : false);
                  const isGeneratingDate =
                    !hasGeneratedContent &&
                    isGenerating &&
                    generatingDateSet.has(dateKey);
                  const selectedDate = selectedSet.has(dateKey);
                  const showBlue = selectedDate || isGeneratingDate;
                  const previewing =
                    hasGeneratedContent && activePreviewDate === dateKey;
                  const className = [
                    'rounded-lg border px-2 py-2 text-center text-xs font-semibold transition',
                    hasGeneratedContent
                      ? previewing
                        ? 'border-emerald-700 bg-emerald-200 text-emerald-950'
                        : 'border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      : showBlue
                        ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                        : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100',
                  ].join(' ');
                  return (
                    <button
                      key={`${platform}-${dateKey}`}
                      type="button"
                      disabled={!connected || isGenerating}
                      aria-label={
                        isCampaign
                          ? `${dateKey}: generated by a campaign`
                          : undefined
                      }
                      onClick={() => {
                        if (hasGeneratedContent) {
                          if (selected.length > 0) {
                            setSelectedDates(platform, []);
                            setErrorsByPlatform((prev) => ({
                              ...prev,
                              [platform]: '',
                            }));
                          }
                          setActivePreviewDate(
                            platform,
                            activePreviewDate === dateKey ? null : dateKey
                          );
                          return;
                        }
                        if (blocked) return;
                        if (activePreviewDate) {
                          setActivePreviewDate(platform, null);
                        }
                        handleToggleDate(platform, dateKey);
                      }}
                      className={className}
                    >
                      <span className="block">
                        {format(new Date(`${dateKey}T12:00:00`), 'MMM d')}
                      </span>
                      <span className="block text-[10px] opacity-75">
                        {format(new Date(`${dateKey}T12:00:00`), 'EEE')}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            id={isFirstCard ? 'tour-bulk-generate' : undefined}
            type="button"
            disabled={
              !connected ||
              isGenerating ||
              creditsLoading ||
              (!isTourDemo &&
                (selected.length === 0 ||
                  openDatesCount === 0 ||
                  insufficientCredits))
            }
            onClick={() => void handleGenerate()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" aria-hidden />
                Generate {selected.length || 0} day
                {selected.length === 1 ? '' : 's'}
                {insufficientCredits ? ' (insufficient credits)' : ''}
              </>
            )}
          </button>
          {isGenerating && (
            <p className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-xs font-medium text-indigo-700">
              Generating…
            </p>
          )}
          {connected && !statusLoading && openDatesCount === 0 && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
              All visible dates already have generated posts for this platform.
            </p>
          )}

          {platformError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              {platformError}
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold text-slate-700 mb-2">
              Generated preview
            </p>
            {!activePreviewRow && activePreviewCampaign ? (
              // Campaign-generated date: the post lives in the campaign
              // workflow, not here. Show the same message that used to be
              // a hover tooltip on the cell itself, plus a link out.
              <article className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-emerald-900">
                    {format(
                      new Date(`${activePreviewCampaign.date}T12:00:00`),
                      'EEEE, MMM d'
                    )}
                  </p>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-800">
                    Campaign
                  </span>
                </div>
                <p className="mt-2 text-xs text-emerald-950">
                  This date&apos;s content is generated by a campaign. The
                  post will be scheduled automatically on this day &mdash; you
                  can review or edit it from the{' '}
                  <Link
                    href="/scheduled-post"
                    className="font-semibold text-emerald-900 underline underline-offset-2 hover:text-emerald-700"
                  >
                    Scheduled Posts
                  </Link>{' '}
                  page.
                </p>
              </article>
            ) : !activePreviewRow ? (
              <p className="text-xs text-slate-500">
                Click a green date to view the generated post for that day.
              </p>
            ) : (
              <article
                className={
                  activePreviewRow.post?.removedByUser
                    ? 'rounded-xl border border-amber-200 bg-amber-50/50 p-2.5'
                    : 'rounded-xl border border-emerald-200 bg-emerald-50/40 p-2.5'
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={`text-xs font-semibold ${activePreviewRow.post?.removedByUser
                        ? 'text-amber-900'
                        : 'text-emerald-900'
                      }`}
                  >
                    {format(
                      new Date(`${activePreviewRow.date}T12:00:00`),
                      'EEEE, MMM d'
                    )}
                  </p>
                  <span
                    className={`text-[10px] font-mono ${activePreviewRow.post?.removedByUser
                        ? 'text-amber-800'
                        : 'text-emerald-800'
                      }`}
                  >
                    {activePreviewRow.scheduledPostId?.slice(0, 8)}
                  </span>
                </div>
                {activePreviewRow.post?.removedByUser ? (
                  <p className="mt-2 text-xs text-amber-950">
                    You removed this post. It no longer appears in your
                    scheduled posts{' '}
                  </p>
                ) : (
                  <>
                    {activePreviewRow.post?.imageUrl ? (
                      <button
                        type="button"
                        onClick={() =>
                          imagePreview.open(
                            activePreviewRow.post!.imageUrl!,
                            `${meta.label} generated post ${activePreviewRow.date}`
                          )
                        }
                        className="group cursor-pointer relative mt-2 block w-full overflow-hidden rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                        aria-label="Open image preview"
                      >
                        <img
                          src={activePreviewRow.post.imageUrl}
                          alt={`${meta.label} generated post ${activePreviewRow.date}`}
                          className="h-28 w-full rounded-lg object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                        />
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/30">
                          <span className="flex items-center gap-1 rounded-full bg-white/0 px-2 py-1 text-[11px] font-semibold text-white opacity-0 transition-opacity duration-200 group-hover:bg-black/60 group-hover:opacity-100">
                            <Expand className="h-3 w-3" />
                            Preview
                          </span>
                        </span>
                      </button>
                    ) : null}
                    {activePreviewRow.post?.imageUrl ? (
                      <div className="flex flex-col sm:flex-row gap-2 mt-3">
                        <ImagePreviewButton
                          onClick={() =>
                            imagePreview.open(
                              activePreviewRow.post!.imageUrl!,
                              `${meta.label} generated post ${activePreviewRow.date}`
                            )
                          }
                          className="rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 hover:opacity-100"
                        />
                        <DownloadPngButton
                          url={activePreviewRow.post.imageUrl}
                          getFilename={() =>
                            `batch-${platform}-${activePreviewRow.date}-${Date.now()}.png`
                          }
                        />
                        <SharePostButton
                          imageUrl={activePreviewRow.post.imageUrl}
                          caption={activePreviewRow.post.message}
                          getFilename={() =>
                            `batch-${platform}-${activePreviewRow.date}-${Date.now()}.png`
                          }
                          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition disabled:opacity-60"
                        />
                      </div>
                    ) : null}
                    <p className="mt-2 text-xs text-slate-700 line-clamp-3">
                      {activePreviewRow.post?.message?.trim() ||
                        'Caption unavailable'}
                    </p>
                  </>
                )}
              </article>
            )}
          </div>
          <ImagePreviewOverlay
            src={imagePreview.previewUrl}
            alt={imagePreview.previewAlt}
            onClose={imagePreview.close}
          />
        </>
      )}
    </section>
  );
}
