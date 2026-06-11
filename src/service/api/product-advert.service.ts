import axiosClient from '@/lib/axios';
import type { ActivePlatformJob } from '@/src/types/job';

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

/** 202 envelope returned by `POST /api/v1/ai-engine/product-advert`. */
export type ProductAdvertGenerateResponse = {
  parentJobId: string;
  generationMode: ProductGenerationMode;
  jobs: ActivePlatformJob[];
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
  form.append('image', image);
  form.append('uid', uid);
  if (prompt?.trim()) form.append('prompt', prompt.trim());
  if (background?.trim()) form.append('background', background.trim());
  appendPlatforms(form, platforms);
  if (generationMode) form.append('generationMode', generationMode);
  if (campaignContext?.trim()) form.append('campaignContext', campaignContext.trim());
  if (useIndustryResearch) form.append('useIndustryResearch', 'true');
  const response = await axiosClient.post<{
    success: boolean;
    data: ProductAdvertGenerateResponse;
    message?: string;
  }>('/api/v1/ai-engine/product-advert', form);
  return response.data.data;
};
