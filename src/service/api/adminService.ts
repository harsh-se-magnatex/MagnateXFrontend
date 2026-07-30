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

export type AdminPlan = {
  id: string;
  name: string;
  displayName: string;
  mode: 'auto' | 'manual';
  price: number;
  credits: number;
};

export type AdminSubscriptionChangeType =
  | 'activate'
  | 'upgrade'
  | 'downgrade'
  | 'change';

export type AdminActivateSubscriptionResult = {
  userId: string;
  previousPlan: string;
  newPlan: string;
  changeType: AdminSubscriptionChangeType;
  planCredits: number;
  planExpiresAt: string;
  mode: 'auto' | 'manual';
};

export const getAdminPlans = async () => {
  return apiGet<ApiEnvelope<{ plans: AdminPlan[] }>>('/api/v1/admin/plans');
};

export const activateAdminUserSubscription = async (payload: {
  userId: string;
  planId: string;
  durationMonths?: number;
  creditMode?: 'set' | 'add';
  note?: string;
}) => {
  return apiPost<ApiEnvelope<AdminActivateSubscriptionResult>>(
    '/api/v1/admin/subscriptions/activate',
    payload
  );
};

// ─── Content Calendar Review (admin portal) ──────────────────────────────────

export type ContentCalendarReviewPlatform =
  | 'instagram'
  | 'facebook'
  | 'linkedin';

export type ContentCalendarReviewUser = {
  userId: string;
  name: string;
  email: string;
  activePlan: string;
  mode: string | null;
  autoModeCalendarGenerated: boolean;
  platforms: ContentCalendarReviewPlatform[];
};

export type AdminContentPlanGeneratedItem = {
  kind: string;
  status: 'draft' | 'scheduled' | 'queued';
  title?: string;
  captionPreview?: string;
  scheduledPostId?: string;
  draftId?: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  videoPosterUrl?: string | null;
  mediaType?: 'image' | 'video' | 'carousel' | null;
  slideCount?: number | null;
  carouselSlides?: Array<{
    index: number;
    imageUrl: string | null;
    headline?: string | null;
  }>;
  postStatus?: string | null;
  UserApprovalStatus?: string | null;
  contentType?: string | null;
  contentDescription?: string | null;
  caption?: string | null;
  error?: string | null;
  scheduleAtMs?: number | null;
  createdAtMs?: number | null;
  updatedAtMs?: number | null;
};

export type AdminContentPlanUpcomingItem = {
  kind: string;
  label: string;
  note?: string;
};

export type AdminContentPlanDay = {
  date: string;
  festivals: Array<{ id: string; name: string }>;
  byPlatform: Partial<
    Record<
      ContentCalendarReviewPlatform,
      {
        generated: AdminContentPlanGeneratedItem[];
        upcoming: AdminContentPlanUpcomingItem[];
      }
    >
  >;
};

export type ContentCalendarReviewPreferences = {
  preferredTime: string | null;
  optimalFacebookTime: string | null;
  optimalInstagramTime: string | null;
  optimalLinkedinTime: string | null;
  useAnalyticsOptimalPostingTime: boolean | null;
  timeZone: string | null;
};

export type ContentCalendarReviewDetail = {
  userId: string;
  name: string;
  email: string;
  activePlan: string;
  mode: string | null;
  autoModeCalendarGenerated: boolean;
  today: string;
  preferences: ContentCalendarReviewPreferences;
  from: string;
  to: string;
  platforms: ContentCalendarReviewPlatform[];
  days: AdminContentPlanDay[];
};

export const getAdminContentCalendarReviewUsers = async () => {
  return apiGet<ApiEnvelope<{ users: ContentCalendarReviewUser[] }>>(
    '/api/v1/admin/content-calendar-review'
  );
};

export const getAdminContentCalendarReviewDetail = async (userId: string) => {
  return apiGet<ApiEnvelope<ContentCalendarReviewDetail>>(
    `/api/v1/admin/content-calendar-review/${encodeURIComponent(userId)}`
  );
};

export const postAdminContentCalendarForceRun = async (payload: {
  userId: string;
  date: string;
  platform: ContentCalendarReviewPlatform;
}) => {
  return apiPost<
    ApiEnvelope<{
      userId: string;
      date: string;
      platform: ContentCalendarReviewPlatform;
      calendarKind: string;
      enqueuedCount: number;
      outcomes: Array<{ kind: string; reason?: string }>;
    }>
  >('/api/v1/admin/content-calendar-review/force-run', payload);
};
