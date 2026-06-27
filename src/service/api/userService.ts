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

export type OnboardingBrandSuggestPayload = {
  businessName?: string;
  industry?: string;
  location?: string;
  website?: string;
  brandDescription?: string;
};

export type OnboardingBrandSuggestResult = {
  hashtags: string[];
  slogans: string[];
};

export const suggestOnboardingBrandCopy = async (
  body: OnboardingBrandSuggestPayload
) => {
  return apiPost<ApiEnvelope<OnboardingBrandSuggestResult>>(
    '/api/v1/user/onboarding/suggest-brand-copy',
    body
  );
};

export const uploadLogo = async (logo: File | string) => {
  const formData = new FormData();
  formData.append('logo', logo);
  return apiPost<
    ApiEnvelope<{
      url: string;
      colorTemplatesGenerationStarted?: boolean;
    }>
  >('/api/v1/user/upload-logo', formData);
};

export const getProfile = async () => {
  return apiGet<ApiEnvelope<{ profile: BusinessProfile }>>(
    '/api/v1/user/profile'
  );
};

export const updateProfile = async (profile: unknown) => {
  return apiPut<ApiEnvelope>('/api/v1/user/profile', profile);
};

export const updateUserName = async (name: string) => {
  return apiPut<ApiEnvelope>('/api/v1/user/update-user-name', { name });
};

export const logoutUser = async () => {
  return apiPost<ApiEnvelope>('/api/v1/user/logout');
};

export type SupportTicketType = 'support' | 'bug' | 'refund';

export const sendSupportMessage = async (
  name: string,
  email: string,
  message: string,
  type: SupportTicketType = 'support'
) => {
  return apiPost<ApiEnvelope>('/api/v1/user/send-support-message', {
    name,
    email,
    message,
    type,
  });
};

export const getSupportMessages = async () => {
  return apiGet<ApiEnvelope<{ supportData: SupportMessage[] }>>(
    '/api/v1/user/get-support-messages'
  );
};

/** Gallery / generation pipeline that produced this image. Backend uses
 *  this to set `GeneratedBy` on the scheduled-post doc so the scheduled-post
 *  list shows the correct pipeline tag (e.g. "Instant" vs "Product advert"). */
export type ScheduleUserPostSource = 'instant-generation' | 'productadvert';

/** Library / generated media: server already has Firebase path + preview URL. */
export type ScheduleUserPostFromLibrary = {
  imageFilePath: string;
  imageUrl: string;
  message: string;
  time: string;
  platform: string;
  source?: ScheduleUserPostSource;
};

/** Local image: multipart field `file` (matches backend `upload.single('file')`). */
export type ScheduleUserPostFromFile = {
  file: File;
  message: string;
  time: string;
  platform: string;
};

export type ScheduleUserPostInput =
  | ScheduleUserPostFromLibrary
  | ScheduleUserPostFromFile;

