import { apiGet, apiPost, apiPut } from '@/lib/api-client';
import type { ApiEnvelope } from '@/lib/api-types';

export type SupportTicket = {
  id: string;
  userId?: string;
  name?: string;
  email?: string;
  message?: string;
  status?: string;
  createdAt?: unknown;
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