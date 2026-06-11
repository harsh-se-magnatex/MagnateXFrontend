import { apiGet, apiPost, apiPut } from '@/lib/api-client';
import type { ApiEnvelope } from '@/lib/api-types';

export type SupportTicketType = 'support' | 'bug' | 'refund';

export type SupportTicket = {
  id: string;
  userId?: string;
  name?: string;
  email?: string;
  message?: string;
  type?: SupportTicketType;
  status?: string;
  createdAt?: unknown;
};

export type AdminUserSearchField = 'all' | 'name' | 'subscriptionId' | 'userId';

export type AdminUser = {
  userId: string;
  name: string;
  email: string;
  activePlan: string;
  subscriptionStatus: string | null;
  subscriptionId: string | null;
  isAccountFrozen: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export const getAllUsersSupportMessages = async () => {
  return apiGet<ApiEnvelope<{ tikcets: SupportTicket[] }>>(
    '/api/v1/admin/get-all-users-support-messages'
  );
};

export const updateSupportMessageStatus = async (
  userId: string,
  ticketId: string,
  status: string
) => {
  return apiPut<ApiEnvelope>(
    '/api/v1/admin/update-support-message-status',
    {
    userId,
    ticketId,
    status,
    }
  );
};

export const sendNotification = async (category: string, title: string, message: string, type: 'notification' | 'release') => {
  return apiPost<ApiEnvelope>('/api/v1/admin/send-notification', {
    category,
    title,
    message,
    type,
  });
};

export const getAdminUsers = async (
  search = '',
  field: AdminUserSearchField = 'all'
) => {
  return apiGet<ApiEnvelope<{ users: AdminUser[]; total: number }>>(
    '/api/v1/admin/users',
    {
      params: {
        search,
        field,
      },
    }
  );
};

export const updateAdminUserFreezeStatus = async (
  userId: string,
  freeze: boolean
) => {
  return apiPut<ApiEnvelope<{ userId: string; isAccountFrozen: boolean }>>(
    '/api/v1/admin/users/freeze-status',
    {
      userId,
      freeze,
    }
  );
};

// ─── AI Engine Review (admin portal) ─────────────────────────────────────────

export type AiEnginePlatform = 'instagram' | 'facebook' | 'linkedin';

export type AiEngineCellState = 'none' | 'running' | 'scheduled' | 'failed';

export type AiEngineReviewCell = {
  state: AiEngineCellState;
  scheduledPostId: string | null;
  imageUrl: string | null;
  postStatus: string | null;
  UserApprovalStatus: string | null;
  error: string | null;
  startedAt: number | null;
  updatedAt: number | null;
  contentType: string | null;
  contentDescription: string | null;
};

export type AiEngineReviewRow = {
  userId: string;
  name: string;
  email: string;
  activePlan: string;
  selectedPlatforms: AiEnginePlatform[];
  cells: Partial<Record<AiEnginePlatform, AiEngineReviewCell>>;
};

export type AiEngineReviewResponse = {
  date: string;
  /** YYYY-MM-DD in `timezone`; the maximum selectable / queryable date. */
  today: string;
  timezone: string;
  platforms: AiEnginePlatform[];
  rows: AiEngineReviewRow[];
};

export const getAdminAiEngineReview = async (date?: string) => {
  return apiGet<ApiEnvelope<AiEngineReviewResponse>>(
    '/api/v1/admin/ai-engine-review',
    {
      params: date ? { date } : undefined,
    }
  );
};

export const triggerAdminAiEngineGenerate = async (
  userId: string,
  platform: AiEnginePlatform,
  date?: string
) => {
  return apiPost<
    ApiEnvelope<{
      jobId: string;
      parentJobId: string;
      userId: string;
      platform: AiEnginePlatform;
      date: string;
      message: string;
    }>
  >('/api/v1/admin/ai-engine-review/generate', {
    userId,
    platform,
    ...(date ? { date } : {}),
  });
};

export const triggerAdminAiEngineRegenerate = async (
  userId: string,
  platform: AiEnginePlatform,
  scheduledPostId: string
) => {
  return apiPost<
    ApiEnvelope<{
      jobId: string;
      parentJobId: string;
      userId: string;
      platform: AiEnginePlatform;
      scheduledPostId: string;
      message: string;
    }>
  >('/api/v1/admin/ai-engine-review/regenerate', {
    userId,
    platform,
    scheduledPostId,
  });
};
