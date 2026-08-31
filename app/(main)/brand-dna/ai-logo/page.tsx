'use client';

import { PageLoadingState } from '@/components/shared/PageLoadingState';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Sparkles, WandSparkles } from 'lucide-react';
import {
  generateAiLogoPicks,
  getAiGeneratedLogos,
  getProfile,
  useAiGeneratedLogo as saveAiGeneratedLogo,
} from '@/src/service/api/userService';
import { useUserPlanCredits } from '../../_components/UserPlanCreditsProvider';
import { useAuth } from '@/src/hooks/useAuth';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/show-error-toast';
import { cn } from '@/lib/utils';
import { workspacePageTitleClass } from '@/lib/workspace-ui';

type Basics = {
  businessName: string;
  industry: string;
};

const MAX_AI_LOGO_PICKS = 10;

function getCreatedAtMs(
  createdAt: string | { _seconds?: number; seconds?: number } | undefined
): number {
  if (!createdAt) return 0;
  if (typeof createdAt === 'string') {
    const ms = Date.parse(createdAt);
    return Number.isNaN(ms) ? 0 : ms;
  }
  const seconds = createdAt._seconds ?? createdAt.seconds;
  return typeof seconds === 'number' ? seconds * 1000 : 0;
}

export default function AILogoPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { billing, loading: billingLoading } = useUserPlanCredits();
  const [basics, setBasics] = useState<Basics>({
    businessName: '',
    industry: '',
  });
  const [requirements, setRequirements] = useState('');
  const [picks, setPicks] = useState<{ src: string; story?: string }[]>([]);
  const [pickUrls, setPickUrls] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const canUseFeature = billing?.activePlan !== 'non-subscribed';
  const generationLimitReached = picks.length >= MAX_AI_LOGO_PICKS;

  useEffect(() => {
    if (authLoading || !user?.uid) return;
    let cancelled = false;
    (async () => {
      try {
        const profileRes = await getProfile();
        if (cancelled) return;
        const profile = (profileRes?.data?.profile || {}) as Record<
          string,
          unknown
        >;
        setBasics({
          businessName: String(profile.businessName || '').trim(),
          industry: String(profile.industry || '').trim(),
        });
      } catch {
        if (!cancelled) {
          setBasics({ businessName: '', industry: '' });
        }
      } finally {
        if (!cancelled) setInitializing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.uid]);

  const runGeneration = useCallback(async () => {
    if (!canUseFeature) {
      showErrorToast('Please subscribe to use AI logo generation.');
      return;
    }
    if (!basics.businessName || !basics.industry) {
      showErrorToast(
        'Please add business name and industry in Template DNA first.'
      );
      return;
    }
    if (generationLimitReached) {
      showErrorToast(
        `You can generate up to ${MAX_AI_LOGO_PICKS} logo options.`
      );
      return;
    }

    try {
      setGenerating(true);
      const response = await generateAiLogoPicks(requirements, 1);
      const nextPicks = response?.data?.picks || [];
      const nextUrls = response?.data?.urls || [];
      const nextStory = response?.data?.designStory;
      if (!nextPicks.length) throw new Error('No logo pick was generated.');
      // Keep the white-canvas data URL in `picks` for display. Refetching
      // storage URLs right away caused a white→dark flash when the gallery
      // briefly showed transparency over dark UI chrome.
      setPicks((currentPicks) =>
        [
          ...nextPicks.map((src) => ({ src, story: nextStory })),
          ...currentPicks,
        ].slice(0, MAX_AI_LOGO_PICKS)
      );
      setPickUrls((current) =>
        [...nextUrls, ...current].slice(0, MAX_AI_LOGO_PICKS)
      );
      toast.success('Logo pick is ready.');
    } catch (error: unknown) {
      showErrorToast(
        'Failed to generate AI logo pick. Please Try Again Later.'
      );
    } finally {
      setGenerating(false);
    }
  }, [
    canUseFeature,
    basics.businessName,
    basics.industry,
    generationLimitReached,
    requirements,
  ]);

  const selectedPublicUrl = useMemo(() => {
    if (selectedIndex == null) return '';
    const fromUrls = pickUrls[selectedIndex] || '';
    if (fromUrls && !fromUrls.startsWith('data:')) return fromUrls;
    const fromPick = picks[selectedIndex]?.src || '';
    if (fromPick && !fromPick.startsWith('data:')) return fromPick;
    return '';
  }, [selectedIndex, pickUrls, picks]);

  async function handleUseSelectedLogo() {
    if (!selectedPublicUrl) {
      showErrorToast(
        'Select a saved logo pick (wait for generation to finish).'
      );
      return;
    }
    try {
      setSaving(true);
      await saveAiGeneratedLogo(selectedPublicUrl);
      toast.success('Logo saved successfully.');
      router.push('/brand-dna');
    } catch (error: unknown) {
      showErrorToast('Failed to save selected logo. Please Try Again Later.');
    } finally {
      setSaving(false);
    }
  }

  async function handleGetAiGeneratedLogos() {
    const response = await getAiGeneratedLogos();
    const logos = response?.data?.logos || [];
    const sorted = [...logos].sort(
      (a, b) => getCreatedAtMs(b.createdAt) - getCreatedAtMs(a.createdAt)
    );
    setPicks(
      sorted.map((logo) => ({ src: logo.url, story: logo.designStory }))
    );
    setPickUrls(sorted.map((logo) => logo.url));
  }

  useEffect(() => {
    void handleGetAiGeneratedLogos();
  }, []);

  if (authLoading || billingLoading || initializing) {
    return <PageLoadingState message="Loading AI logo workspace..." />;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg text-center py-20">
        <p className="text-default">Please sign in to continue.</p>
      </div>
    );
  }

  if (!canUseFeature) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <h1 className="text-page-title text-default">AI Generated Logo</h1>
        <p className="mt-3 text-secondary">
          This feature is available for subscribed plans only.
        </p>
        <Link
          href="/settings/billings"
          className="mt-6 inline-flex rounded-full btn-brand-fill px-5 py-2.5 font-semibold"
        >
          Upgrade plan
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl pb-20 animate-in fade-in duration-500">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1
            className={cn(workspacePageTitleClass, 'flex items-center gap-2')}
          >
            <WandSparkles className="h-7 w-7 text-success" />
            AI Generated Logo
          </h1>
          <p className="mt-2 text-secondary max-w-2xl">
            Generate one logo at a time for{' '}
            <strong>{basics.businessName || 'your brand'}</strong>. You can
            create up to {MAX_AI_LOGO_PICKS} options, and nothing is saved until
            you choose one and click Use Selected Logo.
          </p>
        </div>
        <div className="inline-flex flex-col rounded-2xl border border-success bg-success px-4 py-3 text-left sm:items-end sm:text-right">
          <span className="text-xs font-semibold uppercase tracking-wide text-success">
            Credits available
          </span>
          <span className="mt-1 text-2xl font-bold text-success">
            {billing?.credits ?? 0}
          </span>
          <span className="mt-1 text-xs font-medium text-success">
            1 credit deducted per logo generation
          </span>
        </div>
      </header>

      <div className="glass-card rounded-3xl p-6 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr,2fr]">
          <div className="space-y-4">
            <div className="rounded-xl border border-default bg-element p-4 text-sm text-default">
              <p>
                <strong>Business:</strong> {basics.businessName || '—'}
              </p>
              <p className="mt-1">
                <strong>Industry:</strong> {basics.industry || '—'}
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-default">
                Optional style requirements
              </label>
              <textarea
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                rows={5}
                maxLength={600}
                className="w-full rounded-lg border border-default bg-element px-4 py-2.5 text-default placeholder-muted-foreground focus:border-success focus:outline-none focus:ring-2 focus:ring-[var(--border-success)] transition-expo"
                placeholder="e.g. clean geometric icon, premium minimal style, deep emerald palette"
              />
            </div>
            <button
              type="button"
              onClick={() => void runGeneration()}
              disabled={
                generating ||
                generationLimitReached ||
                !basics.businessName ||
                !basics.industry
              }
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--green-9)] px-4 py-3 font-semibold text-white hover:bg-success disabled:cursor-not-allowed disabled:bg-element"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating logo...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {generationLimitReached
                    ? 'Generation limit reached'
                    : picks.length > 0
                      ? 'Create next logo'
                      : 'Generate first logo'}
                </>
              )}
            </button>
            <p className="text-center text-xs font-medium text-secondary">
              {picks.length}/{MAX_AI_LOGO_PICKS} logo options generated. 1
              credit is deducted per generation.
            </p>
            <button
              type="button"
              onClick={() => void handleUseSelectedLogo()}
              disabled={saving || !selectedPublicUrl}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-primary-purple/25 bg-primary-purple/10 px-4 py-3 font-semibold text-preview hover:bg-element disabled:cursor-not-allowed disabled:text-quaternary"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving selected logo...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Use Selected Logo
                </>
              )}
            </button>
          </div>

          <div>
            {picks.length === 0 && !generating ? (
              <div className="flex h-full min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-default bg-element text-sm text-secondary">
                Click Generate first logo to start.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {generating && (
                  <div className="aspect-square rounded-2xl border border-default bg-element animate-pulse" />
                )}
                {picks.map((pick, idx) => {
                  const active = selectedIndex === idx;
                  return (
                    <button
                      type="button"
                      key={`logo-pick-${idx}`}
                      onClick={() => setSelectedIndex(idx)}
                      style={{ backgroundColor: '#ffffff' }}
                      className={[
                        'group relative aspect-square rounded-full border p-2 transition',
                        active
                          ? 'border-primary-purple ring-2 ring-strong'
                          : 'border-default hover:border-strong',
                      ].join(' ')}
                    >
                      <img
                        src={pick.src}
                        alt={`AI logo pick ${idx + 1}`}
                        className="h-full w-full object-contain"
                      />
                      <span className="absolute left-2 top-2 rounded-full bg-black/75 px-2 py-0.5 text-[11px] text-white">
                        Pick {idx + 1}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
