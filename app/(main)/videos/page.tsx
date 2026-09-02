'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, ImagePlus, Images, Trash2 } from 'lucide-react';
import { auth } from '@/lib/firebase';
import {
  fetchVideoGeneratorProfile,
  resolveFrameFile,
  startVideoGeneration,
} from '@/src/service/api/video-generation.service';
import { waitForVideoGenerationDoc } from '@/src/lib/wait-for-parent-job';
import { useUserPlanCredits } from '../_components/UserPlanCreditsProvider';
import { useTimestampFormatter } from '@/lib/user-timezone';
import { WORKSPACE_NAV_HREFS, workspacePageTitle } from '@/lib/workspace-nav';
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
import { type VideoFramePreviewMode } from '@/lib/video-frame-preview';
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
};

const EMPTY_FRAME: FrameSlot = {
  previewUrl: null,
  file: null,
  kind: null,
  isLogoFromDb: false,
  previewMode: 'hero-photo',
};

function frameUsesLogoCardPreview(frame: FrameSlot): boolean {
  // Manual references are always full visual story frames. A logo upload is
  // still a reference image here, not the separate generated logo end card.
  return frame.kind === 'logo';
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
  onFilesSelected,
  multiple,
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
  onFilesSelected?: (files: File[]) => void;
  multiple?: boolean;
  onRemove: () => void;
  onPickFromGallery?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isLogoCard = frameUsesLogoCardPreview(frame);

  return (
    <div
      className={cn(
        'flex min-w-0 flex-col rounded-2xl border border-default bg-default p-3',
        isPortraitPreview
          ? 'mx-auto w-full max-w-[13rem] sm:max-w-[15rem]'
          : 'min-w-0 flex-1'
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-default">{title}</p>
          <p className="text-xs text-secondary">{subtitle}</p>
        </div>
        {frame.previewUrl ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onRemove}
            className="rounded-full p-1.5 text-secondary transition hover:bg-destructive/10 hover:text-destructive disabled:text-quaternary"
            aria-label={`Remove ${title}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {frame.previewUrl ? (
        <div
          className={cn(
            'relative flex w-full max-w-full items-center justify-center overflow-hidden rounded-xl border border-default',
            previewAspectClass,
            isLogoCard ? 'bg-background' : 'bg-element'
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
              'flex w-full max-w-full flex-col items-center justify-center gap-2 rounded-full border-2 border-dashed border-default bg-element text-secondary transition hover:border-strong hover:bg-element disabled:text-quaternary',
              previewAspectClass
            )}
          >
            <ImagePlus className="h-7 w-7 text-primary-purple" />
            <span className="text-xs font-medium">
              {multiple ? 'Upload images' : 'Upload image'}
            </span>
          </button>
          {onPickFromGallery ? (
            <button
              type="button"
              disabled={disabled}
              onClick={onPickFromGallery}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-default bg-default py-2.5 text-xs font-semibold text-preview transition hover:bg-element disabled:text-quaternary"
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
        multiple={multiple}
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) {
            if (multiple && onFilesSelected) onFilesSelected(files);
            else onUpload(files[0]);
          }
          e.target.value = '';
        }}
      />

      {frame.previewUrl ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="text-xs font-medium text-preview hover:underline disabled:text-quaternary"
          >
            Replace image
          </button>
          {onPickFromGallery ? (
            <button
              type="button"
              disabled={disabled}
              onClick={onPickFromGallery}
              className="text-xs font-medium text-preview hover:underline disabled:text-quaternary"
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
  const [referenceImages, setReferenceImages] = useState<FrameSlot[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFramePosition, setLogoFramePosition] =
    useState<LogoFramePosition>('first');
  const [referencePrompt, setReferencePrompt] = useState('');
  const [pipelinePhase, setPipelinePhase] = useState<PipelinePhase>('idle');
  const [result, setResult] = useState<VideoGenerationResult | null>(null);
  const [captionCopied, setCaptionCopied] = useState(false);
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false);
  const [galleryTargetIndex, setGalleryTargetIndex] = useState<number | null>(null);
  const dragIndexRef = useRef<number | null>(null);

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

  const canGenerate = creditOk && !!logoUrl && !isBusy && !profileLoading;

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

  const setGalleryReference = useCallback(
    (imageUrl: string, targetIndex: number | null) => {
      const url = imageUrl.trim();
      if (!url) return;
      const next: FrameSlot = {
        previewUrl: url,
        file: null,
        kind: 'gallery',
        isLogoFromDb: false,
        previewMode: 'hero-photo',
      };
      setReferenceImages((prev) => {
        if (targetIndex !== null && prev[targetIndex]) {
          revokeIfBlob(prev[targetIndex].previewUrl);
          const updated = [...prev];
          updated[targetIndex] = next;
          return updated;
        }
        return prev.length < 10 ? [...prev, next] : prev;
      });
      resetRun();
    },
    [resetRun]
  );

  const setUploadReference = useCallback(
    (file: File, targetIndex: number | null) => {
      const previewUrl = URL.createObjectURL(file);
      const next: FrameSlot = {
        previewUrl,
        file,
        kind: 'upload',
        isLogoFromDb: false,
        previewMode: 'hero-photo',
      };
      setReferenceImages((prev) => {
        if (targetIndex !== null && prev[targetIndex]) {
          revokeIfBlob(prev[targetIndex].previewUrl);
          const updated = [...prev];
          updated[targetIndex] = next;
          return updated;
        }
        return prev.length < 10 ? [...prev, next] : prev;
      });
      resetRun();
    },
    [resetRun]
  );

  /** Add a file-picker selection in its original picker order, up to ten slots. */
  const addUploadReferences = useCallback(
    (files: File[]) => {
      const available = Math.max(0, 10 - referenceImages.length);
      const accepted = files.slice(0, available);
      if (!accepted.length) return;
      if (accepted.length < files.length) {
        toast.error('You can add up to 10 reference images.');
      }
      const next = accepted.map((file): FrameSlot => ({
        previewUrl: URL.createObjectURL(file),
        file,
        kind: 'upload',
        isLogoFromDb: false,
        previewMode: 'hero-photo',
      }));
      setReferenceImages((prev) => [...prev, ...next].slice(0, 10));
      resetRun();
    },
    [referenceImages.length, resetRun]
  );

  const clearReference = useCallback((index: number) => {
    setReferenceImages((prev) => {
      const removed = prev[index];
      revokeIfBlob(removed?.previewUrl ?? null);
      return prev.filter((_, itemIndex) => itemIndex !== index);
    });
    resetRun();
  }, [resetRun]);

  const moveReference = useCallback((from: number, to: number) => {
    setReferenceImages((prev) => {
      if (from === to || from < 0 || to < 0 || from >= prev.length || to >= prev.length) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    resetRun();
  }, [resetRun]);

  const handleGenerate = async () => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('You must be signed in to generate videos.');

      const referenceImageFiles = await Promise.all(
        referenceImages.map(async (reference, index) => ({
          file: await resolveFrameFile(reference, `reference image ${index + 1}`),
          source: reference.kind === 'gallery' ? 'gallery' as const : 'upload' as const,
        }))
      );

      resetRun();
      setPipelinePhase('generating');

      const response = await startVideoGeneration({
        referencePrompt: referencePrompt.trim() || undefined,
        referenceImages: referenceImageFiles,
        logoFramePosition,
      });
      setResult({
        platform: 'all_platforms',
        videoGenerationDocId: response.videoGenerationDocId,
        posterUrl: referenceImages[0]?.previewUrl ?? '',
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
          referenceImages[0]?.previewUrl ||
          '',
        posterFilePath: String(data.videoPosterPath ?? '').trim() || undefined,
        videoUrl: String(data.videoUrl ?? '').trim() || null,
        videoFilePath: String(data.videoFilePath ?? '').trim() || null,
        videoCaption: String(data.caption ?? '').trim() || null,
        videoAspectRatio: String(data.videoAspectRatio ?? '').trim() || null,
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
          Describe the advert you want and optionally add up to ten reference images.
          Your direction and business profile guide the complete 20-second
          video.
        </p>

        <div className="flex justify-end flex-col items-end mb-6">
          <p>Credits: {userCredits ?? '—'}</p>
          <p>Cost: {perPlatformCost} credits</p>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-primary-purple/20 bg-primary-purple/5 px-4 py-3">
            <p className="text-sm font-semibold text-default">
              One 16:9 video for Instagram, Facebook, and LinkedIn
            </p>
            <p className="mt-1 text-xs text-secondary">
              Generate once, then schedule the identical video to all three
              platforms.
            </p>
          </div>

          <div className="rounded-2xl border border-default bg-default p-4">
            <p className="text-sm font-semibold text-default">Logo placement</p>
            <p className="mt-1 text-xs text-secondary">
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
                      'rounded-full border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:text-quaternary',
                      logoFramePosition === value
                        ? 'border-preview bg-[var(--purple-9)] text-white'
                        : 'border-default bg-default text-default hover:border-preview'
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {!logoUrl ? (
              <p className="mt-2 text-xs text-warning">
                Add a business logo in your profile to enable first or last
                placement.
              </p>
            ) : null}
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Reference images{' '}
                  <span className="font-normal text-slate-400">(optional)</span>
                </p>
                <p className="text-xs text-slate-500">
                  Add up to 10 product, property, place, or visual references.
                  Their order is chronological: Image 1 opens the advert and each
                  following image advances the story. Drag cards to reorder them.
                </p>
                <p className="mt-1 text-xs font-medium text-amber-700">
                  Make sure the reference images do not contain any humans.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {referenceImages.map((reference, index) => (
                <div
                  key={`${reference.previewUrl}-${index}`}
                  draggable={!isBusy}
                  onDragStart={() => {
                    dragIndexRef.current = index;
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const from = dragIndexRef.current;
                    dragIndexRef.current = null;
                    if (from !== null) moveReference(from, index);
                  }}
                  className="relative"
                >
                  <FrameCard
                    title={`Image ${index + 1}`}
                    subtitle={frameSlotSubtitle(reference)}
                    frame={reference}
                    previewAspectClass={framePreviewAspect}
                    isPortraitPreview={isPortraitPreview}
                    disabled={isBusy}
                    onUpload={(file) => setUploadReference(file, index)}
                    onRemove={() => clearReference(index)}
                    onPickFromGallery={() => {
                      setGalleryTargetIndex(index);
                      setGalleryPickerOpen(true);
                    }}
                  />
                  <div className="mt-2 flex justify-center gap-2">
                    <button
                      type="button"
                      disabled={isBusy || index === 0}
                      onClick={() => moveReference(index, index - 1)}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium disabled:opacity-40"
                      aria-label={`Move Image ${index + 1} earlier`}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Earlier
                    </button>
                    <button
                      type="button"
                      disabled={isBusy || index === referenceImages.length - 1}
                      onClick={() => moveReference(index, index + 1)}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium disabled:opacity-40"
                      aria-label={`Move Image ${index + 1} later`}
                    >
                      Later <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                </div>
              ))}
              {referenceImages.length < 10 ? (
                <FrameCard
                  title={`Add reference ${referenceImages.length + 1}`}
                  subtitle="Upload or choose from Media Library"
                  frame={EMPTY_FRAME}
                  previewAspectClass={framePreviewAspect}
                  isPortraitPreview={isPortraitPreview}
                  disabled={isBusy}
                  onUpload={(file) => setUploadReference(file, null)}
                  onFilesSelected={addUploadReferences}
                  multiple
                  onRemove={() => undefined}
                  onPickFromGallery={() => {
                    setGalleryTargetIndex(null);
                    setGalleryPickerOpen(true);
                  }}
                />
              ) : null}
            </div>
          </div>

          <div>
            <label
              htmlFor="video-reference-prompt"
              className="mb-2 block text-sm font-medium text-default"
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
              className="w-full rounded-lg border border-default bg-element px-4 py-3 text-sm text-default outline-none focus:border-primary-purple focus:ring-2 focus:ring-strong"
            />
          </div>

          <button
            type="button"
            disabled={!canGenerate}
            onClick={() => void handleGenerate()}
            className="flex h-11 w-full items-center justify-center rounded-full btn-brand-fill text-sm font-medium transition-expo disabled:cursor-not-allowed"
          >
            {isBusy ? progressLabel || 'Generating...' : 'Create video'}
          </button>

          {isBusy ? (
            <p className="text-xs font-medium text-preview">{progressLabel}</p>
          ) : null}

          {pipelinePhase === 'ready' && result?.videoUrl ? (
            <div className="space-y-4 rounded-xl border border-primary-purple/25 bg-primary-purple/10 p-4">
              <div>
                <h2 className="text-section text-default">
                  Generated video
                  {result.videoAspectRatio
                    ? ` • ${result.videoAspectRatio}`
                    : ''}
                </h2>
                <p className="text-xs text-preview">
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
                <div className="rounded-xl border border-default bg-default p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="text-subsection text-default">
                      Video post caption
                    </h3>
                    <button
                      type="button"
                      onClick={() => void handleCopyCaption()}
                      className="rounded-full bg-primary-purple px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                    >
                      {captionCopied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="whitespace-pre-line text-sm text-default leading-relaxed">
                    {result.videoCaption}
                  </p>
                </div>
              ) : null}
              <div className="flex flex-col gap-3 sm:flex-row">
                <DownloadVideoButton
                  url={result.videoUrl}
                  getFilename={() => 'video-all-platforms.mp4'}
                  className="inline-flex flex-1 items-center justify-center rounded-full border border-primary-purple/30 bg-default px-5 py-2.5 text-sm font-semibold text-preview hover:bg-element disabled:cursor-not-allowed disabled:text-quaternary"
                />
                <button
                  type="button"
                  onClick={handleSendToScheduler}
                  className="inline-flex flex-1 items-center justify-center rounded-full bg-[var(--green-9)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                >
                  Schedule to all three platforms
                </button>
              </div>
            </div>
          ) : null}

        </div>
      </div>

      <MediaLibraryImagePickerDialog
        open={galleryPickerOpen}
        onOpenChange={(open) => {
          setGalleryPickerOpen(open);
        }}
        title="Choose a reference image"
        onSelect={(url) => {
          setGalleryReference(url, galleryTargetIndex);
          setGalleryPickerOpen(false);
          setGalleryTargetIndex(null);
        }}
      />
    </div>
  );
}
