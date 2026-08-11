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
  options?: { name?: string; timeZone?: string }
) => {
  const timeZone = options?.timeZone?.trim() || 'Asia/Calcutta';
  return apiPost<
    ApiEnvelope<{ showRecoveryPopup?: boolean; deletedDocId?: string }>
  >('/api/v1/user/login', {
    idToken,
    intent,
    method,
    ...(options?.name ? { name: options.name } : {}),
    timeZone,
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

export const checkEmailRegistered = async (email: string) => {
  return apiPost<
    ApiEnvelope<{ registered: boolean; providers: string[] }>
  >('/api/v1/user/check-email-registered', { email });
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

export const uploadLogo = async (
  logo: File | string,
  options?: { context?: 'onboarding' }
) => {
  const formData = new FormData();
  formData.append('logo', logo);
  if (options?.context) formData.append('context', options.context);
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
export type ScheduleUserPostSource =
  | 'instant-generation'
  | 'productadvert'
  | 'videoGeneration'
  | 'carouselGeneratedPosts';

export type ScheduleUserPostCarouselSlide = {
  index?: number;
  imageFilePath: string;
  imageUrl: string;
  headline?: string | null;
  purpose?: string | null;
  visualType?: string | null;
};

/** Library / generated media: server already has Firebase path + preview URL. */
export type ScheduleUserPostFromLibrary = {
  message: string;
  time: string;
  platform: string;
  source?: ScheduleUserPostSource;
} & (
  | {
      mediaType?: 'image';
      imageFilePath: string;
      imageUrl: string;
    }
  | {
      mediaType: 'video';
      videoFilePath: string;
      videoUrl: string;
      videoPosterPath?: string;
      videoPosterUrl?: string;
      imageFilePath?: string;
      imageUrl?: string;
    }
  | {
      mediaType: 'carousel';
      carouselSlides: ScheduleUserPostCarouselSlide[];
      imageFilePath?: string;
      imageUrl?: string;
    }
);

/** Local image: multipart field `file` (matches backend `upload.single('file')`). */
export type ScheduleUserPostFromFile = {
  file: File;
  mediaType?: 'image' | 'video';
  message: string;
  time: string;
  platform: string;
};

export type ScheduleUserPostInput =
  | ScheduleUserPostFromLibrary
  | ScheduleUserPostFromFile;

export const scheduleUserPost = async (params: ScheduleUserPostInput) => {
  if ('file' in params) {
    const { file, mediaType, message, time, platform } = params;
    const formData = new FormData();
    formData.append('file', file);
    if (mediaType) {
      formData.append('mediaType', mediaType);
    }
    formData.append('message', message);
    formData.append('time', time);
    formData.append('platform', platform);
    return apiPost<ApiEnvelope>(
      '/api/v1/user/schedule-user-post',
      formData
    );
  }
  const {
    message,
    time,
    platform,
    source,
    ...media
  } = params;
  const body =
    media.mediaType === 'carousel'
      ? {
          mediaType: 'carousel' as const,
          carouselSlides: media.carouselSlides,
          ...(media.imageFilePath ? { imageFilePath: media.imageFilePath } : {}),
          ...(media.imageUrl ? { imageUrl: media.imageUrl } : {}),
        }
      : media.mediaType === 'video'
        ? {
            mediaType: 'video' as const,
            videoFilePath: media.videoFilePath,
            videoUrl: media.videoUrl,
            ...(media.videoPosterPath
              ? { videoPosterPath: media.videoPosterPath }
              : {}),
            ...(media.videoPosterUrl
              ? { videoPosterUrl: media.videoPosterUrl }
              : {}),
            ...(media.imageFilePath ? { imageFilePath: media.imageFilePath } : {}),
            ...(media.imageUrl ? { imageUrl: media.imageUrl } : {}),
          }
        : {
            imageFilePath: media.imageFilePath,
            imageUrl: media.imageUrl,
          };
  return apiPost<ApiEnvelope>(
    '/api/v1/user/schedule-user-post',
    {
      ...body,
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
  socialSalesContactUsage: boolean,
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
    socialSalesContactUsage,
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
  source?: 'ai_openai' | 'aggregated_posts' | 'exploration' | 'refining';
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
    source: 'ai_openai' | 'aggregated_posts' | 'exploration' | 'refining';
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

export type ExamplePostItem = {
  id: string;
  platform: string;
  caption: string;
  imageUrl: string | null;
  index: number;
};

export type ExamplePostsMeta = {
  status: 'running' | 'completed' | 'failed' | null;
  used: boolean;
  expectedCount: number;
  completedCount: number;
  platforms: string[];
  postsPerPlatform: number;
};

export const getUserAIenginePageContext = async () => {
  return apiGet<
    ApiEnvelope<{
      onBoarded: boolean;
      aiEngineSetup?: {
        automationDone?: boolean;
        businessDone?: boolean;
      };
      examplePostsMeta?: ExamplePostsMeta;
      examplePosts?: ExamplePostItem[];
      [key: string]: unknown;
    }>
  >('/api/v1/user/get-user-aiengine-detail');
};

export const generateExamplePostsApi = async () => {
  return apiPost<
    ApiEnvelope<{
      status: 'running';
      platforms: string[];
      expectedCount: number;
      totalJobs: number;
      jobIds: string[];
      postsPerPlatform: number;
    }>
  >('/api/v1/user/generate-example-posts');
};

export const updateAiEngineSetup = async (body: {
  automationDone?: boolean;
  businessDone?: boolean;
}) => {
  return apiPost<
    ApiEnvelope<{
      aiEngineSetup: {
        automationDone: boolean;
        businessDone: boolean;
      };
    }>
  >('/api/v1/user/ai-engine-setup', body);
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
  scheduledPostId?: string;
  platform?: string;
  result?: Record<string, unknown>;
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

/** Backend clears expired plan fields if the Dodo expire webhook was missed. */
export const reconcilePlanApi = async () => {
  return apiPost<
    ApiEnvelope<{
      cleared: boolean;
      reason: string | null;
      activePlan: string;
      planExpiresAt: unknown;
      planStartedAt: unknown;
      mode: 'auto' | 'manual' | null;
    }>
  >('/api/v1/user/reconcile-plan', {});
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

export type GenerateAiLogoOptions = {
  context?: 'onboarding';
  businessName?: string;
  industry?: string;
};

export const generateAiLogoPicks = async (
  requirements = '',
  count = 1,
  options?: GenerateAiLogoOptions
) => {
  return apiPost<
    ApiEnvelope<{
      picks: string[];
      urls?: string[];
      generatedAt: string;
      remaining?: number;
    }>
  >('/api/v1/user/ai-logo/generate', {
    requirements,
    count,
    ...(options?.context ? { context: options.context } : {}),
    ...(options?.businessName
      ? { businessName: options.businessName }
      : {}),
    ...(options?.industry ? { industry: options.industry } : {}),
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

export type NextPlanPlatformsPayload = {
  activePlan: string;
  /** False when expired or non-subscribed after server reconcile. */
  planActive?: boolean;
  planExpiresAt?: number | null;
  targetPlan: string | null;
  maxAllowed: number;
  currentSelected: {
    facebook: boolean;
    instagram: boolean;
    linkedin: boolean;
  };
  pendingSelected: {
    facebook: boolean;
    instagram: boolean;
    linkedin: boolean;
  } | null;
  pendingSelectedForPlan: string | null;
  hasPendingPlanChange: boolean;
  pendingPlanName: string | null;
  nextBillingDate: string | null;
  withinSelectionWindow: boolean;
  selectionComplete: boolean;
};

export const getNextPlanPlatforms = async () => {
  return apiGet<ApiEnvelope<NextPlanPlatformsPayload>>(
    '/api/v1/user/next-plan-platforms'
  );
};

export const selectNextPlanPlatformsApi = async (selected: {
  facebook: boolean;
  instagram: boolean;
  linkedin: boolean;
}) => {
  return apiPost<
    ApiEnvelope<{
      pendingSelected: typeof selected;
      pendingSelectedForPlan: string;
      maxAllowed: number;
      message: string;
    }>
  >('/api/v1/user/select-next-plan-platforms', selected);
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
  return apiGet<
    ApiEnvelope<{
      memoryLayer: unknown;
      memoryLayerEnabled: boolean;
      memoryLayerStrict: boolean;
    }>
  >('/api/v1/user/memory-layer');
};

export const putMemoryLayer = async (body: {
  status: 'in_progress' | 'complete' | 'skipped';
  answers?: MemoryLayerAnswerPayload[];
  selectedProducts?: string[];
  /** Persist updated question options (e.g. custom product chips). */
  questions?: Array<{
    id: string;
    prompt: string;
    type: 'text' | 'textarea' | 'multiselect';
    options?: string[];
    suggestions?: string[];
    multiselectRole?: 'products';
  }>;
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
  return apiPost<
    ApiEnvelope<{ memoryLayer: unknown; uploaded: number; described?: number }>
  >('/api/v1/user/memory-layer/brand-photos', formData);
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
      sourceDocumentId: string;
      memoryLayer: unknown;
      imagesAdded?: number;
    }>
  >('/api/v1/user/memory-layer/source-pdf', formData);
};

export const toggleMemoryLayerPreference = async (opts: {
  enabled?: boolean;
  strict?: boolean;
}) => {
  return apiPut<
    ApiEnvelope<{
      memoryLayerEnabled?: boolean;
      memoryLayerStrict?: boolean;
    }>
  >('/api/v1/user/toggle-memory-layer-preference', opts);
};
