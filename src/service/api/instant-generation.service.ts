import axiosClient from '@/lib/axios';

export type InstantGenerationPlatform = 'instagram' | 'facebook' | 'linkedin';

export type BatchDayResult = {
  date: string | null;
  success: boolean;
  error?: string;
  scheduledPostId?: string;
};

export type GenerateAiEngineResponse = {
  results: BatchDayResult[];
};

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
  }>(
    '/api/v1/ai-engine/generated-dates',
    {
      dates: params.dates,
      platform: params.platform,
      includePostPreview: params.includePostPreview ?? false,
    },
    {
      params: { userId: params.userId },
    }
  );
  return response.data?.data || [];
}
