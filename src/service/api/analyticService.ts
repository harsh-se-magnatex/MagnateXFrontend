import { apiGet, apiPost } from '@/lib/api-client';
import type { ApiEnvelope } from '@/lib/api-types';

export type AnalyticsStructuredSections = {
  automatedInsights: {
    bestPerforming: string;
    optimalPosting: string;
    audienceEngagement: string;
    contentRecommendations: string;
  };
  predictiveAnalytics: {
    expectedReachNewPost: string;
    viralProbability: string;
    audienceBehaviorTrends: string;
  };
  viralContent: {
    rapidEngagement: string;
    highShareVelocity: string;
    increasingCommentRate: string;
    exampleAlert: string;
  };
  anomalyDetection: {
    items: string[];
  };
  sentimentComments: {
    positivePercent: number | null;
    neutralPercent: number | null;
    negativePercent: number | null;
    narrative: string;
  };
};

export type AnalyticsRecommendationPayload = {
  layout?: 'bullet' | 'structured';
  bullets?: string[];
  structured?: AnalyticsStructuredSections;
  source: 'openai' | 'fallback';
};

/**
 * Mini-report style "verdict" rendered above the metric tiles. Replaces the
 * old AI Recommendations card with a graded performance table, ordered
 * priorities, and a short "what's working" list — all driven by the last
 * 3 weeks of analytics.
 */
export type WeeklyVerdictBreakdownItem = {
  area: string;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  score: number;
  reading: string;
};

export type WeeklyVerdictPriorityItem = {
  headline: string;
  detail: string;
};

export type WeeklyVerdictPayload = {
  verdict: string;
  breakdown: WeeklyVerdictBreakdownItem[];
  pullingDown: WeeklyVerdictPriorityItem[];
  working: string[];
};

export type WeeklyVerdictResponse = {
  layout: 'verdict';
  verdict: WeeklyVerdictPayload;
  source: 'openai' | 'fallback';
};

export const syncInsights = async () => {
  return apiPost<ApiEnvelope<{ synced: true }>>(
    '/api/v1/insights/sync',
    {}
  );
};

export const postAnalyticsRecommendations = async (body: {
  scope: 'page' | 'post';
  platform: 'facebook' | 'instagram' | 'linkedin';
  context: Record<string, unknown>;
  layout?: 'bullet' | 'structured';
}) => {
  return apiPost<ApiEnvelope<AnalyticsRecommendationPayload>>(
    '/api/v1/insights/analytics-recommendations',
    body
  );
};

export const postAnalyticsWeeklyVerdict = async (body: {
  platform: 'facebook' | 'instagram' | 'linkedin';
  context: Record<string, unknown>;
}) => {
  return apiPost<ApiEnvelope<WeeklyVerdictResponse>>(
    '/api/v1/insights/analytics-recommendations',
    { ...body, scope: 'page' as const, layout: 'verdict' as const }
  );
};

export const getInsightsFaceBook = async () => {
  return apiGet<
    ApiEnvelope<{
      pageAnalytics: Record<string, unknown> | null;
      allPosts: unknown[];
      repliedCommentIds?: string[];
      firstCommentSentPostIds?: string[];
    }>
  >('/api/v1/insights/facebook/all');
};

export const getInsightsInstagram = async () => {
  return apiGet<
    ApiEnvelope<{
      igAnalytics: Record<string, unknown> | null;
      allPosts: unknown[];
      repliedCommentIds?: string[];
      firstCommentSentPostIds?: string[];
    }>
  >('/api/v1/insights/instagram/all');
};

export type LinkedInInsightsPayload = {
  liAnalytics: Record<string, unknown> | null;
  allPosts: unknown[];
  repliedCommentIds?: string[];
  firstCommentSentPostIds?: string[];
  linkedinAnalyticsConnected: boolean;
};

export const getInsightsLinkedIn = async () => {
  return apiGet<ApiEnvelope<LinkedInInsightsPayload>>(
    '/api/v1/insights/linkedin/all'
  );
};

/* ─────────────────────────  Growth Studio A2  ─────────────────────────── */

export type WhereToSpendPlatform = 'facebook' | 'instagram' | 'linkedin';
export type WhereToSpendStage =
  | 'empty'
  | 'building'
  | 'growing'
  | 'established';
export type WhereToSpendMode = 'stage0' | 'amplify' | 'none';

export type MetaBoostSettings = {
  kind: 'meta';
  objective: string;
  locations: string[];
  ageRange: { min: number; max: number };
  gender: 'all' | 'male' | 'female';
  interests: string[];
  placement: 'Automatic';
  audienceExpansion: boolean;
};

export type LinkedInBoostSettings = {
  kind: 'linkedin';
  objective: string;
  locations: string[];
  industries: string[];
  jobFunctions: string[];
  seniorities: string[];
  companySize: string[];
  audienceExpansion: boolean;
};

export type BoostSettings = MetaBoostSettings | LinkedInBoostSettings;

