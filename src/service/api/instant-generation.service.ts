import axiosClient from '@/lib/axios';

export type InstantGenerationPlatform = 'instagram' | 'facebook' | 'linkedin';

export type InstantGenerationResultItem =
  | { platform: string; scheduledPostId: string; message: string }
  | { platform: string; error: string };

export type InstantGenerationResponse = {
  success: boolean;
  results: InstantGenerationResultItem[];
};

/** Single-day response (legacy `dates` omitted on POST /generate). */
export async function generateInstantPostApi(params: {
  userId: string;
  platform: InstantGenerationPlatform;
}) {
  const response = await axiosClient.post<{
    success: boolean;
    data: InstantGenerationResponse;
    message?: string;
  }>('/api/v1/ai-engine/generate', {
    userId: params.userId,
    platform: params.platform,
  });

  return response.data?.data;
}

export type BatchDayResult = {
  date: string;
  success: boolean;
  results?: InstantGenerationResultItem[];
  error?: string;
};

export type InstantBatchResponse = {
  batch?: BatchDayResult[];
  summary?: {
    total: number;
    succeeded: number;
    failed: number;
  };
};

/** Multi-day batch generation: 1–5 dates, returns completed results. */
export async function generateInstantPostsBatchApi(params: {
  userId: string;
  platform: InstantGenerationPlatform;
  dates: string[];
}) {
  const response = await axiosClient.post<{
    success: boolean;
    data: InstantBatchResponse;
    message?: string;
  }>('/api/v1/ai-engine/generate', {
    userId: params.userId,
    platform: params.platform,
    dates: params.dates,
  });

  return response.data?.data;
}

export type AiEngineDateStatusRow = {
  date: string;
  exists: boolean;
  scheduledPostId?: string;
  contentType?: string | null;
  platform?: string | null;
  post?: {
    postId: string;
    message?: string | null;
    imageFilePath?: string | null;
    imageUrl?: string | null;
    postStatus?: string | null;
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
