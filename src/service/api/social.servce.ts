import axiosClient from '@/lib/axios';

export const addSchedulePost = async (
  message: string,
  scheduleAt: string,
  platform: string,
  file?: File,
  userId?: string
) => {
  const formData = new FormData();
  formData.append('message', message);
  formData.append('scheduleAt', scheduleAt);
  formData.append('platform', platform);
  if (userId) formData.append('userId', userId);
  if (file) formData.append('file', file);

  const response = await axiosClient.post('/auth/schedule/post', formData);
  return response.data;
};

export type ScheduledPostsTab =
  | 'all'
  | 'upcoming'
  | 'posted'
  | 'failed'
  | 'removed'
  | 'rejected';

/** Compound cursor for list pagination — ties break on `postId`. */
export type ScheduledPostsPageCursor = {
  scheduleAt: { _seconds: number; _nanoseconds?: number };
  postId: string;
};

/**
 * Cursor-paginated fetch for the list view. The optional `tab` filter is
 * applied on the server — picking "Failed" no longer requires paginating
 * through the entire history client-side just to find a few matches.
 */
export const getScheduledPosts = async (params?: {
  cursor?: ScheduledPostsPageCursor | null;
  tab?: ScheduledPostsTab;
}) => {
  const search = new URLSearchParams();
  const cursor = params?.cursor;
  if (cursor?.postId && cursor.scheduleAt && '_seconds' in cursor.scheduleAt) {
    search.set('lastCreatedAt', JSON.stringify(cursor));
  }
  // 'all' is the API default; omit it to keep URLs clean and proxy caches happy.
  if (params?.tab && params.tab !== 'all') {
    search.set('tab', params.tab);
  }
  const qs = search.toString();
  const response = await axiosClient.get(
    `/api/v1/automated-post/get-scheduled-posts${qs ? `?${qs}` : ''}`
  );
  return response.data;
};

/**
 * Fetch every scheduled post whose `scheduleAt` lies inside [fromMs, toMs].
 *
 * Used by the calendar view so it reads exactly the posts in the visible
 * month/week — no infinite-pagination cascade. Server returns a bounded
 * result (no cursor); caller should cache by range to avoid refetching when
 * navigating back to a previously-viewed month.
 */
export const getScheduledPostsInRange = async (params: {
  fromMs: number;
  toMs: number;
}) => {
  const search = new URLSearchParams({
    fromMs: String(params.fromMs),
    toMs: String(params.toMs),
  });
  const response = await axiosClient.get(
    `/api/v1/automated-post/get-scheduled-posts?${search.toString()}`
  );
  return response.data;
};

export type AdminPendingScheduledPostsTab = 'today' | 'future';

export const getAdminPendingScheduledPosts = async (params: {
  tab: AdminPendingScheduledPostsTab;
  todayStartMs: number;
  todayEndMs: number;
  lastScheduleAt?: { _seconds: number; _nanoseconds?: number } | null;
}) => {
  const { tab, todayStartMs, todayEndMs, lastScheduleAt } = params;
  const search = new URLSearchParams({
    tab,
    todayStartMs: String(todayStartMs),
    todayEndMs: String(todayEndMs),
  });
  if (lastScheduleAt && '_seconds' in lastScheduleAt) {
    search.set('lastScheduleAt', JSON.stringify(lastScheduleAt));
  }
  const response = await axiosClient.get(
    `/api/v1/admin/get-pending-scheduled-posts?${search.toString()}`
  );
  return response.data;
};

export type AutomatedPostEventPayload = {
  id?: string;
  name: string;
  date: string;
  description: string;
  reason: string;
};

/** Response from `POST /api/v1/automated-post/create-automated-post` (queued). */
export type CreateAutomatedPostResponse = {
  accepted?: boolean;
  platforms?: string[];
  eventCount: number;
  creditCost?: number;
  successCount?: number;
  failedCount?: number;
};

export const createAutomatedPost = async (
  events: AutomatedPostEventPayload[],
  platforms: string[]
): Promise<CreateAutomatedPostResponse> => {
  const response = await axiosClient.post<{
    success: boolean;
    data: CreateAutomatedPostResponse;
    message?: string;
  }>('/api/v1/automated-post/create-automated-post', { events, platforms });
  return response.data.data;
};

export const getSocialAccountsApi = async () => {
  const response = await axiosClient.get('/auth/get-social-accounts');
  return response.data;
};

export const disconnectSocialAccountApi = async (platform: string) => {
  const response = await axiosClient.post('/auth/disconnect-social-account', {
    platform,
  });
  return response.data;
};

export const performActionOnScheduledPost = async (
  postId: string | null,
  action: string,
  userId: string,
  platform: string,
  draftId?: string | null
) => {
  const response = await axiosClient.post(
    '/api/v1/admin/perform-action-on-scheduled-post',
    {
      ...(postId ? { postId } : {}),
      ...(draftId ? { draftId } : {}),
      action,
      userId,
      platform,
    }
  );
  return response.data;
};

export const selectFacebookPageApi = async (selectedPageId: string) => {
  const response = await axiosClient.post('/auth/select-facebook-page', {
    selectedPageId,
  });
  return response.data;
};

export const selectLinkedInPageApi = async (selectedPageId: string) => {
  const response = await axiosClient.post('/auth/select-linkedin-page', {
    selectedPageId,
  });
  return response.data;
};
