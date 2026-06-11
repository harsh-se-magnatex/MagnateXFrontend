'use client';

import { PageLoadingState } from '@/components/shared/PageLoadingState';
import { useAuth } from '@/src/hooks/useAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  WORKSPACE_NAV_HREFS,
  workspacePageTitle,
} from '@/lib/workspace-nav';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react';
import {
  Calendar,
  Clock,
  Image as ImageIcon,
  Send,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  allPlatformsSelectionLabel,
  areAllEnabledSelected,
  listEnabledPlatforms,
  togglePlatformSelection,
  validateGenerationPlatformSelection,
  type SocialPlatform,
} from '@/lib/platform-selection';
import { scheduleUserPost } from '@/src/service/api/userService';
import { getTodatDate } from '@/utils/getTodayDate';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/show-error-toast';
import { useUserPlanCredits } from '../_components/UserPlanCreditsProvider';
import { useTimestampFormatter } from '@/lib/user-timezone';
import { useTourDemo } from '@/src/stores/tourState';
import {
  consumePostSchedulerPrefill,
  type PostSchedulerPrefillPayload,
  type PostSchedulerPrefillSource,
} from '@/lib/post-scheduler-prefill-store';
import {
  ImagePreviewButton,
  ImagePreviewOverlay,
  useImagePreview,
} from '@/components/image-preview';

const inputBase =
  'w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all';

const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

const PLATFORM_ORDER = ['instagram', 'facebook', 'linkedin'] as const;
type SchedulerPlatform = SocialPlatform;
type PlatformScheduleMap = Partial<
  Record<SchedulerPlatform, { date: string; time: string }>
>;

const OPTIMAL_TIME_FIELD: Record<
  SchedulerPlatform,
  'optimalFacebookTime' | 'optimalInstagramTime' | 'optimalLinkedinTime'
> = {
  facebook: 'optimalFacebookTime',
  instagram: 'optimalInstagramTime',
  linkedin: 'optimalLinkedinTime',
};

function firstEnabledPlatform(
  accounts: Partial<Record<SchedulerPlatform, boolean>> | null | undefined
): SchedulerPlatform | undefined {
  if (!accounts) return undefined;
  return PLATFORM_ORDER.find((p) => accounts[p] === true);
}

/** Firestore timestamp as returned from API (seconds + nanoseconds) */
type FirestoreTimestamp = {
  _seconds: number;
  _nanoseconds: number;
};

export type ScheduledPost = {
  message: string;
  imageUrl: string | null;
  scheduleAt: FirestoreTimestamp;
  platform: string;
  postStatus: 'pending' | 'processing' | 'posted' | 'failed';
  failedAt: FirestoreTimestamp | null;
  error: string | null;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
  postedAt: FirestoreTimestamp | null;
};


function formatPlatformLabel(platform: string): string {
  if (platform === 'instagram') return 'Instagram';
  if (platform === 'facebook') return 'Facebook';
  if (platform === 'linkedin') return 'LinkedIn';
  return platform;
}

function isValidImageFile(file: File): boolean {
  return ACCEPTED_IMAGE_TYPES.includes(file.type);
}

