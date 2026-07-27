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
  kind:
    | 'festival'
    | 'ai-engine'
    | 'quick-create'
    | 'campaign'
    | 'video-generation'
    | 'carousel'
    | 'empty';
  label: string;
  note?: string;
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

export type ContentPlanForceRunResult = {
  date: string;
  platform: ContentPlanPlatform;
  calendarKind: string;
  enqueuedCount: number;
  outcomes: Array<{ kind: string; reason?: string }>;
};

export async function forceRunContentPlanApi(args: {
  date: string;
  platform: ContentPlanPlatform;
}): Promise<ContentPlanForceRunResult> {
  const response = await axiosClient.post<{
    success: boolean;
    data: ContentPlanForceRunResult;
    message?: string;
  }>('/api/v1/user/content-plan/force-run', args);
  return response.data.data;
}
