import axiosClient from '@/lib/axios';
import { apiPost } from '@/lib/api-client';

type ApiEnvelope<T> = {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
};

export type StudioRenderedImage = {
  platform: string;
  caption: string;
  imageUrl: string;
  imageFilePath?: string;
  aspectRatio: string;
  imageSize: string;
  generatedAt: string;
};

export type StudioGenerateResult = {
  contentDescription: string;
  contentType?: string;
  instantGenerationDocId?: string | null;
  /** Set when the server inferred a brief from the reference image (image-only flow). */
  inferredImageContext: string | null;
  renderedImages: StudioRenderedImage[];
};

export async function generateAiContentStudio(params: {
  prompt: string;
  platform: string;
  image?: File | null;
}) {
  const form = new FormData();
  form.append('platform', params.platform);
  form.append('prompt', params.prompt);
  if (params.image) form.append('image', params.image);

  const res = await axiosClient.post<ApiEnvelope<StudioGenerateResult>>(
    '/api/v1/ai-content-studio/generate',
    form
  );
  return res.data.data;
}

export type SchedulePostPayload = {
  platform: string;
  scheduleAt: string;
  message: string;
  imageDataUrl?: string;
  imageUrl?: string;
  imageFilePath?: string;
  cropForPlatform?: boolean;
};

export async function scheduleAiContentStudioPost(
  body: SchedulePostPayload | SchedulePostPayload[]
) {
  const envelope = await apiPost<ApiEnvelope<{ scheduledPostId: string }>>(
    '/api/v1/ai-content-studio/schedule',
    body
  );
  return envelope.data;
}
