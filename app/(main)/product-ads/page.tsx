'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Expand } from 'lucide-react';
import { auth } from '@/lib/firebase';
import {
  generateProductAdvertApi,
  type ProductGenerationMode,
} from '@/src/service/api/product-advert.service';
import { waitForParentJobDocs } from '@/src/lib/wait-for-parent-job';
import { useUserPlanCredits } from '../_components/UserPlanCreditsProvider';
import { useTimestampFormatter } from '@/lib/user-timezone';
import Link from 'next/link';
import {
  WORKSPACE_NAV_HREFS,
  workspacePageTitle,
} from '@/lib/workspace-nav';
import { showErrorToast } from '@/lib/show-error-toast';
import {
  setPostSchedulerPrefill,
  type PostSchedulerPrefillPayload,
  type PostSchedulerPrefillPost,
} from '@/lib/post-scheduler-prefill-store';
import { DownloadPngButton } from '@/components/download-png-button';
import { SharePostButton } from '@/components/share-post-button';
import {
  ImagePreviewButton,
  ImagePreviewOverlay,
  useImagePreview,
} from '@/components/image-preview';
import { PageLoadingState } from '@/components/shared/PageLoadingState';
import { NonSubscribedFeatureBlock } from '@/components/shared/NonSubscribedFeatureBlock';
import { isPlanInactive } from '@/lib/plan-access';
import {
  useProductAdvertState,
  type AdvertResult,
  type SocialPlatform,
} from '@/src/stores/productAdvertState';
import {
  allPlatformsSelectionLabel,
  areAllEnabledSelected,
  listEnabledPlatforms,
  togglePlatformSelection,
  validateGenerationPlatformSelection,
} from '@/lib/platform-selection';
import { useTourDemo } from '@/src/stores/tourState';
import { toast } from 'sonner';

const BACKGROUND_OPTIONS = [
  '',
  'Forest',
  'River',
  'Beach',
  'Desert',
  'Mountain top',
  'City street',
  'Cafe interior',
  'Closed room (studio)',
  'Minimalist white background',
  'Futuristic neon room',
  'Garden with flowers',
  'Library',
  'Office desk',
  'Night sky with stars',
  'Luxury living room',
  'Other (custom)',
];

const PLATFORM_ORDER = ['instagram', 'facebook', 'linkedin'] as const;

function mapProductAdvertDocsToResults(
  docs: Array<{ id: string; data: Record<string, unknown> }>
): AdvertResult[] {
  return docs
    .filter(
      (doc) =>
        String(doc.data.generationStatus ?? '').toLowerCase() !== 'failed'
    )
    .map((doc) => {
      const output =
        doc.data.output && typeof doc.data.output === 'object'
          ? (doc.data.output as Record<string, unknown>)
          : {};
      const copy =
        output.copy && typeof output.copy === 'object'
          ? (output.copy as AdvertResult['copy'])
          : null;
      return {
        platform: String(doc.data.platform ?? ''),
        caption:
          typeof doc.data.caption === 'string'
            ? doc.data.caption
            : typeof output.caption === 'string'
              ? output.caption
              : null,
        imageUrl: String(output.imageUrl ?? doc.data.imageUrl ?? ''),
        imageFilePath:
          typeof doc.data.imageFilePath === 'string'
            ? doc.data.imageFilePath
            : typeof output.imageFilePath === 'string'
              ? output.imageFilePath
              : undefined,
        chosenContentType:
          typeof output.chosenContentType === 'string'
            ? output.chosenContentType
            : undefined,
        contentFormatLabel:
          typeof output.contentFormatLabel === 'string'
            ? output.contentFormatLabel
            : undefined,
        copy,
        logoPosition:
          typeof output.logoPosition === 'string' ? output.logoPosition : undefined,
        selectedLogoVariantIndex:
          typeof output.selectedLogoVariantIndex === 'number'
            ? output.selectedLogoVariantIndex
            : undefined,
        logoVariantSource:
          typeof output.logoVariantSource === 'string'
            ? output.logoVariantSource
            : undefined,
        logoVariantCount:
          typeof output.logoVariantCount === 'number'
            ? output.logoVariantCount
            : undefined,
        marketingTagline:
          typeof output.marketingTagline === 'string'
            ? output.marketingTagline
            : undefined,
        analysis:
          output.analysis && typeof output.analysis === 'object'
            ? (output.analysis as Record<string, unknown>)
            : null,
        productAdvertDocId: doc.id,
      };
    })
    .filter((item) => item.imageUrl.trim().length > 0);
}

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

