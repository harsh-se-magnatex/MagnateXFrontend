'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addDays,
  format,
  isAfter,
  parseISO,
  startOfDay,
} from 'date-fns';
import {
  ArrowLeft,
  CalendarCheck2,
  CalendarDays,
  CalendarPlus,
  CalendarRange,
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
import { workspacePageTitleClass } from '@/lib/workspace-ui';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageLoadingState } from '@/components/shared/PageLoadingState';
import { NonSubscribedFeatureBlock } from '@/components/shared/NonSubscribedFeatureBlock';
import { isPlanInactive } from '@/lib/plan-access';
import { showErrorToast } from '@/lib/show-error-toast';
import { useTimestampFormatter } from '@/lib/user-timezone';
import { useTourDemo } from '@/src/stores/tourState';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  ImagePreviewButton,
  ImagePreviewOverlay,
  isImagePreviewOverlayMounted,
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
import {
  CAMPAIGN_CREDIT_PER_DAY,
  DEFAULT_CAMPAIGN_PLAN_DAYS,
  DEFAULT_CAMPAIGN_SET_SIZE,
  MAX_CAMPAIGN_DAYS,
  createCampaignApi,
  deleteCampaignDraftApi,
  getCampaignSuggestionsApi,
  listCampaignDraftsApi,
  canRegenerateDraft,
  nextRegenerationCost,
  regenerateCampaignApi,
  regenerateCampaignDraftApi,
  scheduleCampaignDraftApi,
  suggestCampaignSetApi,
  type CampaignDraft,
  type CampaignSuggestion,
} from '@/src/service/api/campaign.service';
import {
  waitForCampaignDraftRegen,
  waitForParentJobDocs,
} from '@/src/lib/wait-for-parent-job';
import { auth } from '@/lib/firebase';
import {
  useCampaignState,
  type CampaignDayDraft,
} from '@/src/stores/campaignState';
import { getTodatDate } from '@/utils/getTodayDate';
import { normalizePreferredPostingTime } from '@/utils/preferredPostingTime';

const OPTIMAL_TIME_FIELD: Record<
  SocialPlatform,
  'optimalFacebookTime' | 'optimalInstagramTime' | 'optimalLinkedinTime'
> = {
  facebook: 'optimalFacebookTime',
  instagram: 'optimalInstagramTime',
  linkedin: 'optimalLinkedinTime',
};

function preferredScheduleTimeForPlatform(
  platform: string | null | undefined,
  prefs:
    | {
        preferredTime?: string;
        analyticsOptimalPosting?: boolean;
        optimalFacebookTime?: string;
        optimalInstagramTime?: string;
        optimalLinkedinTime?: string;
      }
    | null
    | undefined
): string {
  const key = String(platform ?? '').toLowerCase();
  const social =
    key === 'facebook' || key === 'instagram' || key === 'linkedin'
      ? (key as SocialPlatform)
      : null;
  if (!prefs) return normalizePreferredPostingTime(undefined);
  if (social && prefs.analyticsOptimalPosting) {
    const optimal = prefs[OPTIMAL_TIME_FIELD[social]];
    if (optimal) return normalizePreferredPostingTime(optimal, optimal);
  }
  return normalizePreferredPostingTime(prefs.preferredTime);
}

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
 * Radix Sheet dismiss handlers fire for portaled UI (e.g. image preview) that
 * lives outside `SheetContent`. Block dismiss while a preview is open.
 */
function preventSheetDismissForImagePreview(event: Event): void {
  if (isImagePreviewOverlayMounted()) {
    event.preventDefault();
  }
}

/**
 * Plan-relative bounds for campaign date picking. A campaign always occupies
 * one contiguous 7-day window: the first date picked is the anchor, and every
 * other day must fall within anchor .. anchor+6 (capped at plan expiry).
 * Anchor starts are limited to today .. (planEnd − 6) so a full week fits.
 */
type CampaignDateBounds = {
  today: string;
  planEnd: string;
  latestAnchorStart: string;
};

function getCampaignDateBounds(
  formattedToday: string,
  planExpiresAt: Date | null
): CampaignDateBounds {
  const today = formattedToday;
  const planEnd = planExpiresAt
    ? format(startOfDay(planExpiresAt), 'yyyy-MM-dd')
    : format(addDays(parseISO(today), MAX_CAMPAIGN_DAYS - 1), 'yyyy-MM-dd');
  let latestAnchorStart = format(
    addDays(parseISO(planEnd), -(MAX_CAMPAIGN_DAYS - 1)),
    'yyyy-MM-dd'
  );
  if (latestAnchorStart < today) {
    latestAnchorStart = today;
  }
  return { today, planEnd, latestAnchorStart };
}

function getAnchoredWindow(
  anchor: string,
  bounds: CampaignDateBounds
): { min: string; max: string } {
  const rawEnd = format(
    addDays(parseISO(anchor), MAX_CAMPAIGN_DAYS - 1),
    'yyyy-MM-dd'
  );
  const max = rawEnd > bounds.planEnd ? bounds.planEnd : rawEnd;
  return { min: anchor, max };
}

function datesInIsoRange(min: string, max: string): string[] {
  const out: string[] = [];
  let cursor = parseISO(min);
  const end = parseISO(max);
  while (!isAfter(cursor, end)) {
    out.push(format(cursor, 'yyyy-MM-dd'));
    cursor = addDays(cursor, 1);
  }
  return out;
}

/** Full plan span for draft scheduling (draft drawer). */
function buildPlanDateWindow(
  formattedToday: string,
  planExpiresAt: Date | null
): string[] {
  const bounds = getCampaignDateBounds(formattedToday, planExpiresAt);
  return datesInIsoRange(bounds.today, bounds.planEnd);
}

function formatDisplayDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), 'EEE, MMM d');
  } catch {
    return iso;
  }
}

type CampaignDraftBox = {
  key: string;
  theme: string;
  weekLabel: string;
  items: CampaignDraft[];
};

function campaignDateSpanLabel(start: string, end: string): string {
  if (!start) return 'No date yet';
  if (!end || start === end) {
    try {
      return format(parseISO(start), 'd MMM');
    } catch {
      return start;
    }
  }
  try {
    const s = parseISO(start);
    const e = parseISO(end);
    const sameMonth =
      s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
    return sameMonth
      ? `${format(s, 'd')}–${format(e, 'd MMM')}`
      : `${format(s, 'd MMM')} – ${format(e, 'd MMM')}`;
  } catch {
    return `${start} – ${end}`;
  }
}