export const scheduleUserPost = async (params: ScheduleUserPostInput) => {
  if ('file' in params) {
    const { file, message, time, platform } = params;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('message', message);
    formData.append('time', time);
    formData.append('platform', platform);
    return apiPost<ApiEnvelope>(
      '/api/v1/user/schedule-user-post',
      formData
    );
  }
  const { imageFilePath, imageUrl, message, time, platform, source } = params;
  return apiPost<ApiEnvelope>(
    '/api/v1/user/schedule-user-post',
    {
      imageFilePath,
      imageUrl,
      message,
      time,
      platform,
      ...(source ? { source } : {}),
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
  preferredTime: string,
  useAnalyticsOptimalPostingTime: boolean
) => {
  return apiPost<ApiEnvelope>('/api/v1/user/edit-user-preference', {
    logoPreference,
    emojiUsage,
    socialSalesEmailUsage,
    Caption_Object,
    Need_Approval,
    TimeZone,
    preferredTime,
    useAnalyticsOptimalPostingTime,
  });
};

export type OptimalPostingPlatform = 'facebook' | 'instagram' | 'linkedin';

export type OptimalPostingMeta = {
  sampleSize?: number;
  computedAt?: unknown;
  source?: 'ai_openai' | 'aggregated_posts';
  reasoning?: string;
};

export type UserPreferencesResponse = {
  preferences: {
    [key: string]: any;
    useAnalyticsOptimalPostingTime?: boolean;
    optimalFacebookTime?: string;
    optimalInstagramTime?: string;
    optimalLinkedinTime?: string;
    optimalFacebookMeta?: OptimalPostingMeta;
    optimalInstagramMeta?: OptimalPostingMeta;
    optimalLinkedinMeta?: OptimalPostingMeta;
  };
  selected?: Partial<Record<OptimalPostingPlatform, boolean>>;
  socialStatus?: Partial<
    Record<
      OptimalPostingPlatform,
      { connected?: boolean; status?: string; selectedPageId?: string | null }
    >
  >;
};

export const getUserPreferences = async () => {
  return apiGet<ApiEnvelope<UserPreferencesResponse>>(
    '/api/v1/user/get-user-preferences'
  );
};

export type RefreshOptimalPostingTimeResult = {
  platform: OptimalPostingPlatform;
  optimal: {
    hhmm: string;
    sampleSize: number;
    source: 'ai_openai' | 'aggregated_posts';
    reasoning?: string;
    /**
     * `computed` – fresh value picked this run.
     * `preserved` – compute failed / insufficient data, but the previously
     *               cached value was kept (so the tile doesn't blank out).
     * `absent` – never set; UI will show "—" with a connect hint.
     */
    status?: 'computed' | 'preserved' | 'absent';
  } | null;
};

export const refreshOptimalPostingTime = async (
  platform: OptimalPostingPlatform
) => {
  return apiPost<ApiEnvelope<RefreshOptimalPostingTimeResult>>(
    '/api/v1/user/refresh-optimal-posting-time',
    { platform }
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

export type ScheduledPostUserActionResult = {
  message: string;
  jobId?: string;
  parentJobId?: string;
  platform?: string;
};

export const performActionByUserOnScheduledPost = async (
  postId: string,
  action: string,
  platform: string
) => {
  return apiPost<ApiEnvelope<ScheduledPostUserActionResult>>(
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

export const NOTIFICATION_CATEGORIES = [
  'email',
  'postSuccess',
  'postFailure',
  'newReleases',
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export type NotificationCounts = Record<NotificationCategory, number>;

export const getNotificationCounts = async () => {
  return apiGet<
    ApiEnvelope<{ counts: NotificationCounts; total: number; cap: number }>
  >('/api/v1/user/get-notification-counts');
};

/**
 * Mark one (or all) notification categories as read for the current
 * user. The backend writes `serverTimestamp()` into
 * `users/{uid}.notificationsReadAt.<category>`, which the
 * `NotificationCountsProvider` is subscribed to via `onSnapshot` — so
 * the bell badge clears in real time once Firestore acks the write.
 */
export const markNotificationsRead = async (
  category: NotificationCategory | 'all'
) => {
  return apiPost<ApiEnvelope<{ marked: NotificationCategory[] }>>(
    '/api/v1/user/mark-notifications-read',
    { category }
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
  logo?: string,
  options?: { isRegeneration?: boolean }
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
    isRegeneration: options?.isRegeneration === true,
  });
};

export const getSavedLogoVariants = async (count = 10) => {
  return apiGet<ApiEnvelope<{ variants: string[]; regenerateCount?: number }>>(
    `/api/v1/user/logo-variants/saved?count=${count}`
  );
};

export const saveLogoVariants = async (
  variants: string[],
  options?: { isRegeneration?: boolean }
) => {
  return apiPost<
    ApiEnvelope<{ variants: string[]; regenerateCount?: number }>
  >('/api/v1/user/logo-variants/save', {
    variants,
    isRegeneration: options?.isRegeneration === true,
  });
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

export const generateAiLogoPicks = async (requirements = '', count = 1) => {
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

export const useAiGeneratedLogo = async (publicUrl: string) => {
  return apiPost<ApiEnvelope<{ url: string }>>('/api/v1/user/ai-logo/use', {
    publicUrl,
  });
};

export const getAiGeneratedLogos = async () => {
  return apiGet<ApiEnvelope<{ logos: { url: string; createdAt: string }[] }>>(
    '/api/v1/user/ai-logo/generated'
  );
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
  return apiGet<ApiEnvelope<{ memoryLayer: unknown, memoryLayerEnabled: boolean }>>(
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

/** Per-image user description; max 500 characters (enforced on server). */
export const BRAND_PHOTO_DESCRIPTION_MAX = 500;

export const uploadMemoryLayerBrandPhotos = async (
  files: File[],
  descriptions?: (string | undefined)[]
) => {
  const formData = new FormData();
  for (const f of files) {
    formData.append('photos', f);
  }
  if (descriptions != null) {
    const aligned = files.map((_, i) =>
      (descriptions[i] ?? '')
        .trim()
        .slice(0, BRAND_PHOTO_DESCRIPTION_MAX)
    );
    formData.append('descriptions', JSON.stringify(aligned));
  }
  return apiPost<ApiEnvelope<{ memoryLayer: unknown; uploaded: number; describeJobId?: string; parentJobId?: string }>>(
    '/api/v1/user/memory-layer/brand-photos',
    formData
  );
};

export const putMemoryLayerBrandPhotoDescription = async (
  path: string,
  description: string
) => {
  return apiPut<ApiEnvelope<{ memoryLayer: unknown }>>(
    '/api/v1/user/memory-layer/brand-photos/description',
    { path, description }
  );
};

export const deleteMemoryLayerBrandPhoto = async (path: string) => {
  return apiDelete<ApiEnvelope<{ memoryLayer: unknown }>>(
    '/api/v1/user/memory-layer/brand-photos',
    { path }
  );
};

const MAX_MEMORY_LAYER_PDF_BYTES = 50 * 1024 * 1024;

export const uploadMemoryLayerSourcePdf = async (file: File) => {
  if (file.size > MAX_MEMORY_LAYER_PDF_BYTES) {
    throw new Error('PDF must be 50MB or smaller');
  }
  const formData = new FormData();
  formData.append('pdf', file);
  return apiPost<
    ApiEnvelope<{
      parentJobId: string;
      jobId: string;
      sourceDocumentId: string;
    }>
  >('/api/v1/user/memory-layer/source-pdf', formData);
};

export const toggleMemoryLayerPreference = async (enabled: boolean) => {
  return apiPut<ApiEnvelope>(
    '/api/v1/user/toggle-memory-layer-preference',
    { enabled }
  );
};