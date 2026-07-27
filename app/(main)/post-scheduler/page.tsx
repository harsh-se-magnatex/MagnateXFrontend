'use client';

import { PageLoadingState } from '@/components/shared/PageLoadingState';
import { NonSubscribedFeatureBlock } from '@/components/shared/NonSubscribedFeatureBlock';
import { isPlanInactive } from '@/lib/plan-access';
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
  Film,
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
import {
  isScheduleTimeInPast,
  PAST_SCHEDULE_TIME_MESSAGE,
} from '@/lib/schedule-time-validation';
import { useUserPlanCredits } from '../_components/UserPlanCreditsProvider';
import { useTimestampFormatter } from '@/lib/user-timezone';
import { normalizePreferredPostingTime } from '@/utils/preferredPostingTime';
import { useTourDemo } from '@/src/stores/tourState';
import { CarouselSwipePreview } from '@/components/shared/CarouselSwipePreview';
import {
  peekPostSchedulerPrefill,
  clearPostSchedulerPrefill,
  type PostSchedulerPrefillPayload,
  type PostSchedulerPrefillSource,
} from '@/lib/post-scheduler-prefill-store';
import { useProductAdvertState } from '@/src/stores/productAdvertState';
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
const ACCEPTED_VIDEO_TYPES = ['video/mp4'];
const VIDEO_UPLOAD_PLATFORMS = ['facebook', 'instagram', 'linkedin'] as const;
const LINKEDIN_MAX_VIDEO_BYTES = 500 * 1024 * 1024;
const FACEBOOK_MAX_VIDEO_BYTES = 190 * 1024 * 1024;
const INSTAGRAM_MAX_VIDEO_BYTES = 190 * 1024 * 1024;

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

function getUploadMediaType(file: File): 'image' | 'video' | null {
  if (ACCEPTED_IMAGE_TYPES.includes(file.type)) return 'image';
  if (ACCEPTED_VIDEO_TYPES.includes(file.type)) return 'video';
  return null;
}