/** Campaign drawer header from the stored builder window, not post dates. */
function campaignBoxWeekLabel(items: CampaignDraft[]): string {
  const withWindow = items.find(
    (d) => d.campaignWindowStart && d.campaignWindowEnd
  );
  if (withWindow?.campaignWindowStart && withWindow.campaignWindowEnd) {
    return campaignDateSpanLabel(
      withWindow.campaignWindowStart,
      withWindow.campaignWindowEnd
    );
  }
  const dates = items
    .map((d) => d.targetDate)
    .filter((d): d is string => !!d)
    .sort();
  if (dates.length === 0) return 'No date yet';
  try {
    const weekEnd = format(
      addDays(parseISO(dates[0]), MAX_CAMPAIGN_DAYS - 1),
      'yyyy-MM-dd'
    );
    return campaignDateSpanLabel(dates[0], weekEnd);
  } catch {
    return dates[0];
  }
}

function legacyCampaignBatchKey(draft: CampaignDraft): string {
  const theme = (draft.campaignTheme || 'Campaign').trim();
  const goal = (draft.campaignGoal || '').trim();
  const created = unknownTsToDate(draft.createdAt)?.getTime();
  if (created == null) return `legacy-${draft.draftId}`;
  // Sibling drafts from one run land within seconds; bucket by minute so
  // separate campaign creates (even with the same theme) stay in their own box.
  const bucket = Math.floor(created / 60_000);
  return `legacy-${theme}-${goal}-${bucket}`;
}

/**
 * Stable box key for one campaign run.
 * Auto-seed / gap-fill enqueue one Cloud Task per day (unique parentJobId),
 * so grouping by parentJobId alone splits a 5-day AI campaign into 5 boxes.
 * Prefer theme + calendar window for auto-seeded drafts.
 */
function campaignBatchKey(draft: CampaignDraft): string {
  const theme = (draft.campaignTheme || 'Campaign').trim();
  const windowStart = String(draft.campaignWindowStart ?? '').trim();
  const windowEnd = String(draft.campaignWindowEnd ?? '').trim();

  if (draft.autoSeeded === true) {
    if (windowStart || windowEnd || theme) {
      return `auto:${theme}|${windowStart}|${windowEnd}`;
    }
  }

  if (draft.parentJobId) return draft.parentJobId;

  if (windowStart && theme) {
    return `window:${theme}|${windowStart}|${windowEnd}`;
  }

  return legacyCampaignBatchKey(draft);
}

