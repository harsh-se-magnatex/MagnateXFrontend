'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addDays, format, isAfter, parseISO, startOfToday } from 'date-fns';
import {
  ArrowLeft,
  CalendarCheck2,
  CalendarDays,
  CalendarPlus,
  ImageIcon,
  Inbox,
  Loader2,
  RefreshCcw,
  Sparkles,
  Trash2,
  Wand2,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { PageLoadingState } from '@/components/shared/PageLoadingState';
import { showErrorToast } from '@/lib/show-error-toast';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
  ImagePreviewButton,
  ImagePreviewOverlay,
  useImagePreview,
} from '@/components/image-preview';
import {
  WORKSPACE_NAV_HREFS,
  workspacePageTitle,
} from '@/lib/workspace-nav';
import {
  allPlatformsSelectionLabel,
  areAllEnabledSelected,
  listEnabledPlatforms,
  togglePlatformSelection,
  validateGenerationPlatformSelection,
  type SocialPlatform,
} from '@/lib/platform-selection';

import { useUserPlanCredits } from '../_components/UserPlanCreditsProvider';
import { useFeatureJob } from '@/src/hooks/useFeatureJob';
import {
  CAMPAIGN_CREDIT_PER_DAY,
  DEFAULT_CAMPAIGN_SET_SIZE,
  MAX_CAMPAIGN_DAYS,
  createCampaignApi,
  getCampaignSuggestionsApi,
  listCampaignDraftsApi,
  nextRegenerationCost,
  regenerateCampaignApi,
  regenerateCampaignDraftApi,
  scheduleCampaignDraftApi,
  suggestCampaignSetApi,
  type CampaignDraft,
  type CampaignSuggestion,
} from '@/src/service/api/campaign.service';
import {
  useCampaignState,
  type CampaignDayDraft,
} from '@/src/stores/campaignState';
import { getTodatDate } from '@/utils/getTodayDate';

function platformLabel(platform: SocialPlatform): string {
  if (platform === 'instagram') return 'Instagram';
  if (platform === 'facebook') return 'Facebook';
  return 'LinkedIn';
}

function firestoreTimestampToDate(
  ts: { seconds: number; nanoseconds: number } | null | undefined
): Date | null {
  if (!ts) return null;
  return new Date(ts.seconds * 1000 + ts.nanoseconds / 1e6);
}

/**
 * Radix `Dismissable` events (`onPointerDownOutside`, `onFocusOutside`,
 * `onInteractOutside`) arrive as CustomEvents whose `.target` is the layer
 * the event was dispatched on (i.e. our SheetContent), NOT the DOM element
 * the user actually clicked. The actual click target lives on
 * `event.detail.originalEvent.target`. Use this helper to decide whether
 * the interaction came from inside an `ImagePreviewOverlay` portal so we
 * can preventDefault and keep the Sheet open.
 */
function isEventFromImagePreviewOverlay(event: Event): boolean {
  const detailEvent = (event as unknown as {
    detail?: { originalEvent?: Event };
  }).detail?.originalEvent;
  const target = (detailEvent?.target ?? event.target) as Element | null;
  return !!target?.closest?.('[data-image-preview-overlay]');
}

/**
 * Window the user can pick dates within: today + 1 .. min(today +
 * MAX_DAYS, plan expiry). We start at `today+1` so the user never schedules
 * a day in the past for THEIR timezone — matches the festive/events-post
 * rule and gives the worker enough time to render before the publish slot.
 */
function buildDateWindow(planExpiresAt: Date | null): string[] {
  const today = startOfToday();
  const horizon = addDays(today, MAX_CAMPAIGN_DAYS);
  const cap =
    planExpiresAt && isAfter(horizon, planExpiresAt)
      ? planExpiresAt
      : horizon;
  const out: string[] = [];
  let cursor = addDays(today, 1);
  while (!isAfter(cursor, cap)) {
    out.push(format(cursor, 'yyyy-MM-dd'));
    cursor = addDays(cursor, 1);
  }
  return out;
}

function formatDisplayDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), 'EEE, MMM d');
  } catch {
    return iso;
  }
}

/** Parse Firestore timestamps that come back as `{_seconds, _nanoseconds}`
 *  in the JSON-encoded `unknown` we get from `axios`. */
function unknownTsToDate(value: unknown): Date | null {
  if (!value || typeof value !== 'object') return null;
  const obj = value as {
    _seconds?: number;
    seconds?: number;
    _nanoseconds?: number;
    nanoseconds?: number;
  };
  const secs = obj._seconds ?? obj.seconds;
  if (typeof secs !== 'number') return null;
  const nanos = obj._nanoseconds ?? obj.nanoseconds ?? 0;
  return new Date(secs * 1000 + nanos / 1e6);
}

