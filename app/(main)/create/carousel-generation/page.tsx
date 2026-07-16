'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, Layers, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '@/src/hooks/useAuth';
import { generateCarousel, type CarouselSlideResult } from '@/src/service/api/carousel';
import { useUserPlanCredits } from '@/app/(main)/_components/UserPlanCreditsProvider';
import { PageLoadingState } from '@/components/shared/PageLoadingState';
import { NonSubscribedFeatureBlock } from '@/components/shared/NonSubscribedFeatureBlock';
import {
  workspaceInputClass,
  workspacePageDescriptionClass,
  workspacePageTitleClass,
} from '@/lib/workspace-ui';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/show-error-toast';
import { CarouselSwipePreview } from '@/components/shared/CarouselSwipePreview';
import {
  listEnabledPlatforms,
  type SocialPlatform,
} from '@/lib/platform-selection';
import Link from 'next/link';
import { WORKSPACE_NAV_HREFS } from '@/lib/workspace-nav';
import {
  setPostSchedulerPrefill,
  type PostSchedulerPrefillPayload,
  type PostSchedulerPrefillPost,
} from '@/lib/post-scheduler-prefill-store';

const CREDIT_PER_SLIDE = 2;

export default function CarouselGenerationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { billing, loading: billingLoading } = useUserPlanCredits();

  const [prompt, setPrompt] = useState('');
  const [slideCount, setSlideCount] = useState(5);
  const [platform, setPlatform] = useState<SocialPlatform>('instagram');
  const [useMemoryLayer, setUseMemoryLayer] = useState(true);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [slides, setSlides] = useState<CarouselSlideResult[]>([]);
  const [caption, setCaption] = useState('');

  const enabledPlatforms = useMemo(
    () => listEnabledPlatforms(billing?.selected),
    [billing?.selected]
  );

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

  const isDone = slides.length >= 2;
  const creditCost = slideCount * CREDIT_PER_SLIDE;

  const handleGenerate = useCallback(async () => {
    if (isGenerating) return;
    if (!enabledPlatforms.includes(platform)) {
      toast.error('Connect and select this platform first.');
      return;
    }
    try {
      setIsGenerating(true);
      setSlides([]);
      setCaption('');
      const res = await generateCarousel({
        prompt: prompt.trim() || undefined,
        platform,
        slideCount,
        useMemoryLayer,
        image: referenceFile,
      });
      setSlides(res.slides ?? []);
      setCaption(res.caption ?? '');
      toast.success('Carousel generated');
    } catch {
      showErrorToast('Could not generate carousel');
    } finally {
      setIsGenerating(false);
    }
  }, [
    isGenerating,
    enabledPlatforms,
    platform,
    prompt,
    slideCount,
    useMemoryLayer,
    referenceFile,
  ]);

  const handleSendToScheduler = useCallback(() => {
    const carouselSlides = slides
      .map((slide, i) => ({
        index: slide.index ?? i + 1,
        imageUrl: String(slide.imageUrl ?? '').trim(),
        imageFilePath: String(slide.imageFilePath ?? '').trim(),
        headline: slide.headline ?? null,
        purpose: slide.purpose ?? null,
        visualType: slide.visualType ?? null,
      }))
      .filter((s) => s.imageUrl && s.imageFilePath);

    if (carouselSlides.length < 2) {
      toast.error('Carousel needs at least 2 slides to schedule.');
      return;
    }

    const post: PostSchedulerPrefillPost = {
      imageUrl: carouselSlides[0].imageUrl,
      imageFilePath: carouselSlides[0].imageFilePath,
      mediaType: 'carousel',
      carouselSlides,
      message: caption,
      platform,
      source: 'carouselGeneratedPosts',
    };

    const prefillPayload: PostSchedulerPrefillPayload = {
      source: 'carousel',
      createdAt: Date.now(),
      lockedPlatform: platform,
      posts: [post],
    };

    setPostSchedulerPrefill(prefillPayload);
    router.push(`${WORKSPACE_NAV_HREFS.schedulePost}?prefill=carousel`);
  }, [slides, caption, platform, router]);

  if (authLoading || billingLoading) {
    return <PageLoadingState message="Loading carousel create…" />;
  }

  if (!user) return null;

  if (billing?.activePlan === 'non-subscribed') {
    return <NonSubscribedFeatureBlock />;
  }

  return (
    <div className="max-w-4xl mx-auto page-enter pb-16 space-y-8">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-primary">
          <Layers className="h-6 w-6" />
          <h1 className={workspacePageTitleClass}>Carousel Create</h1>
        </div>
        <p className={workspacePageDescriptionClass}>
          Generate a 2–7 slide portrait carousel (1080×1350) with storyboarding
          and brand asset selection.
        </p>
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
            <label className="text-sm font-medium">Platform</label>
            <select
              className={workspaceInputClass}
              value={platform}
              onChange={(e) => setPlatform(e.target.value as SocialPlatform)}
              disabled={isGenerating}
            >
              {(['instagram', 'facebook', 'linkedin'] as const).map((p) => (
                <option key={p} value={p} disabled={!enabledPlatforms.includes(p)}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                  {!enabledPlatforms.includes(p) ? ' (not connected)' : ''}
                </option>
              ))}
            </select>
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

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={useMemoryLayer}
            onChange={(e) => setUseMemoryLayer(e.target.checked)}
            disabled={isGenerating}
          />
          Use brand photos from Memory Layer when relevant
        </label>

        <div className="space-y-2">
          <label className="text-sm font-medium">Reference image (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setReferenceFile(e.target.files?.[0] ?? null)}
            disabled={isGenerating}
            className="text-sm"
          />
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
          disabled={isGenerating}
          onClick={() => void handleGenerate()}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {isGenerating ? 'Generating…' : 'Generate carousel'}
        </Button>
      </section>

      {slides.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Preview</h2>
          <div className="w-full max-w-md mx-auto">
            <CarouselSwipePreview
              slides={slides.map((s) => ({
                index: s.index,
                imageUrl: s.imageUrl,
                headline: s.headline,
              }))}
              showCaptions
            />
          </div>

          {caption ? (
            <div className="rounded-xl border border-border p-4 text-sm whitespace-pre-wrap">
              {caption}
            </div>
          ) : null}

          {isDone ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                className="flex-1"
                onClick={handleSendToScheduler}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Continue to Post Scheduler
              </Button>
              <Button type="button" variant="outline" asChild className="flex-1">
                <Link href={WORKSPACE_NAV_HREFS.gallery}>View in Media Library</Link>
              </Button>
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}
