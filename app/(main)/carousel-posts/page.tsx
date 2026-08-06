'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CreditCard, ImagePlus, Layers, Loader2, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/src/hooks/useAuth';
import { generateCarousel } from '@/src/service/api/carousel';
import { waitForParentJobDocs } from '@/src/lib/wait-for-parent-job';
import { useUserPlanCredits } from '@/app/(main)/_components/UserPlanCreditsProvider';
import { PageLoadingState } from '@/components/shared/PageLoadingState';
import { NonSubscribedFeatureBlock } from '@/components/shared/NonSubscribedFeatureBlock';
import { isPlanInactive } from '@/lib/plan-access';
import {
  workspaceInputClass,
  workspacePageDescriptionClass,
  workspacePageTitleClass,
} from '@/lib/workspace-ui';
import { Button } from '@/components/ui/button';
import { showErrorToast } from '@/lib/show-error-toast';
import {
  setPostSchedulerPrefill,
  type PostSchedulerPrefillPayload,
} from '@/lib/post-scheduler-prefill-store';
import {
  PLATFORM_ORDER,
  listEnabledPlatforms,
  type SocialPlatform,
} from '@/lib/platform-selection';
import Link from 'next/link';
import { WORKSPACE_NAV_HREFS, workspacePageTitle } from '@/lib/workspace-nav';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { CarouselSwipePreview } from '@/components/shared/CarouselSwipePreview';
import {
  ImagePreviewOverlay,
  useImagePreview,
} from '@/components/image-preview';

const CREDIT_PER_SLIDE = 3;

type CarouselResult = {
  platform: SocialPlatform;
  caption: string;
  slideCount: number;
  imageUrl: string;
  imageFilePath: string;
  carouselSlides: Array<{
    index: number;
    headline?: string | null;
    purpose?: string | null;
    visualType?: string | null;
    imageUrl: string;
    imageFilePath: string;
  }>;
};

function platformLabel(platform: SocialPlatform): string {
  if (platform === 'instagram') return 'Instagram';
  if (platform === 'facebook') return 'Facebook';
  return 'LinkedIn';
}

function firstEnabledPlatform(
  accounts: Partial<Record<SocialPlatform, boolean>> | null | undefined
): SocialPlatform | undefined {
  if (!accounts) return undefined;
  return PLATFORM_ORDER.find((p) => accounts[p] === true);
}

function apiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      | { message?: string; error?: string }
      | undefined;
    const msg = data?.message || data?.error;
    if (typeof msg === 'string' && msg.trim()) return msg.trim();
  }
  if (err instanceof Error && err.message.trim()) return err.message.trim();
  return fallback;
}

function mapCarouselResult(
  docs: Array<{ id: string; data: Record<string, unknown> }>
): CarouselResult | null {
  const first = docs.find(
    (doc) =>
      String(doc.data.generationStatus ?? '').toLowerCase() !== 'failed'
  );
  if (!first) return null;

  const rawSlides = Array.isArray(first.data.carouselSlides)
    ? first.data.carouselSlides
    : [];
  const carouselSlides = rawSlides
    .map((slide, index) => {
      const row = slide as Record<string, unknown>;
      const imageUrl = String(row.imageUrl ?? '').trim();
      const imageFilePath = String(row.imageFilePath ?? '').trim();
      if (!imageUrl || !imageFilePath) return null;
      return {
        index:
          typeof row.index === 'number' && Number.isFinite(row.index)
            ? row.index
            : index + 1,
        headline: typeof row.headline === 'string' ? row.headline : null,
        purpose: typeof row.purpose === 'string' ? row.purpose : null,
        visualType: typeof row.visualType === 'string' ? row.visualType : null,
        imageUrl,
        imageFilePath,
      };
    })
    .filter((slide): slide is NonNullable<typeof slide> => Boolean(slide));

  if (carouselSlides.length === 0) return null;

  const platform = String(first.data.platform ?? '').toLowerCase();
  if (platform !== 'instagram' && platform !== 'facebook' && platform !== 'linkedin') {
    return null;
  }

  return {
    platform,
    caption: String(first.data.caption ?? '').trim(),
    slideCount:
      typeof first.data.slideCount === 'number' && Number.isFinite(first.data.slideCount)
        ? first.data.slideCount
        : carouselSlides.length,
    imageUrl: carouselSlides[0].imageUrl,
    imageFilePath: carouselSlides[0].imageFilePath,
    carouselSlides,
  };
}

