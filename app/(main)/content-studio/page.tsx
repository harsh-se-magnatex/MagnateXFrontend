'use client';

import { useAuth } from '@/src/hooks/useAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react';
import {
  Image as ImageIcon,
  Sparkles,
  Calendar,
  Clock,
  Send,
  CreditCard,
  Expand,
  Video,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  workspaceInputClass,
  workspacePageDescriptionClass,
  workspacePageTitleClass,
} from '@/lib/workspace-ui';
import { PageLoadingState } from '@/components/shared/PageLoadingState';
import { NonSubscribedFeatureBlock } from '@/components/shared/NonSubscribedFeatureBlock';
import { isPlanInactive } from '@/lib/plan-access';
import { getTodatDate } from '@/utils/getTodayDate';
import {
  editVideoAiContentStudio,
  generateAiContentStudio,
  scheduleAiContentStudioPost,
  VIDEO_EDIT_INTENTS,
  VIDEO_EDIT_PLACEMENT_PRESETS,
  VIDEO_EDIT_SCENE_PRESETS,
  VIDEO_EDIT_TOOLS,
  type SchedulePostPayload,
  type StudioVideoEditResult,
  type VideoEditIntentId,
  type VideoEditPlacementPresetId,
  type VideoEditScenePresetId,
  type VideoEditToolId,
} from '@/src/service/api/aiContentStudio';
import { useUserPlanCredits } from '../_components/UserPlanCreditsProvider';
import { useTimestampFormatter } from '@/lib/user-timezone';
import { normalizePreferredPostingTime } from '@/utils/preferredPostingTime';
import Link from 'next/link';
import {
  WORKSPACE_NAV_HREFS,
  workspacePageTitle,
} from '@/lib/workspace-nav';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/show-error-toast';
import {
  isScheduleTimeInPast,
  PAST_SCHEDULE_TIME_MESSAGE,
} from '@/lib/schedule-time-validation';
import { DownloadPngButton } from '@/components/download-png-button';
import { SharePostButton } from '@/components/share-post-button';
import {
  ImagePreviewButton,
  ImagePreviewOverlay,
  useImagePreview,
} from '@/components/image-preview';
import {
  allPlatformsSelectionLabel,
  areAllEnabledSelected,
  listEnabledPlatforms,
  togglePlatformSelection,
  validateGenerationPlatformSelection,
  type SocialPlatform,
} from '@/lib/platform-selection';
import {
  useInstantGeneratedState,
  type CreatedContent,
  type ScheduledItem,
} from '@/src/stores/generatedState';
import { consumeAssistantPrefill } from '@/lib/assistant-prefill-store';
import { useTourDemo } from '@/src/stores/tourState';
import {
  setPostSchedulerPrefill,
  type PostSchedulerPrefillPayload,
} from '@/lib/post-scheduler-prefill-store';

const inputBase = workspaceInputClass;

const scheduleButtonClass =
  'w-full rounded-xl bg-gradient-action px-4 py-3 text-sm font-bold text-white shadow-md shadow-primary-purple/30 transition-all mt-1 hover:brightness-105 hover:-translate-y-0.5 active:scale-[0.98] disabled:transform-none disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:opacity-45 disabled:shadow-none disabled:hover:brightness-100';

const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];


const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
// const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const VIDEO_EDIT_CREDIT_COST = 4;
// const ACCEPTED_TYPES=ACCEPTED_IMAGE_TYPES.concat(ACCEPTED_VIDEO_TYPES);
const ACCEPTED_TYPES=ACCEPTED_IMAGE_TYPES;
type CreateMode = 'image' | 'video';

async function compressToWebP(file: File, maxBytes: number): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  let lo = 0.1;
  let hi = 1.0;
  let best: Blob | null = null;

  for (let i = 0; i < 8; i++) {
    const mid = (lo + hi) / 2;
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))),
        'image/webp',
        mid
      )
    );
    if (blob.size <= maxBytes) {
      best = blob;
      lo = mid;
    } else {
      hi = mid;
    }
  }

  if (!best) {
    best = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))),
        'image/webp',
        lo
      )
    );
  }

  const baseName = file.name.replace(/\.[^.]+$/, '');
  return new File([best!], `${baseName}.webp`, { type: 'image/webp' });
}

const PLATFORM_ORDER = ['instagram', 'facebook', 'linkedin'] as const;

/**
 * Caption block that starts clamped and reveals the full text when the
 * user clicks "View more". Used in places where multiple captions are
 * shown side-by-side and we don't want one long LLM caption to crowd
 * out the others, while still letting the user read every word.
 */
function ExpandableCaption({
  text,
  clampLines = 3,
  className,
}: {
  text: string;
  clampLines?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const trimmed = text?.trim() ?? '';
  if (!trimmed) return null;

  // Cheap heuristic — if the caption is short enough that the clamp
  // would never kick in we don't even render the toggle. ~55 chars per
  // line is a reasonable average for the panel width these captions
  // render in.
  const approxLines = Math.ceil(
    Math.max(trimmed.split('\n').length, trimmed.length / 55)
  );
  const showToggle = approxLines > clampLines;

  const clampClass = (() => {
    switch (clampLines) {
      case 2:
        return 'line-clamp-2';
      case 4:
        return 'line-clamp-4';
      case 5:
        return 'line-clamp-5';
      case 6:
        return 'line-clamp-6';
      case 3:
      default:
        return 'line-clamp-3';
    }
  })();

  return (
    <div className={cn('space-y-1', className)}>
      <p
        className={cn(
          'leading-relaxed whitespace-pre-wrap',
          !expanded && showToggle ? clampClass : null
        )}
      >
        {trimmed}
      </p>
      {showToggle && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-sm"
        >
          {expanded ? 'View less' : 'View more'}
        </button>
      )}
    </div>
  );
}

const OPTIMAL_TIME_FIELD: Record<
  SocialPlatform,
  'optimalFacebookTime' | 'optimalInstagramTime' | 'optimalLinkedinTime'
> = {
  facebook: 'optimalFacebookTime',
  instagram: 'optimalInstagramTime',
  linkedin: 'optimalLinkedinTime',
};

function platformLabel(platform: SocialPlatform): string {
  if (platform === 'instagram') return 'Instagram';
  if (platform === 'facebook') return 'Facebook';
  return 'LinkedIn';
}

function isSocialPlatform(platform: string): platform is SocialPlatform {
  return PLATFORM_ORDER.includes(platform as SocialPlatform);
}

