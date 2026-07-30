'use client';

import { PageLoadingState } from '@/components/shared/PageLoadingState';
import { NonSubscribedFeatureBlock } from '@/components/shared/NonSubscribedFeatureBlock';
import { isPlanInactive } from '@/lib/plan-access';
import { useAuth } from '@/src/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bot,
  Type,
  Smile,
  CheckSquare,
  Clock,
  Mail,
  RefreshCw,
  FacebookIcon,
  Instagram,
  Linkedin,
  Plug,
} from 'lucide-react';
import { toast } from 'sonner';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';

const LOGO_CORNER_PREFERENCES = [
  'top-left',
  'top-right',
  'top-center',
  'bottom-left',
  'bottom-right',
  'bottom-center',
] as const;

function normalizeLogoPreference(raw: string | undefined | null): string {
  const v = String(raw || '')
    .toLowerCase()
    .trim()
    .replace(/_/g, '-')
    .replace(/\s+/g, '-');
  return LOGO_CORNER_PREFERENCES.includes(v as (typeof LOGO_CORNER_PREFERENCES)[number])
    ? v
    : 'top-left';
}
import {
  editUserPreferences,
  getUserPreferences,
  refreshOptimalPostingTime,
  type OptimalPostingMeta,
  type OptimalPostingPlatform,
} from '@/features/user/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { showErrorToast } from '@/lib/show-error-toast';
import {
  useTimestampFormatter,
  type TimestampInput,
} from '@/lib/user-timezone';
import { UpgradeGate } from '@/components/shared/UpgradeGate';
import { useUserPlanCredits } from '../../_components/UserPlanCreditsProvider';
import {
  DEFAULT_PREFERRED_POSTING_TIME,
  normalizePreferredPostingTime,
} from '@/utils/preferredPostingTime';

const inputBase =
  'w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all';

const InstagramOptions = [
  {
    id: 'instagram-short',
    value: 'short',
    platform: 'instagram',
    description: 'upto 15 words',
  },
  {
    id: 'instagram-medium',
    value: 'medium',
    platform: 'instagram',
    description: '20-30 words',
  },
  {
    id: 'instagram-long',
    value: 'long',
    platform: 'instagram',
    description: '40-60 words',
  },
];

const FacebookOptions = [
  {
    id: 'facebook-short',
    value: 'short',
    platform: 'facebook',
    description: 'upto 15 words',
  },
  {
    id: 'facebook-medium',
    value: 'medium',
    platform: 'facebook',
    description: '15-25 words',
  },
  {
    id: 'facebook-long',
    value: 'long',
    platform: 'facebook',
    description: '40-80 words',
  },
];

const LinkedInOptions = [
  {
    id: 'linkedin-short',
    value: 'short',
    platform: 'linkedin',
    description: '25-40 words',
  },
  {
    id: 'linkedin-medium',
    value: 'medium',
    platform: 'linkedin',
    description: '80-120 words',
  },
  {
    id: 'linkedin-long',
    value: 'long',
    platform: 'linkedin',
    description: '150-250 words',
  },
];

const Timezone = Intl.supportedValuesOf('timeZone');

/** `00`, `01`, ..., `23` — used to render a guaranteed-24h hour dropdown. */
const HOURS_24 = Array.from({ length: 24 }, (_, i) =>
  i.toString().padStart(2, '0')
);
/** `00`, `01`, ..., `59` for the minute dropdown. */
const MINUTES_60 = Array.from({ length: 60 }, (_, i) =>
  i.toString().padStart(2, '0')
);

/** Split a stored `HH:mm` preference into hour / minute strings (24-hour). */
function splitPreferredTime(value: string): { hour: string; minute: string } {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return { hour: '', minute: '' };
  const h = Math.max(0, Math.min(23, Number(match[1])))
    .toString()
    .padStart(2, '0');
  const m = Math.max(0, Math.min(59, Number(match[2])))
    .toString()
    .padStart(2, '0');
  return { hour: h, minute: m };
}

