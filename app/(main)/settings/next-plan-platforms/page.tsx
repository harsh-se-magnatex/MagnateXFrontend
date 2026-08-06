'use client';

import { PageLoadingState } from '@/components/shared/PageLoadingState';
import { useAuth } from '@/src/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  Facebook,
  Instagram,
  Linkedin,
  Loader2,
  Share2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { showErrorToast } from '@/lib/show-error-toast';
import { toast } from 'sonner';
import {
  getNextPlanPlatforms,
  selectNextPlanPlatformsApi,
  type NextPlanPlatformsPayload,
} from '@/src/service/api/userService';
import {
  PLAN_MAX_SOCIAL,
  PLATFORM_ORDER,
  type SocialPlatform,
} from '@/lib/platform-selection';
import { useTimestampFormatter } from '@/lib/user-timezone';
import { useUserPlanCredits } from '../../_components/UserPlanCreditsProvider';
import { isPlanInactive } from '@/lib/plan-access';
import { NonSubscribedFeatureBlock } from '@/components/shared/NonSubscribedFeatureBlock';

type SelectedMap = Record<SocialPlatform, boolean>;

const PLATFORM_META: Record<
  SocialPlatform,
  { label: string; icon: typeof Instagram; accent: string }
> = {
  instagram: {
    label: 'Instagram',
    icon: Instagram,
    accent: 'from-pink-500 to-purple-500',
  },
  facebook: {
    label: 'Facebook',
    icon: Facebook,
    accent: 'from-blue-600 to-indigo-500',
  },
  linkedin: {
    label: 'LinkedIn',
    icon: Linkedin,
    accent: 'from-sky-600 to-cyan-500',
  },
};

function emptySelected(): SelectedMap {
  return { facebook: false, instagram: false, linkedin: false };
}

function formatPlanLabel(plan: string | null | undefined): string {
  if (!plan) return '—';
  return plan
    .replace(/-/g, ' ')
    .replace(/\bai\b/i, 'AI')
    .replace(/\bstudio\b/i, 'Studio');
}

