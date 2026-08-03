import axiosClient from '@/lib/axios';
import type { SocialPlatform } from '@/lib/platform-selection';

type ApiEnvelope<T> = {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
};

export type CarouselSlideResult = {
  index: number;
  headline: string;
  imageUrl: string;
  imageFilePath?: string;
  purpose?: string;
  visualType?: string;
};

export type GenerateCarouselResponse = {
  slides: CarouselSlideResult[];
  caption: string;
  galleryDocId: string | null;
  creditCost: number;
};

export async function generateCarousel(params: {
  prompt?: string;
  platform: SocialPlatform;
  slideCount: number;
  image?: File | null;
}): Promise<GenerateCarouselResponse> {
  const form = new FormData();
  form.append('platforms', JSON.stringify([params.platform]));
  form.append('slideCount', String(params.slideCount));
  if (params.prompt?.trim()) form.append('prompt', params.prompt.trim());
  if (params.image) form.append('image', params.image);

  const res = await axiosClient.post<ApiEnvelope<GenerateCarouselResponse>>(
    '/api/v1/carousel/generate',
    form
  );
  return res.data.data;
}