export default function ProductAdvertPage() {
  // Non-serializable (File) and truly transient flags stay local.
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');
  const [captionCopied, setCaptionCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const imagePreview = useImagePreview();

  // Session state: in-memory Zustand, survives SPA navigation within the tab.
  const generationMode = useProductAdvertState((s) => s.generationMode);
  const setGenerationMode = useProductAdvertState((s) => s.setGenerationMode);
  const campaignContext = useProductAdvertState((s) => s.campaignContext);
  const setCampaignContext = useProductAdvertState((s) => s.setCampaignContext);
  const prompt = useProductAdvertState((s) => s.prompt);
  const setPrompt = useProductAdvertState((s) => s.setPrompt);
  const genPlatforms = useProductAdvertState((s) => s.genPlatforms);
  const setGenPlatforms = useProductAdvertState((s) => s.setGenPlatforms);
  const background = useProductAdvertState((s) => s.background);
  const setBackground = useProductAdvertState((s) => s.setBackground);
  const customBackground = useProductAdvertState((s) => s.customBackground);
  const setCustomBackground = useProductAdvertState(
    (s) => s.setCustomBackground
  );
  const finalResult = useProductAdvertState((s) => s.finalResult);
  const setFinalResult = useProductAdvertState((s) => s.setFinalResult);
  const lastGenerationMode = useProductAdvertState((s) => s.lastGenerationMode);
  const setLastGenerationMode = useProductAdvertState(
    (s) => s.setLastGenerationMode
  );
  // On mount: clear in-memory output older than 2 hours within the same tab session.
  useEffect(() => {
    const { generatedAt, clearOutput } = useProductAdvertState.getState();
    const TWO_HOURS = 2 * 60 * 60 * 1000;
    if (generatedAt && Date.now() - generatedAt > TWO_HOURS) clearOutput();
  }, []);

  const { billing, loading: creditsLoading } = useUserPlanCredits();
  const fmtTimestamp = useTimestampFormatter();
  const isTourDemo = useTourDemo();
  const selectedAccounts = billing?.selected;
  const planExpiresAt = billing?.planExpiresAt;
  const userCredits = billing?.credits;
  const formattedPlanExpiresAt = planExpiresAt
    ? fmtTimestamp(planExpiresAt)
    : '—';
  const router = useRouter();

  const hasSelectablePlatforms = useMemo(
    () => isTourDemo || !!firstEnabledPlatform(selectedAccounts),
    [selectedAccounts, isTourDemo]
  );

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

  const showSelectAccountsFirst =
    !isTourDemo &&
    !creditsLoading &&
    billing != null &&
    !hasSelectablePlatforms;

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

  const perPlatformCost = generationMode === 'social_full' ? 6 : 4;
  const generationCreditCost = genPlatforms.length * perPlatformCost;
  const allPlatformsSelected = areAllEnabledSelected(
    genPlatforms,
    allowedPlatforms
  );

  const creditOk =
    userCredits !== undefined &&
    (genPlatforms.length === 0 || userCredits >= generationCreditCost);

  const insufficientCredits =
    genPlatforms.length > 0 &&
    userCredits !== undefined &&
    userCredits < generationCreditCost;

  const canGenerate =
    !!file &&
    creditOk &&
    !isGenerating &&
    platformSelection.ok &&
    !(
      generationMode === 'advert_asset' &&
      background === 'Other (custom)' &&
      !customBackground.trim()
    );

  function handleToggleGenPlatform(platformToToggle: SocialPlatform) {
    if (isTourDemo) return;
    setGenPlatforms(togglePlatformSelection(genPlatforms, platformToToggle));
  }

  function handleSelectAllGenPlatforms() {
    if (isTourDemo) return;
    if (allPlatformsSelected) {
      setGenPlatforms([]);
    } else {
      setGenPlatforms([...allowedPlatforms]);
    }
  }

  async function handleGenerate() {
    if (isTourDemo || isGenerating) return;
    try {
      setError('');
      setFinalResult(null);
      if (!file) throw new Error('Please upload a PNG product image.');
      if (
        generationMode === 'advert_asset' &&
        background === 'Other (custom)' &&
        !customBackground.trim()
      ) {
        showErrorToast('Please enter a custom background.');
        throw new Error('Please enter a custom background.');
      }

      const user = auth.currentUser;
      if (!user) throw new Error('You must be signed in to generate adverts.');

      setIsGenerating(true);

      const selectedBackground =
        background === 'Other (custom)' ? customBackground.trim() : background;
      const response = await generateProductAdvertApi({
        image: file,
        uid: user.uid,
        prompt,
        background:
          generationMode === 'advert_asset' ? selectedBackground : undefined,
        platforms: genPlatforms,
        generationMode,
        campaignContext,
        useIndustryResearch: generationMode === 'social_full' ? true : false,
      });
      setFinalResult(null);
      setLastGenerationMode(response.generationMode);
      const wait = await waitForParentJobDocs({
        uid: user.uid,
        collectionName: 'productadvert',
        parentJobId: response.parentJobId,
        expectedCount: Math.max(1, response.platforms?.length ?? genPlatforms.length),
      });
      if (wait.outcome === 'generated') {
        const platformResults = mapProductAdvertDocsToResults(wait.matchedDocs);
        setFinalResult({
          generationMode: response.generationMode,
          platformResults,
        });
        toast.success('Generated');
      } else {
        showErrorToast('Product advert generation failed. Please try again later.');
      }
      setIsGenerating(false);
    } catch (e: unknown) {
      showErrorToast('Product advert generation failed. Please try again later.');
      console.log(e);
      setIsGenerating(false);
    }
  }

  function buildAdvertCaption(resultItem: AdvertResult) {
    const headline = (resultItem.copy?.headline || '').trim();
    const primary = (resultItem.copy?.primary_text || '').trim();
    const cta = (resultItem.copy?.cta || '').trim();
    const hashtags = Array.isArray(resultItem.copy?.hashtags)
      ? resultItem.copy.hashtags
        .map((tag: string) => String(tag || '').trim())
        .filter(Boolean)
        .join(' ')
      : '';

    const assembled = [headline, primary, cta, hashtags]
      .filter(Boolean)
      .join('\n\n')
      .trim();
    // Prefer structured copy; fall back to top-level caption only when empty.
    // Social-full stores the same string in both primary_text and caption —
    // joining both duplicated the whole post (including Website/Contact).
    if (assembled) return assembled;
    return String(resultItem.caption ?? '').trim();
  }

  function resolveSchedulerCaption(resultItem: AdvertResult) {
    return buildAdvertCaption(resultItem);
  }

  function handleSendToScheduler(resultItem?: AdvertResult) {
    const sourceItems = resultItem
      ? [resultItem]
      : (finalResult?.platformResults ?? []);
    const posts: PostSchedulerPrefillPost[] = sourceItems
      .map((item) => ({
        imageUrl: String(item.imageUrl ?? '').trim(),
        imageFilePath: String(item.imageFilePath ?? '').trim(),
        message: resolveSchedulerCaption(item),
        platform: String(item.platform ?? '').toLowerCase() as PostSchedulerPrefillPost['platform'],
        source: 'productadvert' as const,
      }))
      .filter(
        (item) =>
          !!item.imageUrl &&
          !!item.imageFilePath &&
          PLATFORM_ORDER.includes(item.platform)
      );

    if (posts.length === 0) return;
    const prefillPayload: PostSchedulerPrefillPayload = {
      source: 'product-advert',
      createdAt: Date.now(),
      lockedPlatform: posts.length > 1 ? 'all_platforms' : posts[0].platform,
      posts,
    };

    setPostSchedulerPrefill(prefillPayload);
    router.push(`${WORKSPACE_NAV_HREFS.schedulePost}?prefill=product-advert`);
    // Form state (prompt, platforms, generated result, etc.) is intentionally
    // preserved here so the user can navigate back from /post-scheduler
    // without losing their work. The state is reset by /post-scheduler after
    // the post is successfully scheduled (see resetForm call there).
  }

  async function handleCopyCaption(resultItem: AdvertResult) {
    const caption = resolveSchedulerCaption(resultItem);
    if (!caption) return;
    await navigator.clipboard.writeText(caption);
    setCaptionCopied(true);
    setTimeout(() => setCaptionCopied(false), 1800);
  }

  if (creditsLoading) {
    return <PageLoadingState message="Loading your account..." />;
  }

  if (!isTourDemo && isPlanInactive(billing)) {
    return <NonSubscribedFeatureBlock />;
  }

  return (
    <div className="mx-auto animate-in fade-in duration-500 pb-20">
      <div className="max-w-5xl mx-auto backdrop-blur-lg bg-white/5 border border-white/10 rounded-2xl p-8 shadow-[0_0_30px_rgba(108,92,231,0.2)]">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-6">
          {workspacePageTitle(WORKSPACE_NAV_HREFS.productAdvert)}
        </h1>
        <div className="flex justify-end flex-col items-end">
          <p>Credits: {userCredits}</p>
          <p>
            Cost: {perPlatformCost} credits per platform
            {genPlatforms.length > 0 ? ` (${generationCreditCost} total)` : ''}
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <span className="block text-slate-700 font-medium">Output mode</span>
          <div className="flex flex-col sm:flex-row gap-3">
            <label
              id="tour-pa-mode-advert"
              className="flex items-center gap-2 cursor-pointer text-slate-800"
            >
              <input
                type="radio"
                name="generationMode"
                checked={generationMode === 'advert_asset'}
                onChange={() =>
                  isTourDemo ? undefined : setGenerationMode('advert_asset')
                }
                className="accent-indigo-600"
              />
              <span>
                Advert image
              </span>
            </label>
            <label
              id="tour-pa-mode-social"
              className="flex items-center gap-2 cursor-pointer text-slate-800"
            >
              <input
                type="radio"
                name="generationMode"
                checked={generationMode === 'social_full'}
                onChange={() =>
                  isTourDemo ? undefined : setGenerationMode('social_full')
                }
                className="accent-indigo-600"
              />
              <span>Full social post</span>
            </label>
          </div>
        </div>

        <div className="space-y-2 mb-6">
          <label className="block text-slate-700 font-medium">
            Campaign / product context (optional)
          </label>
          <textarea
            value={campaignContext}
            onChange={(e) => setCampaignContext(e.target.value)}
            placeholder="What we're promoting, offer, audience, or key message…"
            rows={3}
            className="w-full bg-white border border-slate-200 text-slate-900 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
          />
        </div>

        <div id="tour-pa-upload" className="space-y-3 mb-6">
          <label className="block text-slate-700 font-medium">
            Upload product PNG (transparent background)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              isTourDemo ? undefined : setFile(e.target.files?.[0] || null)
            }
            className="w-full file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-semibold file:bg-indigo-600 file:text-white hover:file:opacity-90 transition text-slate-600"
          />
        </div>

        {file && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-indigo-700 mb-2">
              Preview of Uploaded Product
            </h2>
            <div className="p-3 border border-slate-200 rounded-xl bg-white">
              <img
                src={URL.createObjectURL(file)}
                alt="Uploaded product preview"
                className="max-h-64 mx-auto object-contain rounded-md"
              />
            </div>
          </div>
        )}

        {generationMode === 'advert_asset' && (
          <div className="space-y-2 mb-8">
            <label className="text-slate-700 font-medium">
              Background (optional)
            </label>
            <select
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-900 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {BACKGROUND_OPTIONS.map((bg, i) => (
                <option key={i} value={bg}>
                  {bg || 'Let AI decide'}
                </option>
              ))}
            </select>

            {background === 'Other (custom)' && (
              <input
                type="text"
                placeholder="Enter custom background"
                value={customBackground}
                onChange={(e) => setCustomBackground(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-900 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            )}
          </div>
        )}
        <div className="space-y-2 mb-6">
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
                  {allPlatformsSelected
                    ? `Generates one post per connected platform (${allowedPlatforms.length}).`
                    : genPlatforms.length > 1
                      ? `Generates one post per selected platform (${genPlatforms.length}).`
                      : 'Select one or more platforms for this run.'}
                </p>
              )}
            </>
          )}
        </div>
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="w-full py-3 rounded-full font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-transform disabled:opacity-60"
        >
          {isGenerating
            ? 'Generating...'
            : `${generationMode === 'social_full' ? 'Generate full post' : 'Generate advert'}${insufficientCredits ? ' (Insufficient credits)' : ''
            }`}
        </button>

        {isGenerating && (
          <p className="mt-4 text-xs font-medium text-indigo-700">
            Generating…
          </p>
        )}

        {error && <p className="text-rose-600 mt-4 text-sm">{error}</p>}

        {finalResult?.platformResults?.length ? (
          <div className="mt-8">
            <h2 className="font-semibold text-indigo-700 text-lg mb-2">
              {lastGenerationMode === 'social_full'
                ? 'Generated post'
                : 'Generated advert'}
            </h2>
            <div className="space-y-6">
              {finalResult.platformResults.map((item, idx) => (
                <div
                  key={`${item.platform}-${idx}`}
                  className="p-4 rounded-xl border border-slate-200 bg-white"
                >
                  <p className="text-sm font-semibold text-slate-700 mb-2 capitalize">
                    Platform: {item.platform}
                  </p>
                  {item.contentFormatLabel && (
                    <p className="text-sm text-slate-600 mb-2">
                      Format used:{' '}
                      <span className="font-medium">{item.contentFormatLabel}</span>
                    </p>
                  )}
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() =>
                        imagePreview.open(
                          item.imageUrl,
                          `Generated advert for ${item.platform}`
                        )
                      }
                      className="group relative block w-full cursor-pointer overflow-hidden rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      aria-label="Open image preview"
                    >
                      <img
                        src={item.imageUrl}
                        alt={`Generated advert for ${item.platform}`}
                        className="w-full rounded-lg shadow-[0_0_20px_rgba(79,70,229,0.2)] transition-transform duration-200 group-hover:scale-[1.01]"
                      />
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/30">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                          <Expand className="h-3.5 w-3.5" />
                          Preview
                        </span>
                      </span>
                    </button>
                  </div>
                  {Number(item.logoVariantCount ?? 0) > 1 && (
                    <p className="text-xs text-slate-500 mt-2">
                      Logo chosen for contrast on this scene: variant{' '}
                      {Number(item.selectedLogoVariantIndex ?? 0) + 1} of{' '}
                      {item.logoVariantCount}
                      {item.logoVariantSource === 'saved'
                        ? ' (your saved variants)'
                        : item.logoVariantSource === 'generated'
                          ? ' (auto-generated from your brand logo)'
                          : ''}
                      .
                    </p>
                  )}

                  {buildAdvertCaption(item) && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <h3 className="text-sm font-semibold text-slate-800">
                          Generated Caption
                        </h3>
                        <button
                          onClick={() => handleCopyCaption(item)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 text-white hover:opacity-90 transition"
                        >
                          {captionCopied ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <p className="whitespace-pre-line text-sm text-slate-700 leading-relaxed">
                        {buildAdvertCaption(item) ||
                          'Caption generation not available for this image.'}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-4 mt-4">
                    <ImagePreviewButton
                      onClick={() =>
                        imagePreview.open(
                          item.imageUrl,
                          `Generated advert for ${item.platform}`
                        )
                      }
                      className="w-full sm:w-auto cursor-pointer rounded-full px-6 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:opacity-100"
                    />
                    <DownloadPngButton
                      url={item.imageUrl}
                      getFilename={() =>
                        `advert-${item.platform}-${Date.now()}.png`
                      }
                    />
                    <SharePostButton
                      imageUrl={item.imageUrl}
                      caption={buildAdvertCaption(item)}
                      platform={item.platform}
                      getFilename={() =>
                        `advert-${item.platform}-${Date.now()}.png`
                      }
                    />
                  </div>

                  {finalResult.platformResults.length === 1 && (
                    <div className="mt-4">
                      <button
                        onClick={() => handleSendToScheduler(item)}
                        className="w-full py-3 rounded-full bg-emerald-600 text-white font-semibold hover:opacity-90 transition"
                      >
                        Continue to Post Scheduler
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {finalResult.platformResults.length > 1 && (
              <div className="mt-4">
                <button
                  onClick={() => handleSendToScheduler()}
                  className="w-full py-3 rounded-full bg-emerald-600 text-white font-semibold hover:opacity-90 transition"
                >
                  Continue to Post Scheduler
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
      <ImagePreviewOverlay
        src={imagePreview.previewUrl}
        alt={imagePreview.previewAlt}
        onClose={imagePreview.close}
      />
    </div>
  );
}
