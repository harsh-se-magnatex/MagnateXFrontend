import axiosClient from '@/lib/axios';
import type { ActivePlatformJob } from '@/src/types/job';

/** Hard cap on how many days a single campaign can plan. Mirrors the
 *  backend constant so the two layers can never drift. */
export const MAX_CAMPAIGN_DAYS = 7;
/** Default suggestion-set size when the page first loads. */
export const DEFAULT_CAMPAIGN_SET_SIZE = 5;
/** Credit cost per (day × platform) — mirrors backend
 *  `CAMPAIGN_CREDIT_PER_DAY`. Update both in lockstep. */
export const CAMPAIGN_CREDIT_PER_DAY = 3;
/** Credit cost per regeneration AFTER the user's free first regen.
 *  Mirrors backend `CAMPAIGN_REGENERATE_CREDIT`. Update both in lockstep.
 *  `regenerationCount === 0` is always free; every regen after that is
 *  exactly this many credits. */
export const CAMPAIGN_REGENERATE_CREDIT = 3;

export type CampaignDayPlan = {
  dayNumber: number;
  title: string;
  reference: string;
  caption?: string;
};

export type CampaignSuggestion = {
  id: string;
  theme: string;
  description: string;
  goal?: string;
  generatedAt: string;
  days: CampaignDayPlan[];
};

export type CampaignSuggestionSet = {
  suggestions: CampaignSuggestion[];
  /** Server-clamped max days for THIS user (capped by plan window). When
   *  null, the saved set predates this field — treat as MAX_CAMPAIGN_DAYS. */
  maxDays: number | null;
  /** Goal the set was generated against. Null when the user did not supply
   *  one. */
  goal: string | null;
};

// -----------------------------------------------------------------------------
// Suggestion lifecycle
// -----------------------------------------------------------------------------

/**
 * Generate a fresh set of N campaign suggestions. The backend clamps `count`
 * to `[1..5]` and sizes `maxDays` to the user's remaining plan window.
 */
export async function suggestCampaignSetApi(params: {
  goal?: string;
  count?: number;
}): Promise<CampaignSuggestionSet> {
  const response = await axiosClient.post<{
    success: boolean;
    data: CampaignSuggestionSet;
    message?: string;
  }>('/api/v1/campaign/suggest-set', {
    goal: params.goal?.trim() || undefined,
    count: params.count,
  });
  return response.data.data;
}

/**
 * Fetch the user's currently-saved suggestion set. Returns an empty
 * `{ suggestions: [] }` envelope when there's nothing saved yet.
 */
export async function getCampaignSuggestionsApi(): Promise<CampaignSuggestionSet> {
  const response = await axiosClient.get<{
    success: boolean;
    data: CampaignSuggestionSet;
    message?: string;
  }>('/api/v1/campaign/suggestions');
  return response.data.data;
}

/**
 * Regenerate ONE card in the saved suggestion set. Returns the replacement
 * suggestion (same `id` as the one it replaced, fresh `generatedAt`).
 */
export async function regenerateCampaignApi(
  suggestionId: string
): Promise<CampaignSuggestion> {
  const response = await axiosClient.post<{
    success: boolean;
    data: { suggestion: CampaignSuggestion };
    message?: string;
  }>('/api/v1/campaign/regenerate', { suggestionId });
  return response.data.data.suggestion;
}

// -----------------------------------------------------------------------------
// Create / draft lifecycle
// -----------------------------------------------------------------------------

export type CreateCampaignDayInput = {
  /** YYYY-MM-DD in the caller's timezone — server validates against the
   *  user's account timezone before enqueueing. */
  date: string;
  title: string;
  reference: string;
  caption?: string;
  dayNumber?: number;
};

export type CreateCampaignParams = {
  theme: string;
  description?: string;
  goal?: string;
  days: CreateCampaignDayInput[];
  /** Optional explicit platform list. When omitted the server uses the
   *  caller's `selected` accounts (same default as festive-post). */
  platforms?: string[];
  /** Optional reference to the saved suggestion that seeded this campaign —
   *  helps server-side analytics tie drafts back to a card. */
  suggestionId?: string;
};

/** 202 envelope returned by `POST /api/v1/campaign/create`. */
export type CreateCampaignResponse = {
  parentJobId: string;
  jobs: ActivePlatformJob[];
  dayCount: number;
  platforms: string[];
  /** Total credits charged when every (day × platform) succeeds. */
  requiredCredits: number;
};

