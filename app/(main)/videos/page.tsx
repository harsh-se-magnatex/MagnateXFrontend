'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImagePlus, Images, Trash2 } from 'lucide-react';
import { auth } from '@/lib/firebase';
import {
  fetchVideoGeneratorProfile,
  resolveFrameFile,
  startVideoGeneration,
} from '@/src/service/api/video-generation.service';
import { waitForVideoGenerationDoc } from '@/src/lib/wait-for-parent-job';
import { useUserPlanCredits } from '../_components/UserPlanCreditsProvider';
import { useTimestampFormatter } from '@/lib/user-timezone';
import {
  WORKSPACE_NAV_HREFS,
  workspacePageTitle,
} from '@/lib/workspace-nav';
import { workspacePageTitleClass } from '@/lib/workspace-ui';
import { showErrorToast } from '@/lib/show-error-toast';
import {
  setPostSchedulerPrefill,
  type PostSchedulerPrefillPayload,
} from '@/lib/post-scheduler-prefill-store';
import { PageLoadingState } from '@/components/shared/PageLoadingState';
import { NonSubscribedFeatureBlock } from '@/components/shared/NonSubscribedFeatureBlock';
import { isPlanInactive } from '@/lib/plan-access';
import { cn } from '@/lib/utils';
import { MediaLibraryImagePickerDialog } from '@/components/shared/MediaLibraryImagePickerDialog';
import {
  detectVideoFramePreviewMode,
  type VideoFramePreviewMode,
} from '@/lib/video-frame-preview';
import { DownloadVideoButton } from '@/components/download-video-button';
import { toast } from 'sonner';

const PLATFORM_ORDER = ['instagram', 'facebook', 'linkedin'] as const;
type LogoFramePosition = 'first' | 'last';
type PipelinePhase = 'idle' | 'preparing' | 'generating' | 'ready' | 'failed';

type FrameKind = 'logo' | 'upload' | 'gallery';

type FrameSlot = {
  previewUrl: string | null;
  file: File | null;
  kind: FrameKind | null;
  isLogoFromDb: boolean;
  /** Matches backend logo-card vs hero-photo framing for the 9:16/16:9 preview. */
  previewMode: VideoFramePreviewMode;
};

type VideoGenerationResult = {
  platform: string;
  videoGenerationDocId: string;
  posterUrl: string;
  posterFilePath?: string;
  videoUrl?: string | null;
  videoFilePath?: string | null;
  videoCaption?: string | null;
  videoAspectRatio?: string | null;
  promptTitle?: string | null;
  videoPrompt?: string | null;
};

const EMPTY_FRAME: FrameSlot = {
  previewUrl: null,
  file: null,
  kind: null,
  isLogoFromDb: false,
  previewMode: 'hero-photo',
};

function frameUsesLogoCardPreview(frame: FrameSlot): boolean {
  return frame.kind === 'logo' || frame.previewMode === 'logo-card';
}

function frameSlotSubtitle(frame: FrameSlot): string {
  if (frameUsesLogoCardPreview(frame)) {
    if (frame.isLogoFromDb) return 'Brand logo (from profile)';
    if (frame.kind === 'gallery') return 'Logo (from Media Library)';
    if (frame.kind === 'upload') return 'Logo (upload)';
    return 'Brand logo';
  }
  if (frame.kind === 'gallery') return 'From Media Library';
  if (frame.kind === 'upload') return 'Reference image (upload)';
  return 'Scene image';
}

