import axiosClient from '@/lib/axios';
import { apiPost } from '@/lib/api-client';
import {
  prepareGenerationImage,
  prepareGenerationImages,
} from '@/lib/prepare-generation-image';

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
  aspectRatio?: string;
  imageSize?: string;
  generatedAt?: string;
};

export type StudioGenerateResult = {
  accepted: true;
  parentJobId: string;
  platforms: string[];
  creditCost: number;
};

export async function generateAiContentStudio(params: {
  prompt: string;
  platforms: string[];
  image?: File | null;
}): Promise<StudioGenerateResult> {
  const form = new FormData();
  form.append('platforms', JSON.stringify(params.platforms));
  form.append('prompt', params.prompt);
  if (params.image) {
    form.append('image', await prepareGenerationImage(params.image));
  }

  const res = await axiosClient.post<ApiEnvelope<StudioGenerateResult>>(
    '/api/v1/ai-content-studio/generate',
    form
  );
  return res.data.data;
}

export type StudioVideoEditResult = {
  accepted: true;
  parentJobId: string;
  platform: string;
  creditCost: number;
};

export const VIDEO_EDIT_TOOLS = [
  {
    id: 'enhance',
    label: 'Enhance My Video',
    tier: 'safe' as const,
    description: 'Same clip — stabilize, grade, lighting, clarity.',
  },
  {
    id: 'convert_reel',
    label: 'Convert to Reel',
    tier: 'safe' as const,
    description: 'Vertical reframe + polish for Reels/Shorts.',
  },
  {
    id: 'replace_background',
    label: 'Replace Background',
    tier: 'creative' as const,
    description: 'Change the environment; keep you identical.',
  },
  {
    id: 'add_product',
    label: 'Add Your Product',
    tier: 'creative' as const,
    description: 'Place your product naturally in the scene.',
  },
] as const;

export type VideoEditToolId = (typeof VIDEO_EDIT_TOOLS)[number]['id'];

export const VIDEO_EDIT_INTENTS = [
  { id: 'professional', label: 'Professional' },
  { id: 'luxury', label: 'Luxury' },
  { id: 'cinematic', label: 'Cinematic' },
  { id: 'energetic_social', label: 'Energetic Social' },
  { id: 'warm_friendly', label: 'Warm & Friendly' },
] as const;

export type VideoEditIntentId = (typeof VIDEO_EDIT_INTENTS)[number]['id'];

export const VIDEO_EDIT_SCENE_PRESETS = [
  { id: 'modern_office', label: 'Modern office' },
  { id: 'outdoor_storefront', label: 'Outdoor storefront' },
  { id: 'studio_backdrop', label: 'Studio backdrop' },
  { id: 'premium_interior', label: 'Premium interior' },
] as const;

export type VideoEditScenePresetId =
  (typeof VIDEO_EDIT_SCENE_PRESETS)[number]['id'];

export const VIDEO_EDIT_PLACEMENT_PRESETS = [
  { id: 'in_hand', label: 'In hand' },
  { id: 'on_surface', label: 'On a surface' },
  { id: 'held_to_camera', label: 'Held to camera' },
] as const;

export type VideoEditPlacementPresetId =
  (typeof VIDEO_EDIT_PLACEMENT_PRESETS)[number]['id'];

export async function editVideoAiContentStudio(params: {
  prompt: string;
  platforms: string[];
  video: File;
  editTool?: VideoEditToolId | string;
  editIntent?: VideoEditIntentId | string;
  scenePreset?: VideoEditScenePresetId | string | null;
  placementPreset?: VideoEditPlacementPresetId | string | null;
  productImages?: File[];
}): Promise<StudioVideoEditResult> {
  const form = new FormData();
  form.append('platforms', JSON.stringify(params.platforms));
  form.append('prompt', params.prompt);
  form.append('editTool', params.editTool || 'enhance');
  form.append('editIntent', params.editIntent || 'professional');
  if (params.scenePreset) form.append('scenePreset', params.scenePreset);
  if (params.placementPreset) {
    form.append('placementPreset', params.placementPreset);
  }
  form.append('video', params.video);
  const productImages = await prepareGenerationImages(
    (params.productImages ?? []).slice(0, 3)
  );
  for (const img of productImages) {
    form.append('productImage', img);
  }

  const res = await axiosClient.post<ApiEnvelope<StudioVideoEditResult>>(
    '/api/v1/ai-content-studio/edit-video',
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