export default function CarouselGenerationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { billing, loading: billingLoading } = useUserPlanCredits();
  const imagePreview = useImagePreview();

  const [prompt, setPrompt] = useState('');
  const [slideCount, setSlideCount] = useState(5);
  const [platform, setPlatform] = useState<SocialPlatform>('instagram');
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCarousel, setGeneratedCarousel] = useState<CarouselResult | null>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);

  const credits = billing?.credits;
  const creditCost = slideCount * CREDIT_PER_SLIDE;
  const creditOk =
    typeof credits === 'number' && Number.isFinite(credits) && credits >= creditCost;

  const referencePreviewUrl = useMemo(() => {
    if (!referenceFile) return null;
    return URL.createObjectURL(referenceFile);
  }, [referenceFile]);

  useEffect(() => {
    return () => {
      if (referencePreviewUrl) URL.revokeObjectURL(referencePreviewUrl);
    };
  }, [referencePreviewUrl]);

  const clearReferenceFile = useCallback(() => {
    setReferenceFile(null);
    if (referenceInputRef.current) referenceInputRef.current.value = '';
  }, []);

  const selectedAccounts = billing?.selected;

  const enabledPlatforms = useMemo(
    () => listEnabledPlatforms(selectedAccounts),
    [selectedAccounts]
  );

  const hasSelectablePlatforms = useMemo(
    () => !!firstEnabledPlatform(selectedAccounts),
    [selectedAccounts]
  );

  const showSelectAccountsFirst =
    !billingLoading && billing != null && !hasSelectablePlatforms;

  const promptParam = searchParams.get('prompt');
  useEffect(() => {
    const q = promptParam?.trim();
    if (q) setPrompt(q);
  }, [promptParam]);

  const platformParam = searchParams.get('platform');
  useEffect(() => {
    const p = platformParam?.trim().toLowerCase();
    if (p === 'facebook' || p === 'instagram' || p === 'linkedin') {
      setPlatform(p);
    }
  }, [platformParam]);

  useEffect(() => {
    if (billingLoading) return;
    const enabled = listEnabledPlatforms(selectedAccounts);
    if (enabled.length === 0) return;
    if (!enabled.includes(platform)) {
      setPlatform(enabled[0]);
    }
  }, [billingLoading, selectedAccounts, platform]);

  const handleGenerate = useCallback(async () => {
    if (isGenerating) return;
    if (!enabledPlatforms.includes(platform)) {
      showErrorToast('Connect and select this platform first.');
      return;
    }
    if (!creditOk) {
      showErrorToast(
        `Not enough credits. This carousel costs ${creditCost} credits.`
      );
      return;
    }
    const uid = user?.uid;
    if (!uid) {
      showErrorToast('You must be signed in to generate.');
      return;
    }
    try {
      setIsGenerating(true);
      setGeneratedCarousel(null);
      const response = await generateCarousel({
        prompt: prompt.trim() || undefined,
        platform,
        slideCount,
        image: referenceFile,
      });
      const wait = await waitForParentJobDocs({
        uid,
        collectionName: 'carouselGeneratedPosts',
        parentJobId: response.parentJobId,
        expectedCount: 1,
      });
      if (wait.outcome === 'generated') {
        const result = mapCarouselResult(wait.matchedDocs);
        if (!result) {
          showErrorToast('Carousel generation failed. Please try again later.');
        } else {
          setGeneratedCarousel(result);
          toast.success('Generated');
        }
      } else {
        showErrorToast('Carousel generation failed. Please try again later.');
      }
      setIsGenerating(false);
    } catch (err) {
      showErrorToast('Carousel generation failed. Please try again later.');
      setIsGenerating(false);
    }
  }, [
    isGenerating,
    enabledPlatforms,
    platform,
    creditOk,
    creditCost,
    prompt,
    slideCount,
    referenceFile,
    user?.uid,
  ]);

  const handleSendToScheduler = useCallback(() => {
    if (!generatedCarousel) return;
    const payload: PostSchedulerPrefillPayload = {
      source: 'carousel',
      createdAt: Date.now(),
      lockedPlatform: generatedCarousel.platform,
      posts: [
        {
          imageUrl: generatedCarousel.imageUrl,
          imageFilePath: generatedCarousel.imageFilePath,
          mediaType: 'carousel',
          carouselSlides: generatedCarousel.carouselSlides,
          message: generatedCarousel.caption,
          platform: generatedCarousel.platform,
          source: 'carouselGeneratedPosts',
        },
      ],
    };
    setPostSchedulerPrefill(payload);
    router.push(`${WORKSPACE_NAV_HREFS.schedulePost}?prefill=carousel`);
  }, [generatedCarousel, router]);

  if (authLoading || billingLoading) {
    return <PageLoadingState message="Loading carousel create…" />;
  }

  if (!user) return null;

  if (isPlanInactive(billing)) {
    return <NonSubscribedFeatureBlock />;
  }

  return (
    <div className="max-w-4xl mx-auto page-enter pb-16 space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <Layers className="h-6 w-6" />
            <h1 className={workspacePageTitleClass}>Carousel Posts</h1>
          </div>
          <p className={workspacePageDescriptionClass}>
            Generate a 2–7 slide portrait carousel (1080×1350) with storyboarding
            and brand asset selection.
          </p>
        </div>
        <div className="glass-card rounded-2xl px-4 py-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Credits:{' '}
              <span className="font-semibold text-black text-sm">
                {billingLoading ? '…' : (credits ?? '—')}
              </span>
            </p>
            <span className="text-xs font-normal text-slate-500">
              Cost:
              <span className="font-semibold">&nbsp;{creditCost}</span>
            </span>
          </div>
        </div>
      </header>

      <section className="glass-card rounded-2xl border border-border/40 p-6 space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium block mb-2">Topic (optional)</label>
          <textarea
            className={`${workspaceInputClass} min-h-[88px]`}
            placeholder="e.g. 5 mistakes buyers make when choosing running shoes"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isGenerating}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <span className="text-sm font-medium block">Platform</span>
            {showSelectAccountsFirst ? (
              <div
                role="status"
                className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950"
              >
                <p className="font-medium">Select your accounts first</p>
                <p className="mt-1 text-amber-900/90">
                  Choose which platforms you use in onboarding or social
                  settings, then come back here to generate carousels.
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
                  {enabledPlatforms.map((p) => (
                    <label
                      key={p}
                      htmlFor={`carousel-platform-${p}`}
                      className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800"
                    >
                      <input
                        id={`carousel-platform-${p}`}
                        type="checkbox"
                        checked={platform === p}
                        disabled={isGenerating}
                        onChange={() => setPlatform(p)}
                        className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30"
                      />
                      <span>{platformLabel(p)}</span>
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Carousel size and caption follow this platform&apos;s format.
                </p>
              </>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Slides: {slideCount} ({creditCost} credits)
            </label>
            <input
              type="range"
              min={2}
              max={7}
              value={slideCount}
              onChange={(e) => setSlideCount(Number(e.target.value))}
              disabled={isGenerating}
              className="w-full"
            />
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium">Reference image (optional)</span>
          <input
            ref={referenceInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={isGenerating}
            onChange={(e) => {
              setReferenceFile(e.target.files?.[0] ?? null);
              e.target.value = '';
            }}
          />
          {referencePreviewUrl && referenceFile ? (
            <div className="flex flex-col items-center gap-2">
              <div className="relative inline-block overflow-hidden rounded-xl border border-border/60 bg-muted/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={referencePreviewUrl}
                  alt="Reference preview"
                  className="mx-auto max-h-56 max-w-full object-contain"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="absolute right-2 top-2 opacity-70 hover:opacity-100 h-8 w-8 rounded-full"
                  disabled={isGenerating}
                  aria-label="Remove reference image"
                  onClick={clearReferenceFile}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <button
                type="button"
                disabled={isGenerating}
                onClick={() => referenceInputRef.current?.click()}
                className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
              >
                Replace image
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={isGenerating}
              onClick={() => referenceInputRef.current?.click()}
              className={cn(
                'flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center transition',
                'hover:border-primary/40 hover:bg-muted/50',
                'disabled:pointer-events-none disabled:opacity-50'
              )}
            >
              <ImagePlus className="h-6 w-6 text-primary" aria-hidden />
              <span className="text-sm font-medium text-foreground">
                Choose a reference image
              </span>
              <span className="text-xs text-muted-foreground">
                JPEG, PNG, or WebP · optional
              </span>
            </button>
          )}
        </div>

        {isGenerating && (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Generating…
          </p>
        )}

        <Button
          type="button"
          className="w-full"
          disabled={isGenerating || showSelectAccountsFirst || !creditOk}
          onClick={() => void handleGenerate()}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {isGenerating
            ? 'Generating…'
            : !creditOk
              ? 'Generate carousel (Insufficient credits)'
              : 'Generate carousel'}
        </Button>

        {generatedCarousel ? (
          <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/60 p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Generated output
              </p>
              <p className="text-xs text-indigo-600 font-medium">
                {generatedCarousel.slideCount} slides
              </p>
            </div>

            <CarouselSwipePreview
              slides={generatedCarousel.carouselSlides}
              showCaptions
              onImageClick={(url, alt) =>
                imagePreview.open(url, alt || 'Generated carousel slide')
              }
            />

            {generatedCarousel.caption ? (
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                {generatedCarousel.caption}
              </p>
            ) : null}

            <Button type="button" className="w-full" onClick={handleSendToScheduler}>
              Continue to Post Scheduler
            </Button>
          </div>
        ) : null}
      </section>

      <ImagePreviewOverlay
        src={imagePreview.previewUrl}
        alt={imagePreview.previewAlt}
        onClose={imagePreview.close}
      />
    </div>
  );
}