type OptimalPlatformState = {
  hhmm: string | null;
  meta: OptimalPostingMeta | null;
  connected: boolean;
  selected: boolean;
  /** True while the user-clicked Refresh request is in-flight for this tile. */
  refreshing: boolean;
};

const ALL_PLATFORMS: OptimalPostingPlatform[] = [
  'facebook',
  'instagram',
  'linkedin',
];

const PLATFORM_LABELS: Record<OptimalPostingPlatform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
};

const PLATFORM_TIME_KEYS: Record<
  OptimalPostingPlatform,
  'optimalFacebookTime' | 'optimalInstagramTime' | 'optimalLinkedinTime'
> = {
  facebook: 'optimalFacebookTime',
  instagram: 'optimalInstagramTime',
  linkedin: 'optimalLinkedinTime',
};

const PLATFORM_META_KEYS: Record<
  OptimalPostingPlatform,
  'optimalFacebookMeta' | 'optimalInstagramMeta' | 'optimalLinkedinMeta'
> = {
  facebook: 'optimalFacebookMeta',
  instagram: 'optimalInstagramMeta',
  linkedin: 'optimalLinkedinMeta',
};

const PLATFORM_ICON: Record<
  OptimalPostingPlatform,
  React.ComponentType<{ className?: string }>
> = {
  facebook: FacebookIcon,
  instagram: Instagram,
  linkedin: Linkedin,
};

const PLATFORM_ACCENT: Record<
  OptimalPostingPlatform,
  { bg: string; text: string; ring: string }
> = {
  facebook: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    ring: 'ring-blue-500/30',
  },
  instagram: {
    bg: 'bg-pink-50',
    text: 'text-pink-600',
    ring: 'ring-pink-500/30',
  },
  linkedin: {
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    ring: 'ring-sky-500/30',
  },
};

function defaultPlatformState(): OptimalPlatformState {
  return {
    hhmm: null,
    meta: null,
    connected: false,
    selected: false,
    refreshing: false,
  };
}

