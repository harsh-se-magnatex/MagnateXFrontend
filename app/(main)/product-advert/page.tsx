'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import {
  generateProductAdvertApi,
  type ProductGenerationMode,
} from '@/src/service/api/product-advert.service';
import { useUserPlanCredits } from '../_components/UserPlanCreditsProvider';
import Link from 'next/link';
import { toast } from 'sonner';
import { formatTimestamp } from '@/utils/formatTime';
import {
  setPostSchedulerPrefill,
  type PostSchedulerPrefillPayload,
  type PostSchedulerPrefillPost,
} from '@/lib/post-scheduler-prefill-store';
import { DownloadPngButton } from '@/components/download-png-button';

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
type GenPlatform = (typeof PLATFORM_ORDER)[number];
type SocialPlatform = 'facebook' | 'linkedin' | 'instagram' | 'all_platforms';

function firstEnabledPlatform(
  accounts: Partial<Record<GenPlatform, boolean>> | null | undefined
): GenPlatform | undefined {
  if (!accounts) return undefined;
  return PLATFORM_ORDER.find((p) => accounts[p] === true);
}

type GenerationMode = "advert_asset" | "social_full";
type AdvertResult = {
  platform: string;
  chosenContentType?: string;
  contentFormatLabel?: string;
  analysis?: Record<string, unknown> | null;
  copy?: {
    headline?: string;
    primary_text?: string;
    cta?: string;
    hashtags?: string[];
  } | null;
  imageUrl: string;
  imageFilePath?: string;
  logoPosition?: string;
  selectedLogoVariantIndex?: number;
  logoVariantSource?: string;
  logoVariantCount?: number;
  marketingTagline?: string;
  productAdvertDocId?: string | null;
};

interface FinalResult {
  generationMode: GenerationMode;
  platformResults: AdvertResult[];
}

