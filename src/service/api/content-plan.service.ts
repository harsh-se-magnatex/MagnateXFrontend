import axiosClient from '@/lib/axios';

export type ContentPlanPlatform = 'facebook' | 'instagram' | 'linkedin';

export type ContentPlanGeneratedKind =
  | 'campaign'
  | 'ai-engine'
  | 'bulk-create'
  | 'quick-create'
  | 'product-advert'
  | 'video-generation'
  | 'carousel'
  | 'festive'
  | 'other';

export type ContentPlanGeneratedItem = {
  kind: ContentPlanGeneratedKind;
  status: 'draft' | 'scheduled' | 'queued';
  title?: string;
  captionPreview?: string;
  scheduledPostId?: string;
  draftId?: string;
};

export type ContentPlanUpcomingItem = {
  kind: 'festival' | 'ai-engine';
  label: string;
};

export type ContentPlanDay = {
  date: string;
  festivals: Array<{ id: string; name: string }>;
  byPlatform: Partial<
    Record<
      ContentPlanPlatform,
      {
        generated: ContentPlanGeneratedItem[];
        upcoming: ContentPlanUpcomingItem[];
      }
    >
  >;
};

export type ContentPlanResponse = {
  from: string;
  to: string;
  platforms: ContentPlanPlatform[];
  days: ContentPlanDay[];
};

export async function getContentPlanApi(): Promise<ContentPlanResponse> {
  const response = await axiosClient.get<{
    success: boolean;
    data: ContentPlanResponse;
    message?: string;
  }>('/api/v1/user/content-plan');
  return response.data.data;
}