export default function AutomationPreferencePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const fmtTimestamp = useTimestampFormatter();
  const { billing, loading: billingLoading } = useUserPlanCredits();
  /**
   * AI plans default to Auto Approve at purchase; users may switch to Manual
   * Review here. Studio (manual-mode) plans always use Manual Review — Auto
   * Approve is locked behind `<UpgradeGate>` and stale `false` values are
   * normalised back to `true` on mount.
   */
  const isManualMode = billing?.mode === 'manual';
  const [captionObject, setCaptionObject] = useState({
    instagram: '',
    facebook: '',
    linkedin: '',
  });
  const [logoPreference, setLogoPreference] = useState('top-left');
  const [emojiUsage, setEmojiUsage] = useState(true);
  const [socialSalesEmailUsage, setSocialSalesEmailUsage] = useState(true);
  const [needApproval, setNeedApproval] = useState(true);
  const [timeZone, setTimeZone] = useState('');
  const [preferredTime, setPreferredTime] = useState(DEFAULT_PREFERRED_POSTING_TIME);
  const [useAnalyticsOptimalPostingTime, setUseAnalyticsOptimalPostingTime] =
    useState(false);
  const [platformOptimal, setPlatformOptimal] = useState<
    Record<OptimalPostingPlatform, OptimalPlatformState>
  >({
    facebook: defaultPlatformState(),
    instagram: defaultPlatformState(),
    linkedin: defaultPlatformState(),
  });
  const [preferencesLoading, setPreferencesLoading] = useState(true);

  useEffect(() => {
    const getPreferences = async () => {
      try {
        setPreferencesLoading(true);
        const response = await getUserPreferences();

        if (response.success) {
          setEmojiUsage(response.data.preferences.emojiUsage ?? true);
          setCaptionObject(
            response.data.preferences.Caption_Length || {
              instagram: '',
              facebook: '',
              linkedin: '',
            }
          );
          setNeedApproval(response.data.preferences.Need_Approval ?? true);
          setTimeZone(response.data.preferences.TimeZone || 'Asia/Calcutta');
          setPreferredTime(
            normalizePreferredPostingTime(
              response.data.preferences.preferredTime
            )
          );
          setUseAnalyticsOptimalPostingTime(
            response.data.preferences.useAnalyticsOptimalPostingTime === true
          );
          setLogoPreference(
            normalizeLogoPreference(response.data.preferences.logoPreference)
          );

          const prefs = response.data.preferences;
          const selected = response.data.selected ?? {};
          const socialStatus = response.data.socialStatus ?? {};
          setPlatformOptimal((prev) => {
            const next = { ...prev };
            for (const p of ALL_PLATFORMS) {
              const status = socialStatus[p];
              next[p] = {
                ...prev[p],
                hhmm: (prefs[PLATFORM_TIME_KEYS[p]] as string) ?? null,
                meta: (prefs[PLATFORM_META_KEYS[p]] as OptimalPostingMeta) ?? null,
                selected: selected[p] === true,
                connected:
                  status?.connected === true || status?.status === 'connected',
              };
            }
            return next;
          });
        }
      } finally {
        setPreferencesLoading(false);
      }
    };
    getPreferences();
    if (!loading && !user) router.replace('/sign-in');
  }, [loading, user, router]);

  // Studio plans cannot use Auto Approve — flip stale `false` back to `true`.
  useEffect(() => {
    if (isManualMode && !needApproval) {
      setNeedApproval(true);
    }
  }, [isManualMode, needApproval]);

  // Live updates: a fresh OAuth callback or backend-side recompute updates
  // these fields on `users/{uid}` directly. Subscribing here means the
  // optimal-time tiles refresh themselves without the user reloading the page.
  useEffect(() => {
    if (!user?.uid) return;
    const ref = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as Record<string, unknown>;
      const prefs = (data.preferences ?? {}) as Record<string, unknown>;
      const selected = (data.selected ?? {}) as Record<string, boolean>;
      const socialStatus = (data.socialStatus ?? {}) as Record<
        string,
        { connected?: boolean; status?: string } | undefined
      >;
      setPlatformOptimal((prev) => {
        const next = { ...prev };
        for (const p of ALL_PLATFORMS) {
          const status = socialStatus[p];
          next[p] = {
            ...prev[p],
            hhmm: (prefs[PLATFORM_TIME_KEYS[p]] as string) ?? null,
            meta: (prefs[PLATFORM_META_KEYS[p]] as OptimalPostingMeta) ?? null,
            selected: selected[p] === true,
            connected:
              status?.connected === true || status?.status === 'connected',
          };
        }
        return next;
      });
      const flag = prefs.useAnalyticsOptimalPostingTime;
      if (typeof flag === 'boolean') {
        setUseAnalyticsOptimalPostingTime(flag);
      }
    });
    return () => unsubscribe();
  }, [user?.uid]);

  const handleRefreshOptimal = useCallback(
    async (platform: OptimalPostingPlatform) => {
      setPlatformOptimal((prev) => ({
        ...prev,
        [platform]: { ...prev[platform], refreshing: true },
      }));
      try {
        const res = await refreshOptimalPostingTime(platform);
        if (res.success) {
          const optimal = res.data.optimal;
          setPlatformOptimal((prev) => ({
            ...prev,
            [platform]: {
              ...prev[platform],
              hhmm: optimal?.hhmm ?? null,
              meta: optimal
                ? {
                    sampleSize: optimal.sampleSize,
                    source: optimal.source,
                    reasoning: optimal.reasoning,
                    computedAt: new Date().toISOString(),
                  }
                : null,
              refreshing: false,
            },
          }));
          toast.success(
            optimal
              ? `${PLATFORM_LABELS[platform]} optimal time refreshed to ${optimal.hhmm}.`
              : `${PLATFORM_LABELS[platform]} needs at least 5 posts before we can recommend a time.`
          );
        } else {
          throw new Error('Refresh failed');
        }
      } catch (err) {
        setPlatformOptimal((prev) => ({
          ...prev,
          [platform]: { ...prev[platform], refreshing: false },
        }));
        showErrorToast('Failed to refresh optimal time');
      }
    },
    []
  );

  const selectedPlatforms = useMemo(
    () => ALL_PLATFORMS.filter((p) => platformOptimal[p].selected),
    [platformOptimal]
  );

  const handleSubmit = async (
    currentLogoPreference = logoPreference,
    currentEmojiUsage = emojiUsage,
    currentSalesEmailUsage = socialSalesEmailUsage,
    currentApproval = needApproval,
    curentTimeZone = timeZone,
    currentCaptionObject = captionObject,
    currentPreferredTime = preferredTime,
    currentUseAnalyticsOptimalPostingTime = useAnalyticsOptimalPostingTime
  ) => {
    if (currentApproval !== needApproval) {
      window.dispatchEvent(
        new CustomEvent('approvalChanged', { detail: currentApproval })
      );
    }
    try {
      await editUserPreferences(
        currentLogoPreference,
        currentEmojiUsage,
        currentSalesEmailUsage,
        currentCaptionObject,
        currentApproval,
        curentTimeZone,
        normalizePreferredPostingTime(currentPreferredTime),
        currentUseAnalyticsOptimalPostingTime
      );
      // Per-platform optimal-time fields update live via the Firestore
      // subscription above, no need to re-fetch here.
    } catch (error: unknown) {
      showErrorToast('Failed to update preferences');
    }
  };

  if (loading) return <PageLoadingState />;
  if (!user) return null;

  if (preferencesLoading) return <PageLoadingState className="min-h-[240px]" />;
  if (!preferencesLoading && !user) return <div>Not found</div>;

  if (billingLoading && !billing) {
    return <PageLoadingState message="Loading your account..." />;
  }

  if (isPlanInactive(billing)) {
    return <NonSubscribedFeatureBlock />;
  }

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Automation Preferences
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Configure how SocioGenie generated content behaves, default languages,
          and auto-posting rules.
        </p>
      </div>

      <div className="space-y-8">
        {/* Language & Output Section */}
        <section className="glass-card rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <Bot className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">
              AI Output Settings
            </h2>
          </div>

          <div className="flex sm:flex-row-reverse flex-col-reverse gap-4 justify-between">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">
                Emoji Usage
              </label>
              <p className="text-xs text-slate-500 mb-3">
                Include emojis in generated captions automatically.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={emojiUsage}
                  onClick={() => {
                    const newValue = !emojiUsage;
                    setEmojiUsage(newValue);
                    handleSubmit(
                      logoPreference,
                      newValue,
                      socialSalesEmailUsage,
                      needApproval,
                      timeZone,
                      captionObject,
                      preferredTime
                    );
                  }}
                  className={cn(
                    'relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
                    emojiUsage ? 'bg-indigo-600' : 'bg-slate-200'
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform',
                      emojiUsage ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
                <span className="text-sm font-medium text-slate-700">
                  {emojiUsage ? 'Enabled' : 'Disabled'}
                </span>
                <Smile
                  className={cn(
                    'h-4 w-4 ml-1',
                    emojiUsage ? 'text-indigo-500' : 'text-slate-400'
                  )}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">
                Logo Preference
              </label>
              <p className="text-xs text-slate-500 mb-3">
                Where to place the logo in the generated image.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <Select
                  value={logoPreference}
                  onValueChange={(value) => {
                    setLogoPreference(value);
                    handleSubmit(
                      value,
                      emojiUsage,
                      socialSalesEmailUsage,
                      needApproval,
                      timeZone,
                      captionObject,
                      preferredTime
                    );
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a logo preference" />
                    <SelectContent>
                      <SelectItem value="top-left">Top Left</SelectItem>
                      <SelectItem value="top-center">Top Center</SelectItem>
                      <SelectItem value="top-right">Top Right</SelectItem>
                      <SelectItem value="bottom-left">Bottom Left</SelectItem>
                      <SelectItem value="bottom-center">Bottom Center</SelectItem>
                      <SelectItem value="bottom-right">Bottom Right</SelectItem>
                    </SelectContent>
                  </SelectTrigger>
                </Select>
              </div>
            </div>
          </div>
          <div className="mt-8">
            <label className="text-sm font-semibold text-slate-700 block mb-2">
              Social Sales Email and contact number Usage
            </label>
            <p className="text-xs text-slate-500 mb-3">
              Include your social sales email and contact number in the
              generated captions automatically.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={socialSalesEmailUsage}
                onClick={() => {
                  const newValue = !socialSalesEmailUsage;
                  setSocialSalesEmailUsage(newValue);
                  handleSubmit(
                    logoPreference,
                    emojiUsage,
                    newValue,
                    needApproval,
                    timeZone,
                    captionObject,
                    preferredTime
                  );
                }}
                className={cn(
                  'relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
                  socialSalesEmailUsage ? 'bg-indigo-600' : 'bg-slate-200'
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform',
                    socialSalesEmailUsage ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
              <span className="text-sm font-medium text-slate-700">
                {socialSalesEmailUsage ? 'Enabled' : 'Disabled'}
              </span>
              <Mail
                className={cn(
                  'h-4 w-4 ml-1',
                  socialSalesEmailUsage ? 'text-indigo-500' : 'text-slate-400'
                )}
              />
            </div>
          </div>
        </section>

        {/* Content Length Section */}
        <section className="glass-card rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
            <div className="p-2 bg-pink-50 rounded-lg text-pink-600">
              <Type className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">
              Caption Length
            </h2>
          </div>

          <p className="text-sm text-slate-500 mb-5">
            Preferred length for AI auto-generated captions across your posts.
          </p>

          <div className="grid sm:grid-cols-3 gap-4">
            {InstagramOptions.map((len) => {
              const isSelected = captionObject.instagram === len.value;
              return (
                <button
                  key={len.id}
                  type="button"
                  onClick={() => {
                    setCaptionObject({
                      instagram: len.value,
                      facebook: captionObject.facebook,
                      linkedin: captionObject.linkedin,
                    });
                    handleSubmit(
                      logoPreference,
                      emojiUsage,
                      socialSalesEmailUsage,
                      needApproval,
                      timeZone,
                      {
                        instagram: len.value,
                        facebook: captionObject.facebook,
                        linkedin: captionObject.linkedin,
                      },
                      preferredTime
                    );
                  }}
                  className={cn(
                    'flex-1 rounded-2xl border px-6 py-4 text-center transition-all bg-card relative overflow-hidden',
                    isSelected
                      ? 'border-primary ring-1 ring-primary shadow-md shadow-primary/10'
                      : 'border-border/60 hover:border-border hover:bg-accent/40 shadow-sm'
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-0 inset-x-0 h-1 bg-indigo-600" />
                  )}
                  <span
                    className={cn(
                      'block text-sm font-bold capitalize',
                      isSelected ? 'text-primary' : 'text-foreground'
                    )}
                  >
                    {len.id}
                  </span>
                  <span className="block mt-1 text-xs text-slate-500">
                    {len.id === 'instagram-short' && len.description}
                    {len.id === 'instagram-medium' && len.description}
                    {len.id === 'instagram-long' && len.description}
                  </span>
                </button>
              );
            })}
            {FacebookOptions.map((len) => {
              const isSelected = captionObject.facebook === len.value;
              return (
                <button
                  key={len.id}
                  type="button"
                  onClick={() => {
                    setCaptionObject({
                      instagram: captionObject.instagram,
                      facebook: len.value,
                      linkedin: captionObject.linkedin,
                    });
                    handleSubmit(
                      logoPreference,
                      emojiUsage,
                      socialSalesEmailUsage,
                      needApproval,
                      timeZone,
                      {
                        instagram: captionObject.instagram,
                        facebook: len.value,
                        linkedin: captionObject.linkedin,
                      },
                      preferredTime
                    );
                  }}
                  className={cn(
                    'flex-1 rounded-2xl border px-6 py-4 text-center transition-all bg-card relative overflow-hidden',
                    isSelected
                      ? 'border-primary ring-1 ring-primary shadow-md shadow-primary/10'
                      : 'border-border/60 hover:border-border hover:bg-accent/40 shadow-sm'
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-0 inset-x-0 h-1 bg-indigo-600" />
                  )}
                  <span
                    className={cn(
                      'block text-sm font-bold capitalize',
                      isSelected ? 'text-primary' : 'text-foreground'
                    )}
                  >
                    {len.id}
                  </span>
                  <span className="block mt-1 text-xs text-slate-500">
                    {len.id === 'facebook-short' && len.description}
                    {len.id === 'facebook-medium' && len.description}
                    {len.id === 'facebook-long' && len.description}
                  </span>
                </button>
              );
            })}
            {LinkedInOptions.map((len) => {
              const isSelected = captionObject.linkedin === len.value;
              return (
                <button
                  key={len.id}
                  type="button"
                  onClick={() => {
                    setCaptionObject({
                      instagram: captionObject.instagram,
                      facebook: captionObject.facebook,
                      linkedin: len.value,
                    });
                    handleSubmit(
                      logoPreference,
                      emojiUsage,
                      socialSalesEmailUsage,
                      needApproval,
                      timeZone,
                      {
                        instagram: captionObject.instagram,
                        facebook: captionObject.facebook,
                        linkedin: len.value,
                      },
                      preferredTime
                    );
                  }}
                  className={cn(
                    'flex-1 rounded-2xl border px-6 py-4 text-center transition-all bg-card relative overflow-hidden',
                    isSelected
                      ? 'border-primary ring-1 ring-primary shadow-md shadow-primary/10'
                      : 'border-border/60 hover:border-border hover:bg-accent/40 shadow-sm'
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-0 inset-x-0 h-1 bg-indigo-600" />
                  )}
                  <span
                    className={cn(
                      'block text-sm font-bold capitalize',
                      isSelected ? 'text-primary' : 'text-foreground'
                    )}
                  >
                    {len.id}
                  </span>
                  <span className="block mt-1 text-xs text-slate-500">
                    {len.id === 'linkedin-short' && len.description}
                    {len.id === 'linkedin-medium' && len.description}
                    {len.id === 'linkedin-long' && len.description}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Workflow Section */}
        <section className="glass-card rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <CheckSquare className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">
              Approval Workflow & Scheduling
            </h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">
                Post Approval Mode
              </label>
              <p className="text-xs text-slate-500 mb-4">
                In{' '}
                <span className="font-semibold text-slate-700">
                  Auto Approve
                </span>
                , posts are reviewed by an admin and published automatically
                without your input. With{' '}
                <span className="font-semibold text-slate-700">
                  Manual Review
                </span>
                , every post must be reviewed and approved by you before it can
                be published.
              </p>
              <div className="flex rounded-xl bg-muted p-1 border border-border">
                <span className="inline-flex flex-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (needApproval) return;
                      setNeedApproval(true);
                      handleSubmit(
                        logoPreference,
                        emojiUsage,
                        socialSalesEmailUsage,
                        true,
                        timeZone,
                        captionObject,
                        preferredTime
                      );
                    }}
                    className={cn(
                      'w-full rounded-lg py-2.5 text-sm font-semibold transition-all duration-200',
                      needApproval === true
                        ? 'bg-emerald-400/80 text-black/90 shadow-sm ring-1 ring-border'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                    )}
                  >
                    Manual Review
                  </button>
                </span>
                <UpgradeGate
                  gated={isManualMode}
                  tooltip="Upgrade to an AI plan to use Auto Approve"
                  className="flex-1"
                >
                  <button
                    type="button"
                    disabled={isManualMode}
                    onClick={() => {
                      if (isManualMode) return;
                      setNeedApproval(false);
                      handleSubmit(
                        logoPreference,
                        emojiUsage,
                        socialSalesEmailUsage,
                        false,
                        timeZone,
                        captionObject,
                        preferredTime
                      );
                    }}
                    className={cn(
                      'w-full rounded-lg py-2.5 text-sm font-semibold transition-all duration-200',
                      needApproval === false
                        ? 'bg-emerald-400/80 text-black/90 shadow-sm ring-1 ring-emerald-600/20'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                    )}
                  >
                    Auto Approve
                  </button>
                </UpgradeGate>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-slate-400" />
                <label className="text-sm font-semibold text-slate-700 block">
                  Default Timezone
                </label>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Used when generating schedules and publishing posts.
              </p>
              <select
                value={timeZone}
                onChange={(e) => {
                  setTimeZone(e.target.value);
                  handleSubmit(
                    logoPreference,
                    emojiUsage,
                    socialSalesEmailUsage,
                    needApproval,
                    e.target.value,
                    captionObject,
                    preferredTime
                  );
                }}
                className={inputBase}
              >
                {Timezone.map((timezone) => (
                  <option value={timezone} key={timezone}>
                    {timezone}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm font-semibold text-slate-700 block mb-2">
                Analytics-based optimal posting time
              </label>
              <p className="text-xs text-slate-500 mb-3">
                When enabled, AI-engine scheduled posts use your best posting
                hour derived from synced social analytics (engagement-weighted).
                Your preferred time below is used when this is off or when not
                enough posts are available yet.
              </p>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={useAnalyticsOptimalPostingTime}
                  onClick={() => {
                    const newValue = !useAnalyticsOptimalPostingTime;
                    setUseAnalyticsOptimalPostingTime(newValue);
                    handleSubmit(
                      logoPreference,
                      emojiUsage,
                      socialSalesEmailUsage,
                      needApproval,
                      timeZone,
                      captionObject,
                      preferredTime,
                      newValue
                    );
                  }}
                  className={cn(
                    'relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
                    useAnalyticsOptimalPostingTime
                      ? 'bg-indigo-600'
                      : 'bg-slate-200'
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform',
                      useAnalyticsOptimalPostingTime
                        ? 'translate-x-5'
                        : 'translate-x-0'
                    )}
                  />
                </button>
                <span className="text-sm font-medium text-slate-700">
                  {useAnalyticsOptimalPostingTime ? 'On' : 'Off'}
                </span>
              </div>
              {selectedPlatforms.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-sm text-slate-500">
                  Select at least one social platform on the AI Engine page
                  to see per-platform optimal posting times here.
                </div>
              ) : (
                <div
                  className={cn(
                    'grid gap-3',
                    selectedPlatforms.length === 1 && 'grid-cols-1',
                    selectedPlatforms.length === 2 &&
                      'grid-cols-1 sm:grid-cols-2',
                    selectedPlatforms.length === 3 &&
                      'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                  )}
                >
                  {selectedPlatforms.map((platform) => {
                    const state = platformOptimal[platform];
                    const Icon = PLATFORM_ICON[platform];
                    const accent = PLATFORM_ACCENT[platform];
                    const computedAtLabel = fmtTimestamp(
                      state.meta?.computedAt as TimestampInput,
                      { placeholder: '' }
                    );
                    const showRefresh = useAnalyticsOptimalPostingTime;
                    const disabledRefresh =
                      !state.connected || state.refreshing;

                    return (
                      <div
                        key={platform}
                        className={cn(
                          'flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow',
                          !state.connected && 'opacity-70'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'flex h-9 w-9 items-center justify-center rounded-xl ring-1',
                                accent.bg,
                                accent.text,
                                accent.ring
                              )}
                            >
                              <Icon className="h-4 w-4" />
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {PLATFORM_LABELS[platform]}
                              </p>
                              <p className="text-[11px] uppercase tracking-wide text-slate-400">
                                {state.connected ? 'Connected' : 'Not connected'}
                              </p>
                            </div>
                          </div>
                          {showRefresh && (
                            <button
                              type="button"
                              onClick={() => handleRefreshOptimal(platform)}
                              disabled={disabledRefresh}
                              aria-label={`Refresh ${PLATFORM_LABELS[platform]} optimal time`}
                              title={
                                state.connected
                                  ? 'Re-sync analytics and recompute'
                                  : `Connect ${PLATFORM_LABELS[platform]} to enable refresh`
                              }
                              className={cn(
                                'inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1',
                                disabledRefresh
                                  ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300'
                                  : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-300 hover:text-indigo-600'
                              )}
                            >
                              <RefreshCw
                                className={cn(
                                  'h-3.5 w-3.5',
                                  state.refreshing && 'animate-spin'
                                )}
                              />
                            </button>
                          )}
                        </div>

                        <div>
                          <p className="text-2xl font-semibold tabular-nums text-slate-900">
                            {state.hhmm ?? '—'}
                          </p>
                          {!state.connected ? (
                            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                              <Plug className="h-3 w-3" />
                              Connect on the social-media integration page.
                            </p>
                          ) : state.hhmm ? (
                            <p className="mt-1 text-xs text-slate-500">
                              {state.meta?.sampleSize
                                ? `From ${state.meta.sampleSize} posts`
                                : 'From recent posts'}
                              {state.meta?.source === 'ai_openai'
                                ? ' · AI picked'
                                : state.meta?.source === 'aggregated_posts'
                                  ? ' · Engagement-weighted'
                                  : ''}
                              {computedAtLabel
                                ? ` · ${computedAtLabel}`
                                : ''}
                            </p>
                          ) : (
                            <p className="mt-1 text-xs text-slate-500">
                              Needs at least 5 synced posts to recommend a time.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">
                Preferred Time
                <p className="text-xs text-slate-500 mb-3">
                  Fallback when analytics-based optimal time is off or
                  unavailable. Used for manual scheduling preferences. Times
                  are 24-hour and interpreted in your selected timezone above
                  (DST is applied automatically).
                </p>
              </label>
              {(() => {
                const { hour, minute } = splitPreferredTime(preferredTime);
                const commit = (h: string, m: string) => {
                  // Save once we have both hour and minute; otherwise just
                  // hold the partial selection in local state.
                  const next = h && m ? `${h}:${m}` : '';
                  setPreferredTime(next);
                  if (h && m) {
                    handleSubmit(
                      logoPreference,
                      emojiUsage,
                      socialSalesEmailUsage,
                      needApproval,
                      timeZone,
                      captionObject,
                      next
                    );
                  }
                };
                return (
                  <div
                    className="flex items-center gap-2"
                    role="group"
                    aria-label="Preferred time (24-hour)"
                  >
                    <Select
                      value={hour}
                      onValueChange={(h) => commit(h, minute)}
                    >
                      <SelectTrigger
                        className="flex-1 tabular-nums"
                        aria-label="Hour (00–23)"
                      >
                        <SelectValue placeholder="HH" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {HOURS_24.map((h) => (
                          <SelectItem
                            key={h}
                            value={h}
                            className="tabular-nums"
                          >
                            {h}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span
                      aria-hidden
                      className="text-slate-500 font-semibold select-none"
                    >
                      :
                    </span>
                    <Select
                      value={minute}
                      onValueChange={(m) => commit(hour, m)}
                    >
                      <SelectTrigger
                        className="flex-1 tabular-nums"
                        aria-label="Minute (00–59)"
                      >
                        <SelectValue placeholder="MM" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {MINUTES_60.map((m) => (
                          <SelectItem
                            key={m}
                            value={m}
                            className="tabular-nums"
                          >
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-slate-400 ml-1 hidden sm:inline">
                      24h
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