export default function ProductAdvertPage() {
  const [file, setFile] = useState<File | null>(null);
  const [generationMode, setGenerationMode] =
    useState<ProductGenerationMode>('advert_asset');
  const [campaignContext, setCampaignContext] = useState('');
  const [useIndustryResearch, setUseIndustryResearch] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [platform, setPlatform] = useState<SocialPlatform>('facebook');
  const [background, setBackground] = useState(BACKGROUND_OPTIONS[0]);
  const [customBackground, setCustomBackground] = useState('');
  const [finalResult, setFinalResult] = useState<FinalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [captionCopied, setCaptionCopied] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [lastGenerationMode, setLastGenerationMode] =
    useState<ProductGenerationMode>('advert_asset');
  const { billing, loading: creditsLoading } = useUserPlanCredits();
  const selectedAccounts = billing?.selected;
  const creditsExpiresAt = billing?.creditsExpiresAt;
  const userCredits = billing?.credits;
  const router = useRouter();

  const hasSelectablePlatforms = useMemo(
    () => !!firstEnabledPlatform(selectedAccounts),
    [selectedAccounts]
  );

  const showSelectAccountsFirst =
    !creditsLoading && billing != null && !hasSelectablePlatforms;
  const effectivePlatform: GenPlatform = platform === 'all_platforms' ? 'facebook' : platform;

  async function handleGenerate() {
    try {
      setError('');
     setFinalResult(null);
      if (!file) throw new Error('Please upload a PNG product image.');
      if (
        generationMode === 'advert_asset' &&
        background === 'Other (custom)' &&
        !customBackground.trim()
      ) {
        toast.error('Please enter a custom background.');
        throw new Error('Please enter a custom background.');
      }

      const user = auth.currentUser;
      if (!user) throw new Error('You must be signed in to generate adverts.');

      setLoading(true);

      const selectedBackground =
        background === 'Other (custom)' ? customBackground.trim() : background;
      const result = await generateProductAdvertApi({
        image: file,
        uid: user.uid,
        prompt,
        background:
          generationMode === 'advert_asset' ? selectedBackground : undefined,
        platform,
        generationMode,
        campaignContext,
        useIndustryResearch,
      });
      const payload = result?.data as any;
      const rawPlatformResults = Array.isArray(payload?.platformResults)
        ? payload.platformResults
        : [payload];
      const normalizedPlatformResults: AdvertResult[] = rawPlatformResults
        .filter((item: any) => typeof item?.imageUrl === 'string' && item.imageUrl.trim())
        .map((item: any) => ({
          platform: String(item?.platform ?? effectivePlatform),
          chosenContentType:
            typeof item?.chosenContentType === 'string'
              ? item.chosenContentType
              : undefined,
          contentFormatLabel:
            typeof item?.contentFormatLabel === 'string'
              ? item.contentFormatLabel
              : undefined,
          analysis:
            item?.analysis && typeof item.analysis === 'object' ? item.analysis : null,
          copy:
            item?.copy && typeof item.copy === 'object'
              ? {
                  headline: String(item.copy?.headline ?? ''),
                  primary_text: String(item.copy?.primary_text ?? ''),
                  cta: String(item.copy?.cta ?? ''),
                  hashtags: Array.isArray(item.copy?.hashtags)
                    ? item.copy.hashtags.map((tag: unknown) => String(tag ?? ''))
                    : [],
                }
              : null,
          imageUrl: String(item.imageUrl),
          imageFilePath:
            typeof item?.imageFilePath === 'string' ? item.imageFilePath : undefined,
          logoPosition:
            typeof item?.logoPosition === 'string' ? item.logoPosition : undefined,
          selectedLogoVariantIndex:
            typeof item?.selectedLogoVariantIndex === 'number'
              ? item.selectedLogoVariantIndex
              : undefined,
          logoVariantSource:
            typeof item?.logoVariantSource === 'string'
              ? item.logoVariantSource
              : undefined,
          logoVariantCount:
            typeof item?.logoVariantCount === 'number' ? item.logoVariantCount : undefined,
          marketingTagline:
            typeof item?.marketingTagline === 'string' ? item.marketingTagline : undefined,
          productAdvertDocId:
            typeof item?.productAdvertDocId === 'string' ? item.productAdvertDocId : null,
        }));
      setFinalResult({
        generationMode: payload?.generationMode as GenerationMode,
        platformResults: normalizedPlatformResults,
      });
      if (
        payload?.generationMode === 'social_full' ||
        payload?.generationMode === 'advert_asset'
      ) {
        setLastGenerationMode(payload.generationMode);
      }
      toast.success('Advert generated successfully');
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || e.message || 'Failed to generate advert.'
      );
    } finally {
      setLoading(false);
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
        message: buildAdvertCaption(item),
        platform: String(item.platform ?? '').toLowerCase() as PostSchedulerPrefillPost['platform'],
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
    toast.success('Advert scheduled successfully');
  }

  async function handleCopyCaption(resultItem: AdvertResult) {
    const caption = buildAdvertCaption(resultItem);
    if (!caption) return;
    await navigator.clipboard.writeText(caption);
    setCaptionCopied(true);
    setTimeout(() => setCaptionCopied(false), 1800);
  }

  const formattedCreditsExpiresAt = creditsExpiresAt
    ? formatTimestamp(creditsExpiresAt as any)
    : '—';

  const allowedPlatforms = useMemo(() => {
    return PLATFORM_ORDER.filter((p) => selectedAccounts?.[p]);
  }, [selectedAccounts]);

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

  return (
    <div className="mx-auto animate-in fade-in duration-500 pb-20">
      <div className="max-w-5xl mx-auto backdrop-blur-lg bg-white/5 border border-white/10 rounded-2xl p-8 shadow-[0_0_30px_rgba(108,92,231,0.2)]">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-6">
          AI Product Advert Generator
        </h1>
        <div className="flex justify-end flex-col items-end">
          <p>Credits: {userCredits}</p>
          <p>Cost: {generationMode === 'social_full' ? 6 : 4} credits</p>
        </div>

        <div className="space-y-3 mb-6">
          <span className="block text-slate-700 font-medium">Output mode</span>
          <div className="flex flex-col sm:flex-row gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-slate-800">
              <input
                type="radio"
                name="generationMode"
                checked={generationMode === 'advert_asset'}
                onChange={() => setGenerationMode('advert_asset')}
                className="accent-indigo-600"
              />
              <span>
                Advert image (Gemini compositor + random format angle)
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-slate-800">
              <input
                type="radio"
                name="generationMode"
                checked={generationMode === 'social_full'}
                onChange={() => setGenerationMode('social_full')}
                className="accent-indigo-600"
              />
              <span>Full social post (AI engine + product as reference)</span>
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
        <div className="space-y-3 mb-6">
          <label className="block text-slate-700 font-medium">
            Upload product PNG (transparent background)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
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
                        checked={platform === p}
                        onChange={() => setPlatform(p)}
                        className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30"
                      />
                      <span>{label}</span>
                    </label>
                  );
                })}
                {allowedPlatforms.length > 1 && (
                <label
                    htmlFor="generate-platform-all_platforms"
                    className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800"
                  >
                    <input
                      id="generate-platform-all_platforms"
                      type="checkbox"
                      checked={platform === 'all_platforms'}
                      onChange={() => setPlatform('all_platforms')}
                      className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30"
                    />
                    <span>{allowedPlatforms.length === 2 ? 'Both platforms' : 'All platforms'}</span>
                  </label>
                )}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Each run creates one post optimized for the platform you select.
              </p>
            </>
          )}
        </div>
        <button
          onClick={handleGenerate}
          disabled={
            loading ||
            !file ||
            (generationMode === 'advert_asset' &&
              background === 'Other (custom)' &&
              !customBackground.trim())
          }
          className="w-full py-3 rounded-full font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-transform disabled:opacity-60"
        >
          {loading
            ? 'Generating...'
            : generationMode === 'social_full'
              ? 'Generate full post'
              : 'Generate advert'}
        </button>

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
                    <img
                      src={item.imageUrl}
                      alt={`Generated advert for ${item.platform}`}
                      className="rounded-lg shadow-[0_0_20px_rgba(79,70,229,0.2)]"
                    />
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
                  Continue to Post Scheduler (All Platforms)
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
