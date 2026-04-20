'use client';

import { useAuth } from '@/src/hooks/useAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTodatDate } from '@/utils/getTodayDate';
import {
  generateAiContentStudio,
  scheduleAiContentStudioPost,
  type StudioRenderedImage,
  type SchedulePostPayload,
} from '@/src/service/api/aiContentStudio';
import {
  formatTimestamp,
  useUserPlanCredits,
} from '../_components/UserPlanCreditsProvider';
import Link from 'next/link';
import { toast } from 'sonner';
import { DownloadPngButton } from '@/components/download-png-button';

const inputBase =
  'w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all';

const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

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
type GenPlatform = (typeof PLATFORM_ORDER)[number] | 'all_platforms';

function firstEnabledPlatform(
  accounts: Partial<Record<GenPlatform, boolean>> | null | undefined
): GenPlatform | undefined {
  if (!accounts) return undefined;
  return PLATFORM_ORDER.find((p) => accounts[p] === true);
}

type CreatedContent = {
  id: string;
  promptSummary: string;
  inferredImageContext?: string | null;
  renderedImages: StudioRenderedImage[];
  createdAt: string;
};

type ScheduledItem = {
  id: string;
  contentId: string;
  scheduledPostId?: string;
  summary: string;
  scheduledAt: string;
  platform: string;
};