export default function CreateCampaignPage() {
  const formattedToday = getTodatDate();
  const { billing, loading: planCreditsLoading } = useUserPlanCredits();

  const goal = useCampaignState((s) => s.goal);
  const setGoal = useCampaignState((s) => s.setGoal);
  const suggestions = useCampaignState((s) => s.suggestions);
  const maxDaysFromServer = useCampaignState((s) => s.maxDays);
  const selectedSuggestionId = useCampaignState(
    (s) => s.selectedSuggestionId
  );
  const days = useCampaignState((s) => s.days);
  const theme = useCampaignState((s) => s.theme);
  const description = useCampaignState((s) => s.description);
  const genPlatforms = useCampaignState((s) => s.genPlatforms);
  const setGenPlatforms = useCampaignState((s) => s.setGenPlatforms);
  const isLoadingSuggestions = useCampaignState(
    (s) => s.isLoadingSuggestions
  );
  const setIsLoadingSuggestions = useCampaignState(
    (s) => s.setIsLoadingSuggestions
  );
  const regeneratingSuggestionId = useCampaignState(
    (s) => s.regeneratingSuggestionId
  );
  const setRegeneratingSuggestionId = useCampaignState(
    (s) => s.setRegeneratingSuggestionId
  );
  const isSubmitting = useCampaignState((s) => s.isSubmitting);
  const setIsSubmitting = useCampaignState((s) => s.setIsSubmitting);
  const loadSuggestionSet = useCampaignState((s) => s.loadSuggestionSet);
  const replaceSuggestion = useCampaignState((s) => s.replaceSuggestion);
  const selectSuggestion = useCampaignState((s) => s.selectSuggestion);
  const clearSelection = useCampaignState((s) => s.clearSelection);
  const updateDay = useCampaignState((s) => s.updateDay);
  const setDayDate = useCampaignState((s) => s.setDayDate);
  const clearAllDates = useCampaignState((s) => s.clearAllDates);
  const removeDay = useCampaignState((s) => s.removeDay);
  const reset = useCampaignState((s) => s.reset);

  const featureJob = useFeatureJob('campaign-post');
  const {
    parentJobId: activeParentJobId,
    jobs: jobMap,
    overallPct,
    allDone,
    isRunning,
    onGenerated,
  } = featureJob;
  const lastMaterializedRef = useRef<string | null>(null);

  // -------------------- plan window / dates --------------------
  const planExpiresAt = useMemo(
    () => firestoreTimestampToDate(billing?.planExpiresAt ?? null),
    [billing?.planExpiresAt]
  );
  const dateWindow = useMemo(
    () => buildDateWindow(planExpiresAt),
    [planExpiresAt]
  );
  const selectedAccounts = billing?.selected;
  const userCredits = billing?.credits ?? 0;
  const allowedPlatforms = useMemo(
    () => listEnabledPlatforms(selectedAccounts),
    [selectedAccounts]
  );

  useEffect(() => {
    if (planCreditsLoading) return;
    if (allowedPlatforms.length === 0) {
      if (genPlatforms.length > 0) setGenPlatforms([]);
      return;
    }
    const stillValid = genPlatforms.filter((platform) =>
      allowedPlatforms.includes(platform)
    );
    if (stillValid.length === 0) {
      setGenPlatforms([allowedPlatforms[0]]);
    } else if (stillValid.length !== genPlatforms.length) {
      setGenPlatforms(stillValid);
    }
  }, [allowedPlatforms, genPlatforms, planCreditsLoading, setGenPlatforms]);

  const platformSelection = validateGenerationPlatformSelection({
    selected: genPlatforms,
    enabled: allowedPlatforms,
    activePlan: billing?.activePlan,
  });
  const allPlatformsSelected = areAllEnabledSelected(
    genPlatforms,
    allowedPlatforms
  );

  const datedDays = useMemo(
    () =>
      days.filter(
        (d): d is CampaignDayDraft & { date: string } => !!d.date
      ),
    [days]
  );
  const totalCost = useMemo(
    () =>
      datedDays.length *
      CAMPAIGN_CREDIT_PER_DAY *
      Math.max(genPlatforms.length, 1),
    [datedDays.length, genPlatforms.length]
  );
  const insufficientCredits =
    datedDays.length > 0 &&
    genPlatforms.length > 0 &&
    userCredits < totalCost;

  const usedDates = useMemo(
    () => new Set(datedDays.map((day) => day.date)),
    [datedDays]
  );

  const canSubmit =
    !isSubmitting &&
    !isRunning &&
    !planCreditsLoading &&
    days.length > 0 &&
    datedDays.length === days.length &&
    platformSelection.ok &&
    !insufficientCredits;

  // -------------------- initial suggestion fetch --------------------
  // Hydrate the gallery on first mount when the store is empty. We never
  // auto-generate on mount — that would burn credits without consent — but
  // we DO fetch the saved set so a returning user sees their last gallery.
  const didInitialFetchRef = useRef(false);
  useEffect(() => {
    if (didInitialFetchRef.current) return;
    if (suggestions.length > 0) {
      didInitialFetchRef.current = true;
      return;
    }
    didInitialFetchRef.current = true;
    (async () => {
      try {
        setIsLoadingSuggestions(true);
        const set = await getCampaignSuggestionsApi();
        loadSuggestionSet(set.suggestions, set.maxDays);
      } catch (err) {
        // Soft-fail: empty gallery just nudges the user to click Generate.
        console.warn('[create-campaign] initial fetch failed', err);
      } finally {
        setIsLoadingSuggestions(false);
      }
    })();
  }, [loadSuggestionSet, setIsLoadingSuggestions, suggestions.length]);

  // -------------------- job result toast --------------------
  useEffect(() => {
    if (!allDone || !activeParentJobId) return;
    if (lastMaterializedRef.current === activeParentJobId) return;
    lastMaterializedRef.current = activeParentJobId;
    const jobList = Object.values(jobMap);
    const totals = jobList.reduce(
      (acc, job) => {
        const r = (job.result ?? {}) as Record<string, unknown>;
        return {
          successCount:
            acc.successCount +
            (typeof r.successCount === 'number' ? r.successCount : 0),
          failedCount:
            acc.failedCount +
            (typeof r.failedCount === 'number' ? r.failedCount : 0),
        };
      },
      { successCount: 0, failedCount: 0 }
    );
    if (totals.successCount > 0 && totals.failedCount === 0) {
      toast.success(
        `Drafts ready — ${totals.successCount} post(s) saved. Open Drafts to schedule them.`
      );
    } else if (totals.successCount > 0) {
      toast.success(
        `${totals.successCount} drafts saved, ${totals.failedCount} failed. Open Drafts to review.`
      );
    } else if (totals.failedCount > 0) {
      showErrorToast('Campaign generation failed. Please try again.');
    } else {
      toast.success('Campaign processed.');
    }
    setIsSubmitting(false);
    // Refresh the drafts list when the drawer is mounted so the user sees
    // the newly-generated drafts without having to close+reopen.
    void refreshDraftsRef.current?.();
  }, [allDone, activeParentJobId, jobMap, setIsSubmitting]);

  useEffect(() => {
    if (isRunning && !isSubmitting) setIsSubmitting(true);
    else if (!isRunning && isSubmitting) setIsSubmitting(false);
  }, [isRunning, isSubmitting, setIsSubmitting]);

  // -------------------- gallery actions --------------------
  const handleGenerateSet = useCallback(
    async (size?: number) => {
      if (isLoadingSuggestions) return;
      try {
        setIsLoadingSuggestions(true);
        const set = await suggestCampaignSetApi({
          goal,
          count: size ?? DEFAULT_CAMPAIGN_SET_SIZE,
        });
        loadSuggestionSet(set.suggestions, set.maxDays);
        toast.success(
          `Generated ${set.suggestions.length} campaign idea${set.suggestions.length === 1 ? '' : 's'}.`
        );
      } catch (err) {
        const typed = err as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        showErrorToast(
          typed?.response?.data?.message ||
            typed?.message ||
            'Could not generate campaign suggestions.'
        );
      } finally {
        setIsLoadingSuggestions(false);
      }
    },
    [goal, isLoadingSuggestions, loadSuggestionSet, setIsLoadingSuggestions]
  );

  const handleRegenerateOne = useCallback(
    async (suggestionId: string) => {
      if (regeneratingSuggestionId) return;
      try {
        setRegeneratingSuggestionId(suggestionId);
        const fresh = await regenerateCampaignApi(suggestionId);
        replaceSuggestion(fresh);
        toast.success('Suggestion refreshed.');
      } catch (err) {
        const typed = err as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        showErrorToast(
          typed?.response?.data?.message ||
            typed?.message ||
            'Could not regenerate this suggestion.'
        );
      } finally {
        setRegeneratingSuggestionId(null);
      }
    },
    [
      regeneratingSuggestionId,
      replaceSuggestion,
      setRegeneratingSuggestionId,
    ]
  );

  const handleAutoFillDates = useCallback(() => {
    if (days.length === 0) return;
    const window = dateWindow;
    if (window.length === 0) return;
    days.forEach((day, idx) => {
      const next = window[idx];
      if (next) setDayDate(day.dayNumber, next);
      else setDayDate(day.dayNumber, null);
    });
  }, [dateWindow, days, setDayDate]);

  // -------------------- create draft batch --------------------
  const handleCreate = useCallback(async () => {
    if (datedDays.length !== days.length || days.length === 0) {
      showErrorToast('Pick a date for every day before creating the campaign.');
      return;
    }
    if (!platformSelection.ok) {
      showErrorToast(platformSelection.error);
      return;
    }
    if (insufficientCredits) {
      showErrorToast(
        `Not enough credits. This campaign costs ${totalCost} credits and you have ${userCredits}.`
      );
      return;
    }
    if (!canSubmit) return;
    try {
      setIsSubmitting(true);
      lastMaterializedRef.current = null;
      const response = await createCampaignApi({
        theme: theme || 'Brand Campaign',
        description,
        goal: goal || undefined,
        days: datedDays.map((day) => ({
          dayNumber: day.dayNumber,
          title: day.title,
          reference: day.reference,
          caption: day.caption,
          date: day.date,
        })),
        platforms: genPlatforms,
        suggestionId: selectedSuggestionId ?? undefined,
      });
      onGenerated({
        parentJobId: response.parentJobId,
        jobs: response.jobs,
      });
      toast.success(
        `Generating ${response.dayCount} draft(s) across ${response.platforms.length} platform(s).`
      );
    } catch (error: unknown) {
      const typed = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      showErrorToast(
        typed?.response?.data?.message ||
          typed?.message ||
          'Could not create the campaign.'
      );
      setIsSubmitting(false);
    }
  }, [
    canSubmit,
    datedDays,
    days.length,
    description,
    genPlatforms,
    goal,
    insufficientCredits,
    onGenerated,
    platformSelection,
    selectedSuggestionId,
    setIsSubmitting,
    theme,
    totalCost,
    userCredits,
  ]);

  // -------------------- drafts drawer state --------------------
  const [draftsOpen, setDraftsOpen] = useState(false);
  // Lifted ref so the job-completion effect above can poke a refresh
  // without resurrecting the whole drawer component.
  const refreshDraftsRef = useRef<(() => Promise<void>) | null>(null);
  const handleSetRefreshDrafts = useCallback(
    (fn: (() => Promise<void>) | null) => {
      refreshDraftsRef.current = fn;
    },
    []
  );

  if (planCreditsLoading && !billing) {
    return <PageLoadingState message="Loading your account..." />;
  }

  const planExpired =
    planExpiresAt != null && planExpiresAt.getTime() < Date.now();
  if (planExpired) {
    return (
      <div className="animate-in fade-in duration-500 pb-20 flex flex-col items-center justify-center h-screen">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          <p className="text-center">You are not eligible for this feature.</p>
          <p className="text-center">
            Please subscribe to a plan to use this feature.
          </p>
        </h1>
        <p className="mt-2 text-base text-slate-500 max-w-2xl">
          You can subscribe to a plan{' '}
          <Link href="/settings/billings" className="underline text-indigo-600">
            here
          </Link>
          .
        </p>
      </div>
    );
  }

  const hasSelectablePlatforms = allowedPlatforms.length > 0;
  const effectiveMaxDays =
    maxDaysFromServer && maxDaysFromServer > 0
      ? maxDaysFromServer
      : MAX_CAMPAIGN_DAYS;
  const activeSuggestion =
    selectedSuggestionId != null
      ? suggestions.find((s) => s.id === selectedSuggestionId) ?? null
      : null;

  return (
    <div className="mx-auto animate-in fade-in duration-500 pb-20">
      <header className="mb-8 w-full flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            {workspacePageTitle(WORKSPACE_NAV_HREFS.createCampaign)}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100/50">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                AI Powered
              </span>
            </div>
          </h1>
          <p className="mt-2 text-base text-slate-500 max-w-2xl">
            Browse {DEFAULT_CAMPAIGN_SET_SIZE} fresh, AI-authored campaign
            ideas tailored to your brand. Pick the one that fits, set your
            dates (1–{effectiveMaxDays} day{effectiveMaxDays === 1 ? '' : 's'},
            within your plan window), and we&apos;ll generate every visual
            in one go.
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-2 md:items-end">
          <div className="inline-flex items-center gap-2 self-stretch md:self-end rounded-2xl border border-amber-200/60 bg-amber-50/80 px-3 py-2 text-xs font-semibold text-amber-900">
            <Zap className="h-4 w-4 text-amber-600" />
            <span>{userCredits} credits available</span>
          </div>
          <button
            type="button"
            onClick={() => setDraftsOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Inbox className="h-4 w-4" />
            Drafts
          </button>
        </div>
      </header>

      {!activeSuggestion ? (
        <SuggestionGallery
          suggestions={suggestions}
          isLoading={isLoadingSuggestions}
          regeneratingId={regeneratingSuggestionId}
          goal={goal}
          onGoalChange={setGoal}
          onGenerateSet={() => handleGenerateSet()}
          onRegenerate={handleRegenerateOne}
          onSelect={selectSuggestion}
          effectiveMaxDays={effectiveMaxDays}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="lg:col-span-2 space-y-6">
            <EditorHeader
              theme={theme}
              description={description}
              effectiveMaxDays={effectiveMaxDays}
              onBack={clearSelection}
            />

            <DayDraftList
              days={days}
              dateWindow={dateWindow}
              usedDates={usedDates}
              formattedToday={formattedToday}
              onUpdate={updateDay}
              onPickDate={setDayDate}
              onRemove={removeDay}
            />

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleAutoFillDates}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                disabled={dateWindow.length === 0}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Auto-fill consecutive dates
              </button>
              <button
                type="button"
                onClick={clearAllDates}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                disabled={datedDays.length === 0}
              >
                Clear dates
              </button>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
              >
                Start over
              </button>
            </div>
          </section>

          <CampaignSummary
            allowedPlatforms={allowedPlatforms}
            hasSelectablePlatforms={hasSelectablePlatforms}
            genPlatforms={genPlatforms}
            allPlatformsSelected={allPlatformsSelected}
            onTogglePlatform={(platform) =>
              setGenPlatforms(togglePlatformSelection(genPlatforms, platform))
            }
            onSelectAllPlatforms={() =>
              setGenPlatforms(
                allPlatformsSelected ? [] : [...allowedPlatforms]
              )
            }
            platformSelection={platformSelection}
            datedDays={datedDays.length}
            totalDays={days.length}
            canSubmit={canSubmit}
            isSubmitting={isSubmitting}
            isRunning={isRunning}
            overallPct={overallPct}
            jobCount={Object.values(jobMap).length}
            jobs={Object.values(jobMap).map((job) => ({
              jobId: job.jobId,
              platform: job.platform ?? 'unknown',
              pct: job.pct ?? 0,
            }))}
            totalCost={totalCost}
            userCredits={userCredits}
            insufficientCredits={insufficientCredits}
            onCreate={handleCreate}
            onViewDrafts={() => setDraftsOpen(true)}
          />
        </div>
      )}

      <DraftsDrawer
        open={draftsOpen}
        onOpenChange={setDraftsOpen}
        registerRefresh={handleSetRefreshDrafts}
        dateWindow={dateWindow}
        formattedToday={formattedToday}
        isCampaignJobRunning={isRunning}
        onCampaignJobStarted={onGenerated}
      />
    </div>
  );
}