function revokeIfBlob(url: string | null) {
  if (url?.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

function FrameCard({
  title,
  subtitle,
  frame,
  disabled,
  previewAspectClass,
  isPortraitPreview,
  onUpload,
  onRemove,
  onPickFromGallery,
}: {
  title: string;
  subtitle: string;
  frame: FrameSlot;
  disabled?: boolean;
  previewAspectClass: string;
  isPortraitPreview?: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
  onPickFromGallery?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isLogoCard = frameUsesLogoCardPreview(frame);

  return (
    <div
      className={cn(
        'flex min-w-0 flex-col rounded-2xl border border-border bg-card p-3 shadow-sm',
        isPortraitPreview
          ? 'mx-auto w-full max-w-[13rem] sm:max-w-[15rem]'
          : 'min-w-0 flex-1'
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {frame.previewUrl ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onRemove}
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
            aria-label={`Remove ${title}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {frame.previewUrl ? (
        <div
          className={cn(
            'relative flex w-full max-w-full items-center justify-center overflow-hidden rounded-xl border border-border',
            previewAspectClass,
            isLogoCard ? 'bg-background' : 'bg-muted'
          )}
        >
          <img
            src={frame.previewUrl}
            alt={title}
            className={cn(
              'object-contain',
              // Logo-card: keep the centered mark modest, not full-bleed.
              // Hero/product: contain the full still — never object-cover on 9:16.
              isLogoCard
                ? 'max-h-[38%] max-w-[70%]'
                : 'h-auto w-auto max-h-full max-w-full'
            )}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'flex w-full max-w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/50 text-muted-foreground transition hover:border-primary-purple/40 hover:bg-primary-purple/10 disabled:opacity-50',
              previewAspectClass
            )}
          >
            <ImagePlus className="h-7 w-7 text-primary-purple" />
            <span className="text-xs font-medium">Upload image</span>
          </button>
          {onPickFromGallery ? (
            <button
              type="button"
              disabled={disabled}
              onClick={onPickFromGallery}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-2.5 text-xs font-semibold text-primary-purple transition hover:bg-primary-purple/10 disabled:opacity-50"
            >
              <Images className="h-4 w-4" aria-hidden />
              Choose from Media Library
            </button>
          ) : null}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const next = e.target.files?.[0];
          if (next) onUpload(next);
          e.target.value = '';
        }}
      />

      {frame.previewUrl ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="text-xs font-medium text-primary-purple hover:underline disabled:opacity-50"
          >
            Replace image
          </button>
          {onPickFromGallery ? (
            <button
              type="button"
              disabled={disabled}
              onClick={onPickFromGallery}
              className="text-xs font-medium text-primary-purple hover:underline disabled:opacity-50"
            >
              Choose from library
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function VideoGenerationPage() {
  const router = useRouter();
  const [referenceImage, setReferenceImage] = useState<FrameSlot>(EMPTY_FRAME);
  const [profileLoading, setProfileLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFramePosition, setLogoFramePosition] =
    useState<LogoFramePosition>('first');
  const [referencePrompt, setReferencePrompt] = useState('');
  const [pipelinePhase, setPipelinePhase] = useState<PipelinePhase>('idle');
  const [result, setResult] = useState<VideoGenerationResult | null>(null);
  const [captionCopied, setCaptionCopied] = useState(false);
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false);

  const { billing, loading: creditsLoading } = useUserPlanCredits();
  const fmtTimestamp = useTimestampFormatter();
  const planExpiresAt = billing?.planExpiresAt;
  const formattedPlanExpiresAt = planExpiresAt
    ? fmtTimestamp(planExpiresAt)
    : '—';
  const userCredits = billing?.credits;

  const perPlatformCost = 100;
  const creditOk = userCredits !== undefined && userCredits >= perPlatformCost;
  const insufficientCredits =
    userCredits !== undefined && userCredits < perPlatformCost;

  const isBusy = pipelinePhase === 'generating';

  const canGenerate =
    creditOk &&
    !!logoUrl &&
    !isBusy &&
    !profileLoading;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await fetchVideoGeneratorProfile();
        if (cancelled) return;
        setLogoUrl(profile.logoUrl);
      } catch {
        if (!cancelled) {
          showErrorToast(
            'Could not load your video profile. Please try again later.'
          );
        }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const resetRun = useCallback(() => {
    setPipelinePhase('idle');
    setResult(null);
  }, []);

  const applyDetectedPreviewMode = useCallback(async (previewUrl: string) => {
    const previewMode = await detectVideoFramePreviewMode(previewUrl);
    setReferenceImage((prev): FrameSlot => {
      if (prev.previewUrl !== previewUrl) return prev;
      return { ...prev, previewMode };
    });
  }, []);

  const setGalleryReference = useCallback(
    (imageUrl: string) => {
      const url = imageUrl.trim();
      if (!url) return;
      const next: FrameSlot = {
        previewUrl: url,
        file: null,
        kind: 'gallery',
        isLogoFromDb: false,
        previewMode: 'hero-photo',
      };
      setReferenceImage((prev) => {
        revokeIfBlob(prev.previewUrl);
        return next;
      });
      resetRun();
      void applyDetectedPreviewMode(url);
    },
    [applyDetectedPreviewMode, resetRun]
  );

  const setUploadReference = useCallback(
    (file: File) => {
      const previewUrl = URL.createObjectURL(file);
      const next: FrameSlot = {
        previewUrl,
        file,
        kind: 'upload',
        isLogoFromDb: false,
        previewMode: 'hero-photo',
      };
      setReferenceImage((prev) => {
        revokeIfBlob(prev.previewUrl);
        return next;
      });
      resetRun();
      void applyDetectedPreviewMode(previewUrl);
    },
    [applyDetectedPreviewMode, resetRun]
  );

  const clearReference = useCallback(() => {
    setReferenceImage((prev) => {
      revokeIfBlob(prev.previewUrl);
      return EMPTY_FRAME;
    });
    resetRun();
  }, [resetRun]);

  const handleGenerate = async () => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('You must be signed in to generate videos.');

      const referenceImageFile = referenceImage.previewUrl
        ? await resolveFrameFile(referenceImage, 'reference')
        : undefined;

      resetRun();
      setPipelinePhase('generating');

      const response = await startVideoGeneration({
        referencePrompt: referencePrompt.trim() || undefined,
        referenceImage: referenceImageFile,
        logoFramePosition,
      });
      setResult({
        platform: 'all_platforms',
        videoGenerationDocId: response.videoGenerationDocId,
        posterUrl: referenceImage.previewUrl ?? '',
        posterFilePath: undefined,
        videoUrl: null,
        videoFilePath: null,
        videoCaption: null,
        videoAspectRatio: null,
      });
      const wait = await waitForVideoGenerationDoc({
        uid: user.uid,
        docId: response.videoGenerationDocId,
      });
      if (wait.timedOut || wait.outcome !== 'generated' || !wait.data) {
        setPipelinePhase('failed');
        showErrorToast('Video generation failed. Please Try Again Later.');
        return;
      }
      const data = wait.data;
      setResult({
        platform: 'all_platforms',
        videoGenerationDocId: response.videoGenerationDocId,
        posterUrl:
          String(data.videoPosterUrl ?? '').trim() ||
          referenceImage.previewUrl ||
          '',
        posterFilePath: String(data.videoPosterPath ?? '').trim() || undefined,
        videoUrl: String(data.videoUrl ?? '').trim() || null,
        videoFilePath: String(data.videoFilePath ?? '').trim() || null,
        videoCaption: String(data.caption ?? '').trim() || null,
        videoAspectRatio: String(data.videoAspectRatio ?? '').trim() || null,
        promptTitle: String(data.videoPromptTitle ?? '').trim() || null,
        videoPrompt: String(data.videoPrompt ?? '').trim() || null,
      });
      setPipelinePhase('ready');
      toast.success(
        data.videoPromptOnly === true ? 'Prompt generated' : 'Generated'
      );
    } catch (err) {
      setPipelinePhase('failed');
      showErrorToast('Failed to generate video. Please Try Again Later.');
    }
  };

  function handleSendToScheduler() {
    if (!result?.videoUrl || !result.videoFilePath) return;
    const videoUrl = result.videoUrl;
    const videoFilePath = result.videoFilePath;
    const posterUrl = result.posterUrl.trim();
    const posterFilePath = result.posterFilePath?.trim() ?? '';
    const payload: PostSchedulerPrefillPayload = {
      source: 'gallery',
      createdAt: Date.now(),
      lockedPlatform: 'all_platforms',
      posts: PLATFORM_ORDER.map((platform) => ({
          imageUrl: posterUrl,
          imageFilePath: '',
          mediaType: 'video',
          videoUrl,
          videoFilePath,
          ...(posterUrl ? { videoPosterUrl: posterUrl } : {}),
          ...(posterFilePath ? { videoPosterPath: posterFilePath } : {}),
          message: result.videoCaption?.trim() ?? '',
          platform,
          source: 'videoGeneration',
        })),
    };
    setPostSchedulerPrefill(payload);
    router.push(`${WORKSPACE_NAV_HREFS.schedulePost}?prefill=gallery`);
  }

  async function handleCopyCaption() {
    const caption = result?.videoCaption?.trim();
    if (!caption) return;
    await navigator.clipboard.writeText(caption);
    setCaptionCopied(true);
    setTimeout(() => setCaptionCopied(false), 1800);
  }

  const progressLabel = isBusy ? 'Generating video...' : '';
  const framePreviewAspect = 'aspect-video';
  const isPortraitPreview = false;

  if (creditsLoading || profileLoading) {
    return <PageLoadingState message="Loading your account..." />;
  }

  if (isPlanInactive(billing)) {
    return <NonSubscribedFeatureBlock />;
  }

  return (
    <div className="mx-auto animate-in fade-in duration-500 pb-20">
      <div className="max-w-4xl mx-auto glass-card rounded-3xl p-8">
        <h1 className={cn(workspacePageTitleClass, 'mb-2')}>
          {workspacePageTitle(WORKSPACE_NAV_HREFS.videoGeneration)}
        </h1>
        <p className="text-sm text-slate-600 mb-6">
          Describe the advert you want and optionally add one reference image.
          Your direction and business profile guide the complete 20-second
          video.
        </p>

        <div className="flex justify-end flex-col items-end mb-6">
          <p>Credits: {userCredits ?? '—'}</p>
          <p>Cost: {perPlatformCost} credits</p>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-primary-purple/20 bg-primary-purple/5 px-4 py-3">
            <p className="text-sm font-semibold text-foreground">
              One 16:9 video for Instagram, Facebook, and LinkedIn
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Generate once, then schedule the identical video to all three platforms.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-800">
              Logo placement
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Choose whether the saved business logo is shown before or after
              the main video.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(
                [
                  ['first', 'Logo first'],
                  ['last', 'Logo last'],
                ] as const
              ).map(([value, label]) => {
                const disabled = isBusy || !logoUrl;
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setLogoFramePosition(value);
                      resetRun();
                    }}
                    className={cn(
                      'rounded-full border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
                      logoFramePosition === value
                        ? 'border-violet-600 bg-violet-600 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300'
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {!logoUrl ? (
              <p className="mt-2 text-xs text-amber-700">
                Add a business logo in your profile to enable first or last
                placement.
              </p>
            ) : null}
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Reference image{' '}
                  <span className="font-normal text-slate-400">(optional)</span>
                </p>
                <p className="text-xs text-slate-500">
                  Add at most one product, property, place, or visual reference.
                  The generated video will preserve its visible identity and
                  structure.
                </p>
              </div>
            </div>

            <div className="flex justify-center">
              <FrameCard
                title="Visual reference"
                subtitle={frameSlotSubtitle(referenceImage)}
                frame={referenceImage}
                previewAspectClass={framePreviewAspect}
                isPortraitPreview={isPortraitPreview}
                disabled={isBusy}
                onUpload={setUploadReference}
                onRemove={clearReference}
                onPickFromGallery={() => setGalleryPickerOpen(true)}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="video-reference-prompt"
              className="mb-2 block text-sm font-medium text-foreground"
            >
              Video direction (optional)
            </label>
            <textarea
              id="video-reference-prompt"
              value={referencePrompt}
              disabled={isBusy}
              onChange={(e) => {
                setReferencePrompt(e.target.value);
                resetRun();
              }}
              placeholder="Describe the story, action, audience, mood, dialogue, or result you want. Your business profile supplies the factual context."
              rows={3}
              className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground outline-none focus:border-primary-purple focus:ring-2 focus:ring-primary-purple/20"
            />
          </div>

          <button
            type="button"
            disabled={!canGenerate}
            onClick={() => void handleGenerate()}
            className="w-full rounded-full bg-gradient-action py-3 text-sm font-semibold text-white shadow-md shadow-primary-purple/25 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isBusy
              ? progressLabel || 'Generating...'
              : 'Create video'}
          </button>

          {isBusy ? (
            <p className="text-xs font-medium text-violet-700">
              {progressLabel}
            </p>
          ) : null}

          {pipelinePhase === 'ready' && result?.videoUrl ? (
            <div className="space-y-4 rounded-xl border border-primary-purple/25 bg-primary-purple/10 p-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Generated video
                  {result.videoAspectRatio
                    ? ` • ${result.videoAspectRatio}`
                    : ''}
                </h2>
                <p className="text-xs text-primary-purple">
                  Instagram, Facebook, and LinkedIn
                </p>
              </div>
              <video
                controls
                poster={result.posterUrl}
                className={cn(
                  'w-full max-w-2xl mx-auto rounded-lg border border-primary-purple/25 bg-black object-contain',
                  'aspect-video'
                )}
                src={result.videoUrl}
              />
              {result.videoCaption ? (
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-foreground">
                      Video post caption
                    </h3>
                    <button
                      type="button"
                      onClick={() => void handleCopyCaption()}
                      className="rounded-lg bg-primary-purple px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                    >
                      {captionCopied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="whitespace-pre-line text-sm text-foreground leading-relaxed">
                    {result.videoCaption}
                  </p>
                </div>
              ) : null}
              <div className="flex flex-col gap-3 sm:flex-row">
                <DownloadVideoButton
                  url={result.videoUrl}
                  getFilename={() => 'video-all-platforms.mp4'}
                  className="inline-flex flex-1 items-center justify-center rounded-full border border-primary-purple/30 bg-card px-5 py-2.5 text-sm font-semibold text-primary-purple hover:bg-primary-purple/10 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={handleSendToScheduler}
                  className="inline-flex flex-1 items-center justify-center rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                >
                  Schedule to all three platforms
                </button>
              </div>
            </div>
          ) : null}

          {pipelinePhase === 'ready' && result?.videoPrompt ? (
            <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/60 p-4">
              <div>
                <h2 className="text-sm font-semibold text-violet-900">
                  {result.promptTitle || 'Claude video prompt'}
                </h2>
                <p className="text-xs text-violet-700">
                  Prompt-only test completed. No video request was sent.
                </p>
              </div>
              <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-lg border border-violet-100 bg-white p-4 text-xs leading-relaxed text-slate-700">
                {result.videoPrompt}
              </pre>
            </div>
          ) : null}
        </div>
      </div>

      <MediaLibraryImagePickerDialog
        open={galleryPickerOpen}
        onOpenChange={(open) => {
          setGalleryPickerOpen(open);
        }}
        title="Choose one reference image"
        onSelect={(url) => {
          setGalleryReference(url);
          setGalleryPickerOpen(false);
        }}
      />
    </div>
  );
}