/** One bordered box per campaign run. */
function groupDraftsByCampaign(drafts: CampaignDraft[]): CampaignDraftBox[] {
  const batches = new Map<string, CampaignDraft[]>();

  for (const draft of drafts) {
    const batchKey = campaignBatchKey(draft);
    const list = batches.get(batchKey) ?? [];
    list.push(draft);
    batches.set(batchKey, list);
  }

  const boxes: CampaignDraftBox[] = [];
  for (const [key, items] of batches) {
    boxes.push({
      key,
      theme: (items[0]?.campaignTheme || 'Campaign').trim(),
      weekLabel: campaignBoxWeekLabel(items),
      items: [...items].sort((a, b) =>
        (a.targetDate || '').localeCompare(b.targetDate || '')
      ),
    });
  }

  return boxes.sort((b, a) => {
    const aDate = a.items.find((d) => d.targetDate)?.targetDate ?? '';
    const bDate = b.items.find((d) => d.targetDate)?.targetDate ?? '';
    return aDate.localeCompare(bDate);
  });
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
  const isTourDemo = useTourDemo();

  const goal = useCampaignState((s) => s.goal);
  const setGoal = useCampaignState((s) => s.setGoal);
  const suggestions = useCampaignState((s) => s.suggestions);
  const maxDaysFromServer = useCampaignState((s) => s.maxDays);
  const autoSeeded = useCampaignState((s) => s.autoSeeded);
  const pickedSuggestionId = useCampaignState((s) => s.pickedSuggestionId);
  const pickedReason = useCampaignState((s) => s.pickedReason);
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
  const dateAnchor = useCampaignState((s) => s.dateAnchor);
  const setDateAnchor = useCampaignState((s) => s.setDateAnchor);
  const clearAllDates = useCampaignState((s) => s.clearAllDates);
  const removeDay = useCampaignState((s) => s.removeDay);

  // -------------------- plan window / dates --------------------
  const planExpiresAt = useMemo(
    () => firestoreTimestampToDate(billing?.planExpiresAt ?? null),
    [billing?.planExpiresAt]
  );
  const dateBounds = useMemo(
    () => getCampaignDateBounds(formattedToday, planExpiresAt),
    [formattedToday, planExpiresAt]
  );
  const dateWindow = useMemo(
    () => buildPlanDateWindow(formattedToday, planExpiresAt),
    [formattedToday, planExpiresAt]
  );
  const anchoredWindow = useMemo(
    () => (dateAnchor ? getAnchoredWindow(dateAnchor, dateBounds) : null),
    [dateAnchor, dateBounds]
  );
  const hasValidAnchorRange = dateBounds.latestAnchorStart >= dateBounds.today;
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
        loadSuggestionSet(set.suggestions, set.maxDays, {
          autoSeeded: set.autoSeeded === true,
          pickedSuggestionId: set.pickedSuggestionId ?? null,
          pickedReason: set.pickedReason ?? null,
        });
        if (typeof set.goal === 'string' && set.goal.trim()) {
          setGoal(set.goal);
        }
      } catch (err) {
        // Soft-fail: empty gallery just nudges the user to click Generate.
        console.warn('[create-campaign] initial fetch failed', err);
      } finally {
        setIsLoadingSuggestions(false);
      }
    })();
  }, [loadSuggestionSet, setGoal, setIsLoadingSuggestions, suggestions.length]);

  // -------------------- create draft batch --------------------
  const handleGenerateSet = useCallback(
    async (size?: number) => {
      if (isLoadingSuggestions) return;
      try {
        setIsLoadingSuggestions(true);
        const set = await suggestCampaignSetApi({
          goal,
          count: size ?? DEFAULT_CAMPAIGN_SET_SIZE,
        });
        loadSuggestionSet(set.suggestions, set.maxDays, {
          autoSeeded: false,
          pickedSuggestionId: null,
          pickedReason: null,
        });
        toast.success(
          `Generated ${set.suggestions.length} campaign idea${set.suggestions.length === 1 ? '' : 's'}.`
        );
      } catch {
        showErrorToast('Could not generate campaign suggestions. Please try again later.');
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
      } catch {
        showErrorToast('Could not regenerate this suggestion. Please try again later.');
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

  const handlePickDate = useCallback(
    (dayNumber: number, date: string | null) => {
      const day = days.find((d) => d.dayNumber === dayNumber);
      if (!day) return;

      if (!date) {
        if (dateAnchor && day.date === dateAnchor) {
          clearAllDates();
          return;
        }
        setDayDate(dayNumber, null);
        return;
      }

      if (!dateAnchor) {
        if (date < dateBounds.today) {
          showErrorToast('That date is in the past.');
          return;
        }
        if (date > dateBounds.latestAnchorStart) {
          showErrorToast(
            `Pick a start date on or before ${formatDisplayDate(dateBounds.latestAnchorStart)} so all ${MAX_CAMPAIGN_DAYS} days fit before your plan ends.`
          );
          return;
        }
        const otherUsed = new Set(usedDates);
        if (day.date) otherUsed.delete(day.date);
        if (otherUsed.has(date)) {
          showErrorToast(
            'That date is already used by another day. Pick a different day.'
          );
          return;
        }
        setDateAnchor(date);
        setDayDate(dayNumber, date);
        return;
      }

      const isAnchorCell = day.date === dateAnchor;
      if (isAnchorCell && date !== dateAnchor) {
        if (date < dateBounds.today) {
          showErrorToast('That date is in the past.');
          return;
        }
        if (date > dateBounds.latestAnchorStart) {
          showErrorToast(
            `Pick a start date on or before ${formatDisplayDate(dateBounds.latestAnchorStart)} so all ${MAX_CAMPAIGN_DAYS} days fit before your plan ends.`
          );
          return;
        }
        const { min, max } = getAnchoredWindow(date, dateBounds);
        setDateAnchor(date);
        days.forEach((d) => {
          if (d.dayNumber === dayNumber) {
            setDayDate(d.dayNumber, date);
            return;
          }
          if (d.date && (d.date < min || d.date > max)) {
            setDayDate(d.dayNumber, null);
          }
        });
        return;
      }

      const { min, max } = getAnchoredWindow(dateAnchor, dateBounds);
      if (date < min || date > max) {
        showErrorToast(
          `Stay within your ${MAX_CAMPAIGN_DAYS}-day window (${formatDisplayDate(min)} – ${formatDisplayDate(max)}).`
        );
        return;
      }
      const otherUsed = new Set(usedDates);
      if (day.date) otherUsed.delete(day.date);
      if (otherUsed.has(date)) {
        showErrorToast(
          'That date is already used by another day. Pick a different day.'
        );
        return;
      }
      setDayDate(dayNumber, date);
    },
    [
      clearAllDates,
      dateAnchor,
      dateBounds,
      days,
      setDateAnchor,
      setDayDate,
      usedDates,
    ]
  );

  const handleAutoFillDates = useCallback(() => {
    if (days.length === 0 || !hasValidAnchorRange) return;
    let anchor = dateAnchor;
    if (!anchor) {
      anchor = dateBounds.today;
      if (anchor > dateBounds.latestAnchorStart) return;
      setDateAnchor(anchor);
    }
    const { min, max } = getAnchoredWindow(anchor, dateBounds);
    const window = datesInIsoRange(min, max);
    days.forEach((day, idx) => {
      const next = window[idx];
      if (next) setDayDate(day.dayNumber, next);
      else setDayDate(day.dayNumber, null);
    });
  }, [
    dateAnchor,
    dateBounds,
    days,
    hasValidAnchorRange,
    setDateAnchor,
    setDayDate,
  ]);

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
      const response = await createCampaignApi({
        theme: theme || 'Brand Campaign',
        description,
        goal: goal || undefined,
        ...(anchoredWindow
          ? {
              windowStart: anchoredWindow.min,
              windowEnd: anchoredWindow.max,
            }
          : {}),
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
      if (response.accepted || (response.successCount === 0 && response.failedCount === 0)) {
        void refreshDraftsRef.current?.();
        const uid = auth.currentUser?.uid;
        const expected =
          response.expectedDraftCount ||
          Math.max(1, response.dayCount * (response.platforms?.length || 1));
        if (uid && response.parentJobId && expected > 0) {
          const wait = await waitForParentJobDocs({
            uid,
            collectionName: 'content',
            parentJobId: response.parentJobId,
            expectedCount: expected,
          });
          void refreshDraftsRef.current?.();
          if (wait.outcome === 'generated') toast.success('Generated');
          else showErrorToast('Campaign creation failed. Please try again later.');
        }
        setIsSubmitting(false);
        return;
      }
      if (response.successCount > 0 && response.failedCount === 0) {
        toast.success('Generated');
      } else if (response.successCount > 0) {
        showErrorToast('Campaign creation failed. Please try again later.');
      } else if (response.failedCount > 0) {
        showErrorToast('Campaign creation failed. Please try again later.');
      }
      void refreshDraftsRef.current?.();
      setIsSubmitting(false);
    } catch {
      showErrorToast('Campaign creation failed. Please try again later.');
      setIsSubmitting(false);
    }
  }, [
    anchoredWindow,
    canSubmit,
    datedDays,
    days.length,
    description,
    genPlatforms,
    goal,
    insufficientCredits,
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

  if (!isTourDemo && isPlanInactive(billing)) {
    return <NonSubscribedFeatureBlock />;
  }

  const hasSelectablePlatforms = allowedPlatforms.length > 0;
  const effectiveMaxDays =
    maxDaysFromServer && maxDaysFromServer > 0
      ? maxDaysFromServer
      : DEFAULT_CAMPAIGN_PLAN_DAYS;
  const activeSuggestion =
    selectedSuggestionId != null
      ? suggestions.find((s) => s.id === selectedSuggestionId) ?? null
      : null;

  return (
    <div className="mx-auto animate-in fade-in duration-500 pb-20">
      <header className="mb-8 w-full flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <h1 className={cn(workspacePageTitleClass, 'flex items-center gap-3')}>
            {workspacePageTitle(WORKSPACE_NAV_HREFS.createCampaign)}
          </h1>
        </div>

        <div className="flex flex-col items-stretch gap-2 md:items-end">
          <div className="inline-flex items-center gap-2 self-stretch md:self-end rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200">
            <Zap className="h-4 w-4 text-amber-400" />
            <span>{userCredits} credits available</span>
          </div>
          <button
            type="button"
            onClick={() => setDraftsOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-accent"
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
          autoSeeded={autoSeeded}
          pickedSuggestionId={pickedSuggestionId}
          pickedReason={pickedReason}
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
              dateBounds={dateBounds}
              dateAnchor={dateAnchor}
              anchoredWindow={anchoredWindow}
              onUpdate={updateDay}
              onPickDate={handlePickDate}
              onRemove={removeDay}
            />

            <CampaignWeeksOverview
              days={days}
              dateAnchor={dateAnchor}
              anchoredWindow={anchoredWindow}
            />

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleAutoFillDates}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
                disabled={!hasValidAnchorRange}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Auto-fill consecutive dates
              </button>
              <button
                type="button"
                onClick={clearAllDates}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
                disabled={datedDays.length === 0}
              >
                Clear dates
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
        isCampaignJobRunning={isSubmitting}
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
  autoSeeded?: boolean;
  pickedSuggestionId?: string | null;
  pickedReason?: string | null;
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
    autoSeeded = false,
    pickedSuggestionId = null,
    pickedReason = null,
  } = props;

  const showSkeleton = isLoading && suggestions.length === 0;

  return (
    <div className="space-y-6">
      <section
        id="tour-campaign-builder"
        className="glass-card rounded-3xl border border-border shadow-sm overflow-hidden"
      >
        <div className="p-6 border-b border-border flex items-center gap-3 bg-card/50">
          <div className="p-2 bg-primary-purple/10 rounded-lg text-primary-purple">
            <Wand2 className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-foreground">
              1. Pick a campaign idea
            </h2>
            <p className="text-xs text-muted-foreground">
              {autoSeeded && pickedSuggestionId
                ? 'Auto mode already chose one idea for you (see the badge below). You can still pick a different card.'
                : `Optional: tell the AI what the campaign should focus on, then hit Generate. Each idea is a ${effectiveMaxDays}-day plan you can fully edit after picking.`}
            </p>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-4 sm:flex-row sm:items-end">
          <label className="flex-1 block">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Campaign goal
              <span className="ml-1 text-muted-foreground/70 normal-case font-normal tracking-normal">
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
            aria-busy={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-action px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-primary-purple/25 transition hover:brightness-105 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
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
                  ? 'Suggest campaign ideas'
                  : 'Suggest new ideas'}
              </>
            )}
          </button>
        </div>
      </section>

      {autoSeeded && pickedReason ? (
        <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-foreground">
            Why auto mode picked this
          </p>
          <p className="mt-1 leading-relaxed text-foreground">{pickedReason}</p>
        </div>
      ) : null}

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
        <section className="glass-card rounded-3xl border border-dashed border-border bg-muted/40 p-10 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-primary-purple/60" />
          <h3 className="mt-3 text-base font-semibold text-foreground">
            No campaign ideas yet
          </h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
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
                  isAiPicked={
                    autoSeeded && pickedSuggestionId === suggestion.id
                  }
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
  isAiPicked?: boolean;
  onRegenerate: () => void;
  onSelect: () => void;
};

function SuggestionCard(props: SuggestionCardProps) {
  const {
    suggestion,
    isRegenerating,
    anyRegenerating,
    isAiPicked = false,
    onRegenerate,
    onSelect,
  } = props;
  return (
    <div
      className={cn(
        'group relative flex h-full flex-col rounded-3xl border bg-card p-5 shadow-sm transition hover:border-primary-purple/40 hover:shadow-md',
        isAiPicked
          ? 'border-primary-purple ring-2 ring-primary-purple/20'
          : 'border-border',
        isRegenerating && 'opacity-70'
      )}
    >
      {isAiPicked ? (
        <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full bg-primary-purple px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
          <Sparkles className="h-3 w-3" />
          AI picked for you
        </span>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-foreground line-clamp-2">
            {suggestion.theme}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground line-clamp-3">
            {suggestion.description}
          </p>
        </div>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={anyRegenerating}
          aria-label="Regenerate this campaign"
          title="Regenerate this campaign"
          className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-primary-purple/40 hover:bg-primary-purple/10 hover:text-primary-purple disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCcw
            className={cn('h-4 w-4', isRegenerating && 'animate-spin')}
          />
        </button>
      </div>

      {suggestion.goal && (
        <p className="mt-3 inline-flex w-fit max-w-full items-center gap-1 rounded-full bg-primary-purple/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-purple line-clamp-1">
          Goal: {suggestion.goal}
        </p>
      )}

      <ul className="mt-4 space-y-2 flex-1">
        {suggestion.days.slice(0, 4).map((day) => (
          <li
            key={day.dayNumber}
            className="flex items-start gap-2 text-xs text-muted-foreground"
          >
            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-foreground">
              {day.dayNumber}
            </span>
            <span className="line-clamp-2">
              <span className="font-semibold text-foreground">{day.title}</span>{' '}
              <span className="text-muted-foreground">— {day.reference}</span>
            </span>
          </li>
        ))}
        {suggestion.days.length > 4 && (
          <li className="text-[11px] italic text-muted-foreground/70">
            +{suggestion.days.length - 4} more day(s)
          </li>
        )}
      </ul>

      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="text-[11px] text-muted-foreground/70">
          {suggestion.days.length} day{suggestion.days.length === 1 ? '' : 's'}
        </span>
        <button
          type="button"
          onClick={onSelect}
          disabled={anyRegenerating}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary-purple px-3 py-1.5 text-xs font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
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
    <section className="glass-card rounded-3xl border border-border shadow-sm overflow-hidden">
      <div className="p-6 border-b border-border flex items-start justify-between gap-3 bg-card/50">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:bg-accent"
            aria-label="Back to campaign ideas"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-foreground">{theme}</h2>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {description}
            </p>
          </div>
        </div>
        <span className="hidden md:inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Up to {effectiveMaxDays} day{effectiveMaxDays === 1 ? '' : 's'}
        </span>
      </div>
    </section>
  );
}

type DayDraftListProps = {
  days: CampaignDayDraft[];
  dateBounds: CampaignDateBounds;
  dateAnchor: string | null;
  anchoredWindow: { min: string; max: string } | null;
  onUpdate: (dayNumber: number, patch: Partial<CampaignDayDraft>) => void;
  onPickDate: (dayNumber: number, date: string | null) => void;
  onRemove: (dayNumber: number) => void;
};

function DayDraftList(props: DayDraftListProps) {
  const {
    days,
    dateBounds,
    dateAnchor,
    anchoredWindow,
    onUpdate,
    onPickDate,
    onRemove,
  } = props;

  if (days.length === 0) {
    return (
      <section className="glass-card rounded-3xl border border-dashed border-border bg-muted/40 p-8 text-center text-sm text-muted-foreground">
        No days in this campaign. Go back and pick a campaign idea to start.
      </section>
    );
  }

  const firstPickBounds = {
    min: dateBounds.today,
    max: dateBounds.latestAnchorStart,
  };
  const pickerBounds = anchoredWindow ?? firstPickBounds;
  const windowHint = anchoredWindow
    ? `${formatDisplayDate(anchoredWindow.min)} – ${formatDisplayDate(anchoredWindow.max)}`
    : `Pick a start date (${formatDisplayDate(firstPickBounds.min)} – ${formatDisplayDate(firstPickBounds.max)}) to open a ${MAX_CAMPAIGN_DAYS}-day window`;

  return (
    <section className="glass-card rounded-3xl border border-border shadow-sm overflow-hidden">
      <div className="p-6 border-b border-border flex items-center gap-3 bg-card/50">
        <div className="p-2 bg-primary-purple/10 rounded-lg text-primary-purple">
          <CalendarDays className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-foreground">
            2. Pick dates &amp; tweak briefs
          </h2>
          <p className="text-xs text-muted-foreground">
            Your first date sets a {MAX_CAMPAIGN_DAYS}-day window. All posts
            must fall inside that range before your plan ends.{' '}
            <span className="font-medium text-muted-foreground">{windowHint}</span>
          </p>
        </div>
      </div>

      <ul className="divide-y divide-border">
        {days.map((day) => {
          const isAnchorCell = dateAnchor != null && day.date === dateAnchor;
          return (
            <li key={day.dayNumber} className="p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="shrink-0 flex flex-row sm:flex-col items-center sm:items-start gap-3 sm:w-32">
                  <div className="rounded-2xl bg-gradient-action text-white px-3 py-2 text-center shadow-sm shadow-primary-purple/25">
                    <p className="text-[10px] uppercase tracking-wider font-semibold opacity-80">
                      Day
                    </p>
                    <p className="text-xl font-black leading-none">
                      {day.dayNumber}
                    </p>
                  </div>
                  <label className="flex-1 sm:flex-none sm:mt-2 w-full">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Date
                    </span>
                    <input
                      type="date"
                      value={day.date ?? ''}
                      min={pickerBounds.min}
                      max={pickerBounds.max}
                      onChange={(e) => {
                        const next = e.target.value || null;
                        onPickDate(day.dayNumber, next);
                      }}
                      className="w-full rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-medium text-foreground focus:border-primary-purple focus:ring-1 focus:ring-primary-purple outline-none"
                    />
                  </label>
                  {days.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => onRemove(day.dayNumber)}
                      title="Remove this day"
                      className="inline-flex items-center justify-center rounded-lg border border-border bg-card p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>

                <div className="flex-1 space-y-2">
                  <label className="block">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
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
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
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
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Caption seed
                      <span className="ml-1 text-muted-foreground/70 normal-case font-normal tracking-normal">
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
// Schedule overview — dated days in chronological order (not split by calendar
// week, so a Wed→Tue campaign stays one continuous timeline)
// =============================================================================

function formatScheduleSpanLabel(dates: string[]): string {
  if (dates.length === 0) return '';
  const sorted = [...dates].sort();
  const first = parseISO(sorted[0]);
  const last = parseISO(sorted[sorted.length - 1]);
  const sameMonth = first.getMonth() === last.getMonth();
  if (sorted.length === 1) {
    return format(first, 'EEE, MMM d');
  }
  if (sameMonth) {
    return `${format(first, 'EEE, MMM d')} – ${format(last, 'EEE, MMM d')}`;
  }
  return `${format(first, 'EEE, MMM d')} – ${format(last, 'EEE, MMM d')}`;
}

type CampaignWeeksOverviewProps = {
  days: CampaignDayDraft[];
  dateAnchor: string | null;
  anchoredWindow: { min: string; max: string } | null;
};

function CampaignWeeksOverview({
  days,
  dateAnchor,
  anchoredWindow,
}: CampaignWeeksOverviewProps) {
  const datedDays = useMemo(
    () =>
      [...days]
        .filter((d): d is CampaignDayDraft & { date: string } => !!d.date)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [days]
  );

  if (datedDays.length === 0) return null;

  const spanLabel = anchoredWindow
    ? `${formatDisplayDate(anchoredWindow.min)} – ${formatDisplayDate(anchoredWindow.max)}`
    : formatScheduleSpanLabel(datedDays.map((d) => d.date));

  return (
    <section className="glass-card rounded-3xl border border-border shadow-sm overflow-hidden">
      <div className="p-6 border-b border-border flex items-center gap-3 bg-card/50">
        <div className="p-2 bg-primary-purple/10 rounded-lg text-primary-purple">
          <CalendarRange className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-foreground">
            Schedule overview
          </h2>
          <p className="text-xs text-muted-foreground">
            {dateAnchor
              ? `${MAX_CAMPAIGN_DAYS}-day window · ${spanLabel}`
              : spanLabel}
          </p>
        </div>
        <span className="hidden sm:inline-flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {datedDays.length} / {days.length} day
          {days.length === 1 ? '' : 's'}
        </span>
      </div>
      <ul className="p-5 space-y-2">
        {datedDays.map((day) => (
          <li
            key={day.dayNumber}
            className="flex items-start gap-3 rounded-xl bg-muted/50 px-3 py-2"
          >
            <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-purple text-[11px] font-bold text-white">
              {day.dayNumber}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground truncate">
                {day.title || `Day ${day.dayNumber}`}
              </p>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {format(parseISO(day.date), 'EEE, MMM d')}
              </p>
              {day.reference && (
                <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                  {day.reference}
                </p>
              )}
            </div>
          </li>
        ))}
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
    totalCost,
    userCredits,
    insufficientCredits,
    onCreate,
    onViewDrafts,
  } = props;

  return (
    <aside className="lg:sticky lg:top-4 self-start">
      <section
        id="tour-campaign-confirm"
        className="glass-card rounded-3xl p-6 border border-primary-purple/20 bg-primary-purple/5 shadow-sm"
      >
        <h2 className="text-lg font-bold text-foreground mb-6">
          3. Confirm &amp; create
        </h2>

        <div className="space-y-4 text-sm mb-6">
          <div className="space-y-2">
            <span className="font-medium text-muted-foreground">Post platforms:</span>
            {!hasSelectablePlatforms ? (
              <div
                role="status"
                className="rounded-xl border border-amber-500/30 bg-amber-500/15 px-4 py-3 text-sm text-amber-200"
              >
                <p className="font-medium">Select your accounts first</p>
                <p className="mt-1 text-amber-300/90">
                  Choose which platforms you use in onboarding or social
                  settings, then come back to launch the campaign.
                </p>
                <Link
                  href={WORKSPACE_NAV_HREFS.linkedProfiles}
                  className="mt-2 inline-block text-sm font-semibold text-amber-200 underline underline-offset-2 hover:text-amber-300"
                >
                  {workspacePageTitle(WORKSPACE_NAV_HREFS.linkedProfiles)}
                </Link>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-4">
                  {allowedPlatforms.map((p) => (
                    <label
                      key={p}
                      htmlFor={`campaign-platform-${p}`}
                      className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground"
                    >
                      <input
                        id={`campaign-platform-${p}`}
                        type="checkbox"
                        checked={genPlatforms.includes(p)}
                        onChange={() => onTogglePlatform(p)}
                        className="size-4 rounded border-border text-primary-purple focus:ring-primary-purple/30"
                      />
                      <span>{platformLabel(p)}</span>
                    </label>
                  ))}
                  {allowedPlatforms.length > 1 && (
                    <label
                      htmlFor="campaign-platform-all"
                      className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground"
                    >
                      <input
                        id="campaign-platform-all"
                        type="checkbox"
                        checked={allPlatformsSelected}
                        onChange={onSelectAllPlatforms}
                        className="size-4 rounded border-border text-primary-purple focus:ring-primary-purple/30"
                      />
                      <span>
                        {allPlatformsSelectionLabel(allowedPlatforms.length)}
                      </span>
                    </label>
                  )}
                </div>
                {!platformSelection.ok && (
                  <p className="text-xs text-amber-300">
                    {platformSelection.error}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="flex justify-between items-center text-muted-foreground">
            <span className="font-medium">Days planned:</span>
            <span className="font-bold text-foreground">
              {datedDays} / {totalDays || '—'}
            </span>
          </div>
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="font-medium">Cost per day:</span>
            <span className="font-bold text-foreground">
              {CAMPAIGN_CREDIT_PER_DAY} × {Math.max(genPlatforms.length, 1)}{' '}
              ={' '}
              {CAMPAIGN_CREDIT_PER_DAY * Math.max(genPlatforms.length, 1)}{' '}
              credits
            </span>
          </div>
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="font-medium">Credits to charge:</span>
            <span
              className={cn(
                'font-extrabold',
                insufficientCredits ? 'text-destructive' : 'text-primary-purple'
              )}
            >
              {totalCost}
            </span>
          </div>
          {insufficientCredits && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
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
          aria-busy={isSubmitting}
          className="w-full rounded-xl bg-gradient-action px-4 py-3.5 text-sm font-bold text-white shadow-md shadow-primary-purple/25 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary-purple/35 active:scale-[0.98] disabled:transform-none disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
        >
          {isSubmitting ? 'Writing your campaign…' : 'Create campaign'}
        </button>

        <button
          type="button"
          onClick={onViewDrafts}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-accent"
        >
          <Inbox className="h-4 w-4" />
          View drafts
        </button>

        {isSubmitting && (
          <p className="mt-4 text-xs font-medium text-primary-purple">
            Generating drafts…
          </p>
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
  /** True while campaign create or draft regen is in flight. */
  isCampaignJobRunning: boolean;
};

function DraftsDrawer(props: DraftsDrawerProps) {
  const {
    open,
    onOpenChange,
    registerRefresh,
    dateWindow,
    formattedToday,
    isCampaignJobRunning,
  } = props;
  const [drafts, setDrafts] = useState<CampaignDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'draft' | 'scheduled' | 'all'>('draft');
  // Holds the id of the draft currently being regenerated so we can show a
  // per-row spinner. Set when the user clicks Regenerate, cleared once the
  // refresh after the job completes brings back the updated draft data
  // (or immediately if the API call itself rejects).
  const [regeneratingDraftId, setRegeneratingDraftId] = useState<
    string | null
  >(null);
  const [removingDraftId, setRemovingDraftId] = useState<string | null>(null);
  const preview = useImagePreview();
  const { billing } = useUserPlanCredits();

  useEffect(() => {
    if (!open) preview.close();
  }, [open, preview.close]);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const statusParam =
        filter === 'scheduled'
          ? 'scheduled'
          : filter === 'all'
            ? undefined
            : 'draft';
      const list = await listCampaignDraftsApi({
        status: statusParam,
        limit: 50,
      });
      // Draft tab includes both manual and AI-seeded drafts (autoSeeded).
      setDrafts(list);
      // Refreshed data is the authoritative source for "is this draft
      // still being regenerated?". Once the new image/regenerationCount
      // is in `list`, the spinner can go away.
      setRegeneratingDraftId(null);
    } catch {
      showErrorToast('Could not load drafts.');
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

  // Bucket drafts into one box per campaign run (shared parentJobId).
  // The "all" tab skips grouping and shows a flat grid instead.
  const campaignBoxes = useMemo(
    () => groupDraftsByCampaign(drafts),
    [drafts]
  );

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
        const uid = auth.currentUser?.uid;
        if (uid && response.parentJobId) {
          const wait = await waitForCampaignDraftRegen({
            uid,
            draftId,
            regenJobId: response.parentJobId,
          });
          if (wait.outcome === 'generated') toast.success('Generated');
          else showErrorToast('Regeneration failed. Please try again later.');
        } else {
          showErrorToast('Regeneration failed. Please try again later.');
        }
        await refresh();
        setRegeneratingDraftId(null);
      } catch {
        // Roll back the spinner so the user can retry; the toast already
        // tells them what went wrong.
        setRegeneratingDraftId(null);
        showErrorToast('Regeneration failed. Please try again later.');
      }
    },
    [isCampaignJobRunning, regeneratingDraftId, refresh]
  );

  const handleRemoveDraft = useCallback(
    async (draftId: string) => {
      if (removingDraftId) return;
      try {
        setRemovingDraftId(draftId);
        await deleteCampaignDraftApi({ draftId });
        toast.success('Marked as removed');
        await refresh();
      } catch {
        showErrorToast('Could not remove this draft. Please try again later.');
      } finally {
        setRemovingDraftId(null);
      }
    },
    [removingDraftId, refresh]
  );

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next && isImagePreviewOverlayMounted()) return;
          onOpenChange(next);
        }}
      >
      <SheetContent
        side="right"
        // Wide, rectangular drawer — caps at 1400px so the 3-column draft
        // grid below has ~420px per card (plenty for image + controls)
        // while never quite covering the underlying campaign editor on
        // ultra-wide displays. Falls back to 95vw on smaller laptops so
        // the user always gets the full grid experience.
        className="w-full sm:!max-w-[min(95vw,1400px)] flex flex-col gap-0 p-0 bg-card border-border/50"
        onPointerDownOutside={preventSheetDismissForImagePreview}
        onInteractOutside={preventSheetDismissForImagePreview}
        onFocusOutside={preventSheetDismissForImagePreview}
        onEscapeKeyDown={(e) => {
          if (isImagePreviewOverlayMounted()) {
            e.preventDefault();
          }
        }}
      >
        <SheetHeader className="border-b border-border px-6 py-5">
          <SheetTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Inbox className="h-5 w-5 text-primary" />
            Campaign drafts
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Drafts are generated but not yet posted. AI-seeded campaigns show
            an AI generated badge. Pick a date &amp; time to push one onto your
            schedule.
          </SheetDescription>
        </SheetHeader>

        <div className="border-b border-border px-6 py-3 flex items-center justify-between gap-3">
          <div className="inline-flex flex-wrap rounded-full border border-border bg-muted p-1 text-xs font-semibold">
            {(
              [
                { value: 'draft', label: 'Draft' },
                { value: 'scheduled', label: 'Scheduled' },
                { value: 'all', label: 'All' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setFilter(tab.value)}
                className={cn(
                  'rounded-full px-3 py-1 transition',
                  filter === tab.value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-60"
          >
            <RefreshCcw
              className={cn('h-3.5 w-3.5', loading && 'animate-spin')}
            />
            Refresh
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {loading && drafts.length === 0 && (
            <>
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-28 w-full rounded-2xl" />
            </>
          )}
          {!loading && drafts.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
              {filter === 'all'
                ? 'No drafts yet.'
                : `No ${filter} drafts yet.`}
              {filter === 'draft' &&
                ' Generate a campaign and the renders will land here.'}
            </div>
          )}
          {filter === 'all' ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {drafts.map((draft) => (
                <DraftRow
                  key={draft.draftId}
                  draft={draft}
                  dateWindow={dateWindow}
                  formattedToday={formattedToday}
                  defaultScheduleTime={preferredScheduleTimeForPlatform(
                    draft.platform,
                    billing?.preferences
                  )}
                  onScheduled={handleScheduled}
                  onRegenerate={handleRegenerate}
                  onRemove={handleRemoveDraft}
                  isRegenerating={regeneratingDraftId === draft.draftId}
                  isRemoving={removingDraftId === draft.draftId}
                  isAnyRegenInFlight={
                    regeneratingDraftId != null || isCampaignJobRunning
                  }
                  isPreviewOpen={preview.isOpen}
                  onOpenPreview={preview.open}
                />
              ))}
            </div>
          ) : (
            campaignBoxes.map((box) => (
              <article
                key={box.key}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
              >
                <header className="flex items-start justify-between gap-3 border-b border-border bg-muted/50 px-4 py-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary">
                        <CalendarRange className="h-3.5 w-3.5 shrink-0" />
                        {box.weekLabel}
                      </span>
                      {box.items.some((d) => d.autoSeeded === true) ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-primary-purple/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-purple">
                          <Sparkles className="h-3 w-3" />
                          AI generated
                        </span>
                      ) : null}
                    </div>
                    <p className="truncate text-sm font-semibold text-foreground">
                      {box.theme}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
                    {box.items.length} post
                    {box.items.length === 1 ? '' : 's'}
                  </span>
                </header>
                <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
                  {box.items.map((draft) => (
                    <DraftRow
                      key={draft.draftId}
                      draft={draft}
                      dateWindow={dateWindow}
                      formattedToday={formattedToday}
                      defaultScheduleTime={preferredScheduleTimeForPlatform(
                        draft.platform,
                        billing?.preferences
                      )}
                      onScheduled={handleScheduled}
                      onRegenerate={handleRegenerate}
                      onRemove={handleRemoveDraft}
                      isRegenerating={regeneratingDraftId === draft.draftId}
                      isRemoving={removingDraftId === draft.draftId}
                      isAnyRegenInFlight={
                        regeneratingDraftId != null || isCampaignJobRunning
                      }
                      isPreviewOpen={preview.isOpen}
                      onOpenPreview={preview.open}
                    />
                  ))}
                </div>
              </article>
            ))
          )}
        </div>
        {preview.isOpen && (
          <ImagePreviewOverlay
            src={preview.previewUrl}
            alt={preview.previewAlt}
            onClose={preview.close}
            portalled={false}
          />
        )}
      </SheetContent>
    </Sheet>
    </>
  );
}

type DraftRowProps = {
  draft: CampaignDraft;
  dateWindow: string[];
  formattedToday: string;
  /** Preferred or analytics-optimal HH:mm for this draft's platform. */
  defaultScheduleTime: string;
  onScheduled: () => void;
  onRegenerate: (draftId: string) => void;
  onRemove: (draftId: string) => void;
  isRegenerating: boolean;
  isRemoving: boolean;
  isAnyRegenInFlight: boolean;
  isPreviewOpen: boolean;
  onOpenPreview: (url: string, alt?: string) => void;
};

const HOURS_24 = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, '0')
);
const MINUTES_60 = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, '0')
);

function splitHhMm(value: string): { hour: string; minute: string } {
  const [h = '09', m = '00'] = value.split(':');
  return {
    hour: HOURS_24.includes(h) ? h : '09',
    minute: MINUTES_60.includes(m) ? m : '00',
  };
}

function DraftRow(props: DraftRowProps) {
  const {
    draft,
    dateWindow,
    formattedToday,
    defaultScheduleTime,
    onScheduled,
    onRegenerate,
    onRemove,
    isRegenerating,
    isRemoving,
    isAnyRegenInFlight,
    isPreviewOpen,
    onOpenPreview,
  } = props;
  const fmtTimestamp = useTimestampFormatter();
  const isScheduled = draft.status === 'scheduled';
  const isUserRemoved = draft.userRemoved === true;
  const isAiGenerated = draft.autoSeeded === true;
  const targetDate = draft.targetDate || dateWindow[0] || formattedToday;
  const isPastDate = Boolean(
    draft.targetDate && draft.targetDate < formattedToday
  );
  const date = targetDate;
  // Default to the user's preferred / analytics-optimal time for this platform.
  const [time, setTime] = useState<string>(defaultScheduleTime);
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => {
    setTime(defaultScheduleTime);
  }, [defaultScheduleTime, draft.draftId]);

  // First regen is free; everything after costs CAMPAIGN_REGENERATE_CREDIT.
  // Surface this in the button label so the user knows exactly what they're
  // about to spend BEFORE they click.
  const regenCost = nextRegenerationCost(draft.regenerationCount ?? 0);
  const canRegen =
    canRegenerateDraft(draft.regenerationCount ?? 0) &&
    !isPastDate &&
    !isUserRemoved;

  const scheduledAtDate = isScheduled ? unknownTsToDate(draft.scheduledAt) : null;
  const { hour: timeHour, minute: timeMinute } = splitHhMm(time);

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
    } catch {
      showErrorToast('Could not schedule this draft. Please try again later.');
    } finally {
      setScheduling(false);
    }
  }, [date, draft.draftId, onScheduled, scheduling, time]);

  const previewAlt =
    draft.eventName || draft.campaignTheme || 'Campaign draft';

  const openPreview = useCallback(() => {
    if (!draft.imageUrl || isPreviewOpen) return;
    onOpenPreview(draft.imageUrl, previewAlt);
  }, [draft.imageUrl, isPreviewOpen, onOpenPreview, previewAlt]);

  const cardImage = (
    <div
      className={cn(
        'group relative aspect-square w-full overflow-hidden bg-muted',
        draft.imageUrl && 'cursor-zoom-in'
      )}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        openPreview();
      }}
    >
      {draft.imageUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={draft.imageUrl}
          alt={previewAlt}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <ImageIcon className="h-10 w-10" />
        </div>
      )}
      <div className="absolute top-2 left-2 flex flex-wrap gap-1">
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm',
            isScheduled
              ? 'bg-emerald-500/20 text-emerald-300'
              : isUserRemoved
                ? 'bg-slate-500/20 text-slate-200'
                : 'bg-card/90 text-foreground ring-1 ring-border'
          )}
        >
          {isScheduled ? 'scheduled' : isUserRemoved ? 'removed' : 'draft'}
        </span>
        {isAiGenerated ? (
          <span className="inline-flex items-center gap-1 shrink-0 rounded-full bg-violet-600/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
            <Sparkles className="h-2.5 w-2.5" />
            AI generated
          </span>
        ) : null}
      </div>
      {draft.imageUrl && (
        <ImagePreviewButton
          variant="overlay-icon"
          stopPropagation
          ariaLabel="Open full-size preview"
          label="Preview"
          onClick={openPreview}
          className="absolute bottom-2 right-2 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        />
      )}
    </div>
  );

  return (
    <div
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-md',
        isUserRemoved && 'opacity-80'
      )}
    >
      {cardImage}

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground line-clamp-2 leading-snug">
            {draft.eventName || draft.campaignTheme || 'Untitled day'}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground capitalize">
            {draft.platform || 'unknown'} ·{' '}
            {formatDisplayDate(draft.targetDate)}
            {draft.campaignTheme &&
            draft.campaignTheme !== draft.eventName
              ? ` · ${draft.campaignTheme}`
              : ''}
          </p>
        </div>

        {draft.message && (
          <p className="text-[11px] text-muted-foreground line-clamp-3">
            {draft.message}
          </p>
        )}

        {isUserRemoved ? (
          <div className="mt-auto rounded-xl border border-border bg-muted px-3 py-3 text-center">
            <p className="text-sm font-bold text-foreground">Removed by you</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              This draft stays in your campaign history and will not be
              scheduled.
            </p>
          </div>
        ) : isScheduled ? (
          <div className="mt-auto space-y-3">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold text-emerald-300">
              <p className="inline-flex items-center gap-1">
                <CalendarCheck2 className="h-3.5 w-3.5" />
                {scheduledAtDate
                  ? `Will publish ${fmtTimestamp(scheduledAtDate, { style: 'datetime' })}`
                  : 'Scheduled'}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-auto space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>
                  Date
                  <span className="ml-1 normal-case text-muted-foreground/70">
                    (locked)
                  </span>
                </span>
                {/* Date is always locked (set at generation). Time is locked
                     only for AI-seeded campaigns; manual drafts can pick a time. */}
                <input
                  type="date"
                  value={date}
                  disabled
                  readOnly
                  aria-readonly="true"
                  className="mt-1 w-full rounded-lg border border-border bg-muted px-2 py-1.5 text-xs font-medium text-muted-foreground cursor-not-allowed"
                />
              </label>
              <div
                className="flex flex-col text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                role="group"
                aria-label={
                  isAiGenerated
                    ? 'Time (24-hour, locked for AI campaigns)'
                    : 'Time (24-hour)'
                }
              >
                <span>
                  Time (24h)
                  {isAiGenerated ? (
                    <span className="ml-1 normal-case text-muted-foreground/70">
                      (locked)
                    </span>
                  ) : null}
                </span>
                <div className="mt-1 flex items-center gap-1">
                  <Select
                    value={timeHour}
                    onValueChange={(h) => setTime(`${h}:${timeMinute}`)}
                    disabled={isAiGenerated}
                  >
                    <SelectTrigger
                      className={cn(
                        'h-8 flex-1 px-2 text-xs tabular-nums',
                        isAiGenerated && 'cursor-not-allowed opacity-70'
                      )}
                      aria-label="Hour (00–23)"
                    >
                      <SelectValue placeholder="HH" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {HOURS_24.map((h) => (
                        <SelectItem
                          key={h}
                          value={h}
                          className="tabular-nums text-xs"
                        >
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span aria-hidden className="select-none text-muted-foreground">
                    :
                  </span>
                  <Select
                    value={timeMinute}
                    onValueChange={(m) => setTime(`${timeHour}:${m}`)}
                    disabled={isAiGenerated}
                  >
                    <SelectTrigger
                      className={cn(
                        'h-8 flex-1 px-2 text-xs tabular-nums',
                        isAiGenerated && 'cursor-not-allowed opacity-70'
                      )}
                      aria-label="Minute (00–59)"
                    >
                      <SelectValue placeholder="MM" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {MINUTES_60.map((m) => (
                        <SelectItem
                          key={m}
                          value={m}
                          className="tabular-nums text-xs"
                        >
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSchedule}
              disabled={scheduling || isRegenerating || isRemoving}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-action px-3 py-2 text-xs font-bold text-white shadow-sm shadow-primary-purple/25 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {scheduling ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CalendarPlus className="h-3.5 w-3.5" />
              )}
              Schedule
            </button>

            <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
              <span className="text-[10px] text-muted-foreground line-clamp-2 flex-1">
                {isPastDate
                  ? 'Past date · regeneration unavailable'
                  : !canRegen
                    ? `Regenerated ${draft.regenerationCount ?? 0}× · no more regens`
                    : draft.regenerationCount > 0
                      ? `Regenerated ${draft.regenerationCount}× · next ${regenCost === 0 ? 'free' : `${regenCost} credit${regenCost === 1 ? '' : 's'}`}`
                      : 'First regen is free'}
              </span>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onRemove(draft.draftId)}
                  disabled={
                    isAnyRegenInFlight || scheduling || isRemoving || isRegenerating
                  }
                  title="Remove this draft"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isRemoving ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                  Remove
                </button>
                {canRegen ? (
                  <button
                    type="button"
                    onClick={() => onRegenerate(draft.draftId)}
                    disabled={isAnyRegenInFlight || scheduling || isRemoving}
                    title={
                      regenCost === 0
                        ? 'Re-render this draft (free)'
                        : `Re-render this draft (${regenCost} credits)`
                    }
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition',
                      regenCost === 0
                        ? 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/15'
                        : 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/15',
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
                        ? 'Regenerate Free'
                        : `${regenCost} cr`}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