export default function PostSchedulePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedMediaFile, setSelectedMediaFile] = useState<File | null>(null);
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
      mediaType?: 'image' | 'video' | 'carousel';
      videoUrl?: string;
      videoFilePath?: string;
      videoPosterUrl?: string;
      videoPosterPath?: string;
      carouselSlides?: Array<{
        index?: number;
        imageUrl: string;
        imageFilePath: string;
        headline?: string | null;
        purpose?: string | null;
        visualType?: string | null;
      }>;
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

  const selectedMediaType = selectedMediaFile
    ? getUploadMediaType(selectedMediaFile)
    : null;
  const singlePrefilledPost = isPrefilledFlow && prefilledPosts.length === 1
    ? prefilledPosts[0]
    : null;
  const prefilledMediaType = singlePrefilledPost?.mediaType;
  const hasMedia =
    selectedMediaFile !== null ||
    Boolean(prefilledImageUrl) ||
    Boolean(singlePrefilledPost?.videoUrl) ||
    (singlePrefilledPost?.mediaType === 'carousel' &&
      (singlePrefilledPost.carouselSlides?.length ?? 0) >= 2);
  const hasMessageOnly = !hasMedia && message.trim().length > 0;
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
  const maxScheduleDate = planExpiresAt
    ? fmtTimestamp(planExpiresAt, { format: 'yyyy-MM-dd' })
    : formattedToday;
  const inputLabel = hasMedia ? 'Caption' : 'Message';

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
  const selectedSinglePlatform =
    !isPrefilledFlow && genPlatforms.length === 1 ? genPlatforms[0] : null;
  const supportsVideoUploadSelection =
    !isPrefilledFlow &&
    selectedSinglePlatform !== null &&
    VIDEO_UPLOAD_PLATFORMS.includes(
      selectedSinglePlatform as (typeof VIDEO_UPLOAD_PLATFORMS)[number]
    );
  const acceptsVideoUpload =
    supportsVideoUploadSelection || genPlatforms.length === 0;
  const fileInputAccept = acceptsVideoUpload
    ? [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES].join(',')
    : ACCEPTED_IMAGE_TYPES.join(',');
  const hasInvalidVideoPlatformSelection =
    selectedMediaType === 'video' &&
    (!supportsVideoUploadSelection || isPrefilledFlow);

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
      if (!prefs) return normalizePreferredPostingTime(undefined);
      const optimalTime = prefs[OPTIMAL_TIME_FIELD[platform]];
      if (prefs.useAnalyticsOptimalPostingTime && optimalTime) {
        return normalizePreferredPostingTime(optimalTime, optimalTime);
      }
      return normalizePreferredPostingTime(prefs.preferredTime);
    },
    [billing?.preferences]
  );

  useEffect(() => {
    if (!billing?.preferences || schedulePlatforms.length === 0) return;
    setPlatformSchedules((current) => {
      let changed = false;
      const next = { ...current };
      for (const platform of schedulePlatforms) {
        const slot = next[platform] ?? { date: '', time: '' };
        if (slot.time) continue;
        const time = preferredTimeForPlatform(platform);
        next[platform] = { ...slot, time };
        changed = true;
      }
      return changed ? next : current;
    });
  }, [billing?.preferences, schedulePlatforms, preferredTimeForPlatform]);

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
      setSelectedMediaFile(null);
      return;
    }
    const mediaType = getUploadMediaType(file);
    if (!mediaType) {
      setImageError('Please use a valid image (JPEG, PNG, GIF, WebP) or MP4 video.');
      return;
    }
    if (mediaType === 'video' && !acceptsVideoUpload) {
      setImageError(
        'MP4 video uploads are currently supported only for single-platform Facebook, Instagram, or LinkedIn posts.'
      );
      return;
    }
    if (
      mediaType === 'video' &&
      selectedSinglePlatform === 'linkedin' &&
      file.size > LINKEDIN_MAX_VIDEO_BYTES
    ) {
      setImageError('LinkedIn video uploads must be 500MB or smaller.');
      return;
    }
    if (
      mediaType === 'video' &&
      selectedSinglePlatform === 'facebook' &&
      file.size > FACEBOOK_MAX_VIDEO_BYTES
    ) {
      setImageError('Facebook video uploads must be 190MB or smaller.');
      return;
    }
    if (
      mediaType === 'video' &&
      selectedSinglePlatform === 'instagram' &&
      file.size > INSTAGRAM_MAX_VIDEO_BYTES
    ) {
      setImageError('Instagram video uploads must be 190MB or smaller.');
      return;
    }
    setPrefilledImageUrl('');
    setPrefilledImageFilePath('');
    setSelectedMediaFile(file);
  }, [acceptsVideoUpload, selectedSinglePlatform]);

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
    setSelectedMediaFile(null);
    setPrefilledImageUrl('');
    setPrefilledImageFilePath('');
    setPrefilledPosts([]);
    setIsPrefilledFlow(false);
    setImageError(null);
  };

  // Wipes every input on the scheduler form. Called after a successful
  // schedule so that staying on (or returning to) /post-scheduler shows a
  // fresh composer instead of the just-submitted post's caption, image,
  // schedule slots, and selected platforms.
  const resetSchedulerForm = () => {
    clearPostSchedulerPrefill();
    setSelectedMediaFile(null);
    setPrefilledImageUrl('');
    setPrefilledImageFilePath('');
    setPrefilledPosts([]);
    setPrefilledSource(undefined);
    setIsPrefilledFlow(false);
    setMessage('');
    setPlatformSchedules({});
    setGenPlatforms([]);
    setImageError(null);
  };

  const previewUrl = useMemo(() => {
    if (selectedMediaFile) return URL.createObjectURL(selectedMediaFile);
    return prefilledImageUrl;
  }, [selectedMediaFile, prefilledImageUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl && selectedMediaFile) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl, selectedMediaFile]);

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
  /** Gallery / product-advert prefills carry a fixed image — no clearing it. */
  const canRemoveImage = !isPrefilledFlow;
  const hasValidPlatformTarget = isPrefilledFlow
    ? prefilledPosts.length > 0 &&
    prefilledPosts.every((post) => PLATFORM_ORDER.includes(post.platform))
    : platformSelection.ok;
  const hasCompletePlatformSchedules =
    schedulePlatforms.length > 0 &&
    schedulePlatforms.every((platform) => getScheduledAtIso(platform).length > 0);
  const hasPastPlatformSchedules =
    hasCompletePlatformSchedules &&
    schedulePlatforms.some((platform) => {
      const slot = platformSchedules[platform];
      return Boolean(
        slot?.date && slot?.time && isScheduleTimeInPast(slot.date, slot.time)
      );
    });
  const pastScheduleTimeError = hasPastPlatformSchedules
    ? PAST_SCHEDULE_TIME_MESSAGE
    : null;
  const hasAllPlatformCaptions =
    !isMultiPrefilledSchedule ||
    prefilledPosts.some((post) => post.message.trim().length > 0);
  const canSchedule =
    (isPrefilledFlow
      ? hasAllPlatformCaptions || message.trim().length > 0
      : message.trim().length > 0) &&
    hasMedia &&
    hasValidPlatformTarget &&
    hasCompletePlatformSchedules &&
    !hasPastPlatformSchedules &&
    !hasInvalidVideoPlatformSelection &&
    hasSelectablePlatforms &&
    !showSelectAccountsFirst;

  useEffect(() => {
    if (!loading && !user) router.replace('/sign-in');
  }, [loading, user, router]);

  useEffect(() => {
    const prefillParam = searchParams.get('prefill');
    const shouldPrefill =
      prefillParam === 'product-advert' ||
      prefillParam === 'gallery' ||
      prefillParam === 'carousel';
    if (!shouldPrefill) return;
    // Peek (do not clear) so React Strict Mode remounts can re-apply carousel /
    // video slides. Cleared only after a successful schedule via resetSchedulerForm.
    const payload = peekPostSchedulerPrefill() as
      | PostSchedulerPrefillPayload
      | null;
    if (!payload) return;

    const parsedPosts = Array.isArray(payload.posts)
      ? payload.posts
        .map((item) => {
          const rawSource = item?.source;
          const source: PostSchedulerPrefillSource | undefined =
            rawSource === 'instant-generation' ||
            rawSource === 'productadvert' ||
            rawSource === 'videoGeneration' ||
            rawSource === 'carouselGeneratedPosts'
              ? rawSource
              : undefined;
          const carouselSlides = Array.isArray(item?.carouselSlides)
            ? item.carouselSlides
                .map((slide, i) => ({
                  index:
                    typeof slide?.index === 'number' ? slide.index : i + 1,
                  imageUrl: String(slide?.imageUrl ?? '').trim(),
                  imageFilePath: String(slide?.imageFilePath ?? '').trim(),
                  headline:
                    typeof slide?.headline === 'string' ? slide.headline : null,
                  purpose:
                    typeof slide?.purpose === 'string' ? slide.purpose : null,
                  visualType:
                    typeof slide?.visualType === 'string'
                      ? slide.visualType
                      : null,
                }))
                .filter((s) => s.imageUrl && s.imageFilePath)
            : undefined;
          return {
            imageUrl: String(item?.imageUrl ?? '').trim(),
            imageFilePath: String(item?.imageFilePath ?? '').trim(),
            mediaType:
              item?.mediaType === 'video' ||
              item?.mediaType === 'image' ||
              item?.mediaType === 'carousel'
                ? item.mediaType
                : carouselSlides && carouselSlides.length >= 2
                  ? ('carousel' as const)
                  : undefined,
            videoUrl: String(item?.videoUrl ?? '').trim(),
            videoFilePath: String(item?.videoFilePath ?? '').trim(),
            videoPosterUrl: String(item?.videoPosterUrl ?? '').trim(),
            videoPosterPath: String(item?.videoPosterPath ?? '').trim(),
            ...(carouselSlides && carouselSlides.length >= 2
              ? { carouselSlides }
              : {}),
            message: String(item?.message ?? '').trim(),
            platform: String(item?.platform ?? '').toLowerCase() as SchedulerPlatform,
            source,
          };
        })
        .filter(
          (item) =>
            (item.mediaType === 'carousel'
              ? (item.carouselSlides?.length ?? 0) >= 2
              : item.mediaType === 'video'
                ? !!item.videoUrl && !!item.videoFilePath
                : !!item.imageUrl) &&
            PLATFORM_ORDER.includes(item.platform)
        )
      : [];
    if (parsedPosts.length > 0) {
      const first = parsedPosts[0];
      const previewUrl =
        first.mediaType === 'video'
          ? first.videoPosterUrl || first.imageUrl || first.videoUrl
          : first.mediaType === 'carousel'
            ? first.carouselSlides?.[0]?.imageUrl || first.imageUrl
            : first.imageUrl;
      setIsPrefilledFlow(true);
      setPrefilledPosts(parsedPosts);
      setPrefilledImageUrl(previewUrl);
      setPrefilledImageFilePath(
        first.mediaType === 'video'
          ? ''
          : first.mediaType === 'carousel'
            ? first.carouselSlides?.[0]?.imageFilePath || first.imageFilePath
            : first.imageFilePath
      );
      setPrefilledSource(parsedPosts[0].source);
      setMessage(parsedPosts[0].message);
    }
  }, [searchParams]);

  if (loading || creditsLoading) return <PageLoadingState message="Loading your account..." />;
  if (!user) return null;
  const handleSchedulePost = async () => {
    if (isTourDemo) return;
    if (!canSchedule) return;
    // Tracks whether this run consumed a Product Advert prefill so we can
    // wipe the product-advert form state on success (prompt, platforms,
    // generated result, etc.). Without this, navigating back to
    // /product-advert after scheduling would still show the stale inputs
    // and result until a hard refresh.
    let didConsumeProductAdvert = false;
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
        didConsumeProductAdvert = postsToSchedule.some(
          (post) => post.source === 'productadvert'
        );
        await Promise.all(
          postsToSchedule.map(async (post) => {
            const scheduledAtIso = getScheduledAtIso(post.platform);
            if (!scheduledAtIso) {
              throw new Error(
                `Choose a schedule time for ${formatPlatformLabel(post.platform)}.`
              );
            }
            const isVideoPost = post.mediaType === 'video';
            const isCarouselPost = post.mediaType === 'carousel';
            const videoFilePath = String(post.videoFilePath ?? '').trim();
            const videoUrl = String(post.videoUrl ?? '').trim();
            const carouselSlides = Array.isArray(post.carouselSlides)
              ? post.carouselSlides.filter(
                  (s) =>
                    String(s.imageUrl ?? '').trim() &&
                    String(s.imageFilePath ?? '').trim()
                )
              : [];
            const pathReady = isCarouselPost
              ? carouselSlides.length >= 2
              : isVideoPost
                ? videoFilePath.length > 0 && videoUrl.length > 0
                : post.imageFilePath.trim().length > 0;
            if (isCarouselPost && carouselSlides.length < 2) {
              throw new Error(
                'Carousel posts need at least 2 slides with saved image paths.'
              );
            }
            if (!pathReady) {
              throw new Error(
                isVideoPost
                  ? 'Video post is missing videoFilePath / videoUrl. Re-open from the gallery or generate again.'
                  : isCarouselPost
                    ? 'Carousel posts need at least 2 slides with saved image paths.'
                    : 'Image post is missing imageFilePath / imageUrl.'
              );
            }
            return scheduleUserPost({
              ...(isCarouselPost
                ? {
                    mediaType: 'carousel' as const,
                    carouselSlides,
                    imageFilePath:
                      carouselSlides[0]?.imageFilePath || post.imageFilePath,
                    imageUrl: carouselSlides[0]?.imageUrl || post.imageUrl,
                  }
                : isVideoPost
                  ? {
                      mediaType: 'video' as const,
                      videoFilePath,
                      videoUrl,
                      ...(post.videoPosterPath
                        ? { videoPosterPath: post.videoPosterPath }
                        : {}),
                      ...(post.videoPosterUrl
                        ? { videoPosterUrl: post.videoPosterUrl }
                        : {}),
                    }
                  : {
                      imageFilePath: post.imageFilePath,
                      imageUrl: post.imageUrl,
                    }),
              message: post.message || message,
              time: scheduledAtIso,
              platform: post.platform,
              ...(post.source ? { source: post.source } : {}),
            });
          })
        );
        toast.success(
          postsToSchedule.length > 1
            ? 'Posts scheduled successfully'
            : 'Post scheduled successfully'
        );
        if (didConsumeProductAdvert) {
          useProductAdvertState.getState().resetForm();
        }
        resetSchedulerForm();
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
      if (prefilledSource === 'productadvert') {
        didConsumeProductAdvert = true;
      }

      await Promise.all(
        platformsToSchedule.map(async (platformKey) => {
          const scheduledAtIso = getScheduledAtIso(platformKey);
          if (!scheduledAtIso) {
            throw new Error(
              `Choose a schedule time for ${formatPlatformLabel(platformKey)}.`
            );
          }
          if (selectedMediaFile) {
            return scheduleUserPost({
              file: selectedMediaFile,
              mediaType: selectedMediaType ?? 'image',
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
          throw new Error('Please attach media before scheduling.');
        })
      );
      toast.success(
        platformsToSchedule.length > 1
          ? 'Posts scheduled successfully'
          : 'Post scheduled successfully'
      );
      if (didConsumeProductAdvert) {
        useProductAdvertState.getState().resetForm();
      }
      resetSchedulerForm();
    } catch (error) {
      showErrorToast('Failed to schedule post');
    } finally {
      setPostLoading(false);
    }
  };

  if (!isTourDemo && isPlanInactive(billing)) {
    return <NonSubscribedFeatureBlock />;
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
                  {hasMedia ? (
                    <div className="p-4 relative flex justify-center">
                      <div className="relative group rounded-xl overflow-hidden shadow-sm">
                        {selectedMediaType === 'video' && selectedMediaFile ? (
                          <video
                            controls
                            className="max-h-[300px] object-contain bg-black"
                            src={previewUrl ?? ''}
                          />
                        ) : prefilledMediaType === 'video' &&
                          singlePrefilledPost?.videoUrl ? (
                          <video
                            controls
                            poster={singlePrefilledPost.videoPosterUrl || prefilledImageUrl}
                            className="max-h-[300px] object-contain bg-black"
                            src={singlePrefilledPost.videoUrl}
                          />
                        ) : prefilledMediaType === 'carousel' &&
                          (singlePrefilledPost?.carouselSlides?.length ?? 0) >=
                            2 ? (
                          <div className="w-full max-w-sm">
                            <CarouselSwipePreview
                              slides={(
                                singlePrefilledPost?.carouselSlides ?? []
                              ).map((s) => ({
                                index: s.index,
                                imageUrl: s.imageUrl,
                                headline: s.headline,
                              }))}
                              imageClassName="max-h-[300px] object-contain bg-slate-100"
                              showCaptions
                            />
                          </div>
                        ) : (
                          <img
                            src={previewUrl ?? ''}
                            alt="Post preview"
                            className="max-h-[300px] object-contain bg-slate-100"
                          />
                        )}
                        {isSinglePrefilledSchedule && prefilledPosts[0]?.platform && (
                          <p className="mt-3 text-center">
                            <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                              {formatPlatformLabel(prefilledPosts[0].platform)}
                            </span>
                          </p>
                        )}
                        {prefilledImageUrl && !selectedMediaFile ? (
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
                        {canRemoveImage ? (
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
                        ) : null}
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
                        accept={fileInputAccept}
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
                        {acceptsVideoUpload ? (
                          <Film className="h-6 w-6" />
                        ) : (
                          <ImageIcon className="h-6 w-6" />
                        )}
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
                            : acceptsVideoUpload && selectedSinglePlatform === 'facebook'
                                ? 'JPEG, PNG, GIF, WebP, or MP4. MP4 is Facebook-only here.'
                                : acceptsVideoUpload && selectedSinglePlatform === 'instagram'
                                  ? 'JPEG, PNG, GIF, WebP, or MP4. MP4 is Instagram-only here.'
                                : acceptsVideoUpload && selectedSinglePlatform === 'linkedin'
                                  ? 'JPEG, PNG, GIF, WebP, or MP4. MP4 is LinkedIn-only here.'
                                  : 'SVG, PNG, JPG or GIF'}
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
                    hasMedia
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
                      {post.mediaType === 'video' && post.videoUrl ? (
                        <video
                          controls
                          poster={post.videoPosterUrl || post.imageUrl}
                          className="w-full rounded-lg border border-slate-100 bg-black aspect-square object-contain"
                          src={post.videoUrl}
                        />
                      ) : (
                        <img
                          src={post.imageUrl}
                          alt={formatPlatformLabel(post.platform)}
                          className="w-full rounded-lg object-contain bg-white border border-slate-100 aspect-square"
                        />
                      )}
                      <div className="absolute top-1.5 right-1.5">
                        <ImagePreviewButton
                          variant="overlay-icon"
                          onClick={() =>
                            imagePreview.open(
                              post.videoPosterUrl || post.imageUrl,
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
                      <div className="flex items-center gap-2">
                        {isPrefilledFlow ? (
                          <input
                            type="checkbox"
                            checked
                            readOnly
                            aria-label={`${formatPlatformLabel(platform)} selected`}
                            className="size-4 shrink-0 rounded border-slate-300 text-indigo-600 disabled:cursor-default disabled:opacity-100"
                          />
                        ) : null}
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                          {formatPlatformLabel(platform)}
                        </p>
                      </div>
                      <div>
                        <label className="mb-1.5 text-sm font-medium text-slate-700 flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-400" /> Date
                        </label>
                        <input
                          type="date"
                          min={formattedToday}
                          max={maxScheduleDate}
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
            {hasInvalidVideoPlatformSelection && (
              <p className="text-xs text-amber-700">
                MP4 uploads can only be scheduled as a single-platform Facebook, Instagram, or LinkedIn post.
              </p>
            )}
          </div>

          {pastScheduleTimeError && (
            <p className="text-sm text-red-600">{pastScheduleTimeError}</p>
          )}

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
