'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Sparkles, WandSparkles } from 'lucide-react';
import {
  generateAiLogoPicks,
  getProfile,
  useAiGeneratedLogo,
} from '@/src/service/api/userService';
import { useUserPlanCredits } from '../../_components/UserPlanCreditsProvider';
import { useAuth } from '@/src/hooks/useAuth';
import { toast } from 'sonner';

type Basics = {
  businessName: string;
  industry: string;
};

export default function AILogoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const startNow = searchParams.get('start') === '1';

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
      toast.error('Please subscribe to use AI logo generation.');
      return;
    }
    if (!basics.businessName || !basics.industry) {
      toast.error('Please add business name and industry in Template DNA first.');
      return;
    }

    try {
      setGenerating(true);
      setSelectedIndex(null);
      const response = await generateAiLogoPicks(requirements, 5);
      const nextPicks = response?.data?.picks || [];
      if (!nextPicks.length) throw new Error('No logo picks were generated.');
      setPicks(nextPicks);
      toast.success('Top 5 logo picks are ready.');
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || 'Failed to generate AI logo picks.'
      );
    } finally {
      setGenerating(false);
    }
  }, [canUseFeature, basics.businessName, basics.industry, requirements]);

  useEffect(() => {
    if (!startNow || initializing || !canUseFeature) return;
    if (picks.length > 0 || generating) return;
    void runGeneration();
  }, [startNow, initializing, canUseFeature, picks.length, generating, runGeneration]);

  const selectedLogo = useMemo(() => {
    if (selectedIndex == null) return '';
    return picks[selectedIndex] || '';
  }, [selectedIndex, picks]);

  async function handleUseSelectedLogo() {
    if (!selectedLogo) return;
    try {
      setSaving(true);
      await useAiGeneratedLogo(selectedLogo);
      toast.success('Logo saved successfully.');
      router.push('/template-dna');
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || 'Failed to save selected logo.'
      );
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || billingLoading || initializing) {
    return (
      <div className="mx-auto flex min-h-[45vh] max-w-5xl items-center justify-center">
        <div className="flex items-center gap-2 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading AI logo workspace...
        </div>
      </div>
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
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <WandSparkles className="h-7 w-7 text-emerald-600" />
          AI Generated Logo
        </h1>
        <p className="mt-2 text-slate-600 max-w-2xl">
          Generate 5 logo picks for <strong>{basics.businessName || 'your brand'}</strong>.
          Nothing is saved until you choose one and click Use Selected Logo.
        </p>
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
              disabled={generating || !basics.businessName || !basics.industry}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating 5 picks...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate 5 picks
                </>
              )}
            </button>
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
            {generating ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={`logo-skeleton-${i}`}
                    className="aspect-square rounded-2xl border border-slate-200 bg-slate-100 animate-pulse"
                  />
                ))}
              </div>
            ) : picks.length === 0 ? (
              <div className="flex h-full min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
                Click Generate 5 picks to start.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