export default function NextPlanPlatformsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const fmtTimestamp = useTimestampFormatter();
  const { billing, loading: billingLoading } = useUserPlanCredits();

  const [data, setData] = useState<NextPlanPlatformsPayload | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [localSelected, setLocalSelected] = useState<SelectedMap>(emptySelected);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoadingData(true);
      const res = await getNextPlanPlatforms();
      const payload = res.data;
      setData(payload);
      if (payload.pendingSelected) {
        setLocalSelected({ ...emptySelected(), ...payload.pendingSelected });
      } else if (payload.currentSelected) {
        // Prefill from current platforms, then the toggle UI enforces the
        // next-plan cap (truncation happens if the user upgrades/downgrades).
        setLocalSelected({ ...emptySelected(), ...payload.currentSelected });
      } else {
        setLocalSelected(emptySelected());
      }
    } catch {
      showErrorToast('Could not load next-plan platform settings. Please Try Again Later.');
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace('/sign-in');
  }, [loading, user, router]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  const maxAllowed = data?.maxAllowed ?? 0;

  // If prefill from current exceeds next-plan cap, trim on first render of data.
  useEffect(() => {
    if (!data || maxAllowed <= 0) return;
    setLocalSelected((prev) => {
      const enabled = PLATFORM_ORDER.filter((p) => prev[p]);
      if (enabled.length <= maxAllowed) return prev;
      const kept = new Set(enabled.slice(0, maxAllowed));
      return {
        facebook: kept.has('facebook'),
        instagram: kept.has('instagram'),
        linkedin: kept.has('linkedin'),
      };
    });
  }, [data?.targetPlan, maxAllowed]);

  const selectedCount = useMemo(
    () => PLATFORM_ORDER.filter((p) => localSelected[p]).length,
    [localSelected]
  );

  const selectionUnchanged = useMemo(() => {
    const saved = data?.pendingSelected;
    if (!saved) return false;
    return (
      saved.facebook === localSelected.facebook &&
      saved.instagram === localSelected.instagram &&
      saved.linkedin === localSelected.linkedin &&
      data.pendingSelectedForPlan === data.targetPlan
    );
  }, [data, localSelected]);

  const canSave =
    maxAllowed > 0 &&
    selectedCount >= 1 &&
    selectedCount <= maxAllowed &&
    !selectionUnchanged &&
    !saving;

  const togglePlatform = (key: SocialPlatform) => {
    setLocalSelected((prev) => {
      const next = { ...prev };
      if (prev[key]) {
        next[key] = false;
        return next;
      }
      const currentCount = PLATFORM_ORDER.filter((p) => prev[p]).length;
      if (currentCount >= maxAllowed) return prev;
      next[key] = true;
      return next;
    });
  };

  const handleSave = async () => {
    if (!canSave || isPlanInactive(billing)) return;
    try {
      setSaving(true);
      await selectNextPlanPlatformsApi(localSelected);
      toast.success('Next-cycle platforms saved');
      await load();
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : undefined;
      showErrorToast(message || 'Failed to save next-cycle platforms. Please Try Again Later.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadingData || (billingLoading && !billing)) {
    return <PageLoadingState />;
  }
  if (!user) return null;

  if (
    isPlanInactive(billing) ||
    !data ||
    !data.targetPlan ||
    data.activePlan === 'non-subscribed' ||
    data.planActive === false
  ) {
    return <NonSubscribedFeatureBlock />;
  }

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-500 pb-12">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Share2 className="h-5 w-5" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Next plan platforms
          </h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground max-w-xl">
          Choose the social platforms you want when your plan renews. If you
          skip this step, we will continue with your current selection
          {maxAllowed < (PLAN_MAX_SOCIAL[data.activePlan] ?? maxAllowed)
            ? ' (trimmed to fit your next plan)'
            : ''}
          .
        </p>
      </div>

      <section className="glass-card rounded-3xl border border-border p-6 sm:p-8 space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Current plan
            </p>
            <p className="mt-1 font-semibold text-foreground">
              {formatPlanLabel(data.activePlan)}
            </p>
          </div>
          <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
              {data.hasPendingPlanChange ? 'Next plan' : 'Renewing as'}
            </p>
            <p className="mt-1 font-semibold text-foreground">
              {formatPlanLabel(data.targetPlan)}
              <span className="ml-2 text-xs font-medium text-primary">
                · up to {maxAllowed} platform{maxAllowed === 1 ? '' : 's'}
              </span>
            </p>
          </div>
        </div>

        {data.nextBillingDate ? (
          <p className="text-sm text-muted-foreground">
            Renews on{' '}
            <span className="font-semibold text-foreground">
              {fmtTimestamp(data.nextBillingDate)}
            </span>
            {data.withinSelectionWindow ? (
              <span className="ml-2 inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-200 ring-1 ring-amber-500/30">
                Within 15 days
              </span>
            ) : null}
          </p>
        ) : null}

        {data.selectionComplete ? (
          <div
            className="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-sm"
            role="status"
          >
            <p className="font-semibold flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
              <Check className="h-4 w-4" />
              Next-cycle platforms saved
            </p>
            <p className="mt-1 text-emerald-800/90 dark:text-emerald-100/85">
              These will apply automatically when your plan renews. You can still
              update them below before then.
            </p>
          </div>
        ) : (
          <div
            className="rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm"
            role="status"
          >
            <p className="font-semibold text-amber-800 dark:text-amber-200">
              Selection recommended
            </p>
            <p className="mt-1 text-amber-900/90 dark:text-amber-100/85">
              For a smoother renewal, select your next-cycle platforms early. If
              you do not, we will keep your current platforms.
            </p>
          </div>
        )}

        <div className="space-y-3 pt-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Select up to {maxAllowed}
          </p>
          <div className="grid gap-3">
            {PLATFORM_ORDER.map((platform) => {
              const meta = PLATFORM_META[platform];
              const Icon = meta.icon;
              const checked = localSelected[platform];
              const atCap = selectedCount >= maxAllowed && !checked;
              return (
                <button
                  key={platform}
                  type="button"
                  onClick={() => togglePlatform(platform)}
                  disabled={atCap}
                  className={cn(
                    'flex items-center gap-4 rounded-2xl border px-4 py-4 text-left transition-colors',
                    checked
                      ? 'border-primary/50 bg-primary/15 ring-1 ring-primary/30'
                      : 'border-border bg-card hover:bg-muted/50',
                    atCap && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white',
                      meta.accent
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{meta.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {checked ? 'Selected for next cycle' : 'Tap to include'}
                    </p>
                  </div>
                  <div
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full border',
                      checked
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted-foreground/40'
                    )}
                  >
                    {checked ? <Check className="h-3.5 w-3.5" /> : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button
            type="button"
            className="rounded-xl"
            disabled={!canSave}
            onClick={() => void handleSave()}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            Save next-cycle platforms
          </Button>
          <Button asChild type="button" variant="outline" className="rounded-xl">
            <Link href="/settings/billings">Back to Billing</Link>
          </Button>
          <p className="text-xs text-muted-foreground w-full sm:w-auto">
            {selectedCount}/{maxAllowed} selected
          </p>
        </div>
      </section>
    </div>
  );
}
