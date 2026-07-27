'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftRight,
  ImagePlus,
  Images,
  Trash2,
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import {
  fetchDefaultLogoFrameUrl,
  resolveFrameFile,
  startVideoGeneration,
} from '@/src/service/api/video-generation.service';
import { useUserPlanCredits } from '../_components/UserPlanCreditsProvider';
import { useTimestampFormatter } from '@/lib/user-timezone';
import {
  WORKSPACE_NAV_HREFS,
  workspacePageTitle,
} from '@/lib/workspace-nav';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/show-error-toast';
import {
  setPostSchedulerPrefill,
  type PostSchedulerPrefillPayload,
} from '@/lib/post-scheduler-prefill-store';
import { PageLoadingState } from '@/components/shared/PageLoadingState';
import { NonSubscribedFeatureBlock } from '@/components/shared/NonSubscribedFeatureBlock';
import { isPlanInactive } from '@/lib/plan-access';
import {
  listEnabledPlatforms,
  validateGenerationPlatformSelection,
} from '@/lib/platform-selection';
import { cn } from '@/lib/utils';
import { MediaLibraryImagePickerDialog } from '@/components/shared/MediaLibraryImagePickerDialog';

const PLATFORM_ORDER = ['instagram', 'facebook', 'linkedin'] as const;
type SocialPlatform = (typeof PLATFORM_ORDER)[number];

type PipelinePhase = 'idle' | 'preparing' | 'generating' | 'ready' | 'failed';

type FrameKind = 'logo' | 'upload' | 'gallery';

type FrameSlot = {
  previewUrl: string | null;
  file: File | null;
  kind: FrameKind | null;
  isLogoFromDb: boolean;
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
};

function platformLabel(platform: SocialPlatform): string {
  if (platform === 'instagram') return 'Instagram';
  if (platform === 'facebook') return 'Facebook';
  return 'LinkedIn';
}

/** Matches backend `aspectRatioForPlatform` (Veo: 9:16 or 16:9). */
function aspectRatioForPlatform(platform: SocialPlatform | ''): '9:16' | '16:9' {
  if (platform === 'instagram') return '9:16';
  return '16:9';
}

function previewAspectClass(platform: SocialPlatform | ''): string {
  return aspectRatioForPlatform(platform) === '9:16'
    ? 'aspect-[9/16]'
    : 'aspect-video';
}

