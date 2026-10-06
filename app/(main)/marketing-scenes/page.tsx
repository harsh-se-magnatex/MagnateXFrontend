'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { CreditCard, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/src/hooks/useAuth';
import { useUserPlanCredits } from '../_components/UserPlanCreditsProvider';
import {
  MarketingSceneControls,
  defaultMarketingScene,
} from '@/components/marketing-scene-controls';
import { PageDocumentation } from '@/components/documentation/PageDocumentation';
import { PageLoadingState } from '@/components/shared/PageLoadingState';
import { NonSubscribedFeatureBlock } from '@/components/shared/NonSubscribedFeatureBlock';
import { DownloadPngButton } from '@/components/download-png-button';
import {
  generateAiContentStudio,
  type StudioRenderedImage,
} from '@/src/service/api/aiContentStudio';
import { waitForParentJobDocs } from '@/src/lib/wait-for-parent-job';
import {
  listEnabledPlatforms,
  validateGenerationPlatformSelection,
  type SocialPlatform,
} from '@/lib/platform-selection';
import { isPlanInactive } from '@/lib/plan-access';
import {
  workspaceInputClass,
  workspacePageDescriptionClass,
  workspacePageTitleClass,
} from '@/lib/workspace-ui';
import { WORKSPACE_NAV_HREFS } from '@/lib/workspace-nav';
import { showErrorToast } from '@/lib/show-error-toast';
import { MediaLibraryImagePicker } from '@/components/media-library-image-picker';
import { getGeneratedMediaLibraryImageApi } from '@/src/service/api/generated-media-library.service';

