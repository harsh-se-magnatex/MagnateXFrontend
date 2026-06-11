'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Expand } from 'lucide-react';
import { auth } from '@/lib/firebase';
import {
  generateProductAdvertApi,
  type ProductGenerationMode,
} from '@/src/service/api/product-advert.service';
import { useFeatureJob } from '@/src/hooks/useFeatureJob';
import { useUserPlanCredits } from '../_components/UserPlanCreditsProvider';
import { useTimestampFormatter } from '@/lib/user-timezone';
import Link from 'next/link';
import {
  WORKSPACE_NAV_HREFS,
  workspacePageTitle,
} from '@/lib/workspace-nav';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/show-error-toast';
import {
  setPostSchedulerPrefill,
  type PostSchedulerPrefillPayload,
  type PostSchedulerPrefillPost,
} from '@/lib/post-scheduler-prefill-store';
import { DownloadPngButton } from '@/components/download-png-button';
import {
  ImagePreviewButton,
  ImagePreviewOverlay,
  useImagePreview,
} from '@/components/image-preview';
import { Progress } from '@/components/ui/progress';
import { PageLoadingState } from '@/components/shared/PageLoadingState';
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
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const imagePreview = useImagePreview();

  // Firestore-driven progress for the current run. parentJobId + per-platform
  // job docs come from `users/{uid}.activeJobs['product-advert']`.
  const featureJob = useFeatureJob('product-advert');
  const {
    parentJobId: activeParentJobId,
    jobs: jobMap,
    overallPct,
    allDone,
    isRunning,
    onGenerated,
  } = featureJob;

  // Session state: in-memory Zustand, survives SPA navigation within the tab.
  const generationMode = useProductAdvertState((s) => s.generationMode);
  const setGenerationMode = useProductAdvertState((s) => s.setGenerationMode);
  const campaignContext = useProductAdvertState((s) => s.campaignContext);
  const setCampaignContext = useProductAdvertState((s) => s.setCampaignContext);
  const useIndustryResearch = useProductAdvertState(
    (s) => s.useIndustryResearch
  );
  const setUseIndustryResearch = useProductAdvertState(
    (s) => s.setUseIndustryResearch
  );
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
  const loading = useProductAdvertState((s) => s.loading);
  const setLoading = useProductAdvertState((s) => s.setLoading);
  const lastGenerationMode = useProductAdvertState((s) => s.lastGenerationMode);
  const setLastGenerationMode = useProductAdvertState(
    (s) => s.setLastGenerationMode
  );
  const clearOutput = useProductAdvertState((state) => state.clearOutput);
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
    !loading &&
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

  const lastMaterializedRef = useRef<string | null>(null);
  const generationModeForRunRef = useRef<ProductGenerationMode>('advert_asset');

  async function handleGenerate() {
    if (isTourDemo) return;
    try {
      setError('');
      setFinalResult(null);
      lastMaterializedRef.current = null;
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

      setLoading(true);
      generationModeForRunRef.current = generationMode;

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
        useIndustryResearch,
      });
      onGenerated({
        parentJobId: response.parentJobId,
        jobs: response.jobs,
      });
    } catch (e: unknown) {
      const message = 'Failed to generate advert. Please try again.';
      showErrorToast(message);
      setLoading(false);
      console.log(e);
    }
  }

  // Materialize the legacy `finalResult` shape from sibling job docs once each
  // platform has settled. Runs once per parentJobId.
  useEffect(() => {
    if (!allDone || !activeParentJobId) return;
    if (lastMaterializedRef.current === activeParentJobId) return;
    lastMaterializedRef.current = activeParentJobId;

    const jobList = Object.values(jobMap);
    if (!jobList.length) {
      setLoading(false);
      return;
    }

    const platformResults: AdvertResult[] = jobList
      .filter((j) => j.status === 'done' && typeof j.result?.url === 'string')
      .map((j) => {
        const r = (j.result ?? {}) as Record<string, unknown>;
        const copyRaw =
          r.copy && typeof r.copy === 'object'
            ? (r.copy as Record<string, unknown>)
            : null;
        return {
          platform: String(j.platform ?? ''),
          chosenContentType:
            typeof r.chosenContentType === 'string'
              ? r.chosenContentType
              : undefined,
          contentFormatLabel:
            typeof r.contentFormatLabel === 'string'
              ? r.contentFormatLabel
              : undefined,
          analysis:
            r.analysis && typeof r.analysis === 'object'
              ? (r.analysis as Record<string, unknown>)
              : null,
          copy: copyRaw
            ? {
              headline: String(copyRaw.headline ?? ''),
              primary_text: String(copyRaw.primary_text ?? ''),
              cta: String(copyRaw.cta ?? ''),
              hashtags: Array.isArray(copyRaw.hashtags)
                ? (copyRaw.hashtags as unknown[]).map((t) => String(t ?? ''))
                : [],
            }
            : null,
          imageUrl: String(r.url ?? ''),
          imageFilePath:
            typeof r.filePath === 'string' ? r.filePath : undefined,
          logoPosition:
            typeof r.logoPosition === 'string' ? r.logoPosition : undefined,
          selectedLogoVariantIndex:
            typeof r.selectedLogoVariantIndex === 'number'
              ? r.selectedLogoVariantIndex
              : undefined,
          logoVariantSource:
            typeof r.logoVariantSource === 'string'
              ? r.logoVariantSource
              : undefined,
          logoVariantCount:
            typeof r.logoVariantCount === 'number'
              ? r.logoVariantCount
              : undefined,
          marketingTagline:
            typeof r.marketingTagline === 'string'
              ? r.marketingTagline
              : undefined,
          productAdvertDocId:
            typeof r.postId === 'string' ? r.postId : null,
        };
      });

    const generationModeFromResult =
      jobList.find(
        (j) =>
          typeof j.result?.generationMode === 'string' &&
          (j.result.generationMode === 'advert_asset' ||
            j.result.generationMode === 'social_full')
      )?.result?.generationMode as ProductGenerationMode | undefined;
    const finalMode: ProductGenerationMode =
      generationModeFromResult ?? generationModeForRunRef.current;

    setFinalResult({
      generationMode: finalMode,
      platformResults,
    });
    setLastGenerationMode(finalMode);
    setLoading(false);
    if (platformResults.length) {
      toast.success('Advert generated successfully');
    }
  }, [
    allDone,
    activeParentJobId,
    jobMap,
    setFinalResult,
    setLastGenerationMode,
    setLoading,
  ]);

  // Keep the persisted `loading` flag in sync with Firestore-driven
  // `isRunning`. The materialize effect resets `loading` in the happy path,
  // but if `allDone` never fires (stale `activeJobs.product-advert` slot, or
  // missing job docs) the button can hang on "Generating…". This second
  // branch drops `loading` the moment `isRunning` clears.
  useEffect(() => {
    if (isRunning && !loading) {
      setLoading(true);
    } else if (!isRunning && loading) {
      setLoading(false);
    }
  }, [isRunning, loading, setLoading]);

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

    return [headline, primary, cta, hashtags]
      .filter(Boolean)
      .join('\n\n')
      .trim();
  }

  function handleSendToScheduler(resultItem?: AdvertResult) {
    const sourceItems = resultItem
      ? [resultItem]
      : (finalResult?.platformResults ?? []);
    const posts: PostSchedulerPrefillPost[] = sourceItems
      .map((item) => ({
        imageUrl: String(item.imageUrl ?? '').trim(),
        imageFilePath: String(item.imageFilePath ?? '').trim(),
        message: buildAdvertCaption(item),
        platform: String(item.platform ?? '').toLowerCase() as PostSchedulerPrefillPost['platform'],
        source: 'productadvert' as const,
      }))
      .filter(
        (item) =>
          !!item.imageUrl &&
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
    router.push('/post-scheduler?prefill=product-advert');
    clearOutput();
  }

  async function handleCopyCaption(resultItem: AdvertResult) {
    const caption = buildAdvertCaption(resultItem);
    if (!caption) return;
    await navigator.clipboard.writeText(caption);
    setCaptionCopied(true);
    setTimeout(() => setCaptionCopied(false), 1800);
  }

  if (creditsLoading) {
    return <PageLoadingState message="Loading your account..." />;
  }

  if (
    !isTourDemo &&
    new Date(formattedPlanExpiresAt).getTime() < new Date().getTime()
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

        <div className="flex items-center gap-2 mb-6">
          <input
            id="useIndustryResearch"
            type="checkbox"
            checked={useIndustryResearch}
            onChange={(e) => setUseIndustryResearch(e.target.checked)}
            className="accent-indigo-600 rounded"
          />
          <label
            htmlFor="useIndustryResearch"
            className="text-slate-700 text-sm"
          >
            Use industry research (full social mode; skipped when off)
          </label>
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

        <div className="space-y-2 mb-4">
          <label className="text-slate-700 font-medium">
            {generationMode === 'social_full'
              ? 'Creative direction (optional)'
              : 'Your prompt (optional)'}
          </label>
          <input
            type="text"
            placeholder={
              generationMode === 'social_full'
                ? 'Merged with campaign context for the full post'
                : 'e.g. Perfume bottle handed by a man, photoshoot image'
            }
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-900 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

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
                href="/social-media-integration"
                className="mt-2 inline-block text-sm font-semibold text-amber-950 underline underline-offset-2 hover:text-amber-900"
              >
                Open social setup
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
          {loading
            ? 'Generating...'
            : `${generationMode === 'social_full' ? 'Generate full post' : 'Generate advert'}${insufficientCredits ? ' (insufficient credits)' : ''
            }`}
        </button>

        {(loading || isRunning) && (
          <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-indigo-700">
              <span>Generating...</span>
              <span>{overallPct}%</span>
            </div>
            <Progress
              value={overallPct}
              className="h-1.5 bg-indigo-100 **:data-[slot=progress-indicator]:bg-indigo-500"
            />
            {Object.values(jobMap).length > 1 && (
              <div className="space-y-1 pt-1">
                {Object.values(jobMap).map((job) => (
                  <div
                    key={job.jobId}
                    className="flex items-center justify-between text-[11px] text-indigo-700/80"
                  >
                    <span className="capitalize">
                      {job.platform ?? 'unknown'}
                    </span>
                    <span>{job.pct ?? 0}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
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

                  {item.copy && (
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
                  </div>

                  {item.copy && finalResult.platformResults.length === 1 && (
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
