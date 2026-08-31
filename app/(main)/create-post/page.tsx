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
  Loader2,
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
  type StudioRenderedImage,
  VIDEO_EDIT_INTENTS,
  VIDEO_EDIT_PLACEMENT_PRESETS,
  VIDEO_EDIT_SCENE_PRESETS,
  VIDEO_EDIT_TOOLS,
  type SchedulePostPayload,
  type VideoEditIntentId,
  type VideoEditPlacementPresetId,
  type VideoEditScenePresetId,
  type VideoEditToolId,
} from '@/src/service/api/aiContentStudio';
import { waitForParentJobDocs } from '@/src/lib/wait-for-parent-job';
import { useUserPlanCredits } from '../_components/UserPlanCreditsProvider';
import { useTimestampFormatter } from '@/lib/user-timezone';
import { normalizePreferredPostingTime } from '@/utils/preferredPostingTime';
import Link from 'next/link';
import { WORKSPACE_NAV_HREFS, workspacePageTitle } from '@/lib/workspace-nav';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/show-error-toast';
import {
  isScheduleDateAfterPlanExpiry,
  isScheduleTimeInPast,
  PLAN_SCHEDULE_WINDOW_MESSAGE,
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
  'mt-1 flex h-11 w-full items-center justify-center rounded-full btn-brand-fill px-4 text-sm font-medium transition-expo disabled:cursor-not-allowed';

const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const VIDEO_EDIT_CREDIT_COST = 4;
// const ACCEPTED_TYPES=ACCEPTED_IMAGE_TYPES.concat(ACCEPTED_VIDEO_TYPES);
const ACCEPTED_TYPES = ACCEPTED_IMAGE_TYPES;
type CreateMode = 'image' | 'video';

function mapInstantDocsToCreatedContent(args: {
  parentJobId: string;
  promptSummary: string;
  docs: Array<{ id: string; data: Record<string, unknown> }>;
}): CreatedContent {
  const renderedImages: StudioRenderedImage[] = args.docs
    .filter(
      (doc) =>
        String(doc.data.generationStatus ?? '').toLowerCase() !== 'failed' &&
        typeof doc.data.imageUrl === 'string' &&
        doc.data.imageUrl.trim().length > 0
    )
    .map((doc) => ({
      platform: String(doc.data.platform ?? ''),
      caption: String(doc.data.caption ?? ''),
      imageUrl: String(doc.data.imageUrl ?? ''),
      imageFilePath:
        typeof doc.data.imageFilePath === 'string'
          ? doc.data.imageFilePath
          : undefined,
      generatedAt:
        typeof doc.data.createdAtIso === 'string'
          ? doc.data.createdAtIso
          : new Date().toISOString(),
    }));

  return {
    id: args.parentJobId,
    promptSummary: args.promptSummary,
    renderedImages,
    createdAt: new Date().toISOString(),
  };
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
          className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-preview hover:text-preview hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-strong rounded-full"
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
  const [schedulingPlatform, setSchedulingPlatform] =
    useState<SocialPlatform | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
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
    () =>
      VIDEO_EDIT_TOOLS.find((t) => t.id === editTool) ?? VIDEO_EDIT_TOOLS[0],
    [editTool]
  );

  // Session state: in-memory Zustand, survives SPA navigation within the tab.
  const prompt = useInstantGeneratedState((s) => s.prompt);
  const setPrompt = useInstantGeneratedState((s) => s.setPrompt);
  const history = useInstantGeneratedState((s) => s.history);
  const pushHistory = useInstantGeneratedState((s) => s.pushHistory);
  const platformSchedule = useInstantGeneratedState((s) => s.platformSchedule);
  const setPlatformScheduleValue = useInstantGeneratedState(
    (s) => s.setPlatformScheduleValue
  );
  const clearPlatformScheduleSlot = useInstantGeneratedState(
    (s) => s.clearPlatformScheduleSlot
  );
  const removeRenderedPlatform = useInstantGeneratedState(
    (s) => s.removeRenderedPlatform
  );
  const platform = useInstantGeneratedState((s) => s.schedulePlatform);
  const setPlatform = useInstantGeneratedState((s) => s.setSchedulePlatform);
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
  const setGenPlatforms = useInstantGeneratedState(
    (state) => state.setGenPlatforms
  );
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
  const updateRenderedImageCaption = useInstantGeneratedState(
    (state) => state.updateRenderedImageCaption
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
    : '';
  const hasScheduleWindow = /^\d{4}-\d{2}-\d{2}$/.test(maxDate);
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
    const withImages = generated.renderedImages.filter((r) =>
      r.imageUrl?.trim()
    );
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
    createMode === 'video' ? VIDEO_EDIT_CREDIT_COST : genPlatforms.length * 2;
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
    if (activeRenderedImage && isSocialPlatform(activeRenderedImage.platform)) {
      return [
        {
          asset: activeRenderedImage,
          platform: activeRenderedImage.platform as SocialPlatform,
        },
      ];
    }
    return [];
  }, [generated, isAllPlatforms, activeRenderedImage]);

  const canSchedulePlatform = useCallback(
    (targetPlatform: SocialPlatform) => {
      if (!generated || isScheduling) return false;
      const target = scheduleTargets.find((t) => t.platform === targetPlatform);
      if (!target?.asset.imageUrl?.trim()) return false;
      const slot = platformSchedule[targetPlatform];
      if (!slot?.date || !slot?.time) return false;
      if (
        !hasScheduleWindow ||
        isScheduleDateAfterPlanExpiry(slot.date, maxDate)
      )
        return false;
      if (isScheduleTimeInPast(slot.date, slot.time)) return false;
      return true;
    },
    [
      generated,
      hasScheduleWindow,
      isScheduling,
      maxDate,
      platformSchedule,
      scheduleTargets,
    ]
  );

  const preferredTimeForPlatform = useCallback(
    (targetPlatform: SocialPlatform) => {
      const prefs = billing?.preferences;
      if (!prefs) return normalizePreferredPostingTime(undefined);
      const optimalTime = prefs[OPTIMAL_TIME_FIELD[targetPlatform]];
      if (prefs.analyticsOptimalPosting && optimalTime) {
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
    const uid = user?.uid;
    if (!uid) {
      showErrorToast('You must be signed in to generate.');
      return;
    }

    if (createMode === 'video') {
      if (!selectedVideo) return;
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
          productImages: editTool === 'add_product' ? productImages : undefined,
        });
        if (!response.accepted) {
          throw new Error('Could not generate video.');
        }
        const wait = await waitForParentJobDocs({
          uid,
          collectionName: 'content',
          parentJobId: response.parentJobId,
          expectedCount: 1,
        });
        if (wait.outcome === 'generated') toast.success('Generated');
        else
          showErrorToast('Content generation failed. Please try again later.');
        setIsGenerating(false);
      } catch (e: unknown) {
        showErrorToast('Content generation failed. Please try again later.');
        setGenerateError('Failed');
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
      const response = await generateAiContentStudio({
        prompt: prompt.trim(),
        platforms: genPlatforms,
        image: selectedImage,
      });

      if (!response.accepted) {
        throw new Error('Could not generate content.');
      }
      setGenerated(null);
      setSelectedRenderedImage(null);
      const wait = await waitForParentJobDocs({
        uid,
        collectionName: 'content',
        parentJobId: response.parentJobId,
        expectedCount: Math.max(
          1,
          response.platforms?.length ?? genPlatforms.length
        ),
      });
      if (wait.outcome === 'generated') {
        const createdContent = mapInstantDocsToCreatedContent({
          parentJobId: response.parentJobId,
          promptSummary: prompt.trim(),
          docs: wait.matchedDocs,
        });
        setGenerated(createdContent);
        setSelectedRenderedImage(
          createdContent.renderedImages.length === 1
            ? createdContent.renderedImages[0]
            : null
        );
        toast.success('Generated');
      } else {
        showErrorToast('Content generation failed. Please try again later.');
      }
      setIsGenerating(false);
    } catch (e: unknown) {
      showErrorToast('Content generation failed. Please try again later.');
      setGenerateError('Failed');
      setIsGenerating(false);
    }
  };

  const handleSchedulePlatform = async (targetPlatform: SocialPlatform) => {
    if (!generated) return;
    const target = scheduleTargets.find((t) => t.platform === targetPlatform);
    if (!target) return;

    const slot = platformSchedule[targetPlatform];
    if (
      !hasScheduleWindow ||
      isScheduleDateAfterPlanExpiry(slot?.date ?? '', maxDate)
    ) {
      setScheduleError(PLAN_SCHEDULE_WINDOW_MESSAGE);
      return;
    }
    if (!canSchedulePlatform(targetPlatform)) return;

    setScheduleError(null);
    setIsScheduling(true);
    setSchedulingPlatform(targetPlatform);
    try {
      if (!slot?.date || !slot?.time) {
        throw new Error(
          `Choose a schedule time for ${platformLabel(targetPlatform)}.`
        );
      }
      const when = new Date(`${slot.date}T${slot.time}:00`);
      const post: SchedulePostPayload = {
        platform: targetPlatform,
        scheduleAt: when.toISOString(),
        message: target.asset.caption,
        imageUrl: target.asset.imageUrl,
        imageFilePath: target.asset.imageFilePath,
      };
      const { scheduledPostId } = await scheduleAiContentStudioPost(post);
      const item: ScheduledItem = {
        id: crypto.randomUUID(),
        contentId: generated.id,
        scheduledPostId,
        summary: target.asset.caption.slice(0, 120),
        scheduledAt: `${slot.date} at ${slot.time}`,
        platform: targetPlatform,
      };
      pushScheduled(item);
      toast.success(
        `${platformLabel(targetPlatform)} post scheduled successfully`
      );

      const remainingCount = scheduleTargets.filter(
        (t) => t.platform !== targetPlatform
      ).length;
      clearPlatformScheduleSlot(targetPlatform);
      if (remainingCount === 0) {
        clearOutput();
        setSelectedImage(null);
        setImageError(null);
      } else {
        removeRenderedPlatform(targetPlatform);
      }
    } catch (e) {
      showErrorToast(
        e instanceof Error
          ? e.message
          : `Failed to schedule ${platformLabel(targetPlatform)} content.`
      );
      setScheduleError(
        e instanceof Error ? e.message : 'Failed to schedule content.'
      );
    } finally {
      setIsScheduling(false);
      setSchedulingPlatform(null);
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
            Describe what you want to say. Add a photo and we&apos;ll restyle it
            to match your brand.
          </p>
        </div>
        <div className="glass-card rounded-2xl px-4 py-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary-purple/10 text-preview">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
              Credits:
              <span className="font-semibold text-default text-sm">
                {creditsLoading ? '…' : (credits ?? '—')}{' '}
              </span>
            </p>

            <span className="text-xs font-normal text-secondary">
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
          <div className="flex items-center gap-3 border-b border-default pb-3">
            <div className="p-2 bg-primary-purple/10 rounded-lg text-preview">
              <Sparkles className="h-4 w-4" />
            </div>
            <h2 className="text-section text-default">Create Quick Content</h2>
          </div>
          <div className="space-y-4">
            {createMode === 'video' ? (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-default">
                    What do you want to do?
                  </label>
                  <p className="mb-2 text-xs text-secondary">
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
                            'rounded-full border px-3 py-2.5 text-left transition-expo ease-[cubic-bezier(0.4,0,0.2,1)]',
                            selected
                              ? 'border-primary-purple/35 bg-primary-purple/10'
                              : 'border-default bg-default hover:border-strong hover:bg-primary-purple/[0.03]',
                            isGenerating && 'cursor-not-allowed opacity-60'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-default">
                              {tool.label}
                            </span>
                            <span
                              className={cn(
                                'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                                tool.tier === 'safe'
                                  ? 'bg-success text-success'
                                  : 'bg-warning text-warning'
                              )}
                            >
                              {tool.tier}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-secondary">
                            {tool.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-default">
                    Editing look
                  </label>
                  <p className="mb-2 text-xs text-secondary">
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
                            'rounded-full border px-3 py-1.5 text-xs font-semibold transition-expo ease-[cubic-bezier(0.4,0,0.2,1)]',
                            selected
                              ? 'border-primary-purple/35 bg-primary-purple/10 text-preview'
                              : 'border-default bg-default text-secondary hover:border-strong hover:text-default',
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
                    <label className="mb-1.5 block text-sm font-semibold text-default">
                      Background scene
                    </label>
                    <p className="mb-2 text-xs text-secondary">
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
                              'rounded-full border px-3 py-1.5 text-xs font-semibold transition-expo',
                              selected
                                ? 'border-warning bg-warning text-warning'
                                : 'border-default bg-default text-secondary hover:border-warning hover:text-default',
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
                      <label className="mb-1.5 block text-sm font-semibold text-default">
                        Product placement
                      </label>
                      <p className="mb-2 text-xs text-secondary">
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
                                'rounded-full border px-3 py-1.5 text-xs font-semibold transition-expo',
                                selected
                                  ? 'border-warning bg-warning text-warning'
                                  : 'border-default bg-default text-secondary hover:border-warning hover:text-default',
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
                      <label className="mb-1.5 block text-sm font-semibold text-default">
                        Product photos (1–3)
                      </label>
                      <p className="mb-2 text-xs text-secondary">
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
                            .filter((f) => ACCEPTED_TYPES.includes(f.type))
                            .slice(0, 3);
                          setProductImages(files);
                          e.target.value = '';
                        }}
                        className="block w-full text-sm text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-primary-purple/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-preview hover:file:bg-primary-purple/15"
                      />
                      {productImages.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {productImages.map((file, idx) => (
                            <div
                              key={`${file.name}-${idx}`}
                              className="relative h-16 w-16 overflow-hidden rounded-lg border border-default bg-element"
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
                        <p className="mt-1 text-xs text-warning">
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
                className="mb-1.5 block text-sm font-semibold text-default"
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
                    : 'Describe the product, audience, and goal. For example: "Instagram post for a D2C coffee brand, targeting busy founders who want better focus."'
                }
                rows={3}
                className={cn(
                  inputBase,
                  'resize-y min-h-[80px] leading-relaxed'
                )}
              />
              <p className="mt-1 text-xs text-secondary">
                {createMode === 'video'
                  ? selectedEditTool.tier === 'safe'
                    ? `${selectedEditTool.label}: same people and place — professionally presented.`
                    : `${selectedEditTool.label}: you opted into a creative change. Person stays you.`
                  : 'You can use just a reference text, just a photo, or both together.'}
              </p>
            </div>

            {createMode === 'image' ? (
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-default">
                  Reference image (optional)
                </label>
                <div
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  className={cn(
                    'app-dropzone',
                    isDragging && 'app-dropzone--active'
                  )}
                >
                  {hasImage ? (
                    <div className="p-3 relative flex justify-center">
                      <div className="app-media-frame relative group">
                        <img
                          src={previewUrl ?? ''}
                          alt="Reference preview"
                          className="max-h-[200px] object-contain bg-element"
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
                            className="rounded-full bg-default px-3 py-1.5 text-xs font-semibold text-destructive transition-transform disabled:cursor-not-allowed disabled:text-quaternary disabled:"
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
                      <div className="app-dropzone__icon flex h-10 w-10 items-center justify-center rounded-full text-preview bg-default ring-1 ring-border">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                      <div className="text-center">
                        <span className="text-sm font-medium text-default block">
                          Click to upload or drag &amp; drop
                        </span>
                        <span className="text-xs text-secondary mt-0.5 block">
                          JPEG, PNG, GIF, WebP.
                        </span>
                      </div>
                    </label>
                  )}
                </div>
                {imageError && (
                  <p className="mt-2 text-sm text-destructive">{imageError}</p>
                )}
              </div>
            ) : (
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-default">
                  Video
                </label>
                <p className="mb-2 text-xs text-secondary">
                  Upload the clip you want to edit (MP4 or WebM).
                </p>
                <div
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  className={cn(
                    'app-dropzone',
                    isDragging && 'app-dropzone--active'
                  )}
                >
                  {hasVideo ? (
                    <div className="p-3 relative flex flex-col items-center gap-3">
                      <p className="w-full truncate text-sm font-medium text-default">
                        {selectedVideo?.name ?? 'Video selected'}
                      </p>
                      <button
                        type="button"
                        onClick={clearVideo}
                        disabled={isGenerating}
                        className="rounded-full bg-default px-3 py-1.5 text-xs font-semibold text-destructive ring-1 ring-border transition-transform disabled:cursor-not-allowed disabled:text-quaternary"
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
                      <div className="app-dropzone__icon flex h-10 w-10 items-center justify-center rounded-full text-preview bg-default ring-1 ring-border">
                        <Video className="h-5 w-5" />
                      </div>
                      <div className="text-center">
                        <span className="text-sm font-medium text-default block">
                          Click to upload or drag &amp; drop
                        </span>
                        <span className="text-xs text-secondary mt-0.5 block">
                          JPEG, PNG, GIF, WebP or MP4.
                        </span>
                      </div>
                    </label>
                  )}
                </div>
                {videoError && (
                  <p className="mt-2 text-sm text-destructive">{videoError}</p>
                )}
              </div>
            )}
          </div>
          <div id="tour-qc-platforms">
            {showSelectAccountsFirst ? (
              <div
                role="status"
                className="rounded-xl border border-warning bg-warning px-4 py-3 text-sm text-warning"
              >
                <p className="font-medium">Select your accounts first</p>
                <p className="mt-1 text-warning">
                  Choose which platforms you use in onboarding or social
                  settings, then come back here to generate posts.
                </p>
                <Link
                  href={WORKSPACE_NAV_HREFS.linkedProfiles}
                  className="mt-2 inline-block text-sm font-semibold text-warning underline underline-offset-2 hover:text-warning"
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
                      className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-default"
                    >
                      <input
                        id={`generate-platform-${p}`}
                        type="checkbox"
                        checked={genPlatforms.includes(p)}
                        onChange={() => handleToggleGenPlatform(p)}
                        className="size-4 rounded border-default text-preview focus:ring-strong"
                      />
                      <span>{platformLabel(p)}</span>
                    </label>
                  ))}
                  {allowedPlatforms.length > 1 && (
                    <label
                      htmlFor="generate-platform-all"
                      className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-default"
                    >
                      <input
                        id="generate-platform-all"
                        type="checkbox"
                        checked={allPlatformsSelected}
                        onChange={handleSelectAllGenPlatforms}
                        className="size-4 rounded border-default text-preview focus:ring-strong"
                      />
                      <span>
                        {allPlatformsSelectionLabel(allowedPlatforms.length)}
                      </span>
                    </label>
                  )}
                </div>
                {!platformSelection.ok ? (
                  <p className="mt-2 text-xs text-warning">
                    {platformSelection.error}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-secondary">
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
            <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-3">
              {generateError}
            </p>
          )}

          <button
            id="tour-qc-generate"
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate}
            aria-busy={isGenerating}
            className={cn(
              'group relative w-full overflow-hidden rounded-full btn-brand-fill px-4 py-3.5 text-sm font-bold ',
              'transition-[transform,box-] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
              '',
              'disabled:transform-none disabled:cursor-not-allowed disabled:bg-element disabled:text-secondary disabled:shadow-none',
              'flex items-center justify-center gap-2'
            )}
          >
            <span
              className="absolute inset-0 bg-default transition-expo group-hover:bg-default"
              aria-hidden
            />
            {isGenerating ? (
              <Loader2
                className="relative z-10 h-4 w-4 animate-spin"
                aria-hidden
              />
            ) : createMode === 'video' ? (
              <Video className="relative z-10 h-4 w-4" aria-hidden />
            ) : (
              <Sparkles className="relative z-10 h-4 w-4" aria-hidden />
            )}
            <span className="relative z-10">
              {isGenerating
                ? createMode === 'video'
                  ? 'Editing your video…'
                  : 'Creating your post…'
                : createMode === 'video'
                  ? 'Edit video'
                  : 'Create post'}
            </span>
          </button>

          {credits !== undefined && credits < generationCreditCost && (
            <p className="mt-2 text-center text-xs text-secondary">
              Needs {generationCreditCost}{' '}
              {generationCreditCost === 1 ? 'credit' : 'credits'} — you have{' '}
              {credits}.{' '}
              <Link
                href="/settings/billings"
                className="font-semibold text-preview underline underline-offset-2"
              >
                Top up
              </Link>
            </p>
          )}

          {createMode === 'image' && generated && (
            <div className="mt-2 rounded-2xl border border-default bg-element p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
                  Generated output
                </p>
                {generated.renderedImages.length > 1 && (
                  <p className="text-xs text-preview font-medium">
                    {generated.renderedImages.length} platforms · schedule each
                    one separately below
                  </p>
                )}
              </div>

              {typeof generated.inferredImageContext === 'string' &&
                generated.inferredImageContext.length > 0 && (
                  <p className="text-sm text-secondary rounded-lg bg-default border border-default px-3 py-2">
                    <span className="font-medium text-default">
                      From your image:{' '}
                    </span>
                    {generated.inferredImageContext}
                  </p>
                )}

              {generated.renderedImages.length === 0 && (
                <p className="text-sm text-warning bg-warning rounded-lg px-3 py-2">
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
                      <p className="text-xs font-semibold text-secondary capitalize">
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
                        className="group relative block w-full cursor-pointer overflow-hidden rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-strong"
                        aria-label="Open image preview"
                      >
                        <img
                          src={asset.imageUrl}
                          alt="Generated post"
                          className="max-h-[320px] w-full rounded-xl object-contain bg-element border border-default transition-transform duration-200"
                        />
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-expo group-hover:bg-black/30">
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
                          className="w-full sm:w-auto rounded-full px-6 bg-default border border-primary-purple/25 text-preview hover:bg-element hover:opacity-100"
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
                      <textarea
                        aria-label={`${asset.platform} generated caption`}
                        value={asset.caption}
                        onChange={(event) =>
                          updateRenderedImageCaption(
                            asset.platform,
                            event.target.value
                          )
                        }
                        rows={6}
                        className={cn(
                          inputBase,
                          'resize-y text-sm leading-relaxed'
                        )}
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-warning bg-warning rounded-lg px-3 py-2">
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
                      className="w-full rounded-xl border border-default bg-default p-3"
                    >
                      <span className="text-xs font-bold capitalize tracking-wider text-secondary block mb-2">
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
                          className="group relative block w-full cursor-pointer overflow-hidden rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-strong"
                          aria-label="Open image preview"
                        >
                          <img
                            src={asset.imageUrl}
                            alt={`${asset.platform} generated post`}
                            className="max-h-[240px] w-full rounded-lg object-contain bg-element border border-default transition-transform duration-200"
                          />
                          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-expo group-hover:bg-black/30">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                              <Expand className="h-3.5 w-3.5" />
                              Preview
                            </span>
                          </span>
                        </button>
                      ) : (
                        <p className="text-xs text-warning bg-warning rounded px-2 py-1">
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
                            className="w-full sm:w-auto rounded-full px-6 bg-default border border-primary-purple/25 text-preview hover:bg-element hover:opacity-100"
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
                      <textarea
                        aria-label={`${asset.platform} generated caption`}
                        value={asset.caption}
                        onChange={(event) =>
                          updateRenderedImageCaption(
                            asset.platform,
                            event.target.value
                          )
                        }
                        rows={5}
                        className={cn(
                          inputBase,
                          'mt-2 resize-y text-xs leading-relaxed'
                        )}
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
            <div className="flex items-center gap-3 border-b border-default pb-4">
              <div className="p-2 bg-primary-purple/10 rounded-lg text-preview">
                <Send className="h-5 w-5" />
              </div>
              <h2 className="text-subsection text-default">
                Schedule this content
              </h2>
            </div>

            {!generated ? (
              <p className="text-sm text-secondary">
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
                          className="w-full rounded-lg object-contain bg-element border border-default aspect-square"
                        />
                      ) : (
                        <div className="w-full aspect-square rounded-lg bg-warning flex items-center justify-center text-[10px] text-warning">
                          No image
                        </div>
                      )}
                      <p className="text-[10px] text-center text-secondary capitalize">
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
                    const isPast =
                      Boolean(slot.date) &&
                      Boolean(slot.time) &&
                      isScheduleTimeInPast(slot.date, slot.time);
                    const isAfterExpiry = isScheduleDateAfterPlanExpiry(
                      slot.date,
                      maxDate
                    );
                    return (
                      <div
                        key={targetPlatform}
                        className="rounded-2xl border border-default bg-default p-3 space-y-3 flex flex-col justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked
                            readOnly
                            aria-label={`${platformLabel(targetPlatform)} selected`}
                            className="size-4 shrink-0 rounded border-default text-preview disabled:cursor-default disabled:text-quaternary"
                          />
                          <p className="text-xs font-bold uppercase tracking-wider text-secondary">
                            {platformLabel(targetPlatform)}
                          </p>
                        </div>
                        <div>
                          <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-default">
                            <Calendar className="h-4 w-4 text-secondary" /> Date
                          </label>
                          <input
                            type="date"
                            min={formattedToday}
                            max={maxDate || undefined}
                            disabled={!hasScheduleWindow}
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
                          <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-default">
                            <Clock className="h-4 w-4 text-secondary" /> Time
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
                              className={`group mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-expo focus:outline-none focus:ring-2 focus:ring-strong focus:ring-offset-1 ${
                                slot.time === suggestedTime
                                  ? 'cursor-default border-primary-purple/25 bg-primary-purple/15 text-preview'
                                  : 'cursor-pointer border-primary-purple/25 bg-primary-purple/10 text-preview hover:border-primary-purple hover:bg-primary-purple hover:text-white'
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
                          <p className="text-xs font-medium text-preview bg-primary-purple/10 py-2 px-3 rounded-lg">
                            Will schedule on: {slot.date} at {slot.time}
                          </p>
                        )}
                        {isPast && (
                          <p className="text-xs text-destructive">
                            {PAST_SCHEDULE_TIME_MESSAGE}
                          </p>
                        )}
                        {(!hasScheduleWindow || isAfterExpiry) && (
                          <p className="text-xs text-destructive">
                            {PLAN_SCHEDULE_WINDOW_MESSAGE}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => handleSchedulePlatform(targetPlatform)}
                          disabled={
                            !canSchedulePlatform(targetPlatform) || isScheduling
                          }
                          aria-busy={
                            isScheduling &&
                            schedulingPlatform === targetPlatform
                          }
                          className={cn(
                            scheduleButtonClass,
                            'flex items-center justify-center gap-2'
                          )}
                        >
                          {isScheduling &&
                            schedulingPlatform === targetPlatform && (
                              <Loader2
                                className="h-4 w-4 animate-spin"
                                aria-hidden
                              />
                            )}
                          {isScheduling && schedulingPlatform === targetPlatform
                            ? 'Scheduling…'
                            : `Schedule ${platformLabel(targetPlatform)}`}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {scheduleError && (
                  <p className="text-sm text-destructive">{scheduleError}</p>
                )}
              </>
            ) : !activeRenderedImage ? (
              <p className="text-sm text-secondary">
                No image was returned. Try generating again.
              </p>
            ) : (
              /* ── Single-platform schedule flow ── */
              <>
                <div className="bg-element rounded-2xl border border-default p-4 mb-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
                      Preview
                    </p>
                    <span className="text-xs font-semibold text-preview capitalize bg-primary-purple/10 px-2 py-0.5 rounded-full">
                      {activeRenderedImage.platform}
                    </span>
                  </div>
                  {activeRenderedImage.imageUrl && (
                    <img
                      src={activeRenderedImage.imageUrl}
                      alt=""
                      className="max-h-40 w-full rounded-lg object-contain bg-default border border-default"
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
                    className="text-sm text-default"
                  />
                </div>

                {scheduleTargets.map(({ platform: targetPlatform }) => {
                  const slot = platformSchedule[targetPlatform] ?? {
                    date: '',
                    time: '',
                  };
                  const suggestedTime =
                    preferredTimeForPlatform(targetPlatform);
                  const isPast =
                    Boolean(slot.date) &&
                    Boolean(slot.time) &&
                    isScheduleTimeInPast(slot.date, slot.time);
                  const isAfterExpiry = isScheduleDateAfterPlanExpiry(
                    slot.date,
                    maxDate
                  );
                  return (
                    <div
                      key={targetPlatform}
                      className="rounded-2xl border border-default bg-default p-3 space-y-3"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked
                          readOnly
                          aria-label={`${platformLabel(targetPlatform)} selected`}
                          className="size-4 shrink-0 rounded border-default text-preview disabled:cursor-default disabled:text-quaternary"
                        />
                        <p className="text-xs font-bold uppercase tracking-wider text-secondary">
                          {platformLabel(targetPlatform)}
                        </p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-default">
                            <Calendar className="h-4 w-4 text-secondary" /> Date
                          </label>
                          <input
                            type="date"
                            min={formattedToday}
                            max={maxDate || undefined}
                            disabled={!hasScheduleWindow}
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
                          <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-default">
                            <Clock className="h-4 w-4 text-secondary" /> Time
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
                              className={`group mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-expo focus:outline-none focus:ring-2 focus:ring-strong focus:ring-offset-1 ${
                                slot.time === suggestedTime
                                  ? 'cursor-default border-primary-purple/25 bg-primary-purple/15 text-preview'
                                  : 'cursor-pointer border-primary-purple/25 bg-primary-purple/10 text-preview hover:border-primary-purple hover:bg-primary-purple hover:text-white'
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
                        <p className="text-xs font-medium text-preview bg-primary-purple/10 py-2 px-3 rounded-lg inline-block">
                          Will schedule on: {slot.date} at {slot.time}
                        </p>
                      )}
                      {isPast && (
                        <p className="text-xs text-destructive">
                          {PAST_SCHEDULE_TIME_MESSAGE}
                        </p>
                      )}
                      {(!hasScheduleWindow || isAfterExpiry) && (
                        <p className="text-xs text-destructive">
                          {PLAN_SCHEDULE_WINDOW_MESSAGE}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSchedulePlatform(targetPlatform)}
                        disabled={
                          !canSchedulePlatform(targetPlatform) || isScheduling
                        }
                        aria-busy={
                          isScheduling && schedulingPlatform === targetPlatform
                        }
                        className={cn(
                          scheduleButtonClass,
                          'flex items-center justify-center gap-2'
                        )}
                      >
                        {isScheduling &&
                          schedulingPlatform === targetPlatform && (
                            <Loader2
                              className="h-4 w-4 animate-spin"
                              aria-hidden
                            />
                          )}
                        {isScheduling && schedulingPlatform === targetPlatform
                          ? 'Scheduling…'
                          : `Schedule ${platformLabel(targetPlatform)}`}
                      </button>
                    </div>
                  );
                })}

                {scheduleError && (
                  <p className="text-sm text-destructive">{scheduleError}</p>
                )}
              </>
            )}
          </div>

          <div className="glass-card rounded-3xl p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-eyebrow">Upcoming</h2>
              <span className="text-xs text-secondary">
                {scheduled.length} scheduled
              </span>
            </div>

            {scheduled.length === 0 ? (
              <p className="text-sm text-secondary">
                Anything you schedule here will appear in this list so you can
                keep track of what&apos;s coming next.
              </p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                {scheduled.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-1.5 rounded-2xl border border-default bg-default px-4 py-3 text-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-default">
                        {item.platform}
                      </span>
                      <span className="text-xs font-medium text-secondary">
                        {item.scheduledAt}
                      </span>
                    </div>
                    <p className="text-xs text-secondary line-clamp-2">
                      {item.summary}
                      {item.summary.length >= 120 && '…'}
                    </p>
                    {item.scheduledPostId && (
                      <p className="text-[10px] text-secondary font-mono">
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
              <h2 className="text-eyebrow">Recent generations</h2>
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                {history.map((item) => {
                  const histCaption =
                    item.renderedImages.find((r) => r.caption?.trim())
                      ?.caption ?? '';
                  return (
                    <div
                      key={item.id}
                      className="flex flex-col gap-1 rounded-2xl border border-default bg-default px-4 py-3 text-xs"
                    >
                      <div className="flex items-center justify-between gap-3 mb-0.5">
                        <span className="font-semibold text-default line-clamp-1">
                          {item.promptSummary}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-secondary">
                          {fmtTimestamp(item.createdAt, {
                            style: 'datetime-short',
                          })}
                        </span>
                      </div>
                      {typeof item.inferredImageContext === 'string' &&
                        item.inferredImageContext.length > 0 && (
                          <p className="text-secondary line-clamp-2">
                            <span className="font-medium text-default">
                              From your image:{' '}
                            </span>
                            {item.inferredImageContext}
                          </p>
                        )}
                      {histCaption ? (
                        <p className="text-secondary line-clamp-2">
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