export default function AIContentPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [prompt, setPrompt] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<CreatedContent | null>(null);
  const [history, setHistory] = useState<CreatedContent[]>([]);
  const [genPlatform, setGenPlatform] = useState<GenPlatform>('instagram');

  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [platform, setPlatform] = useState('');
  const [cropForPlatform, setCropForPlatform] = useState(true);
  const [scheduled, setScheduled] = useState<ScheduledItem[]>([]);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [selectedRenderedImage, setSelectedRenderedImage] = useState<
    import('@/src/service/api/aiContentStudio').StudioRenderedImage | null
  >(null);
  const { billing, loading: creditsLoading } = useUserPlanCredits();
  const selectedAccounts = billing?.selected;
  const creditsExpiresAt = billing?.creditsExpiresAt;
  const userCredits = billing?.credits;
  const formattedCreditsExpiresAt = creditsExpiresAt
    ? formatTimestamp(creditsExpiresAt)
    : '—';
  const hasPrompt = prompt.trim().length > 0;

  const hasSelectablePlatforms = useMemo(
    () => !!firstEnabledPlatform(selectedAccounts),
    [selectedAccounts]
  );

  const showSelectAccountsFirst =
    !creditsLoading && billing != null && !hasSelectablePlatforms;

  useEffect(() => {
    if (genPlatform === 'all_platforms') return;
    const first = firstEnabledPlatform(selectedAccounts);
    if (!first) return;
    if (!selectedAccounts?.[genPlatform as keyof typeof selectedAccounts]) {
      setGenPlatform(first);
    }
  }, [selectedAccounts, genPlatform]);

  useEffect(() => {
    if (!platform || platform === 'all_platforms') return;
    const first = firstEnabledPlatform(selectedAccounts);
    if (!first) return;
    if (!selectedAccounts?.[platform as keyof typeof selectedAccounts]) {
      setPlatform(first);
    }
  }, [selectedAccounts, platform]);
  const hasImage = selectedImage !== null;
  const formattedToday = getTodatDate();
  const credits = billing?.credits;

  const previewUrl = useMemo(
    () => (selectedImage ? URL.createObjectURL(selectedImage) : null),
    [selectedImage]
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!loading && !user) router.replace('/sign-in');
  }, [loading, user, router]);

  const promptParam = searchParams.get('prompt');
  useEffect(() => {
    const q = promptParam?.trim();
    if (q) setPrompt(q);
  }, [promptParam]);

  const creditOk = credits !== undefined && credits > 0;
  const canGenerate =
    (hasPrompt || hasImage) && creditOk && !isGenerating && !!genPlatform;

  const scheduledAt =
    scheduleDate && scheduleTime ? `${scheduleDate}T${scheduleTime}` : '';

  const isAllPlatforms = platform === 'all_platforms';
  const canSchedule =
    !!generated &&
    !!scheduledAt &&
    !isScheduling &&
    (isAllPlatforms
      ? generated.renderedImages.some((r) => r.imageUrl)
      : !!selectedRenderedImage?.imageUrl && !!platform);

  const handleFile = useCallback((file: File | null) => {
    setImageError(null);
    if (!file) {
      setSelectedImage(null);
      return;
    }
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setImageError('Please use a valid image (JPEG, PNG, GIF, or WebP).');
      return;
    }
    setSelectedImage(file);
  }, []);

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
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
    if (file) handleFile(file);
    e.target.value = '';
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImageError(null);
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setIsGenerating(true);
    setGenerated(null);
    setGenerateError(null);
    setSelectedRenderedImage(null);

    try {
      let imageToSend = selectedImage;
      if (selectedImage && selectedImage.size > MAX_IMAGE_BYTES) {
        imageToSend = await compressToWebP(selectedImage, MAX_IMAGE_BYTES);
      }

      const data = await generateAiContentStudio({
        prompt: prompt.trim(),
        platform: genPlatform,
        image: imageToSend,
      });

      const id = crypto.randomUUID();
      const item: CreatedContent = {
        id,
        promptSummary:
          prompt.trim() ||
          (data.inferredImageContext
            ? data.inferredImageContext
            : 'Image-only'),
        inferredImageContext: data.inferredImageContext,
        renderedImages: data.renderedImages,
        createdAt: new Date().toLocaleString(),
      };

      setGenerated(item);
      setHistory((prev) => [item, ...prev]);

      // Auto-select for single-platform results; for all_platforms no selection needed.
      if (data.renderedImages.length === 1 && data.renderedImages[0].imageUrl) {
        setSelectedRenderedImage(data.renderedImages[0]);
        setPlatform(data.renderedImages[0].platform);
      } else {
        setPlatform('all_platforms');
      }

      toast.success('Content generated successfully');
      if (!data.renderedImages.some((r) => r.imageUrl)) {
        toast.error(
          'The image model did not return an image. Try again or pick another platform.'
        );
      }
    } catch (e: any) {
      console.log(e.response);
      toast.error(
        e?.response?.data?.message || e.message || 'Failed to generate content.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSchedule = async () => {
    if (!canSchedule || !generated) return;
    setScheduleError(null);
    setIsScheduling(true);
    try {
      const when = new Date(`${scheduleDate}T${scheduleTime}:00`);

      if (isAllPlatforms) {
        const posts: SchedulePostPayload[] = generated.renderedImages
          .filter((r) => r.imageUrl)
          .map((r) => ({
            platform: r.platform,
            scheduleAt: when.toISOString(),
            message: r.caption,
            imageUrl: r.imageUrl,
            imageFilePath: r.imageFilePath,
            cropForPlatform,
          }));
        const { scheduledPostId } = await scheduleAiContentStudioPost(posts);
        const item: ScheduledItem = {
          id: crypto.randomUUID(),
          contentId: generated.id,
          scheduledPostId,
          summary: posts[0]?.message.slice(0, 120) ?? '',
          scheduledAt: scheduledAt.replace('T', ' at '),
          platform: 'all platforms',
        };
        setScheduled((prev) => [item, ...prev]);
      } else {
        if (!selectedRenderedImage?.imageUrl) return;
        const { scheduledPostId } = await scheduleAiContentStudioPost({
          platform,
          scheduleAt: when.toISOString(),
          message: selectedRenderedImage.caption,
          imageUrl: selectedRenderedImage.imageUrl,
          imageFilePath: selectedRenderedImage.imageFilePath,
          cropForPlatform,
        });
        const item: ScheduledItem = {
          id: crypto.randomUUID(),
          contentId: generated.id,
          scheduledPostId,
          summary: selectedRenderedImage.caption.slice(0, 120),
          scheduledAt: scheduledAt.replace('T', ' at '),
          platform,
        };
        setScheduled((prev) => [item, ...prev]);
      }

      setScheduleDate('');
      setScheduleTime('');
      setPlatform('');
      setSelectedRenderedImage(null);
      toast.success('Content scheduled successfully');
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Failed to schedule content.'
      );
    } finally {
      setIsScheduling(false);
    }
  };

  if (
    billing?.activePlan === 'non-subscribed' &&
    userCredits === 0 &&
    new Date(formattedCreditsExpiresAt) < new Date()
  ) {
    return (
      <div className="animate-in fade-in duration-500 pb-20 flex flex-col items-center justify-center h-screen">
        <h1 className="text-3xl font-bold tracking-tight  text-slate-900">
          <p className="text-center">You are not eligible for this feature.</p>
          <p className="text-center">
            Please subscribe to a plan to use this feature.
          </p>
        </h1>
        <p className="mt-2 text-base text-slate-500 max-w-2xl">
          You can subscribe to a plan{' '}
          <Link href="/settings/billings" className="underline text-indigo-600">
            here
          </Link>
          .
        </p>
      </div>
    );
  }

  const allowdPlatforms = useMemo(() => {
    return PLATFORM_ORDER.filter((p) => selectedAccounts?.[p]);
  }, [selectedAccounts]);

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500 pb-20">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 leading-tight">
            Instant generation
          </h1>
          <p className="mt-2 text-base text-slate-500 max-w-2xl">
            Turn a simple prompt or product photo into ready-to-schedule social
            content and ads.
          </p>
        </div>
        <div className="glass-card rounded-2xl px-4 py-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Credits
            </p>
            <p className="text-lg font-bold text-slate-900">
              {creditsLoading ? '…' : (credits ?? '—')}{' '}
              <span className="text-xs font-normal text-slate-500">
                per generation: <span className="font-semibold">2</span>
              </span>
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,2fr),minmax(0,1.3fr)]">
        {/* Left: Create & Generate */}
        <section className="glass-card rounded-3xl p-6 sm:p-8 space-y-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">
              Create campaign concept
            </h2>
          </div>

          <div className="space-y-6">
            <div>
              <label
                htmlFor="ai-prompt"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Prompt
              </label>
              <textarea
                id="ai-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder='Describe the product, audience, and goal. For example: "Instagram carousel ad for a D2C coffee brand, targeting busy founders who want better focus."'
                rows={4}
                className={cn(
                  inputBase,
                  'resize-y min-h-[110px] leading-relaxed'
                )}
              />
              <p className="mt-1 text-xs text-slate-500">
                You can use just a prompt, just a photo, or both together.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
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
                  <div className="p-4 relative flex justify-center">
                    <div className="relative group rounded-xl overflow-hidden shadow-sm">
                      <img
                        src={previewUrl ?? ''}
                        alt="Reference preview"
                        className="max-h-[260px] object-contain bg-slate-100"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={clearImage}
                          className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-red-600 shadow-sm hover:scale-105 transition-transform"
                        >
                          Remove image
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-3 py-8 px-4 cursor-pointer">
                    <input
                      type="file"
                      accept={ACCEPTED_IMAGE_TYPES.join(',')}
                      onChange={onFileInputChange}
                      className="sr-only"
                    />
                    <div className="flex h-14 w-14 items-center justify-center rounded-full text-indigo-500 bg-white shadow-sm ring-1 ring-slate-100">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                    <div className="text-center">
                      <span className="text-sm font-medium text-slate-700 block">
                        Click to upload or drag &amp; drop
                      </span>
                      <span className="text-xs text-slate-500 mt-1 block">
                        JPEG, PNG, GIF or WebP (max. 5MB)
                      </span>
                    </div>
                  </label>
                )}
              </div>
              {imageError && (
                <p className="mt-2 text-sm text-red-500">{imageError}</p>
              )}
            </div>
          </div>
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
                href="/social-media-integration"
                className="mt-2 inline-block text-sm font-semibold text-amber-950 underline underline-offset-2 hover:text-amber-900"
              >
                Open social setup
              </Link>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-4 sm:gap-6">
                {PLATFORM_ORDER.map((p) => {
                  const allowed = !!selectedAccounts?.[p];
                  const label =
                    p === 'instagram'
                      ? 'Instagram'
                      : p === 'facebook'
                        ? 'Facebook'
                        : 'LinkedIn';
                  if (!allowed) return null;
                  return (
                    <label
                      key={p}
                      htmlFor={`generate-platform-${p}`}
                      className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800"
                    >
                      <input
                        type="checkbox"
                        name="generate-platform"
                        checked={genPlatform === p}
                        onChange={() => setGenPlatform(p)}
                        className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30"
                      />
                      <span>{label}</span>
                    </label>
                  );
                })}
                {allowdPlatforms.length > 1 && (
                  <label
                    htmlFor="generate-platform-all_platforms"
                    className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800"
                  >
                    <input
                      id="generate-platform-all_platforms"
                      type="checkbox"
                      checked={genPlatform === 'all_platforms'}
                      onChange={() => setGenPlatform('all_platforms')}
                      className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30"
                    />
                    <span>
                      {allowdPlatforms.length === 2
                        ? 'Both platforms'
                        : 'All platforms'}
                    </span>
                  </label>
                )}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {genPlatform === 'all_platforms'
                  ? 'Generates one post per connected platform in a single run.'
                  : 'Each run creates one post optimized for the platform you select.'}
              </p>
            </>
          )}

          {generateError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
              {generateError}
            </p>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition-all hover:bg-indigo-700 hover:-translate-y-0.5 active:scale-[0.98] disabled:transform-none disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none flex items-center justify-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {isGenerating ? 'Running AI engine…' : 'Generate content'}
          </button>

          {generated && (
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
                      <img
                        src={asset.imageUrl}
                        alt="Generated post"
                        className="max-h-[320px] w-full rounded-xl object-contain bg-slate-100 border border-slate-200"
                      />
                      <div className="flex flex-col sm:flex-row gap-4 mt-4">
                        <DownloadPngButton
                          url={asset.imageUrl}
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
                        <img
                          src={asset.imageUrl}
                          alt={`${asset.platform} generated post`}
                          className="max-h-[240px] w-full rounded-lg object-contain bg-slate-100 border border-slate-100"
                        />
                      ) : (
                        <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                          No image returned
                        </p>
                      )}
                      {asset.imageUrl ? (
                        <div className="flex flex-col sm:flex-row gap-4 mt-3">
                          <DownloadPngButton
                            url={asset.imageUrl}
                            getFilename={() =>
                              `instant-${asset.platform}-${Date.now()}.png`
                            }
                          />
                        </div>
                      ) : null}
                      <p className="mt-2 text-xs text-slate-700 leading-relaxed line-clamp-3 whitespace-pre-wrap">
                        {asset.caption}
                      </p>
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

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                      <Calendar className="h-4 w-4 text-slate-400" /> Date
                    </label>
                    <input
                      type="date"
                      min={formattedToday}
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className={inputBase}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                      <Clock className="h-4 w-4 text-slate-400" /> Time
                    </label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className={inputBase}
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={cropForPlatform}
                    onChange={(e) => setCropForPlatform(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  AI smart-crop each image to its platform ratio before
                  scheduling
                </label>

                {scheduledAt && (
                  <p className="text-xs font-medium text-indigo-600 bg-indigo-50 py-2 px-3 rounded-lg inline-block">
                    Will schedule on: {scheduledAt.replace('T', ' at ')}
                  </p>
                )}

                {scheduleError && (
                  <p className="text-sm text-red-600">{scheduleError}</p>
                )}

                <button
                  type="button"
                  onClick={handleSchedule}
                  disabled={!canSchedule}
                  className="w-full rounded-xl bg-gradient-primary px-4 py-3 text-sm font-bold text-white shadow-sm shadow-slate-900/20 transition-all hover:bg-slate-800 hover:-translate-y-0.5 active:scale-[0.98] disabled:transform-none disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none mt-1"
                >
                  {isScheduling ? 'Scheduling…' : `Schedule on all platforms`}
                </button>
              </>
            ) : !selectedRenderedImage ? (
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
                      {selectedRenderedImage.platform}
                    </span>
                  </div>
                  {selectedRenderedImage.imageUrl && (
                    <img
                      src={selectedRenderedImage.imageUrl}
                      alt=""
                      className="max-h-40 w-full rounded-lg object-contain bg-white border border-slate-100"
                    />
                  )}
                  {selectedRenderedImage.imageUrl ? (
                    <div className="flex flex-col sm:flex-row gap-4 mt-3">
                      <DownloadPngButton
                        url={selectedRenderedImage.imageUrl}
                        getFilename={() =>
                          `instant-${selectedRenderedImage.platform}-${Date.now()}.png`
                        }
                      />
                    </div>
                  ) : null}
                  <p className="text-sm text-slate-800 line-clamp-4">
                    {selectedRenderedImage.caption}
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
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className={inputBase}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                      <Clock className="h-4 w-4 text-slate-400" /> Time
                    </label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className={inputBase}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 sm:gap-6">
                  {PLATFORM_ORDER.map((p) => {
                    const allowed = !!selectedAccounts?.[p];
                    const label =
                      p === 'instagram'
                        ? 'Instagram'
                        : p === 'facebook'
                          ? 'Facebook'
                          : 'LinkedIn';
                    if (!allowed) return null;
                    return (
                      <label
                        key={p}
                        htmlFor={`schedule-platform-${p}`}
                        className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800"
                      >
                        <input
                          id={`schedule-platform-${p}`}
                          type="checkbox"
                          checked={platform === p}
                          onChange={() => setPlatform(p)}
                          className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30"
                        />
                        <span>{label}</span>
                      </label>
                    );
                  })}
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={cropForPlatform}
                    onChange={(e) => setCropForPlatform(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  AI smart-crop image to selected platform ratio before
                  scheduling
                </label>
                <p className="text-xs text-slate-500">
                  Ratios: Instagram 4:5, Facebook 1:1, LinkedIn 1.91:1.
                  Orientation is preserved during refinement; crop is applied
                  only at scheduling.
                </p>

                {scheduledAt && (
                  <p className="text-xs font-medium text-indigo-600 bg-indigo-50 py-2 px-3 rounded-lg inline-block">
                    Will schedule on: {scheduledAt.replace('T', ' at ')}
                  </p>
                )}

                {scheduleError && (
                  <p className="text-sm text-red-600">{scheduleError}</p>
                )}

                <button
                  type="button"
                  onClick={handleSchedule}
                  disabled={!canSchedule}
                  className="w-full rounded-xl bg-gradient-primary px-4 py-3 text-sm font-bold text-white shadow-sm shadow-slate-900/20 transition-all hover:bg-slate-800 hover:-translate-y-0.5 active:scale-[0.98] disabled:transform-none disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none mt-1"
                >
                  {isScheduling ? 'Scheduling…' : 'Add to schedule'}
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
                          {item.createdAt}
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
    </div>
  );
}
