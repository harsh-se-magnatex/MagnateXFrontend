import axiosClient from '@/lib/axios';

export type TemplateDNAPlatform = 'instagram' | 'facebook' | 'linkedin';

export interface PostTemplateDNA {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  textPosition: string;
  subjectPosition: string;
  whitespace: string;
  aspectRatio: string;
  usesBorders: boolean;
  borderStyle: string;
  photographyType: string;
  mood: string;
  editingStyle: string;
  isRealPhoto: boolean;
  fontPersonality: string;
  usesAllCaps: boolean;
  fontCount: number;
  textHierarchy: string;
  hasLogo: boolean;
  logoPosition: string;
  usesIcons: boolean;
  shapeStyle: string;
  usesOverlay: boolean;
  overlayStyle: string;
  captionLength: string;
  openingHookStyle: string;
  emojiUsage: string;
  ctaStyle: string;
  captionTone: string;
  overallStyle: string;
  sourcePlatform: string;
  extractedAt: string;
}

interface ExtractResponse {
  success: boolean;
  data: { templateDNA: PostTemplateDNA };
  message: string;
}

interface GetResponse {
  success: boolean;
  data: { templateDNA: PostTemplateDNA | null };
  message: string;
}

export async function extractTemplateDNA(
  images: File[],
  platform: TemplateDNAPlatform
): Promise<PostTemplateDNA> {
  if (!images.length) throw new Error('At least one image is required');
  const formData = new FormData();
  for (const file of images) {
    formData.append('images', file);
  }
  formData.append('platform', platform);
  const response = await axiosClient.post<ExtractResponse>(
    '/api/v1/template-dna/extract',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  );
  if (!response.data?.data?.templateDNA) {
    throw new Error(response.data?.message ?? 'Failed to extract template DNA');
  }
  return response.data.data.templateDNA;
}

export async function getTemplateDNA(
  platform: TemplateDNAPlatform
): Promise<PostTemplateDNA | null> {
  const response = await axiosClient.get<GetResponse>(
    `/api/v1/template-dna/${platform}`
  );
  return response.data?.data?.templateDNA ?? null;
}
