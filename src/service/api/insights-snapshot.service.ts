import { apiGet } from '@/lib/api-client';
import type { ApiEnvelope } from '@/lib/api-types';

import type {
  WhatToPostNextPayload,
  WeeklyVerdictPayload,
  WhereToSpendPayload,
  WhereToSpendPlatform,
} from './analyticService';

/**
 * Frontend mirror of `backend/packages/shared/src/types/analytics-snapshot.ts`.
 * Kept narrow so the page can read the snapshot in one round-trip and
 * seed the existing Growth Studio Zustand caches.
 *
 * If you change the backend shape, update both here and in
 * `backend/packages/shared/src/types/analytics-snapshot.ts`.
 */

export type AnalyticsSnapshotPlatform = WhereToSpendPlatform;

export type AnalyticsSnapshotMeta = {
  version: 1;
  generatedAt: string;
  date: string;
  durationMs: number;
  source: 'cron' | 'live-fallback';
  errors?: Record<string, string>;
};

export type AnalyticsSnapshotDocument = {
  meta: AnalyticsSnapshotMeta;
  whatToPostNext: Partial<
    Record<AnalyticsSnapshotPlatform, WhatToPostNextPayload>
  >;
  whereToSpend: Partial<Record<AnalyticsSnapshotPlatform, WhereToSpendPayload>>;
  /** Present on snapshots built after the weekly-verdict cache rollout. */
  weeklyVerdict?: Partial<
    Record<
      AnalyticsSnapshotPlatform,
      { verdict: WeeklyVerdictPayload; source: 'openai' | 'fallback' }
    >
  >;
  optimalPostingTime?: Partial<
    Record<
      AnalyticsSnapshotPlatform,
      {
        hhmm: string | null;
        status: 'computed' | 'preserved' | 'absent';
        sampleSize?: number;
        source?: 'ai_openai' | 'aggregated_posts' | 'exploration' | 'refining';
        reasoning?: string;
      }
    >
  >;
  replySuggestions?: Partial<
    Record<
      AnalyticsSnapshotPlatform,
      Record<string, { suggestion: string; source: 'openai' | 'fallback' }>
    >
  >;
  firstCommentSuggestions?: Partial<
    Record<
      AnalyticsSnapshotPlatform,
      Record<string, { suggestion: string; source: 'openai' | 'fallback' }>
    >
  >;
};

export type GetInsightsSnapshotResponse = {
  snapshot: AnalyticsSnapshotDocument | null;
  reason?: string;
};

/**
 * Reads the latest cron-built analytics snapshot for the calling user.
 * Returns `{ snapshot: null, reason }` when nothing has been built yet
 * (brand-new user, or first cron pass hasn't happened yet).
 *
 * Pass `build: true` to force an on-demand build + persist instead of
 * the cron-driven cache. Reserve this for explicit "refresh now" CTAs;
 * the build call is the same 10\u201340s OpenAI burst the cron pays.
 */
export async function getInsightsSnapshot(opts?: {
  build?: boolean;
}): Promise<GetInsightsSnapshotResponse> {
  const url = opts?.build
    ? '/api/v1/insights/snapshot?build=true'
    : '/api/v1/insights/snapshot';
  const res = await apiGet<ApiEnvelope<GetInsightsSnapshotResponse>>(url);
  return res.data;
}
