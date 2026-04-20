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

export const getScheduledPosts = async (
  cursor?: { _seconds: number; _nanoseconds?: number } | null
) => {
  const params =
    cursor && '_seconds' in cursor
      ? `?lastCreatedAt=${encodeURIComponent(JSON.stringify(cursor))}`
      : '';
  const response = await axiosClient.get(
    `/api/v1/automated-post/get-scheduled-posts${params}`
  );
  return response.data;
};

export const getAdminPendingScheduledPosts = async (
  lastScheduleAt?: { _seconds: number; _nanoseconds?: number } | null
) => {
  const params =
    lastScheduleAt && '_seconds' in lastScheduleAt
      ? `?lastScheduleAt=${encodeURIComponent(JSON.stringify(lastScheduleAt))}`
      : '';
  const response = await axiosClient.get(
    `/api/v1/admin/get-pending-scheduled-posts${params}`
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

export const createAutomatedPost = async (
  events: AutomatedPostEventPayload[],
  platform: 'instagram' | 'facebook' | 'linkedin' | 'all_platforms'
) => {
  const response = await axiosClient.post(
    '/api/v1/automated-post/create-automated-post',
    { events, platform }
  );
  return response.data;
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
  postId: string,
  action: string,
  userId: string,
  platform: string
) => {
  const response = await axiosClient.post(
    '/api/v1/admin/perform-action-on-scheduled-post',
    { postId, action, userId, platform }
  );
  return response.data;
};

export const selectFacebookPageApi = async (selectedPageId: string) => {
  const response = await axiosClient.post('/auth/select-facebook-page', {
    selectedPageId,
  });
  return response.data;
};