export default function MarketingScenesPage() {
  const { user, loading } = useAuth();
  const { billing, loading: creditsLoading } = useUserPlanCredits();
  const [scene, setScene] = useState(defaultMarketingScene);
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>();
  const [platforms, setPlatforms] = useState<SocialPlatform[]>([]);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<StudioRenderedImage[]>([]);
  const [error, setError] = useState<string>();
  const activeWait = useRef<AbortController | null>(null);
  const enabled = useMemo(
    () => listEnabledPlatforms(billing?.selected),
    [billing?.selected]
  );
  const selectedPlatforms = platforms.filter((platform) =>
    enabled.includes(platform)
  );
  const platformSelection = validateGenerationPlatformSelection({
    selected: selectedPlatforms,
    enabled,
    activePlan: billing?.activePlan,
  });
  const creditCost = selectedPlatforms.length * 2;
  const canGenerate = Boolean(
    user &&
    image &&
    platformSelection.ok &&
    (billing?.credits ?? 0) >= creditCost &&
    !generating
  );

  useEffect(() => {
    if (!image) {
      setPreview(undefined);
      return;
    }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);
  useEffect(() => () => activeWait.current?.abort(), []);

  async function generate() {
    if (!canGenerate || !user || !image) return;
    setGenerating(true);
    setError(undefined);
    setResults([]);
    const controller = new AbortController();
    activeWait.current = controller;
    try {
      const response = await generateAiContentStudio({
        prompt: prompt.trim(),
        image,
        platforms: selectedPlatforms,
        imageModel: 'gpt-image-2',
        marketingScene: scene,
      });
      if (controller.signal.aborted) return;
      const wait = await waitForParentJobDocs({
        uid: user.uid,
        collectionName: 'content',
        parentJobId: response.parentJobId,
        expectedCount: response.platforms.length,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      const images = wait.matchedDocs
        .filter(
          ({ data }) =>
            data.generationStatus !== 'failed' &&
            typeof data.imageUrl === 'string' &&
            data.imageUrl.trim()
        )
        .map(({ data }) => ({
          platform: String(data.platform ?? ''),
          imageUrl: String(data.imageUrl),
          caption: String(data.caption ?? ''),
          imageFilePath:
            typeof data.imageFilePath === 'string'
              ? data.imageFilePath
              : undefined,
        }));
      setResults(images);
      if (wait.outcome === 'timedOut')
        setError(
          'Generation is taking longer than expected. Check the Media Library for completed images.'
        );
      else if (!images.length)
        throw new Error('Scene generation failed. Please try again.');
      else if (wait.failedCount)
        setError(
          'Some platforms failed to generate. Completed images are shown below.'
        );
      else toast.success('Marketing scenes generated');
    } catch (cause) {
      if (controller.signal.aborted) return;
      const message =
        cause instanceof Error
          ? cause.message
          : 'Scene generation failed. Please try again.';
      setError(message);
      showErrorToast(message);
    } finally {
      if (!controller.signal.aborted) setGenerating(false);
      if (activeWait.current === controller) activeWait.current = null;
    }
  }

  if (loading || creditsLoading) return <PageLoadingState />;
  if (isPlanInactive(billing)) return <NonSubscribedFeatureBlock />;
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className={workspacePageTitleClass}>Marketing Scenes</h1>
          <p className={workspacePageDescriptionClass}>
            Turn your product photo or artwork into a billboard, lightbox,
            magazine, storefront, or giant installation with your business logo
            and campaign copy.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PageDocumentation />
          <div className="glass-card flex items-center gap-3 rounded-2xl px-4 py-3">
            <div className="rounded-lg bg-primary-purple/10 p-2 text-preview">
              <CreditCard className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
                Credits: <span className="text-sm text-default">{billing?.credits ?? 0}</span>
              </p>
              <p className="text-xs text-secondary">Cost: 2 per platform</p>
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <MarketingSceneControls
            scene={scene}
            onSceneChange={(next) => next && setScene(next)}
            disabled={generating}
            hasImage={Boolean(image)}
            requireScene
          />
          <label className="block text-sm text-default">
            <span className="mb-1.5 block font-semibold">Reference image</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={generating}
              className={workspaceInputClass}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (
                  ![
                    'image/jpeg',
                    'image/png',
                    'image/webp',
                    'image/gif',
                  ].includes(file.type)
                ) {
                  setError('Upload a JPEG, PNG, WebP, or GIF image.');
                  setImage(null);
                  event.target.value = '';
                  return;
                }
                setError(undefined);
                setImage(file);
              }}
            />
            <span className="mt-1 block text-xs text-secondary">
              Upload a product photo or finished advertisement. We use your
              saved business profile and logo to design suitable copy and place
              it within the scene. Existing artwork is preserved.
            </span>
          </label>
          <MediaLibraryImagePicker disabled={generating} onChoose={async (item) => {
            if (!item.imageUrl) return;
            try {
              const blob = await getGeneratedMediaLibraryImageApi(item.id);
              setImage(new File([blob], `media-${item.id}.png`, { type: blob.type || 'image/png' }));
              setError(undefined);
            } catch {
              setError('Could not load this Media Library image. Try another image.');
            }
          }} />
          {preview && (
            <img
              src={preview}
              alt="Uploaded scene reference"
              className="max-h-64 w-full rounded-xl object-contain"
            />
          )}
          <label className="block text-sm text-default">
            <span className="mb-1.5 block font-semibold">
              Additional direction (optional)
            </span>
            <textarea
              className={workspaceInputClass}
              rows={3}
              value={prompt}
              disabled={generating}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Describe your campaign or specify exact copy. Leave blank to let AI write suitable text for your business and scene."
            />
          </label>
          <fieldset disabled={generating} className="space-y-2">
            <legend className="mb-2 text-sm font-semibold text-default">
              Platforms
            </legend>
            {enabled.map((platform) => (
              <label
                key={platform}
                className="mr-4 inline-flex items-center gap-2 text-sm capitalize"
              >
                <input
                  type="checkbox"
                  checked={selectedPlatforms.includes(platform)}
                  onChange={(event) =>
                    setPlatforms((current) =>
                      event.target.checked
                        ? [...current, platform]
                        : current.filter((value) => value !== platform)
                    )
                  }
                />
                {platform}
              </label>
            ))}
            {!enabled.length && (
              <p className="text-sm text-secondary">
                <Link
                  className="underline"
                  href={WORKSPACE_NAV_HREFS.linkedProfiles}
                >
                  Connect a social account
                </Link>{' '}
                to generate a scene.
              </p>
            )}
          </fieldset>
          <p className="text-sm text-secondary">
            {creditCost} credits · 2 per platform · {billing?.credits ?? 0}{' '}
            available
          </p>
          {creditCost > (billing?.credits ?? 0) && (
            <p className="text-sm text-warning">
              You need more credits to generate for these platforms.
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-warning">
              {error}
            </p>
          )}
          <button
            type="button"
            disabled={!canGenerate}
            onClick={generate}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full btn-brand-fill px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {generating ? 'Generating scenes…' : 'Generate marketing scenes'}
          </button>
        </div>
        <div className="space-y-4" aria-live="polite">
          {!results.length && (
            <div className="rounded-xl border border-default p-6 text-sm text-secondary">
              {generating
                ? 'Your scenes are being generated. Results will appear here and in the Media Library.'
                : 'Your generated marketing scenes will appear here.'}
            </div>
          )}
          {results.map((result) => (
            <article
              key={result.platform}
              className="space-y-3 rounded-xl border border-default p-4"
            >
              <h2 className="font-semibold capitalize">{result.platform}</h2>
              <img
                src={result.imageUrl}
                alt={`${scene.topic} marketing scene for ${result.platform}`}
                className="w-full rounded-lg"
              />
              {result.caption && (
                <p className="whitespace-pre-wrap text-sm text-secondary">
                  {result.caption}
                </p>
              )}
              <DownloadPngButton
                url={result.imageUrl}
                getFilename={() =>
                  `marketing-scene-${result.platform}-${Date.now()}.png`
                }
              />
            </article>
          ))}
          <Link
            href={WORKSPACE_NAV_HREFS.gallery}
            className="inline-block text-sm font-medium underline"
          >
            Open Media Library to view or schedule images
          </Link>
        </div>
      </div>
    </div>
  );
}