function firstEnabledPlatform(
  accounts: Partial<Record<SocialPlatform, boolean>> | null | undefined
): SocialPlatform | undefined {
  if (!accounts) return undefined;
  return PLATFORM_ORDER.find((p) => accounts[p] === true);
}

export default function AIContentPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Local-only state: non-serializable (File), preview URLs, transient UI.
  const [createMode, setCreateMode] = useState<CreateMode>('image');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [videoResult, setVideoResult] = useState<StudioVideoEditResult | null>(
    null
  );
  const [editTool, setEditTool] = useState<VideoEditToolId>('enhance');
  const [editIntent, setEditIntent] =
    useState<VideoEditIntentId>('professional');
  const [scenePreset, setScenePreset] =
    useState<VideoEditScenePresetId>('modern_office');
  const [placementPreset, setPlacementPreset] =
    useState<VideoEditPlacementPresetId>('in_hand');
  const [productImages, setProductImages] = useState<File[]>([]);
  const imagePreview = useImagePreview();
  const selectedEditTool = useMemo(
    () => VIDEO_EDIT_TOOLS.find((t) => t.id === editTool) ?? VIDEO_EDIT_TOOLS[0],
    [editTool]
  );

  const [isGenerating, setIsGenerating] = useState(false);

  // Session state: in-memory Zustand, survives SPA navigation within the tab.
  const prompt = useInstantGeneratedState((s) => s.prompt);
  const setPrompt = useInstantGeneratedState((s) => s.setPrompt);
  const history = useInstantGeneratedState((s) => s.history);
  const pushHistory = useInstantGeneratedState((s) => s.pushHistory);
  const platformSchedule = useInstantGeneratedState((s) => s.platformSchedule);
  const setPlatformScheduleValue = useInstantGeneratedState(
    (s) => s.setPlatformScheduleValue
  );
  const platform = useInstantGeneratedState((s) => s.schedulePlatform);
  const setPlatform = useInstantGeneratedState((s) => s.setSchedulePlatform)
  const scheduled = useInstantGeneratedState((s) => s.scheduled);
  const pushScheduled = useInstantGeneratedState((s) => s.pushScheduled);
  const { billing, loading: creditsLoading } = useUserPlanCredits();
  const fmtTimestamp = useTimestampFormatter();
  const isTourDemo = useTourDemo();
  const selectedAccounts = billing?.selected;
  const planExpiresAt = billing?.planExpiresAt;
  const formattedPlanExpiresAt = planExpiresAt
    ? fmtTimestamp(planExpiresAt)
    : '—';
  const hasPrompt = prompt.trim().length > 0;

  const hasSelectablePlatforms = useMemo(
    () => isTourDemo || !!firstEnabledPlatform(selectedAccounts),
    [selectedAccounts, isTourDemo]
  );

  const showSelectAccountsFirst =
    !isTourDemo &&
    !creditsLoading &&
    billing != null &&
    !hasSelectablePlatforms;


  const genPlatforms = useInstantGeneratedState((state) => state.genPlatforms);
  const setGenPlatforms = useInstantGeneratedState((state) => state.setGenPlatforms);
  const toggleGenPlatform = useInstantGeneratedState(
    (state) => state.toggleGenPlatform
  );
  const generated = useInstantGeneratedState((state) => state.createdContent);
  const setGenerated = useInstantGeneratedState(
    (state) => state.setCreatedContent
  );
  const selectedRenderedImage = useInstantGeneratedState(
    (state) => state.selectedRenderedImage
  );
  const setSelectedRenderedImage = useInstantGeneratedState(
    (state) => state.setSelectedRenderedImage
  );

  const clearOutput = useInstantGeneratedState((state) => state.clearOutput);
  // On mount: clear in-memory output older than 2 hours within the same tab session.
  useEffect(() => {
    const { generatedAt, clearOutput } = useInstantGeneratedState.getState();
    const TWO_HOURS = 2 * 60 * 60 * 1000;
    if (generatedAt && Date.now() - generatedAt > TWO_HOURS) clearOutput();
  }, []);

  useEffect(() => {
    if (creditsLoading) return;
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
  }, [selectedAccounts, genPlatforms, setGenPlatforms, creditsLoading]);

  useEffect(() => {
    if (creditsLoading) return;
    if (!platform || platform === 'all_platforms') return;
    const first = firstEnabledPlatform(selectedAccounts);
    if (!first) return;
    if (!selectedAccounts?.[platform as SocialPlatform]) {
      setPlatform(first);
    }
  }, [selectedAccounts, platform, creditsLoading]);
  const hasImage = selectedImage !== null;
  const hasVideo = selectedVideo !== null;
  const formattedToday = getTodatDate();
  const maxDate = billing?.planExpiresAt
    ? fmtTimestamp(billing.planExpiresAt, { format: 'yyyy-MM-dd' })
    : formattedToday;
  const credits = billing?.credits;

  const previewUrl = useMemo(
    () => (selectedImage ? URL.createObjectURL(selectedImage) : null),
    [selectedImage]
  );
  const productPreviewUrls = useMemo(
    () => productImages.map((f) => URL.createObjectURL(f)),
    [productImages]
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      for (const url of productPreviewUrls) URL.revokeObjectURL(url);
    };
  }, [productPreviewUrls]);

  useEffect(() => {
    if (!loading && !user) router.replace('/sign-in');
  }, [loading, user, router]);

  const promptParam = searchParams.get('prompt');
  useEffect(() => {
    const q = promptParam?.trim();
    if (q) setPrompt(q);
  }, [promptParam]);

  const assistantPrefillId = searchParams.get('assistantPrefill');
  useEffect(() => {
    if (!assistantPrefillId) return;
    const entry = consumeAssistantPrefill(assistantPrefillId);
    if (!entry || entry.kind !== 'draft_quick') return;
    const payload = entry.payload as {
      prompt?: string;
      platforms?: string[];
    };
    if (typeof payload.prompt === 'string' && payload.prompt.trim()) {
      setPrompt(payload.prompt.trim());
    }
    if (Array.isArray(payload.platforms) && payload.platforms.length) {
      const next = payload.platforms.filter(
        (p): p is SocialPlatform =>
          p === 'instagram' || p === 'facebook' || p === 'linkedin'
      );
      if (next.length) setGenPlatforms(next);
    }
  }, [assistantPrefillId]);

  // Pre-select the platform when arriving from the analytics "What to post
  // next" section. The query string carries the active analytics tab
  // (`?platform=facebook|instagram|linkedin`) so the user lands here with the
  // same platform already chosen for both generation and scheduling.
  const platformParam = searchParams.get('platform');
  useEffect(() => {
    const raw = platformParam?.trim().toLowerCase();
    if (raw !== 'facebook' && raw !== 'instagram' && raw !== 'linkedin') {
      return;
    }
    const next = raw as SocialPlatform;
    if (!selectedAccounts?.[next]) return;

    const createdContent = useInstantGeneratedState.getState().createdContent;
    if (createdContent && createdContent.renderedImages.length > 1) return;

    setGenPlatforms([next]);
    if (!createdContent?.renderedImages.length) {
      setPlatform(next);
    }
  }, [platformParam, selectedAccounts, setGenPlatforms, setPlatform]);

  useEffect(() => {
    if (!generated) return;
    const withImages = generated.renderedImages.filter((r) => r.imageUrl?.trim());
    if (withImages.length > 1 && platform !== 'all_platforms') {
      setPlatform('all_platforms');
    }
  }, [generated, platform, setPlatform]);

  const allowedPlatforms = useMemo(
    () =>
      isTourDemo
        ? ([...PLATFORM_ORDER] as SocialPlatform[])
        : listEnabledPlatforms(selectedAccounts),
    [selectedAccounts, isTourDemo]
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

  const generationCreditCost =
    createMode === 'video'
      ? VIDEO_EDIT_CREDIT_COST
      : genPlatforms.length * 2;
  const allPlatformsSelected = areAllEnabledSelected(
    genPlatforms,
    allowedPlatforms
  );

  const creditOk =
    credits !== undefined &&
    (createMode === 'video'
      ? credits >= VIDEO_EDIT_CREDIT_COST
      : genPlatforms.length === 0 || credits >= generationCreditCost);
  const canGenerate =
    createMode === 'video'
      ? hasVideo &&
        !videoError &&
        creditOk &&
        !isGenerating &&
        platformSelection.ok &&
        (editTool !== 'replace_background' || Boolean(scenePreset)) &&
        (editTool !== 'add_product' ||
          (Boolean(placementPreset) && productImages.length > 0))
      : (hasPrompt || hasImage) &&
        creditOk &&
        !isGenerating &&
        platformSelection.ok;

  const isAllPlatforms = platform === 'all_platforms';
  const activeRenderedImage = useMemo(() => {
    if (selectedRenderedImage?.imageUrl?.trim()) return selectedRenderedImage;
    const images =
      generated?.renderedImages.filter((asset) => asset.imageUrl?.trim()) ?? [];
    if (images.length === 1) return images[0];
    return null;
  }, [generated, selectedRenderedImage]);

  const scheduleTargets = useMemo(() => {
    if (!generated) return [];
    if (isAllPlatforms) {
      return generated.renderedImages
        .filter(
          (asset) => asset.imageUrl?.trim() && isSocialPlatform(asset.platform)
        )
        .map((asset) => ({
          asset,
          platform: asset.platform as SocialPlatform,
        }));
    }
    if (
      activeRenderedImage &&
      isSocialPlatform(activeRenderedImage.platform)
    ) {
      return [
        {
          asset: activeRenderedImage,
          platform: activeRenderedImage.platform as SocialPlatform,
        },
      ];
    }
    return [];
  }, [generated, isAllPlatforms, activeRenderedImage]);

  const hasCompletePlatformSchedules =
    scheduleTargets.length > 0 &&
    scheduleTargets.every((target) => {
      const slot = platformSchedule[target.platform];
      return Boolean(slot?.date && slot?.time);
    });

  const hasPastPlatformSchedules =
    hasCompletePlatformSchedules &&
    scheduleTargets.some((target) => {
      const slot = platformSchedule[target.platform];
      return Boolean(
        slot?.date && slot?.time && isScheduleTimeInPast(slot.date, slot.time)
      );
    });

  const pastScheduleTimeError = hasPastPlatformSchedules
    ? PAST_SCHEDULE_TIME_MESSAGE
    : null;

  const canSchedule =
    !!generated &&
    !isScheduling &&
    hasCompletePlatformSchedules &&
    !hasPastPlatformSchedules;

  const preferredTimeForPlatform = useCallback(
    (targetPlatform: SocialPlatform) => {
      const prefs = billing?.preferences;
      if (!prefs) return normalizePreferredPostingTime(undefined);
      const optimalTime = prefs[OPTIMAL_TIME_FIELD[targetPlatform]];
      if (prefs.useAnalyticsOptimalPostingTime && optimalTime) {
        return normalizePreferredPostingTime(optimalTime, optimalTime);
      }
      return normalizePreferredPostingTime(prefs.preferredTime);
    },
    [billing?.preferences]
  );

  const handleFile = useCallback((file: File | null) => {
    setImageError(null);
    if (!file) {
      setSelectedImage(null);
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setImageError('Please use a valid option (JPEG, PNG, GIF, WebP or MP4).');
      return;
    }
    setSelectedImage(file);
  }, []);

  const handleVideoFile = useCallback((file: File | null) => {
    setVideoError(null);
    if (!file) {
      setSelectedVideo(null);
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setVideoError('Please use a valid option (JPEG, PNG, GIF, WebP or MP4).');
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setVideoError('Video must be 100MB or smaller.');
      return;
    }
    setSelectedVideo(file);
  }, []);

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      if (createMode === 'video') handleVideoFile(file);
      else handleFile(file);
    },
    [createMode, handleFile, handleVideoFile]
  );

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const onFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file?.type.startsWith('video/')) {
      setCreateMode('video');
      setSelectedVideo(file);
    } else {
      setCreateMode('image');
      setSelectedImage(file!);
    }
    e.target.value = '';
  };

  const clearImage = () => {
    if (isGenerating) return;
    setSelectedImage(null);
    setImageError(null);
  };

  const clearVideo = () => {
    if (isGenerating) return;
    setSelectedVideo(null);
    setVideoError(null);
  };

  const switchCreateMode = (mode: CreateMode) => {
    if (isGenerating || mode === createMode) return;
    setCreateMode(mode);
    setGenerateError(null);
    setVideoResult(null);
    if (mode === 'image') {
      setSelectedVideo(null);
      setVideoError(null);
    } else {
      setSelectedImage(null);
      setImageError(null);
      setGenerated(null);
      setSelectedRenderedImage(null);
    }
  };

  const promptForRunRef = useRef<string>('');

  const handleGenerate = async () => {
    if (isTourDemo) return;
    if (!canGenerate) return;

    if (createMode === 'video') {
      if (!selectedVideo) return;
      setVideoResult(null);
      setGenerateError(null);
      promptForRunRef.current = prompt.trim();
      setIsGenerating(true);
      try {
        const response = await editVideoAiContentStudio({
          prompt: prompt.trim(),
          platforms: genPlatforms,
          video: selectedVideo,
          editTool,
          editIntent,
          scenePreset:
            editTool === 'replace_background' ? scenePreset : undefined,
          placementPreset:
            editTool === 'add_product' ? placementPreset : undefined,
          productImages:
            editTool === 'add_product' ? productImages : undefined,
        });
        if (!response.videoUrl?.trim()) {
          throw new Error(
            'The video model did not return a video. Try again.'
          );
        }
        setVideoResult(response);
        toast.success('Edited video is ready');
      } catch (e: unknown) {
        const message = 'Failed to edit video.';
        showErrorToast(message);
        setGenerateError(message);
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    setGenerated(null);
    setGenerateError(null);
    setSelectedRenderedImage(null);
    promptForRunRef.current = prompt.trim();
    setIsGenerating(true);

    try {
      let imageToSend = selectedImage;
      if (selectedImage && selectedImage.size > MAX_IMAGE_BYTES) {
        imageToSend = await compressToWebP(selectedImage, MAX_IMAGE_BYTES);
      }

      const response = await generateAiContentStudio({
        prompt: prompt.trim(),
        platforms: genPlatforms,
        image: imageToSend,
      });

      const renderedImages = response.renderedImages.filter((r) =>
        r.imageUrl?.trim()
      );

      if (renderedImages.length === 0) {
        throw new Error(
          'The image model did not return an image. Try again or pick another platform.'
        );
      }

      const item: CreatedContent = {
        id: crypto.randomUUID(),
        promptSummary:
          promptForRunRef.current ||
          (response.inferredImageContext
            ? response.inferredImageContext
            : 'Image-only'),
        inferredImageContext: response.inferredImageContext,
        renderedImages,
        createdAt: new Date().toISOString(),
      };

      setGenerated(item);
      pushHistory(item);

      if (renderedImages.length === 1 && renderedImages[0].imageUrl) {
        setSelectedRenderedImage(renderedImages[0]);
        setPlatform(renderedImages[0].platform);
      } else if (renderedImages.length > 1) {
        setPlatform('all_platforms');
      }

      toast.success('Content generated successfully');
    } catch (e: unknown) {
      const message = 'Failed to generate content.';
      showErrorToast(message);
      setGenerateError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendVideoToScheduler = () => {
    if (!videoResult?.videoUrl || !videoResult.videoFilePath) return;
    const targetPlatform = (
      isSocialPlatform(videoResult.platform)
        ? videoResult.platform
        : genPlatforms[0]
    ) as SocialPlatform | undefined;
    if (!targetPlatform) return;
    const payload: PostSchedulerPrefillPayload = {
      source: 'gallery',
      createdAt: Date.now(),
      lockedPlatform: targetPlatform,
      posts: [
        {
          imageUrl: videoResult.videoUrl,
          imageFilePath: '',
          mediaType: 'video',
          videoUrl: videoResult.videoUrl,
          videoFilePath: videoResult.videoFilePath,
          message: videoResult.caption?.trim() ?? '',
          platform: targetPlatform,
          source: 'instant-generation',
        },
      ],
    };
    setPostSchedulerPrefill(payload);
    router.push(`${WORKSPACE_NAV_HREFS.schedulePost}?prefill=gallery`);
  };

  const handleSchedule = async () => {
    if (!canSchedule || !generated) return;
    setScheduleError(null);
    setIsScheduling(true);
    try {
      const posts: SchedulePostPayload[] = scheduleTargets.map(
        ({ asset, platform }) => {
          const slot = platformSchedule[platform];
          const when = new Date(`${slot?.date}T${slot?.time}:00`);
          return {
            platform,
            scheduleAt: when.toISOString(),
            message: asset.caption,
            imageUrl: asset.imageUrl,
            imageFilePath: asset.imageFilePath,
          };
        }
      );
      const { scheduledPostId } = await scheduleAiContentStudioPost(
        posts.length === 1 ? posts[0] : posts
      );
      scheduleTargets.forEach(({ asset, platform }) => {
        const slot = platformSchedule[platform];
        const item: ScheduledItem = {
          id: crypto.randomUUID(),
          contentId: generated.id,
          scheduledPostId,
          summary: asset.caption.slice(0, 120),
          scheduledAt: `${slot?.date} at ${slot?.time}`,
          platform,
        };
        pushScheduled(item);
      });

      clearOutput();
      toast.success('Content scheduled successfully');
    } catch (e) {
      showErrorToast('Failed to schedule content.');
    } finally {
      setIsScheduling(false);
      clearOutput();
      setSelectedImage(null);
      setImageError(null);
    }
  };
  const handleToggleGenPlatform = (platformToToggle: SocialPlatform) => {
    if (isTourDemo) return;
    setGenPlatforms(togglePlatformSelection(genPlatforms, platformToToggle));
  };

  const handleSelectAllGenPlatforms = () => {
    if (isTourDemo) return;
    if (allPlatformsSelected) {
      setGenPlatforms([]);
      return;
    }
    setGenPlatforms([...allowedPlatforms]);
  };

  if (loading || creditsLoading) {
    return <PageLoadingState message="Loading your account..." />;
  }

  if (!isTourDemo && isPlanInactive(billing)) {
    return <NonSubscribedFeatureBlock />;
  }

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500 pb-20">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className={workspacePageTitleClass}>
            {workspacePageTitle(WORKSPACE_NAV_HREFS.quickCreate)}
          </h1>
          <p className={workspacePageDescriptionClass}>
            Create image posts.
          </p>
        </div>
        <div className="glass-card rounded-2xl px-4 py-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Credits: 
              <span className="font-semibold text-black text-sm">
              {creditsLoading ? '…' : (credits ?? '—')}{' '}
              </span>
            </p>

            <span className="text-xs font-normal text-slate-500">
                Cost:
                <span className="font-semibold">
                  &nbsp;{generationCreditCost || 2}
                </span>
              </span>
          </div>
        </div>
      </header>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,2fr),minmax(0,1.3fr)]">
        {/* Left: Create & Generate */}
        <section className="glass-card rounded-3xl p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <Sparkles className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">
              Create Quick Content
            </h2>
          </div>
          <div className="space-y-4">
            {createMode === 'video' ? (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    What do you want to do?
                  </label>
                  <p className="mb-2 text-xs text-slate-500">
                    Safe tools keep your scene. Creative tools only change what
                    you explicitly choose.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {VIDEO_EDIT_TOOLS.map((tool) => {
                      const selected = editTool === tool.id;
                      return (
                        <button
                          key={tool.id}
                          type="button"
                          disabled={isGenerating}
                          onClick={() => setEditTool(tool.id)}
                          className={cn(
                            'rounded-xl border px-3 py-2.5 text-left transition-colors',
                            selected
                              ? 'border-indigo-300 bg-indigo-50'
                              : 'border-slate-200 bg-white hover:border-slate-300',
                            isGenerating && 'cursor-not-allowed opacity-60'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900">
                              {tool.label}
                            </span>
                            <span
                              className={cn(
                                'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                                tool.tier === 'safe'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-amber-50 text-amber-800'
                              )}
                            >
                              {tool.tier}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            {tool.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Editing look
                  </label>
                  <p className="mb-2 text-xs text-slate-500">
                    {selectedEditTool.tier === 'safe'
                      ? 'Mood and grade for the polish pass.'
                      : 'Mood for your creative transformation.'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {VIDEO_EDIT_INTENTS.map((intent) => {
                      const selected = editIntent === intent.id;
                      return (
                        <button
                          key={intent.id}
                          type="button"
                          disabled={isGenerating}
                          onClick={() => setEditIntent(intent.id)}
                          className={cn(
                            'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                            selected
                              ? 'border-indigo-300 bg-indigo-50 text-indigo-800'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800',
                            isGenerating && 'cursor-not-allowed opacity-60'
                          )}
                        >
                          {intent.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {editTool === 'replace_background' ? (
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Background scene
                    </label>
                    <p className="mb-2 text-xs text-slate-500">
                      Pick a concrete setting — open text is less reliable.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {VIDEO_EDIT_SCENE_PRESETS.map((preset) => {
                        const selected = scenePreset === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            disabled={isGenerating}
                            onClick={() => setScenePreset(preset.id)}
                            className={cn(
                              'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                              selected
                                ? 'border-amber-300 bg-amber-50 text-amber-900'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                              isGenerating && 'cursor-not-allowed opacity-60'
                            )}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {editTool === 'add_product' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Product placement
                      </label>
                      <p className="mb-2 text-xs text-slate-500">
                        Where should the product appear in the clip?
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {VIDEO_EDIT_PLACEMENT_PRESETS.map((preset) => {
                          const selected = placementPreset === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              disabled={isGenerating}
                              onClick={() => setPlacementPreset(preset.id)}
                              className={cn(
                                'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                                selected
                                  ? 'border-amber-300 bg-amber-50 text-amber-900'
                                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                                isGenerating && 'cursor-not-allowed opacity-60'
                              )}
                            >
                              {preset.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Product photos (1–3)
                      </label>
                      <p className="mb-2 text-xs text-slate-500">
                        Clear product shots work best — same product you want
                        placed in the video.
                      </p>
                      <input
                        type="file"
                        accept={ACCEPTED_TYPES.join(',')}
                        multiple
                        disabled={isGenerating}
                        onChange={(e) => {
                          const files = Array.from(e.target.files ?? [])
                            .filter((f) =>
                              ACCEPTED_TYPES.includes(f.type)
                            )
                            .slice(0, 3);
                          setProductImages(files);
                          e.target.value = '';
                        }}
                        className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
                      />
                      {productImages.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {productImages.map((file, idx) => (
                            <div
                              key={`${file.name}-${idx}`}
                              className="relative h-16 w-16 overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={productPreviewUrls[idx] ?? ''}
                                alt={file.name}
                                className="h-full w-full object-cover"
                              />
                              <button
                                type="button"
                                disabled={isGenerating}
                                onClick={() =>
                                  setProductImages((prev) =>
                                    prev.filter((_, i) => i !== idx)
                                  )
                                }
                                className="absolute right-0.5 top-0.5 rounded bg-black/60 px-1 text-[10px] font-bold text-white"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-amber-700">
                          Add at least one product photo to continue.
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}

            <div id="tour-qc-prompt">
              <label
                htmlFor="ai-prompt"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                {createMode === 'video'
                  ? 'Fine-tune (optional)'
                  : 'Reference Text'}
              </label>
              <textarea
                id="ai-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  createMode === 'video'
                    ? editTool === 'replace_background'
                      ? 'Optional notes — scene is set by the preset above.'
                      : editTool === 'add_product'
                        ? 'Optional notes — placement is set by the preset above.'
                        : 'Optional polish notes — e.g. "warmer light, less noise."'
                    : 'Describe the product, audience, and goal. For example: "Instagram carousel ad for a D2C coffee brand, targeting busy founders who want better focus."'
                }
                rows={3}
                className={cn(
                  inputBase,
                  'resize-y min-h-[80px] leading-relaxed'
                )}
              />
              <p className="mt-1 text-xs text-slate-500">
                {createMode === 'video'
                  ? selectedEditTool.tier === 'safe'
                    ? `${selectedEditTool.label}: same people and place — professionally presented.`
                    : `${selectedEditTool.label}: you opted into a creative change. Person stays you.`
                  : 'You can use just a reference text, just a photo, or both together.'}
              </p>
            </div>

            {createMode === 'image' ? (
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Reference image (optional)
              </label>
              <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                className={cn(
                  'relative rounded-2xl border-2 border-dashed transition-all',
                  isDragging
                    ? 'border-indigo-400 bg-indigo-50/50'
                    : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-100/50'
                )}
              >
                {hasImage ? (
                  <div className="p-3 relative flex justify-center">
                    <div className="relative group rounded-xl overflow-hidden shadow-sm">
                      <img
                        src={previewUrl ?? ''}
                        alt="Reference preview"
                        className="max-h-[200px] object-contain bg-slate-100"
                      />
                      <div
                        className={cn(
                          'absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity',
                          isGenerating
                            ? 'pointer-events-none opacity-0'
                            : 'opacity-0 group-hover:opacity-100'
                        )}
                      >
                        <button
                          type="button"
                          onClick={clearImage}
                          disabled={isGenerating}
                          className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-red-600 shadow-sm transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                        >
                          Remove image
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 py-5 px-4 cursor-pointer">
                    <input
                      type="file"
                      accept={ACCEPTED_TYPES.join(',')}
                      onChange={onFileInputChange}
                      className="sr-only"
                    />
                    <div className="flex h-10 w-10 items-center justify-center rounded-full text-indigo-500 bg-white shadow-sm ring-1 ring-slate-100">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                    <div className="text-center">
                      <span className="text-sm font-medium text-slate-700 block">
                        Click to upload or drag &amp; drop
                      </span>
                      <span className="text-xs text-slate-500 mt-0.5 block">
                        JPEG, PNG, GIF, WebP.
                      </span>
                    </div>
                  </label>
                )}
              </div>
              {imageError && (
                <p className="mt-2 text-sm text-red-500">{imageError}</p>
              )}
            </div>
            ) : (
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Video
              </label>
              <p className="mb-2 text-xs text-slate-500">
                Upload the clip you want to edit (MP4 or WebM).
              </p>
              <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                className={cn(
                  'relative rounded-2xl border-2 border-dashed transition-all',
                  isDragging
                    ? 'border-indigo-400 bg-indigo-50/50'
                    : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-100/50'
                )}
              >
                {hasVideo ? (
                  <div className="p-3 relative flex flex-col items-center gap-3">
                    <p className="w-full truncate text-sm font-medium text-slate-700">
                      {selectedVideo?.name ?? 'Video selected'}
                    </p>
                    <button
                      type="button"
                      onClick={clearVideo}
                      disabled={isGenerating}
                      className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-red-600 shadow-sm ring-1 ring-slate-200 transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Remove video
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 py-5 px-4 cursor-pointer">
                    <input
                      type="file"
                      accept={ACCEPTED_TYPES.join(',')}
                      onChange={onFileInputChange}
                      className="sr-only"
                    />
                    <div className="flex h-10 w-10 items-center justify-center rounded-full text-indigo-500 bg-white shadow-sm ring-1 ring-slate-100">
                      <Video className="h-5 w-5" />
                    </div>
                    <div className="text-center">
                      <span className="text-sm font-medium text-slate-700 block">
                        Click to upload or drag &amp; drop
                      </span>
                      <span className="text-xs text-slate-500 mt-0.5 block">
                        JPEG, PNG, GIF, WebP or MP4.
                      </span>
                    </div>
                  </label>
                )}
              </div>
              {videoError && (
                <p className="mt-2 text-sm text-red-500">{videoError}</p>
              )}
            </div>
            )}
          </div>
          <div id="tour-qc-platforms">
          {showSelectAccountsFirst ? (
            <div
              role="status"
              className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950"
            >
              <p className="font-medium">Select your accounts first</p>
              <p className="mt-1 text-amber-900/90">
                Choose which platforms you use in onboarding or social settings,
                then come back here to generate posts.
              </p>
              <Link
                href={WORKSPACE_NAV_HREFS.linkedProfiles}
                className="mt-2 inline-block text-sm font-semibold text-amber-950 underline underline-offset-2 hover:text-amber-900"
              >
                {workspacePageTitle(WORKSPACE_NAV_HREFS.linkedProfiles)}
              </Link>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-4 sm:gap-6">
                {allowedPlatforms.map((p) => (
                  <label
                    key={p}
                    htmlFor={`generate-platform-${p}`}
                    className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800"
                  >
                    <input
                      id={`generate-platform-${p}`}
                      type="checkbox"
                      checked={genPlatforms.includes(p)}
                      onChange={() => handleToggleGenPlatform(p)}
                      className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30"
                    />
                    <span>{platformLabel(p)}</span>
                  </label>
                ))}
                {allowedPlatforms.length > 1 && (
                  <label
                    htmlFor="generate-platform-all"
                    className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800"
                  >
                    <input
                      id="generate-platform-all"
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
                <p className="mt-2 text-xs text-amber-700">{platformSelection.error}</p>
              ) : (
                <p className="mt-2 text-xs text-slate-500">
                  {createMode === 'video'
                    ? 'Edits one video using your first selected platform for aspect ratio and caption.'
                    : allPlatformsSelected
                      ? `Generates one post per connected platform (${allowedPlatforms.length}).`
                      : genPlatforms.length > 1
                        ? `Generates one post per selected platform (${genPlatforms.length}).`
                        : 'Select one or more platforms for this run.'}
                </p>
              )}
            </>
          )}
          </div>

          {generateError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
              {generateError}
            </p>
          )}

          <button
            id="tour-qc-generate"
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition-all hover:bg-indigo-700 hover:-translate-y-0.5 active:scale-[0.98] disabled:transform-none disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none flex items-center justify-center gap-2"
          >
            {createMode === 'video' ? (
              <Video className="h-4 w-4" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isGenerating
              ? createMode === 'video'
                ? 'Editing video with AI…'
                : 'Generating...'
              : createMode === 'video'
                ? `Edit video ${credits !== undefined && credits >= generationCreditCost ? '' : '(Insufficient credits)'}`
                : `Generate content ${credits !== undefined && credits >= generationCreditCost ? '' : '(Insufficient credits)'}`}
          </button>

          {createMode === 'video' && videoResult?.videoUrl && (
            <div className="mt-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-5 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Edited video
                {videoResult.platform ? ` · ${videoResult.platform}` : ''}
                {videoResult.aspectRatio
                  ? ` · ${videoResult.aspectRatio}`
                  : ''}
              </p>
              <video
                src={videoResult.videoUrl}
                controls
                playsInline
                className="max-h-[420px] w-full rounded-xl bg-black object-contain border border-slate-200"
              />
              <div className="flex flex-wrap gap-3">
                <a
                  href={videoResult.videoUrl}
                  download={`quick-create-video-${Date.now()}.mp4`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full border border-indigo-200 bg-white px-5 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
                >
                  Download
                </a>
                <button
                  type="button"
                  onClick={handleSendVideoToScheduler}
                  className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Schedule
                </button>
              </div>
              {videoResult.caption ? (
                <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {videoResult.caption}
                </p>
              ) : null}
              {videoResult.omniPrompt ? (
                <p className="text-xs text-slate-500 rounded-lg bg-white/80 border border-slate-100 px-3 py-2">
                  <span className="font-medium text-slate-600">
                    Omni prompt:{' '}
                  </span>
                  {videoResult.omniPrompt}
                </p>
              ) : null}
            </div>
          )}

          {createMode === 'image' && generated && (
            <div className="mt-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Generated output
                </p>
                {generated.renderedImages.length > 1 && (
                  <p className="text-xs text-indigo-600 font-medium">
                    {generated.renderedImages.length} platforms · all will be
                    scheduled together
                  </p>
                )}
              </div>

              {typeof generated.inferredImageContext === 'string' &&
                generated.inferredImageContext.length > 0 && (
                  <p className="text-sm text-slate-600 rounded-lg bg-white/80 border border-slate-100 px-3 py-2">
                    <span className="font-medium text-slate-700">
                      From your image:{' '}
                    </span>
                    {generated.inferredImageContext}
                  </p>
                )}

              {generated.renderedImages.length === 0 && (
                <p className="text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
                  No image was returned for this run. Try again or choose
                  another platform.
                </p>
              )}

              {/* Single result — compact view */}
              {generated.renderedImages.length === 1 &&
                (() => {
                  const asset = generated.renderedImages[0];
                  return asset.imageUrl ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-600 capitalize">
                        {asset.platform} · Image + caption
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          imagePreview.open(
                            asset.imageUrl,
                            `${asset.platform} generated post`
                          )
                        }
                        className="group relative block w-full cursor-pointer overflow-hidden rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        aria-label="Open image preview"
                      >
                        <img
                          src={asset.imageUrl}
                          alt="Generated post"
                          className="max-h-[320px] w-full rounded-xl object-contain bg-slate-100 border border-slate-200 transition-transform duration-200 group-hover:scale-[1.01]"
                        />
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/30">
                          <span className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                            <Expand className="h-3.5 w-3.5" />
                            Preview
                          </span>
                        </span>
                      </button>
                      <div className="flex flex-col sm:flex-row flex-wrap gap-4 mt-4">
                        <ImagePreviewButton
                          onClick={() =>
                            imagePreview.open(
                              asset.imageUrl,
                              `${asset.platform} generated post`
                            )
                          }
                          className="w-full sm:w-auto rounded-full px-6 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:opacity-100"
                        />
                        <DownloadPngButton
                          url={asset.imageUrl}
                          getFilename={() =>
                            `instant-${asset.platform}-${Date.now()}.png`
                          }
                        />
                        <SharePostButton
                          imageUrl={asset.imageUrl}
                          caption={asset.caption}
                          platform={asset.platform}
                          getFilename={() =>
                            `instant-${asset.platform}-${Date.now()}.png`
                          }
                        />
                      </div>
                      <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                        {asset.caption}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
                      No image was returned for this run. Try again or choose
                      another platform.
                    </p>
                  );
                })()}

              {/* Multi-platform results — read-only display */}
              {generated.renderedImages.length > 1 && (
                <div className="space-y-3">
                  {generated.renderedImages.map((asset) => (
                    <div
                      key={asset.platform}
                      className="w-full rounded-xl border border-slate-200 bg-white/70 p-3"
                    >
                      <span className="text-xs font-bold capitalize tracking-wider text-slate-600 block mb-2">
                        {asset.platform}
                      </span>
                      {asset.imageUrl ? (
                        <button
                          type="button"
                          onClick={() =>
                            imagePreview.open(
                              asset.imageUrl,
                              `${asset.platform} generated post`
                            )
                          }
                          className="group relative block w-full cursor-pointer overflow-hidden rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                          aria-label="Open image preview"
                        >
                          <img
                            src={asset.imageUrl}
                            alt={`${asset.platform} generated post`}
                            className="max-h-[240px] w-full rounded-lg object-contain bg-slate-100 border border-slate-100 transition-transform duration-200 group-hover:scale-[1.01]"
                          />
                          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/30">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                              <Expand className="h-3.5 w-3.5" />
                              Preview
                            </span>
                          </span>
                        </button>
                      ) : (
                        <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                          No image returned
                        </p>
                      )}
                      {asset.imageUrl ? (
                        <div className="flex flex-col sm:flex-row flex-wrap gap-4 mt-3">
                          <ImagePreviewButton
                            onClick={() =>
                              imagePreview.open(
                                asset.imageUrl,
                                `${asset.platform} generated post`
                              )
                            }
                            className="w-full sm:w-auto rounded-full px-6 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:opacity-100"
                          />
                          <DownloadPngButton
                            url={asset.imageUrl}
                            getFilename={() =>
                              `instant-${asset.platform}-${Date.now()}.png`
                            }
                          />
                          <SharePostButton
                            imageUrl={asset.imageUrl}
                            caption={asset.caption}
                            platform={asset.platform}
                            getFilename={() =>
                              `instant-${asset.platform}-${Date.now()}.png`
                            }
                          />
                        </div>
                      ) : null}
                      <ExpandableCaption
                        text={asset.caption}
                        clampLines={3}
                        className="mt-2 text-xs text-slate-700"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Right: Schedule & History */}
        <section className="space-y-6">
          <div className="glass-card rounded-3xl p-6 sm:p-7 space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <Send className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">
                Schedule this content
              </h2>
            </div>

            {!generated ? (
              <p className="text-sm text-slate-500">
                Generate a concept first, then you&apos;ll be able to pick a
                date, time, and platform to schedule it.
              </p>
            ) : isAllPlatforms ? (
              /* ── All-platforms schedule flow ── */
              <>
                {/* Mini thumbnails of all generated images */}
                <div className="grid grid-cols-3 gap-2">
                  {generated.renderedImages.map((r) => (
                    <div key={r.platform} className="space-y-1">
                      {r.imageUrl ? (
                        <img
                          src={r.imageUrl}
                          alt={r.platform}
                          className="w-full rounded-lg object-contain bg-slate-100 border border-slate-100 aspect-square"
                        />
                      ) : (
                        <div className="w-full aspect-square rounded-lg bg-amber-50 flex items-center justify-center text-[10px] text-amber-700">
                          No image
                        </div>
                      )}
                      <p className="text-[10px] text-center text-slate-500 capitalize">
                        {r.platform}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {scheduleTargets.map(({ platform: targetPlatform }) => {
                    const slot = platformSchedule[targetPlatform] ?? {
                      date: '',
                      time: '',
                    };
                    const suggestedTime =
                      preferredTimeForPlatform(targetPlatform);
                    return (
                      <div
                        key={targetPlatform}
                        className="rounded-2xl border border-slate-200 bg-white/80 p-3 space-y-3"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked
                            readOnly
                            aria-label={`${platformLabel(targetPlatform)} selected`}
                            className="size-4 shrink-0 rounded border-slate-300 text-indigo-600 disabled:cursor-default disabled:opacity-100"
                          />
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                            {platformLabel(targetPlatform)}
                          </p>
                        </div>
                        <div>
                          <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                            <Calendar className="h-4 w-4 text-slate-400" /> Date
                          </label>
                          <input
                            type="date"
                            min={formattedToday}
                            max={maxDate}
                            value={slot.date}
                            onChange={(e) =>
                              setPlatformScheduleValue(targetPlatform, {
                                date: e.target.value,
                              })
                            }
                            className={inputBase}
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                            <Clock className="h-4 w-4 text-slate-400" /> Time
                          </label>
                          <input
                            type="time"
                            value={slot.time}
                            onChange={(e) =>
                              setPlatformScheduleValue(targetPlatform, {
                                time: e.target.value,
                              })
                            }
                            className={inputBase}
                          />
                          {suggestedTime && (
                            <button
                              type="button"
                              onClick={() =>
                                setPlatformScheduleValue(targetPlatform, {
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
                            Will schedule on: {slot.date} at {slot.time}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {(scheduleError || pastScheduleTimeError) && (
                  <p className="text-sm text-red-600">
                    {scheduleError || pastScheduleTimeError}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleSchedule}
                  disabled={!canSchedule}
                  className={scheduleButtonClass}
                >
                  {isScheduling ? 'Scheduling…' : 'Schedule this content'}
                </button>
              </>
            ) : !activeRenderedImage ? (
              <p className="text-sm text-slate-500">
                No image was returned. Try generating again.
              </p>
            ) : (
              /* ── Single-platform schedule flow ── */
              <>
                <div className="bg-slate-50/70 rounded-2xl border border-slate-100 p-4 mb-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                      Preview
                    </p>
                    <span className="text-xs font-semibold text-indigo-600 capitalize bg-indigo-50 px-2 py-0.5 rounded-full">
                      {activeRenderedImage.platform}
                    </span>
                  </div>
                  {activeRenderedImage.imageUrl && (
                    <img
                      src={activeRenderedImage.imageUrl}
                      alt=""
                      className="max-h-40 w-full rounded-lg object-contain bg-white border border-slate-100"
                    />
                  )}
                  {activeRenderedImage.imageUrl ? (
                    <div className="flex flex-col sm:flex-row gap-4 mt-3">
                      <DownloadPngButton
                        url={activeRenderedImage.imageUrl}
                        getFilename={() =>
                          `instant-${activeRenderedImage.platform}-${Date.now()}.png`
                        }
                      />
                      <SharePostButton
                        imageUrl={activeRenderedImage.imageUrl}
                        caption={activeRenderedImage.caption}
                        platform={activeRenderedImage.platform}
                        getFilename={() =>
                          `instant-${activeRenderedImage.platform}-${Date.now()}.png`
                        }
                      />
                    </div>
                  ) : null}
                  <ExpandableCaption
                    text={activeRenderedImage.caption}
                    clampLines={4}
                    className="text-sm text-slate-800"
                  />
                </div>

                {scheduleTargets.map(({ platform: targetPlatform }) => {
                  const slot = platformSchedule[targetPlatform] ?? {
                    date: '',
                    time: '',
                  };
                  const suggestedTime = preferredTimeForPlatform(targetPlatform);
                  return (
                    <div
                      key={targetPlatform}
                      className="rounded-2xl border border-slate-200 bg-white/80 p-3 space-y-3"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked
                          readOnly
                          aria-label={`${platformLabel(targetPlatform)} selected`}
                          className="size-4 shrink-0 rounded border-slate-300 text-indigo-600 disabled:cursor-default disabled:opacity-100"
                        />
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                          {platformLabel(targetPlatform)}
                        </p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                            <Calendar className="h-4 w-4 text-slate-400" /> Date
                          </label>
                          <input
                            type="date"
                            min={formattedToday}
                            value={slot.date}
                            onChange={(e) =>
                              setPlatformScheduleValue(targetPlatform, {
                                date: e.target.value,
                              })
                            }
                            className={inputBase}
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                            <Clock className="h-4 w-4 text-slate-400" /> Time
                          </label>
                          <input
                            type="time"
                            value={slot.time}
                            onChange={(e) =>
                              setPlatformScheduleValue(targetPlatform, {
                                time: e.target.value,
                              })
                            }
                            className={inputBase}
                          />
                          {suggestedTime && (
                            <button
                              type="button"
                              onClick={() =>
                                setPlatformScheduleValue(targetPlatform, {
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
                      </div>
                      {slot.date && slot.time && (
                        <p className="text-xs font-medium text-indigo-600 bg-indigo-50 py-2 px-3 rounded-lg inline-block">
                          Will schedule on: {slot.date} at {slot.time}
                        </p>
                      )}
                    </div>
                  );
                })}

                {(scheduleError || pastScheduleTimeError) && (
                  <p className="text-sm text-red-600">
                    {scheduleError || pastScheduleTimeError}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleSchedule}
                  disabled={!canSchedule}
                  className={scheduleButtonClass}
                >
                  {isScheduling ? 'Scheduling…' : 'Schedule this content'}
                </button>
              </>
            )}
          </div>

          <div className="glass-card rounded-3xl p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-widest">
                Upcoming
              </h2>
              <span className="text-xs text-slate-500">
                {scheduled.length} scheduled
              </span>
            </div>

            {scheduled.length === 0 ? (
              <p className="text-sm text-slate-500">
                Anything you schedule here will appear in this list so you can
                keep track of what&apos;s coming next.
              </p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                {scheduled.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-1.5 rounded-2xl border border-slate-100 bg-white/80 px-4 py-3 text-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-slate-900">
                        {item.platform}
                      </span>
                      <span className="text-xs font-medium text-slate-500">
                        {item.scheduledAt}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2">
                      {item.summary}
                      {item.summary.length >= 120 && '…'}
                    </p>
                    {item.scheduledPostId && (
                      <p className="text-[10px] text-slate-400 font-mono">
                        {item.scheduledPostId}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {history.length > 0 && (
            <div className="glass-card rounded-3xl p-6 sm:p-7 space-y-3">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-widest">
                Recent generations
              </h2>
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                {history.map((item) => {
                  const histCaption =
                    item.renderedImages.find((r) => r.caption?.trim())
                      ?.caption ?? '';
                  return (
                    <div
                      key={item.id}
                      className="flex flex-col gap-1 rounded-2xl border border-slate-100 bg-white/70 px-4 py-3 text-xs"
                    >
                      <div className="flex items-center justify-between gap-3 mb-0.5">
                        <span className="font-semibold text-slate-800 line-clamp-1">
                          {item.promptSummary}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-slate-500">
                          {fmtTimestamp(item.createdAt, { style: 'datetime-short' })}
                        </span>
                      </div>
                      {typeof item.inferredImageContext === 'string' &&
                        item.inferredImageContext.length > 0 && (
                          <p className="text-slate-600 line-clamp-2">
                            <span className="font-medium text-slate-700">
                              From your image:{' '}
                            </span>
                            {item.inferredImageContext}
                          </p>
                        )}
                      {histCaption ? (
                        <p className="text-slate-600 line-clamp-2">
                          {histCaption}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