export async function createCampaignApi(
  params: CreateCampaignParams
): Promise<CreateCampaignResponse> {
  const response = await axiosClient.post<{
    success: boolean;
    data: CreateCampaignResponse;
    message?: string;
  }>('/api/v1/campaign/create', {
    theme: params.theme,
    description: params.description,
    goal: params.goal,
    days: params.days,
    platforms: params.platforms,
    suggestionId: params.suggestionId,
  });
  return response.data.data;
}

// -----------------------------------------------------------------------------
// Drafts
// -----------------------------------------------------------------------------

/** Firestore-typed shape returned from `GET /campaign/drafts`. */
export type CampaignDraft = {
  draftId: string;
  status: 'draft' | 'scheduled' | string;
  platform: string | null;
  message: string | null;
  imageUrl: string | null;
  imageFilePath: string | null;
  /** YYYY-MM-DD the campaign generator was targeting for this day. */
  targetDate: string | null;
  eventName: string | null;
  campaignTheme: string | null;
  campaignGoal: string | null;
  /** Number of times this draft has been successfully regenerated.
   *  `0` => the next regen is FREE; anything `>= 1` => 3 credits. */
  regenerationCount: number;
  scheduledPostId: string | null;
  /** Firestore timestamp objects come back as `{ _seconds, _nanoseconds }`.
   *  Kept loosely-typed so the UI can format defensively. */
  scheduledAt: unknown;
  createdAt: unknown;
};

export async function listCampaignDraftsApi(params?: {
  status?: 'draft' | 'scheduled';
  limit?: number;
}): Promise<CampaignDraft[]> {
  const response = await axiosClient.get<{
    success: boolean;
    data: { drafts: CampaignDraft[] };
    message?: string;
  }>('/api/v1/campaign/drafts', {
    params: {
      status: params?.status,
      limit: params?.limit,
    },
  });
  return response.data.data.drafts;
}

export type ScheduleCampaignDraftResponse = {
  draftId: string;
  scheduledPostId: string;
  scheduledAt: string;
};

export async function scheduleCampaignDraftApi(params: {
  draftId: string;
  /** ISO-8601 string. Server treats `<now` as an error. */
  scheduleAt: string;
}): Promise<ScheduleCampaignDraftResponse> {
  const response = await axiosClient.post<{
    success: boolean;
    data: ScheduleCampaignDraftResponse;
    message?: string;
  }>(`/api/v1/campaign/drafts/${encodeURIComponent(params.draftId)}/schedule`, {
    scheduleAt: params.scheduleAt,
  });
  return response.data.data;
}

export type RegenerateCampaignDraftResponse = {
  parentJobId: string;
  jobs: Array<{
    jobId: string;
    platform: 'instagram' | 'facebook' | 'linkedin';
  }>;
  draftId: string;
  /** Exact credit amount the worker will deduct on success. `0` for the
   *  user's free first regen. */
  chargeCredits: number;
  /** `regenerationCount` BEFORE this run — UI shows it for transparency. */
  regenerationCountBefore: number;
};

/**
 * Kick off a single-draft regeneration. The server queues a `campaign-post`
 * job that overwrites the draft in place; the existing `useFeatureJob`
 * progress hook on the page picks the run up automatically.
 *
 * Pricing: free for the first regen of any given draft, then 3 credits
 * for every regen after that. The exact charge for THIS attempt is in
 * `chargeCredits` on the response.
 */
export async function regenerateCampaignDraftApi(params: {
  draftId: string;
}): Promise<RegenerateCampaignDraftResponse> {
  const response = await axiosClient.post<{
    success: boolean;
    data: RegenerateCampaignDraftResponse;
    message?: string;
  }>(
    `/api/v1/campaign/drafts/${encodeURIComponent(params.draftId)}/regenerate`,
    {}
  );
  return response.data.data;
}

/**
 * Convenience helper: the dollar-cost of the NEXT regen for a draft. Free
 * on the first attempt (`regenerationCount === 0`), `CAMPAIGN_REGENERATE_CREDIT`
 * thereafter. Kept here so the UI never hard-codes the cost branching.
 */
export function nextRegenerationCost(regenerationCount: number): number {
  return regenerationCount > 0 ? CAMPAIGN_REGENERATE_CREDIT : 0;
}