export type WhereToSpendCard = {
  stage: WhereToSpendStage;
  followers: number;
  budget: {
    currency: 'INR';
    dailyAmount: number;
    totalAmount: number;
    durationDays: number;
  };
  expectedReach: { low: number; high: number };
  settings: BoostSettings;
  /** 1–2 sentence note from the AI refiner. Null when AI is unavailable. */
  rationale: string | null;
  /** Where the targeting fields came from (interests / industries / locations). */
  targetingSource: 'openai' | 'static';
  postPreview?: {
    postId: string;
    caption: string;
    mediaUrl?: string;
    permalinkUrl?: string;
    engagementRate: number;
    medianEngagementRate: number;
    hoursSincePost: number;
  };
};

export type WhereToSpendPayload = {
  visible: boolean;
  mode: WhereToSpendMode;
  card: WhereToSpendCard | null;
  reason?: string;
};

export const getWhereToSpend = async (platform: WhereToSpendPlatform) => {
  return apiGet<ApiEnvelope<WhereToSpendPayload>>(
    `/api/v1/growth-studio/where-to-spend?platform=${platform}`
  );
};

/* ─────────────────────────  Growth Studio A1  ─────────────────────────── */

export type WhatToPostNextPlatform = WhereToSpendPlatform;

export type PostBriefKind =
  | 'recreate-winner'
  | 'plug-a-gap'
  | 'try-a-new-format';

/**
 * One idea card. `prompt` is intentionally hidden in the UI; it is only
 * forwarded to `/instant-generation` when the user clicks the card's
 * "Generate this post" button.
 */
export type PostBrief = {
  key: PostBriefKind;
  title: string;
  description: string;
  hint: string;
  prompt: string;
};

export type WhatToPostNextPayload = {
  visible: boolean;
  briefs: PostBrief[];
  source: 'openai' | 'fallback';
  reason?: string;
};

export const getWhatToPostNext = async (platform: WhatToPostNextPlatform) => {
  return apiGet<ApiEnvelope<WhatToPostNextPayload>>(
    `/api/v1/growth-studio/what-to-post-next?platform=${platform}`
  );
};

/* ─────────────────────────  Growth Studio B2  ─────────────────────────── */

export type ReplySuggestionPlatform = WhereToSpendPlatform;

export type ReplySuggestionInput = {
  platform: ReplySuggestionPlatform;
  comment: string;
  postMessage?: string;
  pageName?: string;
};

export type ReplySuggestionPayload = {
  suggestion: string;
  source: 'openai' | 'fallback';
};

export const postReplySuggestion = async (body: ReplySuggestionInput) => {
  return apiPost<ApiEnvelope<ReplySuggestionPayload>>(
    '/api/v1/growth-studio/reply-suggestion',
    body
  );
};

export type ReplySendInput = {
  platform: ReplySuggestionPlatform;
  postId: string;
  commentId: string;
  message: string;
};

export type ReplySendPayload = {
  replyId: string;
  repliedAt: number;
};

export const postReplySend = async (body: ReplySendInput) => {
  return apiPost<ApiEnvelope<ReplySendPayload>>(
    '/api/v1/growth-studio/reply-send',
    body
  );
};

export type ReplyUndoInput = {
  platform: ReplySuggestionPlatform;
  commentId: string;
};

export type ReplyUndoPayload = {
  undone: true;
  alreadyGone?: boolean;
};

export const postReplyUndo = async (body: ReplyUndoInput) => {
  return apiPost<ApiEnvelope<ReplyUndoPayload>>(
    '/api/v1/growth-studio/reply-undo',
    body
  );
};

/* ────────────────  Growth Studio B1 — First-hour seeding  ──────────────── */

export type FirstCommentSuggestionInput = {
  platform: ReplySuggestionPlatform;
  postId: string;
  postMessage?: string;
  pageName?: string;
};

export type FirstCommentSuggestionPayload = {
  suggestion: string;
  source: 'openai' | 'fallback';
};

export const postFirstCommentSuggestion = async (
  body: FirstCommentSuggestionInput
) => {
  return apiPost<ApiEnvelope<FirstCommentSuggestionPayload>>(
    '/api/v1/growth-studio/first-comment-suggestion',
    body
  );
};

export type FirstCommentSendInput = {
  platform: ReplySuggestionPlatform;
  postId: string;
  message: string;
};

export type FirstCommentSendPayload = {
  replyId: string;
  postedAt: number;
};

export const postFirstCommentSend = async (body: FirstCommentSendInput) => {
  return apiPost<ApiEnvelope<FirstCommentSendPayload>>(
    '/api/v1/growth-studio/first-comment-send',
    body
  );
};

export type FirstCommentUndoInput = {
  platform: ReplySuggestionPlatform;
  postId: string;
};

export type FirstCommentUndoPayload = {
  undone: true;
  alreadyGone?: boolean;
};

export const postFirstCommentUndo = async (body: FirstCommentUndoInput) => {
  return apiPost<ApiEnvelope<FirstCommentUndoPayload>>(
    '/api/v1/growth-studio/first-comment-undo',
    body
  );
};

