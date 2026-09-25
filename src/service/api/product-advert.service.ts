import axiosClient from '@/lib/axios';
import {
  prepareGenerationImage,
  prepareGenerationImages,
} from '@/lib/prepare-generation-image';

export type ProductGenerationMode = 'advert_asset' | 'social_full';

export type ProductAdvertPayload = {
  image: File;
  uid: string;
  prompt?: string;
  background?: string;
  platforms?: string[];
  generationMode?: ProductGenerationMode;
  campaignContext?: string;
  useIndustryResearch?: boolean;
  templateDnaLayoutByPlatform?: Record<string, string>;
  promptOnly?: boolean;
};

export type ProductAdvertPlatformResult = {
  platform: string;
  result: Record<string, unknown>;
};

export type ProductAdvertGenerateResponse = {
  accepted: true;
  parentJobId: string;
  generationMode: ProductGenerationMode;
  platforms: string[];
  creditCost: number;
  promptOnly?: boolean;
};

export type ProductAdvertPromptPreview = {
  parentJobId: string;
  platforms: string[];
  results: Record<string, {
    status: 'pending' | 'ready' | 'failed';
    finalPrompt?: string;
    referenceEditLead?: string;
    referenceImageUsed?: boolean;
    styleSource?: string;
    templateDnaRevision?: number | null;
    error?: string;
  }>;
};

export type ProductAdvertVideoGenerateResponse = {
  accepted: true;
  parentJobId: string;
  videoGenerationDocId: string;
  platform: string;
  platforms: string[];
  creditCost: number;
  videoStyle?: 'normal' | 'ugc';
};

function appendPlatforms(form: FormData, platforms?: string[]) {
  if (platforms?.length) {
    form.append('platforms', JSON.stringify(platforms));
  }
}

export const generateProductAdvertApi = async ({
  image,
  uid,
  prompt,
  background,
  platforms,
  generationMode,
  campaignContext,
  useIndustryResearch,
  templateDnaLayoutByPlatform,
}: ProductAdvertPayload): Promise<ProductAdvertGenerateResponse> => {
  const form = new FormData();
  form.append('image', await prepareGenerationImage(image));
  form.append('uid', uid);
  if (prompt?.trim()) form.append('prompt', prompt.trim());
  if (background?.trim()) form.append('background', background.trim());
  appendPlatforms(form, platforms);
  if (generationMode) form.append('generationMode', generationMode);
  if (campaignContext?.trim())
    form.append('campaignContext', campaignContext.trim());
  if (useIndustryResearch) form.append('useIndustryResearch', 'true');
  if (templateDnaLayoutByPlatform && Object.keys(templateDnaLayoutByPlatform).length) form.append('templateDnaLayoutByPlatform', JSON.stringify(templateDnaLayoutByPlatform));
  const response = await axiosClient.post<{
    success: boolean;
    data: ProductAdvertGenerateResponse;
    message?: string;
  }>('/api/v1/ai-engine/product-advert', form);
  return response.data.data;
};

export const getProductAdvertPromptPreview = async (parentJobId: string): Promise<ProductAdvertPromptPreview> => {
  const response = await axiosClient.get<{ data: ProductAdvertPromptPreview }>(
    `/api/v1/ai-engine/product-advert/prompt-preview/${encodeURIComponent(parentJobId)}`
  );
  return response.data.data;
};

export const generateProductAdvertVideoApi = async (args: {
  referencePrompt?: string;
  referenceImages?: Array<{ file: File; source: 'upload' | 'gallery' }>;
  logoFramePosition?: 'first' | 'last';
  videoStyle?: 'normal' | 'ugc';
}): Promise<ProductAdvertVideoGenerateResponse> => {
  const form = new FormData();
  form.append('videoStyle', args.videoStyle ?? 'normal');
  if (args.logoFramePosition) {
    form.append('logoFramePosition', args.logoFramePosition);
  }
  if (args.referencePrompt?.trim()) {
    form.append('referencePrompt', args.referencePrompt.trim());
  }
  const referenceInputs = args.referenceImages ?? [];
  const references = await prepareGenerationImages(referenceInputs.map((item) => item.file), {
    maxBytes: 4 * 1024 * 1024,
  });
  for (const image of references) {
    form.append('referenceImages', image);
  }
  if (referenceInputs.length) {
    form.append(
      'referenceImageSources',
      JSON.stringify(referenceInputs.map((item) => item.source))
    );
  }
  const response = await axiosClient.post<{
    success: boolean;
    data: ProductAdvertVideoGenerateResponse;
    message?: string;
  }>('/api/v1/ai-engine/video-generation', form);
  return response.data.data;
};
