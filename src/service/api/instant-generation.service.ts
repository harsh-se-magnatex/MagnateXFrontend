import axiosClient from '@/lib/axios';
import type { ActivePlatformJob } from '@/src/types/job';

export type InstantGenerationPlatform = 'instagram' | 'facebook' | 'linkedin';

/**
 * 202 envelope returned by `POST /api/v1/ai-engine/generate`. The same shape
 * covers both single-date (omit `dates`) and batch (one job per requested
 * date, each carrying its own `date`). Frontend opens `onSnapshot` per `jobId`.
 */
export type GenerateAiEngineResponse = {
  parentJobId: string;
  jobs: ActivePlatformJob[];
};

/** Single-day post — server defaults to tomorrow when `dates` is omitted. */
export async function generateInstantPostApi(params: {
  userId: string;
  platform: InstantGenerationPlatform;
}): Promise<GenerateAiEngineResponse> {
  const response = await axiosClient.post<{
    success: boolean;
    data: GenerateAiEngineResponse;
    message?: string;
  }>('/api/v1/ai-engine/generate', {
    userId: params.userId,
    platform: params.platform,
  });

  return response.data.data;
}

/** Multi-day batch — one job per (platform, date). Up to 5 dates. */
export async function generateInstantPostsBatchApi(params: {
  userId: string;
  platform: InstantGenerationPlatform;
  dates: string[];
}): Promise<GenerateAiEngineResponse> {
  const response = await axiosClient.post<{
    success: boolean;
    data: GenerateAiEngineResponse;
    message?: string;
  }>('/api/v1/ai-engine/generate', {
    userId: params.userId,
    platform: params.platform,
    dates: params.dates,
  });

  return response.data.data;
}

/**
 * What occupies a "blocked" bulk-create cell.
 *  - `ai-engine`: a previous batch / cron run scheduled a post here. The
 *    row carries `scheduledPostId` + (when `includePostPreview`) `post`.
 *  - `campaign`: a campaign draft or scheduled-campaign post is targeting
 *    this (date, platform). The cell renders darker green with a tooltip
 *    instead of opening a preview.
 *  - `null` / missing: cell is free to select.
 */
export type AiEngineDateSource = 'ai-engine' | 'campaign';

export type AiEngineDateStatusRow = {
  date: string;
  exists: boolean;
  source?: AiEngineDateSource | null;
  scheduledPostId?: string;
  contentType?: string | null;
  platform?: string | null;
  post?: {
    postId: string;
    message?: string | null;
    imageFilePath?: string | null;
    imageUrl?: string | null;
    postStatus?: string | null;
    removedByUser?: boolean;
  } | null;
};

export async function getAiEngineDateStatusApi(params: {
  userId: string;
  dates: string[];
  platform?: InstantGenerationPlatform;
  includePostPreview?: boolean;
}) {
  const response = await axiosClient.post<{
    success: boolean;
    data: AiEngineDateStatusRow[];
    message?: string;
  }>('/api/v1/ai-engine/generated-dates', {
    dates: params.dates,
    platform: params.platform,
    includePostPreview: params.includePostPreview ?? false,
  }, {
    params: { userId: params.userId },
  });
  return response.data?.data || [];
}
