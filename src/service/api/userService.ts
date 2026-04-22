import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client';
import type { ApiEnvelope } from '@/lib/api-types';

export type BusinessProfile = Record<string, unknown>;
export type SupportMessage = {
  id?: string;
  message?: string;
  status?: string;
  createdAt?: unknown;
  [key: string]: unknown;
};

export const loginUser = async (
  idToken: string,
  intent: 'signin' | 'signup',
  method: string,
  options?: { name?: string }
) => {
  return apiPost<
    ApiEnvelope<{ showRecoveryPopup?: boolean; deletedDocId?: string }>
  >('/api/v1/user/login', {
    idToken,
    intent,
    method,
    ...(options?.name ? { name: options.name } : {}),
  });
};

export const linkProvider = async (
  idToken: string,
  provider: 'google.com' | 'password' | 'phone'
) => {
  return apiPost<ApiEnvelope>('/api/v1/user/link-provider', {
    idToken,
    provider,
  });
};

export const checkEmailExistsinDeletedUsers = async (email: string) => {
  return apiPost<ApiEnvelope<{ exists: boolean; deletedDocId?: string }>>(
    '/api/v1/user/check-email-exists-in-deleted-users',
    { email }
  );
};

/** Same endpoint as email check; body uses `phoneNumber` (E.164, e.g. +919876543210). */
export const checkPhoneExistsInDeletedUsers = async (phoneNumber: string) => {
  return apiPost<ApiEnvelope<{ exists: boolean; deletedDocId?: string }>>(
    '/api/v1/user/check-email-exists-in-deleted-users',
    { phoneNumber }
  );
};

export const onBoardUser = async (user: unknown) => {
  return apiPost<ApiEnvelope>('/api/v1/user/onboard', user);
};

export const uploadLogo = async (logo: File | string) => {
  const formData = new FormData();
  formData.append('logo', logo);
  return apiPost<ApiEnvelope<{ url: string }>>(
    '/api/v1/user/upload-logo',
    formData
  );
};

export const getProfile = async () => {
  return apiGet<ApiEnvelope<{ profile: BusinessProfile }>>(
    '/api/v1/user/profile'
  );
};

export const updateProfile = async (profile: unknown) => {
  return apiPut<ApiEnvelope>('/api/v1/user/profile', profile);
};

export const logoutUser = async () => {
  return apiPost<ApiEnvelope>('/api/v1/user/logout');
};

export const sendSupportMessage = async (
  name: string,
  email: string,
  message: string
) => {
  return apiPost<ApiEnvelope>('/api/v1/user/send-support-message', {
    name,
    email,
    message,
  });
};

export const getSupportMessages = async () => {
  return apiGet<ApiEnvelope<{ supportData: SupportMessage[] }>>(
    '/api/v1/user/get-support-messages'
  );
};

