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
  const [basics, setBasics] = useState<Basics>({ businessName: '', industry: '' });
  const [requirements, setRequirements] = useState('');
  const [picks, setPicks] = useState<string[]>([]);
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
        const profile = (profileRes?.data?.profile || {}) as Record<string, unknown>;
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
      showErrorToast('Please add business name and industry in Template DNA first.');
      return;
    }
    if (generationLimitReached) {
      showErrorToast(`You can generate up to ${MAX_AI_LOGO_PICKS} logo options.`);
      return;
    }

    try {
      setGenerating(true);
      const response = await generateAiLogoPicks(requirements, 1);
      const nextPicks = response?.data?.picks || [];
      if (!nextPicks.length) throw new Error('No logo pick was generated.');
      setPicks((currentPicks) =>
        [...nextPicks, ...currentPicks].slice(0, MAX_AI_LOGO_PICKS)
      );
      toast.success('Logo pick is ready.');
      void handleGetAiGeneratedLogos();
    } catch (error: unknown) {
      showErrorToast('Failed to generate AI logo pick.');
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

  const selectedLogo = useMemo(() => {
    if (selectedIndex == null) return '';
    return picks[selectedIndex] || '';
  }, [selectedIndex, picks]);

  async function handleUseSelectedLogo() {
    if (!selectedLogo) return;
    try {
      setSaving(true);
      await saveAiGeneratedLogo(selectedLogo);
      toast.success('Logo saved successfully.');
      router.push('/template-dna');
    } catch (error: unknown) {
      showErrorToast('Failed to save selected logo.');
    } finally {
      setSaving(false);
    }
  }

  async function handleGetAiGeneratedLogos() {
    const response = await getAiGeneratedLogos();
    const logos = response?.data?.logos || [];
    setPicks(
      [...logos]
        .sort(
          (a, b) => getCreatedAtMs(b.createdAt) - getCreatedAtMs(a.createdAt)
        )
        .map((logo) => logo.url)
    );
  }

  useEffect(() => {
    void handleGetAiGeneratedLogos();
  }, []);

  if (authLoading || billingLoading || initializing) {
    return (
      <PageLoadingState message="Loading AI logo workspace..." />
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg text-center py-20">
        <p className="text-slate-700">Please sign in to continue.</p>
      </div>
    );
  }

  if (!canUseFeature) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">AI Generated Logo</h1>
        <p className="mt-3 text-slate-600">
          This feature is available for subscribed plans only.
        </p>
        <Link
          href="/settings/billings"
          className="mt-6 inline-flex rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700"
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
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <WandSparkles className="h-7 w-7 text-emerald-600" />
            AI Generated Logo
          </h1>
          <p className="mt-2 text-slate-600 max-w-2xl">
            Generate one logo at a time for <strong>{basics.businessName || 'your brand'}</strong>.
            You can create up to {MAX_AI_LOGO_PICKS} options, and nothing is saved
            until you choose one and click Use Selected Logo.
          </p>
        </div>
        <div className="inline-flex flex-col rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left shadow-sm sm:items-end sm:text-right">
          <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Credits available
          </span>
          <span className="mt-1 text-2xl font-bold text-emerald-100">
            {billing?.credits ?? 0}
          </span>
          <span className="mt-1 text-xs font-medium text-emerald-700">
            1 credit deducted per logo generation
          </span>
        </div>
      </header>

      <div className="glass-card rounded-3xl p-6 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr,2fr]">
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p><strong>Business:</strong> {basics.businessName || '—'}</p>
              <p className="mt-1"><strong>Industry:</strong> {basics.industry || '—'}</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Optional style requirements
              </label>
              <textarea
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                rows={5}
                maxLength={600}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-sm"
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
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
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
            <p className="text-center text-xs font-medium text-slate-500">
              {picks.length}/{MAX_AI_LOGO_PICKS} logo options generated. 1 credit
              is deducted per generation.
            </p>
            <button
              type="button"
              onClick={() => void handleUseSelectedLogo()}
              disabled={saving || !selectedLogo}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 font-semibold text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
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
              <div className="flex h-full min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
                Click Generate first logo to start.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {generating && (
                  <div className="aspect-square rounded-2xl border border-slate-200 bg-slate-100 animate-pulse" />
                )}
                {picks.map((src, idx) => {
                  const active = selectedIndex === idx;
                  return (
                    <button
                      type="button"
                      key={`logo-pick-${idx}`}
                      onClick={() => setSelectedIndex(idx)}
                      className={[
                        'group relative aspect-square rounded-2xl border bg-white p-2 transition',
                        active
                          ? 'border-indigo-500 ring-2 ring-indigo-200'
                          : 'border-slate-200 hover:border-slate-300',
                      ].join(' ')}
                    >
                      <img
                        src={src}
                        alt={`AI logo pick ${idx + 1}`}
                        className="h-full w-full object-contain"
                      />
                      <span className="absolute left-2 top-2 rounded-full bg-slate-900/75 px-2 py-0.5 text-[11px] text-white">
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