export default function PostSchedulePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const imagePreview = useImagePreview();
  const [prefilledImageUrl, setPrefilledImageUrl] = useState<string>(
    ''
  );
  const [prefilledImageFilePath, setPrefilledImageFilePath] = useState<string>(
    ''
  );
  const [prefilledPosts, setPrefilledPosts] = useState<
    Array<{
      imageUrl: string;
      imageFilePath: string;
      message: string;
      platform: SchedulerPlatform;
      source?: PostSchedulerPrefillSource;
    }>
  >([]);
  const [prefilledSource, setPrefilledSource] = useState<
    PostSchedulerPrefillSource | undefined
  >(undefined);
  const [isPrefilledFlow, setIsPrefilledFlow] = useState(false);
  const [message, setMessage] = useState('');
  const [platformSchedules, setPlatformSchedules] =
    useState<PlatformScheduleMap>({});
  const [genPlatforms, setGenPlatforms] = useState<SocialPlatform[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [postLoading, setPostLoading] = useState(false);

  const hasImage = selectedImage !== null || Boolean(prefilledImageUrl);
  const hasMessageOnly = !hasImage && message.trim().length > 0;
  const imageAreaDisabled = hasMessageOnly;
  const formattedToday = getTodatDate();
  const { billing, loading: creditsLoading } = useUserPlanCredits();
  const fmtTimestamp = useTimestampFormatter();
  const isTourDemo = useTourDemo();
  const selectedAccounts = billing?.selected;
  const planExpiresAt = billing?.planExpiresAt;
  const formattedPlanExpiresAt = planExpiresAt
    ? fmtTimestamp(planExpiresAt)
    : '—';
  const inputLabel = hasImage ? 'Caption' : 'Message';

  const hasSelectablePlatforms = useMemo(
    () => !!firstEnabledPlatform(selectedAccounts),
    [selectedAccounts]
  );

  const showSelectAccountsFirst =
    !creditsLoading && billing != null && !hasSelectablePlatforms;

  const allowedPlatforms = useMemo(
    () => listEnabledPlatforms(selectedAccounts),
    [selectedAccounts]
  );

  const platformSelection = useMemo(
    () =>
      validateGenerationPlatformSelection({
        selected: genPlatforms,
        enabled: allowedPlatforms,
        activePlan: billing?.activePlan,
      }),
    [genPlatforms, allowedPlatforms, billing?.activePlan]
  );

  const allPlatformsSelected = areAllEnabledSelected(
    genPlatforms,
    allowedPlatforms
  );

  const schedulePlatforms = useMemo(() => {
    const platforms = isPrefilledFlow
      ? prefilledPosts.map((post) => post.platform)
      : genPlatforms;
    return PLATFORM_ORDER.filter((platform) => platforms.includes(platform));
  }, [genPlatforms, isPrefilledFlow, prefilledPosts]);

  const setPlatformScheduleValue = useCallback(
    (
      platform: SchedulerPlatform,
      patch: Partial<{ date: string; time: string }>
    ) => {
      setPlatformSchedules((current) => ({
        ...current,
        [platform]: {
          date: current[platform]?.date ?? '',
          time: current[platform]?.time ?? '',
          ...patch,
        },
      }));
    },
    []
  );

  const preferredTimeForPlatform = useCallback(
    (platform: SchedulerPlatform) => {
      const prefs = billing?.preferences;
      if (!prefs) return '';
      const optimalTime = prefs[OPTIMAL_TIME_FIELD[platform]];
      if (prefs.useAnalyticsOptimalPostingTime && optimalTime) {
        return optimalTime;
      }
      return prefs.preferredTime ?? '';
    },
    [billing?.preferences]
  );

  useEffect(() => {
    if (isPrefilledFlow || creditsLoading) return;
    const enabled = listEnabledPlatforms(selectedAccounts);
    if (enabled.length === 0) {
      if (genPlatforms.length > 0) setGenPlatforms([]);
      return;
    }

    const validSelection = genPlatforms.filter((platform) =>
      enabled.includes(platform)
    );

    if (validSelection.length !== genPlatforms.length) {
      setGenPlatforms(validSelection);
    }
  }, [selectedAccounts, genPlatforms, isPrefilledFlow, creditsLoading]);

  function handleToggleGenPlatform(platformToToggle: SocialPlatform) {
    setGenPlatforms(togglePlatformSelection(genPlatforms, platformToToggle));
  }

  function handleSelectAllGenPlatforms() {
    if (allPlatformsSelected) {
      setGenPlatforms([]);
    } else {
      setGenPlatforms([...allowedPlatforms]);
    }
  }

  const handleFile = useCallback((file: File | null) => {
    setImageError(null);
    if (!file) {
      setSelectedImage(null);
      return;
    }
    if (!isValidImageFile(file)) {
      setImageError('Please use a valid image (JPEG, PNG, GIF, or WebP).');
      return;
    }
    setPrefilledImageUrl('');
    setPrefilledImageFilePath('');
    setSelectedImage(file);
  }, []);

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (imageAreaDisabled) return;
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [imageAreaDisabled, handleFile]
  );

  const onDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (imageAreaDisabled) return;
      setIsDragging(true);
    },
    [imageAreaDisabled]
  );

  const onDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const onFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const clearImage = () => {
    setSelectedImage(null);
    setPrefilledImageUrl('');
    setPrefilledImageFilePath('');
    setPrefilledPosts([]);
    setIsPrefilledFlow(false);
    setImageError(null);
  };

  const previewUrl = useMemo(() => {
    if (selectedImage) return URL.createObjectURL(selectedImage);
    return prefilledImageUrl;
  }, [selectedImage, prefilledImageUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl && selectedImage) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl, selectedImage]);

  // UTC ISO string sent to the backend. `new Date(naive)` interprets the
  // naive `YYYY-MM-DDTHH:mm` string as the browser's local time, then
  // `.toISOString()` converts it to UTC, preserving the user's chosen wall time.
  const getScheduledAtIso = useCallback((platform: SchedulerPlatform) => {
    const slot = platformSchedules[platform];
    if (!slot?.date || !slot.time) return '';
    const d = new Date(`${slot.date}T${slot.time}`);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString();
  }, [platformSchedules]);

  const isMultiPrefilledSchedule = isPrefilledFlow && prefilledPosts.length > 1;
  const isSinglePrefilledSchedule = isPrefilledFlow && prefilledPosts.length === 1;
  const hasValidPlatformTarget = isPrefilledFlow
    ? prefilledPosts.length > 0 &&
    prefilledPosts.every((post) => PLATFORM_ORDER.includes(post.platform))
    : platformSelection.ok;
  const hasCompletePlatformSchedules =
    schedulePlatforms.length > 0 &&
    schedulePlatforms.every((platform) => getScheduledAtIso(platform).length > 0);
  const hasAllPlatformCaptions =
    !isMultiPrefilledSchedule ||
    prefilledPosts.some((post) => post.message.trim().length > 0);
  const canSchedule =
    (isPrefilledFlow
      ? hasAllPlatformCaptions || message.trim().length > 0
      : message.trim().length > 0) &&
    hasImage &&
    hasValidPlatformTarget &&
    hasCompletePlatformSchedules &&
    hasSelectablePlatforms &&
    !showSelectAccountsFirst;

  useEffect(() => {
    if (!loading && !user) router.replace('/sign-in');
  }, [loading, user, router]);

  useEffect(() => {
    const prefillParam = searchParams.get('prefill');
    const shouldPrefill =
      prefillParam === 'product-advert' || prefillParam === 'gallery';
    if (!shouldPrefill) return;
    const payload = consumePostSchedulerPrefill() as
      | PostSchedulerPrefillPayload
      | null;
    if (!payload) return;

    const parsedPosts = Array.isArray(payload.posts)
      ? payload.posts
        .map((item) => {
          const rawSource = item?.source;
          const source: PostSchedulerPrefillSource | undefined =
            rawSource === 'instant-generation' || rawSource === 'productadvert'
              ? rawSource
              : undefined;
          return {
            imageUrl: String(item?.imageUrl ?? '').trim(),
            imageFilePath: String(item?.imageFilePath ?? '').trim(),
            message: String(item?.message ?? '').trim(),
            platform: String(item?.platform ?? '').toLowerCase() as SchedulerPlatform,
            source,
          };
        })
        .filter(
          (item) =>
            !!item.imageUrl &&
            PLATFORM_ORDER.includes(item.platform)
        )
      : [];
    if (parsedPosts.length > 0) {
      setIsPrefilledFlow(true);
      setPrefilledPosts(parsedPosts);
      setPrefilledImageUrl(parsedPosts[0].imageUrl);
      setPrefilledImageFilePath(parsedPosts[0].imageFilePath);
      setPrefilledSource(parsedPosts[0].source);
      setMessage(parsedPosts[0].message);
    }
  }, [searchParams]);

  if (loading || creditsLoading) return <PageLoadingState message="Loading your account..." />;
  if (!user) return null;
  const handleSchedulePost = async () => {
    if (isTourDemo) return;
    if (!canSchedule) return;
    try {
      setPostLoading(true);
      const buildFileFromImageUrl = async (imageUrl: string, index: number) => {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        return new File([blob], `product-advert-${Date.now()}-${index}.png`, {
          type: blob.type || 'image/png',
        });
      };

      if (isPrefilledFlow && prefilledPosts.length > 0) {
        const postsToSchedule = prefilledPosts.filter(
          (post) => selectedAccounts?.[post.platform]
        );
        if (postsToSchedule.length === 0) {
          throw new Error('No connected platforms available for scheduling.');
        }
        await Promise.all(
          postsToSchedule.map(async (post) => {
            const scheduledAtIso = getScheduledAtIso(post.platform);
            if (!scheduledAtIso) {
              throw new Error(
                `Choose a schedule time for ${formatPlatformLabel(post.platform)}.`
              );
            }
            const pathReady = post.imageFilePath.trim().length > 0;
            if (pathReady) {
              return scheduleUserPost({
                imageFilePath: post.imageFilePath,
                imageUrl: post.imageUrl,
                message: post.message || message,
                time: scheduledAtIso,
                platform: post.platform,
                ...(post.source ? { source: post.source } : {}),
              });
            }
            const fileFromUrl = await buildFileFromImageUrl(post.imageUrl, 0);
            return scheduleUserPost({
              file: fileFromUrl,
              message: post.message || message,
              time: scheduledAtIso,
              platform: post.platform,
            });
          })
        );
        toast.success(
          postsToSchedule.length > 1
            ? 'Posts scheduled successfully'
            : 'Post scheduled successfully'
        );
        return;
      }

      const pathReady =
        prefilledImageFilePath.trim().length > 0 &&
        prefilledImageUrl.trim().length > 0;

      const platformsToSchedule = genPlatforms.filter(
        (p) => selectedAccounts?.[p]
      );
      if (platformsToSchedule.length === 0) {
        throw new Error('No connected platforms available for scheduling.');
      }

      await Promise.all(
        platformsToSchedule.map(async (platformKey) => {
          const scheduledAtIso = getScheduledAtIso(platformKey);
          if (!scheduledAtIso) {
            throw new Error(
              `Choose a schedule time for ${formatPlatformLabel(platformKey)}.`
            );
          }
          if (selectedImage) {
            return scheduleUserPost({
              file: selectedImage,
              message,
              time: scheduledAtIso,
              platform: platformKey,
            });
          }
          if (pathReady) {
            return scheduleUserPost({
              imageFilePath: prefilledImageFilePath,
              imageUrl: prefilledImageUrl,
              message,
              time: scheduledAtIso,
              platform: platformKey,
              ...(prefilledSource ? { source: prefilledSource } : {}),
            });
          }
          if (prefilledImageUrl.trim().length > 0) {
            const fileFromUrl = await buildFileFromImageUrl(
              prefilledImageUrl.trim(),
              0
            );
            return scheduleUserPost({
              file: fileFromUrl,
              message,
              time: scheduledAtIso,
              platform: platformKey,
            });
          }
          throw new Error('Please attach an image before scheduling.');
        })
      );
      toast.success(
        platformsToSchedule.length > 1
          ? 'Posts scheduled successfully'
          : 'Post scheduled successfully'
      );
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : 'Failed to schedule post');
    } finally {
      setPostLoading(false);
    }
  };

  if (!isTourDemo && new Date(formattedPlanExpiresAt).getTime() < new Date().getTime()) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center animate-in fade-in duration-500 pb-20 px-4 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          <span className="block">You are not eligible for this feature.</span>
          <span className="block">
            Please subscribe to a plan to use this feature.
          </span>
        </h1>
        <p className="mt-3 max-w-xl text-base text-slate-600">
          You can subscribe to a plan{' '}
          <Link
            href="/settings/billings"
            className="font-semibold text-indigo-600 underline underline-offset-2 hover:text-indigo-700"
          >
            here
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl animate-in fade-in duration-500 pb-20">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 leading-tight">
          {workspacePageTitle(WORKSPACE_NAV_HREFS.schedulePost)}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
          Schedule your social media content perfectly timed for your audience.
        </p>
      </header>

      <div className="grid gap-8">
        {/* Composer Area */}
        <section
          id="tour-ps-form"
          className="glass-card rounded-3xl p-6 sm:p-8 space-y-6"
        >
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <Send className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">Compose</h2>
          </div>

          {!isMultiPrefilledSchedule ? (
            <>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Media Attachment
                </label>
                <div
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  className={cn(
                    'relative rounded-2xl border-2 border-dashed transition-all',
                    imageAreaDisabled
                      ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60'
                      : isDragging
                        ? 'border-indigo-400 bg-indigo-50/50'
                        : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-100/50'
                  )}
                >
                  {hasImage ? (
                    <div className="p-4 relative flex justify-center">
                      <div className="relative group rounded-xl overflow-hidden shadow-sm">
                        <img
                          src={previewUrl ?? ''}
                          alt="Post preview"
                          className="max-h-[300px] object-contain bg-slate-100"
                        />
                        {isSinglePrefilledSchedule && prefilledPosts[0]?.platform && (
                          <p className="mt-3 text-center">
                            <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                              {formatPlatformLabel(prefilledPosts[0].platform)}
                            </span>
                          </p>
                        )}
                        {prefilledImageUrl && !selectedImage ? (
                          <div className="absolute top-2 left-2 z-10">
                            <ImagePreviewButton
                              variant="overlay-icon"
                              onClick={() =>
                                imagePreview.open(
                                  prefilledImageUrl,
                                  'Prefilled post image'
                                )
                              }
                            />
                          </div>
                        ) : null}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            type="button"
                            onClick={clearImage}
                            disabled={imageAreaDisabled}
                            className="rounded-full bg-white/90 p-2 text-red-600 shadow-sm hover:scale-110 transition-transform disabled:opacity-50"
                            aria-label="Remove image"
                          >
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <label
                      className={cn(
                        'flex flex-col items-center justify-center gap-3 py-10 px-4',
                        imageAreaDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
                      )}
                    >
                      <input
                        type="file"
                        accept={ACCEPTED_IMAGE_TYPES.join(',')}
                        onChange={onFileInputChange}
                        disabled={imageAreaDisabled}
                        className="sr-only"
                      />
                      <div
                        className={cn(
                          'flex h-14 w-14 items-center justify-center rounded-full text-slate-400 bg-white shadow-sm ring-1 ring-slate-100',
                          imageAreaDisabled ? 'opacity-50' : 'text-indigo-500'
                        )}
                      >
                        <ImageIcon className="h-6 w-6" />
                      </div>
                      <div className="text-center">
                        <span className="text-sm font-medium text-slate-700 block">
                          {imageAreaDisabled
                            ? 'Image disabled'
                            : 'Click to upload or drag & drop'}
                        </span>
                        <span className="text-xs text-slate-500 mt-1 block">
                          {imageAreaDisabled
                            ? "You're creating a text-only post"
                            : 'SVG, PNG, JPG or GIF (max. 5MB)'}
                        </span>
                      </div>
                    </label>
                  )}
                </div>
                {imageError && (
                  <p className="mt-2 text-sm text-red-500 flex items-center gap-1.5 font-medium">
                    <AlertCircle className="h-4 w-4" /> {imageError}
                  </p>
                )}
                {hasMessageOnly && (
                  <p className="mt-2 text-sm text-yellow-600 flex items-center gap-1.5 font-medium">
                    <AlertCircle className="h-4 w-4" /> Clear message box to add an
                    image.
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="schedule-message"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  {inputLabel}
                </label>
                <textarea
                  id="schedule-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    hasImage
                      ? 'Add a captivating caption...'
                      : 'What do you want to share?'
                  }
                  rows={5}
                  className={cn(inputBase, 'resize-y min-h-[120px] leading-relaxed')}
                />
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-700">
                Posts to schedule
              </p>
              <p className="text-xs text-slate-500">
                Each post will publish to the platform shown below its image.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {prefilledPosts.map((post, idx) => (
                  <div
                    key={`${post.platform}-${idx}`}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-2"
                  >
                    <div className="relative">
                      <img
                        src={post.imageUrl}
                        alt={formatPlatformLabel(post.platform)}
                        className="w-full rounded-lg object-contain bg-white border border-slate-100 aspect-square"
                      />
                      <div className="absolute top-1.5 right-1.5">
                        <ImagePreviewButton
                          variant="overlay-icon"
                          onClick={() =>
                            imagePreview.open(
                              post.imageUrl,
                              `${formatPlatformLabel(post.platform)} prefilled post`
                            )
                          }
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-center">
                      <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                        {formatPlatformLabel(post.platform)}
                      </span>
                    </p>
                    <p className="mt-2 text-xs text-slate-600 whitespace-pre-line leading-relaxed line-clamp-6">
                      {post.message || 'No caption provided'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-5 space-y-5">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">
              Publish Settings
            </h3>

            {!isPrefilledFlow && (
              <div>
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Platforms
                </span>
                {showSelectAccountsFirst ? (
                  <div
                    role="status"
                    className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950"
                  >
                    <p className="font-medium">Select your accounts first</p>
                    <p className="mt-1 text-amber-900/90">
                      Choose which platforms you use in onboarding or social
                      settings, then come back here to schedule posts.
                    </p>
                    <Link
                      href="/social-media-integration"
                      className="mt-2 inline-block text-sm font-semibold text-amber-950 underline underline-offset-2 hover:text-amber-900"
                    >
                      Open social setup
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-4 sm:gap-6">
                      {allowedPlatforms.map((p) => (
                        <label
                          key={p}
                          htmlFor={`schedule-platform-${p}`}
                          className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800"
                        >
                          <input
                            id={`schedule-platform-${p}`}
                            type="checkbox"
                            checked={genPlatforms.includes(p)}
                            onChange={() => handleToggleGenPlatform(p)}
                            className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30"
                          />
                          <span>{formatPlatformLabel(p)}</span>
                        </label>
                      ))}
                      {allowedPlatforms.length > 1 && (
                        <label
                          htmlFor="schedule-platform-all"
                          className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800"
                        >
                          <input
                            id="schedule-platform-all"
                            type="checkbox"
                            checked={allPlatformsSelected}
                            onChange={handleSelectAllGenPlatforms}
                            className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30"
                          />
                          <span>
                            {allPlatformsSelectionLabel(allowedPlatforms.length)}
                          </span>
                        </label>
                      )}
                    </div>
                    {!platformSelection.ok ? (
                      <p className="mt-2 text-xs text-amber-700">
                        {platformSelection.error}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-slate-500">
                        {allPlatformsSelected
                          ? `Schedules this post on each connected platform (${allowedPlatforms.length}).`
                          : genPlatforms.length > 1
                            ? `Schedules this post on each selected platform (${genPlatforms.length}).`
                            : 'Select one or more platforms for this post.'}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {schedulePlatforms.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {schedulePlatforms.map((platform) => {
                  const slot = platformSchedules[platform] ?? {
                    date: '',
                    time: '',
                  };
                  const suggestedTime = preferredTimeForPlatform(platform);
                  return (
                    <div
                      key={platform}
                      className="rounded-2xl border border-slate-200 bg-white/80 p-3 space-y-3"
                    >
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        {formatPlatformLabel(platform)}
                      </p>
                      <div>
                        <label className="mb-1.5 text-sm font-medium text-slate-700 flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-400" /> Date
                        </label>
                        <input
                          type="date"
                          min={formattedToday}
                          value={slot.date}
                          onChange={(e) =>
                            setPlatformScheduleValue(platform, {
                              date: e.target.value,
                            })
                          }
                          className={inputBase}
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 text-sm font-medium text-slate-700 flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-400" /> Time
                        </label>
                        <input
                          type="time"
                          value={slot.time}
                          onChange={(e) =>
                            setPlatformScheduleValue(platform, {
                              time: e.target.value,
                            })
                          }
                          className={inputBase}
                        />
                        {suggestedTime && (
                          <button
                            type="button"
                            onClick={() =>
                              setPlatformScheduleValue(platform, {
                                time: suggestedTime,
                              })
                            }
                            aria-label={`Use suggested time ${suggestedTime}`}
                            title="Tap to apply this suggested time"
                            className={`group mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all duration-150 active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 ${
                              slot.time === suggestedTime
                                ? 'cursor-default border-indigo-200 bg-indigo-100 text-indigo-700'
                                : 'cursor-pointer border-indigo-200 bg-indigo-50 text-indigo-700 hover:border-indigo-600 hover:bg-indigo-600 hover:text-white hover:shadow-sm'
                            }`}
                          >
                            <Sparkles className="h-3 w-3" />
                            <span>
                              {slot.time === suggestedTime
                                ? `Using suggested ${suggestedTime}`
                                : `Use suggested ${suggestedTime}`}
                            </span>
                          </button>
                        )}
                      </div>
                      {slot.date && slot.time && (
                        <p className="text-xs font-medium text-indigo-600 bg-indigo-50 py-2 px-3 rounded-lg">
                          Will publish on: {slot.date} at {slot.time}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Select a platform to choose a schedule time.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleSchedulePost}
            disabled={!canSchedule || postLoading}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition-all hover:bg-indigo-700 hover:-translate-y-0.5 active:scale-[0.98] disabled:transform-none disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
          >
            {postLoading
              ? 'Scheduling...'
              : !isPrefilledFlow && genPlatforms.length > 1
                ? 'Schedule posts'
                : 'Schedule Post'}
          </button>
        </section>
      </div>
      <ImagePreviewOverlay
        src={imagePreview.previewUrl}
        alt={imagePreview.previewAlt}
        onClose={imagePreview.close}
      />
    </div>
  );
}