export const scheduleUserPost = async (
  file: File,
  message: string,
  time: string,
  platform: string
) => {
  return apiPost<ApiEnvelope>(
    '/api/v1/user/schedule-user-post',
    { file, message, time, platform },
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
};

export const editUserPreferences = async (
  logoPreference: string,
  emojiUsage: boolean,
  socialSalesEmailUsage: boolean,
  Caption_Object: { instagram: string; facebook: string; linkedin: string },
  Need_Approval: boolean,
  TimeZone: string,
  preferredTime: string
) => {
  return apiPost<ApiEnvelope>('/api/v1/user/edit-user-preference', {
    logoPreference,
    emojiUsage,
    socialSalesEmailUsage,
    Caption_Object,
    Need_Approval,
    TimeZone,
    preferredTime,
  });
};

export const getUserPreferences = async () => {
  return apiGet<ApiEnvelope<{ preferences: any }>>(
    '/api/v1/user/get-user-preferences'
  );
};

export const getUserAIenginePageContext = async () => {
  return apiGet<ApiEnvelope<{ onBoarded: boolean }>>(
    '/api/v1/user/get-user-aiengine-detail'
  );
};

export const logOutFromAllDevices = async () => {
  return apiPost<ApiEnvelope>('/api/v1/user/logout-from-all-devices');
};

export const deleteUserAccount = async () => {
  return apiDelete<ApiEnvelope<{ message: string; transferId: string }>>(
    '/api/v1/user/delete-user-account'
  );
};

export const recoverDeletedUserAccount = async (
  deletedDocId: string,
  idToken: string
) => {
  return apiPost<ApiEnvelope>('/api/v1/user/recover-deleted-user-account', {
    deletedDocId,
    idToken,
  });
};

export const createNewAccount = async (
  idToken: string,
  deletedDocId: string
) => {
  return apiPost<ApiEnvelope>('/api/v1/user/create-new-account', {
    idToken,
    deletedDocId,
  });
};

export const performActionByUserOnScheduledPost = async (
  postId: string,
  action: string,
  platform: string
) => {
  return apiPost<ApiEnvelope>(
    '/api/v1/user/perform-action-by-user-on-scheduled-post',
    { postId, action, platform }
  );
};

export const removeScheduledPost = async (postId: string) => {
  return apiPost<ApiEnvelope>('/api/v1/user/remove-scheduled-post', { postId });
};

export const getSuccessNotifications = async () => {
  return apiGet<ApiEnvelope<{ successNotifications: any[] }>>(
    '/api/v1/user/get-success-notifications'
  );
};

export const getFailureNotifications = async () => {
  return apiGet<ApiEnvelope<{ failureNotifications: any[] }>>(
    '/api/v1/user/get-failure-notifications'
  );
};

export const getAllNotifications = async (type: 'notification' | 'release') => {
  return apiGet<ApiEnvelope<{ notifications: any[] }>>(
    '/api/v1/user/get-all-notifications' + '?type=' + type
  );
};

export const getUserDetailForHomePage = async () => {
  return apiGet<ApiEnvelope<{ data: any }>>(
    '/api/v1/user/get-user-detail-for-home-page'
  );
};

export const getUserCredits = async () => {
  return apiGet<ApiEnvelope<{ credits: number }>>(
    '/api/v1/user/get-user-credits'
  );
};

export const getLogoVariants = async (
  count = 3,
  nonce?: number,
  logo?: string
) => {
  const qNonce = Number.isFinite(nonce as number)
    ? String(nonce)
    : String(Date.now());
  return apiPost<
    ApiEnvelope<{
      variants: string[];
      rawLogo?: string;
      transparentLogo?: string;
      nonce: number;
      generatedAt: string;
    }>
  >('/api/v1/user/logo-variants', {
    count,
    nonce: qNonce,
    logo: logo || '',
  });
};

export const getSavedLogoVariants = async (count = 10) => {
  return apiGet<ApiEnvelope<{ variants: string[] }>>(
    `/api/v1/user/logo-variants/saved?count=${count}`
  );
};

export const saveLogoVariants = async (variants: string[]) => {
  return apiPost<ApiEnvelope<{ variants: string[] }>>(
    '/api/v1/user/logo-variants/save',
    { variants }
  );
};

export const setLogoVariantsForImagesPreference = async (
  useLogoVariantsForImages: boolean
) => {
  return apiPut<
    ApiEnvelope<{
      useLogoVariantsForImages: boolean;
      backgroundGenerationStarted?: boolean;
    }>
  >('/api/v1/user/logo-variants/use-for-images', {
    useLogoVariantsForImages,
  });
};

export const generateAiLogoPicks = async (requirements = '', count = 5) => {
  return apiPost<
    ApiEnvelope<{
      picks: string[];
      generatedAt: string;
    }>
  >('/api/v1/user/ai-logo/generate', {
    requirements,
    count,
  });
};

export const useAiGeneratedLogo = async (logoDataUrl: string) => {
  return apiPost<ApiEnvelope<{ url: string }>>('/api/v1/user/ai-logo/use', {
    logoDataUrl,
  });
};

export const selectSocialPlatformApi = async (selected: {
  facebook: boolean;
  instagram: boolean;
  linkedin: boolean;
}) => {
  return apiPost<ApiEnvelope>('/api/v1/user/select-social-platform', selected);
};

export type MemoryLayerAnswerPayload = {
  questionId: string;
  skipped: boolean;
  value?: string | string[] | null;
};

export const generateMemoryLayerQuestions = async (opts?: {
  force?: boolean;
}) => {
  return apiPost<ApiEnvelope<{ memoryLayer: unknown; cached?: boolean }>>(
    '/api/v1/user/memory-layer/generate-questions',
    opts ?? {}
  );
};

export const getMemoryLayer = async () => {
  return apiGet<ApiEnvelope<{ memoryLayer: unknown }>>(
    '/api/v1/user/memory-layer'
  );
};

export const putMemoryLayer = async (body: {
  status: 'in_progress' | 'complete' | 'skipped';
  answers?: MemoryLayerAnswerPayload[];
  selectedProducts?: string[];
}) => {
  return apiPut<ApiEnvelope<{ memoryLayer: unknown }>>(
    '/api/v1/user/memory-layer',
    body
  );
};

export const uploadMemoryLayerBrandPhotos = async (files: File[]) => {
  const formData = new FormData();
  for (const f of files) {
    formData.append('photos', f);
  }
  return apiPost<ApiEnvelope<{ memoryLayer: unknown; uploaded: number }>>(
    '/api/v1/user/memory-layer/brand-photos',
    formData
  );
};

export const deleteMemoryLayerBrandPhoto = async (path: string) => {
  return apiDelete<ApiEnvelope<{ memoryLayer: unknown }>>(
    '/api/v1/user/memory-layer/brand-photos',
    { path }
  );
};
