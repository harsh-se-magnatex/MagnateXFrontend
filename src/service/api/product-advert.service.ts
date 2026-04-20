import axiosClient from '@/lib/axios';

export type ProductGenerationMode = 'advert_asset' | 'social_full';

export type ProductAdvertPayload = {
  image: File;
  uid: string;
  prompt?: string;
  background?: string;
  platform?: string;
  generationMode?: ProductGenerationMode;
  campaignContext?: string;
  useIndustryResearch?: boolean;
};

export const generateProductAdvertApi = async ({
  image,
  uid,
  prompt,
  background,
  platform,
  generationMode,
  campaignContext,
  useIndustryResearch,
}: ProductAdvertPayload) => {
  const form = new FormData();
  form.append('image', image);
  form.append('uid', uid);
  if (prompt?.trim()) form.append('prompt', prompt.trim());
  if (background?.trim()) form.append('background', background.trim());
  if (platform?.trim()) form.append('platform', platform.trim());
  if (generationMode) form.append('generationMode', generationMode);
  if (campaignContext?.trim()) form.append('campaignContext', campaignContext.trim());
  if (useIndustryResearch) form.append('useIndustryResearch', 'true');
  const response = await axiosClient.post('/api/v1/ai-engine/product-advert', form);
  return response.data;
};

