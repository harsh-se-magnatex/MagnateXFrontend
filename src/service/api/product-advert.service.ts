import axiosClient from '@/lib/axios';
import { prepareGenerationImage } from '@/lib/prepare-generation-image';

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
};

export type ProductAdvertVideoGenerateResponse = {
  accepted: true;
  parentJobId: string;
  videoGenerationDocId: string;
  platform: string;
  platforms: string[];
  creditCost: number;
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
  const response = await axiosClient.post<{
    success: boolean;
    data: ProductAdvertGenerateResponse;
    message?: string;
  }>('/api/v1/ai-engine/product-advert', form);
  return response.data.data;
};

export const generateProductAdvertVideoApi = async (args: {
  referencePrompt?: string;
  referenceImage?: File;
  logoFramePosition: 'first' | 'last';
}): Promise<ProductAdvertVideoGenerateResponse> => {
  const form = new FormData();
  form.append('logoFramePosition', args.logoFramePosition);
  if (args.referencePrompt?.trim()) {
    form.append('referencePrompt', args.referencePrompt.trim());
  }
  if (args.referenceImage) {
    form.append(
      'referenceImage',
      await prepareGenerationImage(args.referenceImage)
    );
  }
  const response = await axiosClient.post<{
    success: boolean;
    data: ProductAdvertVideoGenerateResponse;
    message?: string;
  }>('/api/v1/ai-engine/video-generation', form);
  return response.data.data;
};
