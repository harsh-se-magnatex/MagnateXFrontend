import axiosClient from '@/lib/axios';
import { apiPost } from '@/lib/api-client';
import type { ActivePlatformJob, Platform } from '@/src/types/job';

type ApiEnvelope<T> = {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
};

/**
 * Legacy synchronous result shape (used by the page to render finished
 * content). Reconstructed on the client from `jobs/{jobId}.result` snapshots —
 * see `instant-generation/page.tsx`.
 */
// EDIT_PHOTO_DISABLED
// import type { CreativeDesignDocument, MandateSnapshot } from '@/lib/creative-design/types';

export type StudioRenderedImage = {
  platform: string;
  caption: string;
  imageUrl: string;
  imageFilePath?: string;
  aspectRatio?: string;
  imageSize?: string;
  generatedAt?: string;
  // backgroundUrl?: string;
  // designJson?: CreativeDesignDocument;
  // previewImageUrl?: string;
  // mandateSnapshot?: MandateSnapshot;
  // logoUrl?: string;
  // canvasWidth?: number;
  // canvasHeight?: number;
};

export type StudioGenerateResult = {
  contentDescription: string;
  contentType?: string;
  instantGenerationDocId?: string | null;
  /** Set when the server inferred a brief from the reference image (image-only flow). */
  inferredImageContext: string | null;
  renderedImages: StudioRenderedImage[];
};

/**
 * 202 envelope returned by `POST /api/v1/ai-content-studio/generate`. The
 * frontend uses `parentJobId` + `jobs[]` to open Firestore `onSnapshot`
 * listeners (see `useFeatureJob`).
 */
export type GenerateJobsResponse = {
  parentJobId: string;
  jobs: ActivePlatformJob[];
};

export async function generateAiContentStudio(params: {
  prompt: string;
  platforms: Platform[];
  image?: File | null;
}): Promise<GenerateJobsResponse> {
  const form = new FormData();
  form.append('platforms', JSON.stringify(params.platforms));
  form.append('prompt', params.prompt);
  if (params.image) form.append('image', params.image);

  const res = await axiosClient.post<ApiEnvelope<GenerateJobsResponse>>(
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