// =============================================================================
// Suggestion gallery (step 1)
// =============================================================================

type SuggestionGalleryProps = {
  suggestions: CampaignSuggestion[];
  isLoading: boolean;
  regeneratingId: string | null;
  goal: string;
  onGoalChange: (value: string) => void;
  onGenerateSet: () => void;
  onRegenerate: (suggestionId: string) => void;
  onSelect: (suggestionId: string) => void;
  effectiveMaxDays: number;
};

function SuggestionGallery(props: SuggestionGalleryProps) {
  const {
    suggestions,
    isLoading,
    regeneratingId,
    goal,
    onGoalChange,
    onGenerateSet,
    onRegenerate,
    onSelect,
    effectiveMaxDays,
  } = props;

  const showSkeleton = isLoading && suggestions.length === 0;

  return (
    <div className="space-y-6">
      <section className="glass-card rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-white/50">
          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
            <Wand2 className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-900">
              1. Pick a campaign idea
            </h2>
            <p className="text-xs text-slate-500">
              Optional: tell the AI what the campaign should focus on, then
              hit Generate. Each idea is a {effectiveMaxDays}-day plan you
              can fully edit after picking.
            </p>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-4 sm:flex-row sm:items-end">
          <label className="flex-1 block">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Campaign goal
              <span className="ml-1 text-slate-400 normal-case font-normal tracking-normal">
                (optional)
              </span>
            </span>
            <Input
              value={goal}
              onChange={(e) => onGoalChange(e.target.value)}
              placeholder="e.g. winter sale, product launch, brand awareness…"
              className="mt-1"
            />
          </label>
          <button
            type="button"
            onClick={onGenerateSet}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Drafting ideas…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {suggestions.length === 0
                  ? 'Generate campaign ideas'
                  : 'Regenerate all ideas'}
              </>
            )}
          </button>
        </div>
      </section>

      {showSkeleton && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: DEFAULT_CAMPAIGN_SET_SIZE }).map((_, idx) => (
            <Skeleton
              key={`gallery-skel-${idx}`}
              className="h-64 w-full rounded-3xl"
            />
          ))}
        </div>
      )}

      {!showSkeleton && suggestions.length === 0 && (
        <section className="glass-card rounded-3xl border border-dashed border-slate-300 bg-slate-50/40 p-10 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-indigo-400" />
          <h3 className="mt-3 text-base font-semibold text-slate-800">
            No campaign ideas yet
          </h3>
          <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
            Click <span className="font-semibold">Generate campaign
            ideas</span> above to get {DEFAULT_CAMPAIGN_SET_SIZE} distinct
            multi-day concepts tailored to your brand.
          </p>
        </section>
      )}

      {suggestions.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence initial={false}>
            {suggestions.map((suggestion, idx) => (
              <motion.div
                key={suggestion.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, delay: idx * 0.02 }}
              >
                <SuggestionCard
                  suggestion={suggestion}
                  isRegenerating={regeneratingId === suggestion.id}
                  anyRegenerating={regeneratingId != null}
                  onRegenerate={() => onRegenerate(suggestion.id)}
                  onSelect={() => onSelect(suggestion.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

type SuggestionCardProps = {
  suggestion: CampaignSuggestion;
  isRegenerating: boolean;
  anyRegenerating: boolean;
  onRegenerate: () => void;
  onSelect: () => void;
};

function SuggestionCard(props: SuggestionCardProps) {
  const { suggestion, isRegenerating, anyRegenerating, onRegenerate, onSelect } =
    props;
  return (
    <div
      className={cn(
        'group relative flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md',
        isRegenerating && 'opacity-70'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-slate-900 line-clamp-2">
            {suggestion.theme}
          </h3>
          <p className="mt-1 text-xs text-slate-500 line-clamp-3">
            {suggestion.description}
          </p>
        </div>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={anyRegenerating}
          aria-label="Regenerate this campaign"
          title="Regenerate this campaign"
          className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCcw
            className={cn('h-4 w-4', isRegenerating && 'animate-spin')}
          />
        </button>
      </div>

      {suggestion.goal && (
        <p className="mt-3 inline-flex w-fit max-w-full items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-700 line-clamp-1">
          Goal: {suggestion.goal}
        </p>
      )}

      <ul className="mt-4 space-y-2 flex-1">
        {suggestion.days.slice(0, 4).map((day) => (
          <li
            key={day.dayNumber}
            className="flex items-start gap-2 text-xs text-slate-600"
          >
            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
              {day.dayNumber}
            </span>
            <span className="line-clamp-2">
              <span className="font-semibold text-slate-800">{day.title}</span>{' '}
              <span className="text-slate-500">— {day.reference}</span>
            </span>
          </li>
        ))}
        {suggestion.days.length > 4 && (
          <li className="text-[11px] italic text-slate-400">
            +{suggestion.days.length - 4} more day(s)
          </li>
        )}
      </ul>

      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="text-[11px] text-slate-400">
          {suggestion.days.length} day{suggestion.days.length === 1 ? '' : 's'}
        </span>
        <button
          type="button"
          onClick={onSelect}
          disabled={anyRegenerating}
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Use this campaign
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Editor (step 2)
// =============================================================================

type EditorHeaderProps = {
  theme: string;
  description: string;
  effectiveMaxDays: number;
  onBack: () => void;
};

function EditorHeader(props: EditorHeaderProps) {
  const { theme, description, effectiveMaxDays, onBack } = props;
  return (
    <section className="glass-card rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-3 bg-white/50">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
            aria-label="Back to campaign ideas"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{theme}</h2>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              {description}
            </p>
          </div>
        </div>
        <span className="hidden md:inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
          Up to {effectiveMaxDays} day{effectiveMaxDays === 1 ? '' : 's'}
        </span>
      </div>
    </section>
  );
}

type DayDraftListProps = {
  days: CampaignDayDraft[];
  dateWindow: string[];
  usedDates: Set<string>;
  formattedToday: string;
  onUpdate: (dayNumber: number, patch: Partial<CampaignDayDraft>) => void;
  onPickDate: (dayNumber: number, date: string | null) => void;
  onRemove: (dayNumber: number) => void;
};

function DayDraftList(props: DayDraftListProps) {
  const {
    days,
    dateWindow,
    usedDates,
    formattedToday,
    onUpdate,
    onPickDate,
    onRemove,
  } = props;

  if (days.length === 0) {
    return (
      <section className="glass-card rounded-3xl border border-dashed border-slate-300 bg-slate-50/40 p-8 text-center text-sm text-slate-600">
        No days in this campaign. Go back and pick a campaign idea to start.
      </section>
    );
  }

  const minDate = dateWindow[0] ?? formattedToday;
  const maxDate = dateWindow[dateWindow.length - 1] ?? '';

  return (
    <section className="glass-card rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-white/50">
        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
          <CalendarDays className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-900">
            2. Pick dates &amp; tweak briefs
          </h2>
          <p className="text-xs text-slate-500">
            Dates don&apos;t have to be sequential — pick any day inside your
            plan window. Remove a day if you only want a shorter campaign
            (minimum 1 day).
          </p>
        </div>
      </div>

      <ul className="divide-y divide-slate-100">
        {days.map((day) => {
          const otherUsed = new Set(usedDates);
          if (day.date) otherUsed.delete(day.date);
          return (
            <li key={day.dayNumber} className="p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="shrink-0 flex flex-row sm:flex-col items-center sm:items-start gap-3 sm:w-32">
                  <div className="rounded-2xl bg-indigo-600 text-white px-3 py-2 text-center shadow-sm shadow-indigo-600/20">
                    <p className="text-[10px] uppercase tracking-wider font-semibold opacity-80">
                      Day
                    </p>
                    <p className="text-xl font-black leading-none">
                      {day.dayNumber}
                    </p>
                  </div>
                  <label className="flex-1 sm:flex-none sm:mt-2 w-full">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Date
                    </span>
                    <input
                      type="date"
                      value={day.date ?? ''}
                      min={minDate}
                      max={maxDate || undefined}
                      onChange={(e) => {
                        const next = e.target.value || null;
                        if (next && otherUsed.has(next)) {
                          showErrorToast(
                            'That date is already used by another day. Pick a different day.'
                          );
                          return;
                        }
                        onPickDate(day.dayNumber, next);
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </label>
                  {days.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemove(day.dayNumber)}
                      className="inline-flex items-center gap-1 self-start text-[11px] font-semibold text-rose-600 hover:text-rose-700"
                      aria-label={`Remove day ${day.dayNumber}`}
                    >
                      <Trash2 className="h-3 w-3" />
                      Remove
                    </button>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <label className="block">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Title
                    </span>
                    <Input
                      value={day.title}
                      onChange={(e) =>
                        onUpdate(day.dayNumber, { title: e.target.value })
                      }
                      placeholder="Short day headline"
                      className="mt-1"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Reference brief
                    </span>
                    <Textarea
                      value={day.reference}
                      onChange={(e) =>
                        onUpdate(day.dayNumber, { reference: e.target.value })
                      }
                      placeholder="Describe what this day's post should look like."
                      rows={2}
                      className="mt-1"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Caption seed
                      <span className="ml-1 text-slate-400 normal-case font-normal tracking-normal">
                        (optional)
                      </span>
                    </span>
                    <Textarea
                      value={day.caption ?? ''}
                      onChange={(e) =>
                        onUpdate(day.dayNumber, {
                          caption: e.target.value || undefined,
                        })
                      }
                      placeholder="Optional caption line to steer the copy."
                      rows={1}
                      className="mt-1"
                    />
                  </label>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// =============================================================================
// Summary / submit panel
// =============================================================================

type CampaignSummaryProps = {
  allowedPlatforms: SocialPlatform[];
  hasSelectablePlatforms: boolean;
  genPlatforms: SocialPlatform[];
  allPlatformsSelected: boolean;
  onTogglePlatform: (platform: SocialPlatform) => void;
  onSelectAllPlatforms: () => void;
  platformSelection: { ok: true } | { ok: false; error: string };
  datedDays: number;
  totalDays: number;
  canSubmit: boolean;
  isSubmitting: boolean;
  isRunning: boolean;
  overallPct: number;
  jobCount: number;
  jobs: Array<{ jobId: string; platform: string; pct: number }>;
  totalCost: number;
  userCredits: number;
  insufficientCredits: boolean;
  onCreate: () => void;
  onViewDrafts: () => void;
};

function CampaignSummary(props: CampaignSummaryProps) {
  const {
    allowedPlatforms,
    hasSelectablePlatforms,
    genPlatforms,
    allPlatformsSelected,
    onTogglePlatform,
    onSelectAllPlatforms,
    platformSelection,
    datedDays,
    totalDays,
    canSubmit,
    isSubmitting,
    isRunning,
    overallPct,
    jobCount,
    jobs,
    totalCost,
    userCredits,
    insufficientCredits,
    onCreate,
    onViewDrafts,
  } = props;

  return (
    <aside className="lg:sticky lg:top-4 self-start">
      <section className="glass-card rounded-3xl p-6 border border-indigo-100/60 bg-indigo-50/20 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-6">
          3. Confirm &amp; create
        </h2>

        <div className="space-y-4 text-sm mb-6">
          <div className="space-y-2">
            <span className="font-medium text-slate-600">Post platforms:</span>
            {!hasSelectablePlatforms ? (
              <div
                role="status"
                className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950"
              >
                <p className="font-medium">Select your accounts first</p>
                <p className="mt-1 text-amber-900/90">
                  Choose which platforms you use in onboarding or social
                  settings, then come back to launch the campaign.
                </p>
                <Link
                  href="/social-media-integration"
                  className="mt-2 inline-block text-sm font-semibold text-amber-950 underline underline-offset-2 hover:text-amber-900"
                >
                  Open social setup
                </Link>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-4">
                  {allowedPlatforms.map((p) => (
                    <label
                      key={p}
                      htmlFor={`campaign-platform-${p}`}
                      className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800"
                    >
                      <input
                        id={`campaign-platform-${p}`}
                        type="checkbox"
                        checked={genPlatforms.includes(p)}
                        onChange={() => onTogglePlatform(p)}
                        className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30"
                      />
                      <span>{platformLabel(p)}</span>
                    </label>
                  ))}
                  {allowedPlatforms.length > 1 && (
                    <label
                      htmlFor="campaign-platform-all"
                      className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800"
                    >
                      <input
                        id="campaign-platform-all"
                        type="checkbox"
                        checked={allPlatformsSelected}
                        onChange={onSelectAllPlatforms}
                        className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30"
                      />
                      <span>
                        {allPlatformsSelectionLabel(allowedPlatforms.length)}
                      </span>
                    </label>
                  )}
                </div>
                {!platformSelection.ok && (
                  <p className="text-xs text-amber-700">
                    {platformSelection.error}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="flex justify-between items-center text-slate-600">
            <span className="font-medium">Days planned:</span>
            <span className="font-bold text-slate-900">
              {datedDays} / {totalDays || '—'}
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span className="font-medium">Cost per day:</span>
            <span className="font-bold text-slate-900">
              {CAMPAIGN_CREDIT_PER_DAY} × {Math.max(genPlatforms.length, 1)}{' '}
              ={' '}
              {CAMPAIGN_CREDIT_PER_DAY * Math.max(genPlatforms.length, 1)}{' '}
              credits
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span className="font-medium">Credits to charge:</span>
            <span
              className={cn(
                'font-extrabold',
                insufficientCredits ? 'text-rose-600' : 'text-indigo-700'
              )}
            >
              {totalCost}
            </span>
          </div>
          {insufficientCredits && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs text-rose-800">
              You need {totalCost} credits but only have {userCredits}.{' '}
              <Link
                href="/settings/billings"
                className="font-semibold underline underline-offset-2"
              >
                Top up here
              </Link>
              .
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onCreate}
          disabled={!canSubmit}
          className="w-full rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition-all hover:bg-indigo-700 hover:-translate-y-0.5 active:scale-[0.98] disabled:transform-none disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
        >
          {isSubmitting
            ? 'Generating drafts…'
            : `Generate drafts (${totalCost || 0} credits)`}
        </button>

        <button
          type="button"
          onClick={onViewDrafts}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Inbox className="h-4 w-4" />
          View drafts
        </button>

        {(isSubmitting || isRunning) && (
          <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-indigo-700">
              <span>Generating…</span>
              <span>{overallPct}%</span>
            </div>
            <Progress
              value={overallPct}
              className="h-1.5 bg-indigo-100 **:data-[slot=progress-indicator]:bg-indigo-500"
            />
            {jobCount > 1 && (
              <div className="space-y-1 pt-1">
                {jobs.map((job) => (
                  <div
                    key={job.jobId}
                    className="flex items-center justify-between text-[11px] text-indigo-700/80"
                  >
                    <span className="capitalize">{job.platform}</span>
                    <span>{job.pct}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </aside>
  );
}

// =============================================================================
// Drafts drawer
// =============================================================================

type DraftsDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registerRefresh: (fn: (() => Promise<void>) | null) => void;
  dateWindow: string[];
  formattedToday: string;
  /** True while a campaign-post job is in flight (create OR regen). Used
   *  to grey out regen buttons across all rows — only one campaign-post
   *  job can occupy the activeJobs slot at a time. */
  isCampaignJobRunning: boolean;
  /** Hook into the page's `useFeatureJob` optimistic cache so the
   *  progress UI lights up immediately after a regen is queued (without
   *  waiting for the user-doc Firestore snapshot). */
  onCampaignJobStarted: (response: {
    parentJobId: string;
    jobs: Array<{ jobId: string; platform: 'instagram' | 'facebook' | 'linkedin' }>;
  }) => void;
};

function DraftsDrawer(props: DraftsDrawerProps) {
  const {
    open,
    onOpenChange,
    registerRefresh,
    dateWindow,
    formattedToday,
    isCampaignJobRunning,
    onCampaignJobStarted,
  } = props;
  const [drafts, setDrafts] = useState<CampaignDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'draft' | 'scheduled' | 'all'>(
    'draft'
  );
  // Holds the id of the draft currently being regenerated so we can show a
  // per-row spinner. Set when the user clicks Regenerate, cleared once the
  // refresh after the job completes brings back the updated draft data
  // (or immediately if the API call itself rejects).
  const [regeneratingDraftId, setRegeneratingDraftId] = useState<
    string | null
  >(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const list = await listCampaignDraftsApi({
        status: filter === 'all' ? undefined : filter,
        limit: 50,
      });
      setDrafts(list);
      // Refreshed data is the authoritative source for "is this draft
      // still being regenerated?". Once the new image/regenerationCount
      // is in `list`, the spinner can go away.
      setRegeneratingDraftId(null);
    } catch (err) {
      const typed = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      showErrorToast(
        typed?.response?.data?.message ||
          typed?.message ||
          'Could not load drafts.'
      );
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // Register the refresh callback so the parent page can poke us when a
  // new generation finishes (no need to close+reopen the drawer).
  useEffect(() => {
    registerRefresh(refresh);
    return () => registerRefresh(null);
  }, [refresh, registerRefresh]);

  // Auto-refresh whenever the drawer opens or the filter changes — drafts
  // are small enough that a refetch on open is cheaper than incremental
  // state syncing.
  useEffect(() => {
    if (!open) return;
    void refresh();
  }, [open, refresh]);

  const handleScheduled = useCallback(() => {
    void refresh();
  }, [refresh]);

  const handleRegenerate = useCallback(
    async (draftId: string) => {
      if (regeneratingDraftId) {
        showErrorToast(
          'Another draft is regenerating. Wait for it to finish.'
        );
        return;
      }
      if (isCampaignJobRunning) {
        showErrorToast(
          'A campaign job is already running. Wait for it to finish.'
        );
        return;
      }
      try {
        setRegeneratingDraftId(draftId);
        const response = await regenerateCampaignDraftApi({ draftId });
        onCampaignJobStarted({
          parentJobId: response.parentJobId,
          jobs: response.jobs,
        });
        toast.success("Regenerating");
      } catch (err) {
        // Roll back the spinner so the user can retry; the toast already
        // tells them what went wrong.
        setRegeneratingDraftId(null);
        const typed = err as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        showErrorToast(
          typed?.response?.data?.message ||
            typed?.message ||
            'Could not start the regeneration.'
        );
      }
    },
    [isCampaignJobRunning, onCampaignJobStarted, regeneratingDraftId]
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl flex flex-col gap-0 p-0"
        // The per-row image preview overlay (rendered by `ImagePreviewOverlay`
        // via createPortal -> document.body) lives OUTSIDE this Sheet's DOM
        // tree, so Radix's default outside-click detection treats clicks on
        // the preview's close button (and Esc presses while it's open) as a
        // request to dismiss the Sheet too. Veto those events here — the
        // preview owns its own dismissal.
        //
        // IMPORTANT: Radix wraps these as CustomEvents and the actual DOM
        // target lives at `event.detail.originalEvent.target`, NOT
        // `event.target` (which is the dispatch layer = the SheetContent
        // element). Earlier we checked `event.target` and the guard silently
        // never matched, so the Sheet closed on pointerdown right before the
        // X button's own `onClick` fired on the preview.
        //
        // We hook BOTH `onPointerDownOutside` (fires first) and
        // `onInteractOutside` (fires after) to be defensive — Radix's docs
        // promise `onInteractOutside` runs even when the pointer-down
        // handler doesn't preventDefault, but stopping at the first
        // opportunity avoids any chance of the close logic running.
        onPointerDownOutside={(e) => {
          if (isEventFromImagePreviewOverlay(e)) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (isEventFromImagePreviewOverlay(e)) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (document.querySelector('[data-image-preview-overlay]')) {
            e.preventDefault();
          }
        }}
      >
        <SheetHeader className="border-b border-slate-100 px-6 py-5">
          <SheetTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Inbox className="h-5 w-5 text-indigo-600" />
            Campaign drafts
          </SheetTitle>
          <SheetDescription className="text-xs text-slate-500">
            Drafts are generated but not yet posted. Pick a date &amp; time
            to push one onto your schedule.
          </SheetDescription>
        </SheetHeader>

        <div className="border-b border-slate-100 px-6 py-3 flex items-center justify-between gap-3">
          <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 text-xs font-semibold">
            {(['draft', 'scheduled', 'all'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={cn(
                  'rounded-full px-3 py-1 capitalize transition',
                  filter === value
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                {value}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCcw
              className={cn('h-3.5 w-3.5', loading && 'animate-spin')}
            />
            Refresh
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {loading && drafts.length === 0 && (
            <>
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-28 w-full rounded-2xl" />
            </>
          )}
          {!loading && drafts.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/40 p-6 text-center text-sm text-slate-500">
              No {filter === 'all' ? '' : filter} drafts yet.
              {filter === 'draft' &&
                ' Generate a campaign and the renders will land here.'}
            </div>
          )}
          {drafts.map((draft) => (
            <DraftRow
              key={draft.draftId}
              draft={draft}
              dateWindow={dateWindow}
              formattedToday={formattedToday}
              onScheduled={handleScheduled}
              onRegenerate={handleRegenerate}
              isRegenerating={regeneratingDraftId === draft.draftId}
              isAnyRegenInFlight={
                regeneratingDraftId != null || isCampaignJobRunning
              }
            />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

type DraftRowProps = {
  draft: CampaignDraft;
  dateWindow: string[];
  formattedToday: string;
  onScheduled: () => void;
  onRegenerate: (draftId: string) => void;
  /** True while THIS specific draft is being regenerated. Drives the
   *  per-row "Regenerating…" spinner. */
  isRegenerating: boolean;
  /** True when EITHER this draft is regenerating OR some other
   *  campaign-post job is in flight (create or another row's regen).
   *  Used to disable the button across the board so we can't enqueue
   *  two campaign-post jobs simultaneously. */
  isAnyRegenInFlight: boolean;
};

function DraftRow(props: DraftRowProps) {
  const {
    draft,
    dateWindow,
    formattedToday,
    onScheduled,
    onRegenerate,
    isRegenerating,
    isAnyRegenInFlight,
  } = props;
  const isScheduled = draft.status === 'scheduled';
  const targetDate = draft.targetDate || dateWindow[0] || formattedToday;
  const [date, setDate] = useState<string>(targetDate);
  // Default time of day for the picker — 9 AM in the user's local TZ is a
  // safe early-morning slot that's well before most engagement peaks.
  const [time, setTime] = useState<string>('09:00');
  const [scheduling, setScheduling] = useState(false);
  // First regen is free; everything after costs CAMPAIGN_REGENERATE_CREDIT.
  // Surface this in the button label so the user knows exactly what they're
  // about to spend BEFORE they click.
  const regenCost = nextRegenerationCost(draft.regenerationCount ?? 0);

  const scheduledAtDate = isScheduled ? unknownTsToDate(draft.scheduledAt) : null;

  const handleSchedule = useCallback(async () => {
    if (scheduling) return;
    if (!date || !time) {
      showErrorToast('Pick a date and time first.');
      return;
    }
    const iso = new Date(`${date}T${time}`);
    if (Number.isNaN(iso.getTime())) {
      showErrorToast('Invalid date/time.');
      return;
    }
    if (iso.getTime() < Date.now()) {
      showErrorToast('Pick a date/time in the future.');
      return;
    }
    try {
      setScheduling(true);
      await scheduleCampaignDraftApi({
        draftId: draft.draftId,
        scheduleAt: iso.toISOString(),
      });
      toast.success('Draft scheduled.');
      onScheduled();
    } catch (err) {
      const typed = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      showErrorToast(
        typed?.response?.data?.message ||
          typed?.message ||
          'Could not schedule this draft.'
      );
    } finally {
      setScheduling(false);
    }
  }, [date, draft.draftId, onScheduled, scheduling, time]);

  const previewAlt =
    draft.eventName || draft.campaignTheme || 'Campaign draft';

  // Fullscreen image preview state. Reusing the shared hook gives us Esc-to-
  // close, body scroll lock, and a portal-mounted overlay for free — matches
  // the rest of the app.
  const preview = useImagePreview();
  const openPreview = useCallback(() => {
    if (!draft.imageUrl) return;
    preview.open(draft.imageUrl, previewAlt);
  }, [draft.imageUrl, preview, previewAlt]);

  // Only mount the HoverCard wrapper when there's actually an image to
  // preview — otherwise hovering the empty placeholder would open an empty
  // popover, which is more confusing than helpful.
  const thumbnail = (
    <div
      className={cn(
        'group relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100',
        draft.imageUrl && 'cursor-zoom-in'
      )}
    >
      {draft.imageUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={draft.imageUrl}
          alt={previewAlt}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-slate-300">
          <ImageIcon className="h-6 w-6" />
        </div>
      )}
      {draft.imageUrl && (
        <ImagePreviewButton
          variant="overlay-icon"
          stopPropagation
          ariaLabel="Open full-size preview"
          label="Preview"
          onClick={openPreview}
          className="absolute bottom-1 right-1 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        />
      )}
    </div>
  );

  return (
    <div className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      {draft.imageUrl ? (
        <HoverCard openDelay={120} closeDelay={80}>
          <HoverCardTrigger asChild>{thumbnail}</HoverCardTrigger>
          <HoverCardContent
            side="left"
            align="start"
            sideOffset={12}
            collisionPadding={16}
            className="w-80 p-0 overflow-hidden"
          >
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={draft.imageUrl}
                alt={previewAlt}
                className="w-full max-h-80 object-contain bg-slate-100"
              />
              <ImagePreviewButton
                variant="overlay-icon"
                stopPropagation
                ariaLabel="Open full-size preview"
                label="Preview"
                onClick={openPreview}
                className="absolute bottom-2 right-2"
              />
            </div>
            <div className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold text-slate-900 leading-snug">
                  {previewAlt}
                </p>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                    isScheduled
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-600'
                  )}
                >
                  {isScheduled ? 'scheduled' : 'draft'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 capitalize">
                {draft.platform || 'unknown'} ·{' '}
                {formatDisplayDate(draft.targetDate)}
                {draft.campaignTheme ? ` · ${draft.campaignTheme}` : ''}
              </p>
              {draft.message && (
                <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {draft.message}
                </p>
              )}
            </div>
          </HoverCardContent>
        </HoverCard>
      ) : (
        thumbnail
      )}
      {preview.isOpen && (
        <ImagePreviewOverlay
          src={preview.previewUrl}
          alt={preview.previewAlt}
          onClose={preview.close}
        />
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">
              {draft.eventName || draft.campaignTheme || 'Untitled day'}
            </p>
            <p className="text-[11px] text-slate-500 capitalize">
              {draft.platform || 'unknown'} ·{' '}
              {formatDisplayDate(draft.targetDate)}
            </p>
          </div>
          <span
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
              isScheduled
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-100 text-slate-600'
            )}
          >
            {isScheduled ? 'scheduled' : 'draft'}
          </span>
        </div>

        {draft.message && (
          <p className="mt-1 text-[11px] text-slate-500 line-clamp-2">
            {draft.message}
          </p>
        )}

        {isScheduled ? (
          <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
            <CalendarCheck2 className="h-3 w-3" />
            {scheduledAtDate
              ? `Will publish ${format(scheduledAtDate, "EEE, MMM d 'at' h:mm a")}`
              : 'Scheduled'}
          </p>
        ) : (
          <>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <label className="flex flex-col text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Date <span className="ml-1 normal-case text-slate-400">(locked)</span>
                {/* The date was committed when the campaign was generated —
                     the user only picks a time of day here. Disabled +
                     readOnly so neither click nor keyboard can change it. */}
                <input
                  type="date"
                  value={date}
                  disabled
                  readOnly
                  aria-readonly="true"
                  className="mt-1 rounded-lg border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 cursor-not-allowed"
                />
              </label>
              <label className="flex flex-col text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Time
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="mt-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </label>
              <button
                type="button"
                onClick={handleSchedule}
                disabled={scheduling || isRegenerating}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {scheduling ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CalendarPlus className="h-3.5 w-3.5" />
                )}
                Schedule
              </button>
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] text-slate-400">
                {draft.regenerationCount > 0
                  ? `Regenerated ${draft.regenerationCount}× · next regen ${regenCost} credit${regenCost === 1 ? '' : 's'}`
                  : 'First regeneration is free'}
              </span>
              <button
                type="button"
                onClick={() => onRegenerate(draft.draftId)}
                disabled={isAnyRegenInFlight || scheduling}
                title={
                  regenCost === 0
                    ? 'Re-render this draft (free)'
                    : `Re-render this draft (${regenCost} credits)`
                }
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition',
                  regenCost === 0
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                    : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              >
                {isRegenerating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCcw className="h-3 w-3" />
                )}
                {isRegenerating
                  ? 'Regenerating…'
                  : regenCost === 0
                    ? 'Regenerate · Free'
                    : `Regenerate · ${regenCost} credits`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