function aspectRatioHint(platform: SocialPlatform | ''): string {
  if (!platform) {
    return 'Select a platform — preview shape matches the generated video (9:16 or 16:9).';
  }
  const ratio = aspectRatioForPlatform(platform);
  if (ratio === '9:16') {
    return 'Instagram videos are 9:16 portrait — frame previews use the same shape.';
  }
  return 'Facebook and LinkedIn videos are 16:9 widescreen — frame previews use the same shape.';
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
  const isLogoCard = frame.kind === 'logo';

  return (
    <div
      className={cn(
        'flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm',
        isPortraitPreview
          ? 'mx-auto w-full max-w-[13rem] sm:max-w-[15rem]'
          : 'min-w-0 flex-1'
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        {frame.previewUrl ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onRemove}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            aria-label={`Remove ${title}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {frame.previewUrl ? (
        <div
          className={cn(
            'relative flex w-full max-w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200',
            previewAspectClass,
            isLogoCard ? 'bg-slate-900' : 'bg-slate-100'
          )}
        >
          <img
            src={frame.previewUrl}
            alt={title}
            className={cn(
              'max-h-full max-w-full object-contain',
              isLogoCard ? 'p-6' : 'h-full w-full object-cover'
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
              'flex w-full max-w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/80 text-slate-600 transition hover:border-violet-300 hover:bg-violet-50/40 disabled:opacity-50',
              previewAspectClass
            )}
          >
            <ImagePlus className="h-7 w-7 text-violet-500" />
            <span className="text-xs font-medium">Upload image</span>
          </button>
          {onPickFromGallery ? (
            <button
              type="button"
              disabled={disabled}
              onClick={onPickFromGallery}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-50 disabled:opacity-50"
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
            className="text-xs font-medium text-violet-700 hover:underline disabled:opacity-50"
          >
            Replace image
          </button>
          {onPickFromGallery ? (
            <button
              type="button"
              disabled={disabled}
              onClick={onPickFromGallery}
              className="text-xs font-medium text-violet-700 hover:underline disabled:opacity-50"
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
  const [firstFrame, setFirstFrame] = useState<FrameSlot>(EMPTY_FRAME);
  const [lastFrame, setLastFrame] = useState<FrameSlot>(EMPTY_FRAME);
  const [logoLoading, setLogoLoading] = useState(true);
  const [referencePrompt, setReferencePrompt] = useState('');
  const [platform, setPlatform] = useState<SocialPlatform | ''>('');
  const [pipelinePhase, setPipelinePhase] = useState<PipelinePhase>('idle');
  const [result, setResult] = useState<VideoGenerationResult | null>(null);
  const [captionCopied, setCaptionCopied] = useState(false);
  const [galleryPickerTarget, setGalleryPickerTarget] = useState<
    'first' | 'last' | null
  >(null);

  const { billing, loading: creditsLoading } = useUserPlanCredits();
  const fmtTimestamp = useTimestampFormatter();
  const selectedAccounts = billing?.selected;
  const planExpiresAt = billing?.planExpiresAt;
  const formattedPlanExpiresAt = planExpiresAt
    ? fmtTimestamp(planExpiresAt)
    : '—';
  const userCredits = billing?.credits;

  const allowedPlatforms = useMemo(
    () => listEnabledPlatforms(selectedAccounts),
    [selectedAccounts]
  );

  const platformSelection = useMemo(
    () =>
      validateGenerationPlatformSelection({
        selected: platform ? [platform] : [],
        enabled: allowedPlatforms,
        activePlan: billing?.activePlan,
      }),
    [platform, allowedPlatforms, billing?.activePlan]
  );

  const hasGalleryFrame = useMemo(
    () =>
      [firstFrame, lastFrame].some(
        (slot) => slot.kind === 'gallery' && Boolean(slot.previewUrl)
      ),
    [firstFrame, lastFrame]
  );

  const hasUploadedSceneFile = useMemo(
    () =>
      [firstFrame, lastFrame].some(
        (slot) => slot.kind === 'upload' && Boolean(slot.file)
      ),
    [firstFrame, lastFrame]
  );

  const framesReady =
    Boolean(firstFrame.previewUrl) &&
    Boolean(lastFrame.previewUrl) &&
    (hasUploadedSceneFile || hasGalleryFrame);

  const perPlatformCost = 4;
  const creditOk =
    userCredits !== undefined && userCredits >= perPlatformCost;
  const insufficientCredits =
    userCredits !== undefined && userCredits < perPlatformCost;

  const isBusy = pipelinePhase === 'generating';

  const canGenerate =
    framesReady &&
    !!platform &&
    creditOk &&
    !isBusy &&
    !logoLoading &&
    platformSelection.ok;

  const showSelectAccountsFirst =
    !creditsLoading && billing != null && allowedPlatforms.length === 0;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const logoUrl = await fetchDefaultLogoFrameUrl();
        if (cancelled) return;
        if (logoUrl) {
          setFirstFrame({
            previewUrl: logoUrl,
            file: null,
            kind: 'logo',
            isLogoFromDb: true,
          });
        }
      } catch {
        if (!cancelled) {
          showErrorToast('Could not load your brand logo for the first frame.');
        }
      } finally {
        if (!cancelled) setLogoLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (allowedPlatforms.length === 0) {
      if (platform) setPlatform('');
      return;
    }
    if (platform && !allowedPlatforms.includes(platform)) {
      setPlatform('');
    }
  }, [allowedPlatforms, platform]);

  const resetRun = useCallback(() => {
    setPipelinePhase('idle');
    setResult(null);
  }, []);

  const setGalleryFrame = useCallback(
    (target: 'first' | 'last', imageUrl: string) => {
      const url = imageUrl.trim();
      if (!url) return;
      const next: FrameSlot = {
        previewUrl: url,
        file: null,
        kind: 'gallery',
        isLogoFromDb: false,
      };
      if (target === 'first') {
        setFirstFrame((prev) => {
          revokeIfBlob(prev.previewUrl);
          return next;
        });
      } else {
        setLastFrame((prev) => {
          revokeIfBlob(prev.previewUrl);
          return next;
        });
      }
      resetRun();
    },
    [resetRun]
  );

  const setUploadFrame = useCallback(
    (target: 'first' | 'last', file: File) => {
      const previewUrl = URL.createObjectURL(file);
      const next: FrameSlot = {
        previewUrl,
        file,
        kind: 'upload',
        isLogoFromDb: false,
      };
      if (target === 'first') {
        setFirstFrame((prev) => {
          revokeIfBlob(prev.previewUrl);
          return next;
        });
      } else {
        setLastFrame((prev) => {
          revokeIfBlob(prev.previewUrl);
          return next;
        });
      }
      resetRun();
    },
    [resetRun]
  );

  const clearFrame = useCallback(
    (target: 'first' | 'last') => {
      if (target === 'first') {
        setFirstFrame((prev) => {
          revokeIfBlob(prev.previewUrl);
          return EMPTY_FRAME;
        });
      } else {
        setLastFrame((prev) => {
          revokeIfBlob(prev.previewUrl);
          return EMPTY_FRAME;
        });
      }
      resetRun();
    },
    [resetRun]
  );

  const firstFrameRef = useRef(firstFrame);
  const lastFrameRef = useRef(lastFrame);
  firstFrameRef.current = firstFrame;
  lastFrameRef.current = lastFrame;

  const swapFrames = useCallback(() => {
    const prevFirst = firstFrameRef.current;
    const prevLast = lastFrameRef.current;
    setFirstFrame(prevLast);
    setLastFrame(prevFirst);
    resetRun();
  }, [resetRun]);

  const handleGenerate = async () => {
    try {
      if (!firstFrame.previewUrl || !lastFrame.previewUrl) {
        throw new Error('Both first and last frames are required.');
      }
      if (!platform) throw new Error('Please select a platform.');
      const user = auth.currentUser;
      if (!user) throw new Error('You must be signed in to generate videos.');

      const [firstFrameFile, lastFrameFile] = await Promise.all([
        resolveFrameFile(firstFrame, 'first'),
        resolveFrameFile(lastFrame, 'last'),
      ]);

      resetRun();
      setPipelinePhase('generating');

      const response = await startVideoGeneration({
        platform,
        referencePrompt: referencePrompt.trim() || undefined,
        firstFrame: firstFrameFile,
        lastFrame: lastFrameFile,
      });
      setResult({
        platform,
        videoGenerationDocId: response.videoGenerationDocId,
        posterUrl: response.posterUrl ?? lastFrame.previewUrl ?? '',
        posterFilePath: response.posterFilePath,
        videoUrl: response.videoUrl ?? null,
        videoFilePath: response.videoFilePath ?? null,
        videoCaption: response.caption ?? null,
        videoAspectRatio: response.aspectRatio ?? null,
      });
      setPipelinePhase('ready');
      toast.success('Video is ready');
    } catch (err) {
      setPipelinePhase('failed');
      showErrorToast('Failed to generate video.');
    }
  };

  function handleSendToScheduler() {
    if (!result?.videoUrl || !result.videoFilePath) return;
    const posterUrl = result.posterUrl.trim();
    const posterFilePath = result.posterFilePath?.trim() ?? '';
    const payload: PostSchedulerPrefillPayload = {
      source: 'gallery',
      createdAt: Date.now(),
      lockedPlatform: result.platform as SocialPlatform,
      posts: [
        {
          imageUrl: posterUrl,
          imageFilePath: '',
          mediaType: 'video',
          videoUrl: result.videoUrl,
          videoFilePath: result.videoFilePath,
          ...(posterUrl ? { videoPosterUrl: posterUrl } : {}),
          ...(posterFilePath ? { videoPosterPath: posterFilePath } : {}),
          message: result.videoCaption?.trim() ?? '',
          platform: result.platform as SocialPlatform,
          source: 'videoGeneration',
        },
      ],
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
  const framePreviewAspect = previewAspectClass(platform);
  const isPortraitPreview = aspectRatioForPlatform(platform) === '9:16';

  if (creditsLoading || logoLoading) {
    return <PageLoadingState message="Loading your account..." />;
  }

  if (isPlanInactive(billing)) {
    return <NonSubscribedFeatureBlock />;
  }

  return (
    <div className="mx-auto animate-in fade-in duration-500 pb-20">
      <div className="max-w-4xl mx-auto backdrop-blur-lg bg-white/5 border border-white/10 rounded-2xl p-8 shadow-[0_0_30px_rgba(108,92,231,0.2)]">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
          {workspacePageTitle(WORKSPACE_NAV_HREFS.videoGeneration)}
        </h1>
        <p className="text-sm text-slate-600 mb-6">
          Set your Veo first and last frames, optionally guide motion with a
          reference prompt, then generate an 8-second platform-tuned advert
          video.
        </p>

        <div className="flex justify-end flex-col items-end mb-6">
          <p>Credits: {userCredits ?? '—'}</p>
          <p>Cost: {perPlatformCost} credits</p>
        </div>

        <div className="space-y-6">
          <div>
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Platform
            </span>
            {showSelectAccountsFirst ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                Connect at least one social account before generating video.{' '}
                <Link
                  href={WORKSPACE_NAV_HREFS.linkedProfiles}
                  className="font-medium underline"
                >
                  Connected Accounts
                </Link>
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {PLATFORM_ORDER.map((entry) => {
                    const enabled = allowedPlatforms.includes(entry);
                    const selected = platform === entry;
                    const ratio = aspectRatioForPlatform(entry);
                    return (
                      <button
                        key={entry}
                        type="button"
                        disabled={!enabled || isBusy}
                        onClick={() => {
                          setPlatform(entry);
                          resetRun();
                        }}
                        className={cn(
                          'rounded-full border px-4 py-2 text-sm font-semibold transition',
                          selected
                            ? 'border-violet-600 bg-violet-600 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300',
                          !enabled && 'cursor-not-allowed opacity-50'
                        )}
                      >
                        {platformLabel(entry)}
                        <span className="ml-1.5 text-xs font-normal opacity-80">
                          {ratio}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {aspectRatioHint(platform)}
                </p>
              </>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-700">
                  First & last frames
                </p>
                <p className="text-xs text-slate-500">
                  First frame defaults to your brand logo. Upload your scene to
                  the last frame. Swap or remove either slot — both are required.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
              <FrameCard
                title="First frame"
                subtitle={
                  firstFrame.kind === 'logo'
                    ? firstFrame.isLogoFromDb
                      ? 'Brand logo (from profile)'
                      : 'Brand logo'
                    : firstFrame.kind === 'gallery'
                      ? 'From Media Library'
                      : 'Scene image'
                }
                frame={firstFrame}
                previewAspectClass={framePreviewAspect}
                isPortraitPreview={isPortraitPreview}
                disabled={isBusy}
                onUpload={(file) => setUploadFrame('first', file)}
                onRemove={() => clearFrame('first')}
                onPickFromGallery={() => setGalleryPickerTarget('first')}
              />

              <button
                type="button"
                disabled={isBusy}
                onClick={swapFrames}
                className="mx-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-violet-200 bg-white text-violet-700 shadow-sm transition hover:bg-violet-50 disabled:opacity-50 sm:self-center"
                aria-label="Swap first and last frames"
                title="Swap frames"
              >
                <ArrowLeftRight className="h-5 w-5" />
              </button>

              <FrameCard
                title="Last frame"
                subtitle={
                  lastFrame.kind === 'logo'
                    ? 'Brand logo'
                    : lastFrame.kind === 'gallery'
                      ? 'From Media Library'
                      : 'Scene image (upload)'
                }
                frame={lastFrame}
                previewAspectClass={framePreviewAspect}
                isPortraitPreview={isPortraitPreview}
                disabled={isBusy}
                onUpload={(file) => setUploadFrame('last', file)}
                onRemove={() => clearFrame('last')}
                onPickFromGallery={() => setGalleryPickerTarget('last')}
              />
            </div>

            {!framesReady ? (
              <p className="mt-2 text-xs text-amber-700">
                Add both frames before generating — logo in one slot and your
                uploaded scene in the other.
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="video-reference-prompt"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Reference prompt (optional)
            </label>
            <textarea
              id="video-reference-prompt"
              value={referencePrompt}
              disabled={isBusy}
              onChange={(e) => {
                setReferencePrompt(e.target.value);
                resetRun();
              }}
              placeholder="Describe motion, mood, or creative direction for the video (optional)"
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>

          <button
            type="button"
            disabled={!canGenerate || showSelectAccountsFirst}
            onClick={() => void handleGenerate()}
            className="w-full rounded-full bg-violet-600 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isBusy
              ? progressLabel || 'Generating...'
              : `Generate video${insufficientCredits ? ' (Insufficient credits)' : ''}`}
          </button>

          {isBusy ? (
            <p className="text-xs font-medium text-violet-700">{progressLabel}</p>
          ) : null}

          {pipelinePhase === 'ready' && result?.videoUrl ? (
            <div className="space-y-4 rounded-xl border border-violet-100 bg-violet-50/50 p-4">
              <div>
                <h2 className="text-sm font-semibold text-violet-900">
                  Generated video
                  {result.videoAspectRatio
                    ? ` • ${result.videoAspectRatio}`
                    : ''}
                </h2>
                <p className="text-xs text-violet-700 capitalize">
                  Platform: {result.platform}
                </p>
              </div>
              <video
                controls
                poster={result.posterUrl}
                className={cn(
                  'w-full max-w-2xl mx-auto rounded-lg border border-violet-100 bg-black object-contain',
                  previewAspectClass(result.platform as SocialPlatform)
                )}
                src={result.videoUrl}
              />
              {result.videoCaption ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-slate-800">
                      Video post caption
                    </h3>
                    <button
                      type="button"
                      onClick={() => void handleCopyCaption()}
                      className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                    >
                      {captionCopied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="whitespace-pre-line text-sm text-slate-700 leading-relaxed">
                    {result.videoCaption}
                  </p>
                </div>
              ) : null}
              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  href={result.videoUrl}
                  download={`video-${result.platform}.mp4`}
                  className="inline-flex flex-1 items-center justify-center rounded-full border border-violet-200 bg-white px-5 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-50"
                >
                  Download video
                </a>
                <button
                  type="button"
                  onClick={handleSendToScheduler}
                  className="inline-flex flex-1 items-center justify-center rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                >
                  Schedule this video
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <MediaLibraryImagePickerDialog
        open={galleryPickerTarget !== null}
        onOpenChange={(open) => {
          if (!open) setGalleryPickerTarget(null);
        }}
        title={
          galleryPickerTarget === 'first'
            ? 'Choose image for first frame'
            : galleryPickerTarget === 'last'
              ? 'Choose image for last frame'
              : 'Choose from Media Library'
        }
        onSelect={(url) => {
          if (galleryPickerTarget) {
            setGalleryFrame(galleryPickerTarget, url);
            setGalleryPickerTarget(null);
          }
        }}
      />
    </div>
  );
}
