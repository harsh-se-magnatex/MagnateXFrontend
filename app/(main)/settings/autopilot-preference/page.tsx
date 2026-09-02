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
  Phone,
} from 'lucide-react';
import { toast } from 'sonner';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { workspacePageTitleClass } from '@/lib/workspace-ui';

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
  return LOGO_CORNER_PREFERENCES.includes(
    v as (typeof LOGO_CORNER_PREFERENCES)[number]
  )
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
  'w-full rounded-xl border border-default bg-element px-4 py-3 text-default focus:border-primary-purple focus:outline-none focus:ring-2 focus:ring-strong transition-expo';

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
    bg: 'bg-info',
    text: 'text-info',
    ring: 'ring-[var(--border-info)]',
  },
  instagram: {
    bg: 'bg-preview',
    text: 'text-preview',
    ring: 'ring-[var(--border-preview)]',
  },
  linkedin: {
    bg: 'bg-info',
    text: 'text-info',
    ring: 'ring-[var(--border-info)]',
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
  const [socialSalesContactUsage, setSocialSalesContactUsage] = useState(true);
  const [needApproval, setNeedApproval] = useState(true);
  const [timeZone, setTimeZone] = useState('');
  const [preferredTime, setPreferredTime] = useState(
    DEFAULT_PREFERRED_POSTING_TIME
  );
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
            response.data.preferences.captionLengths || {
              instagram: '',
              facebook: '',
              linkedin: '',
            }
          );
          setSocialSalesEmailUsage(
            response.data.preferences.socialSalesEmailUsage ?? true
          );
          setSocialSalesContactUsage(
            response.data.preferences.socialSalesContactUsage ?? true
          );
          setNeedApproval(response.data.preferences.approvalMode === 'manual');
          setTimeZone(response.data.preferences.timeZone || 'Asia/Calcutta');
          setPreferredTime(
            normalizePreferredPostingTime(
              response.data.preferences.preferredTime
            )
          );
          setUseAnalyticsOptimalPostingTime(
            response.data.preferences.analyticsOptimalPosting === true
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
                meta:
                  (prefs[PLATFORM_META_KEYS[p]] as OptimalPostingMeta) ?? null,
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
      const flag = prefs.analyticsOptimalPosting;
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
              ? optimal.source === 'exploration'
                ? `${PLATFORM_LABELS[platform]} next posting time: ${optimal.hhmm}.`
                : `${PLATFORM_LABELS[platform]} optimal time refreshed to ${optimal.hhmm}.`
              : `${PLATFORM_LABELS[platform]} is still gathering posts — the next scheduled posts will try different times until we have 5.`
          );
        } else {
          throw new Error('Refresh failed');
        }
      } catch (err) {
        setPlatformOptimal((prev) => ({
          ...prev,
          [platform]: { ...prev[platform], refreshing: false },
        }));
        showErrorToast(
          'Failed to refresh optimal time. Please Try Again Later.'
        );
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
    currentSalesContactUsage = socialSalesContactUsage,
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
        currentSalesContactUsage,
        currentCaptionObject,
        currentApproval ? 'manual' : 'auto',
        curentTimeZone,
        normalizePreferredPostingTime(currentPreferredTime),
        currentUseAnalyticsOptimalPostingTime
      );
      // Per-platform optimal-time fields update live via the Firestore
      // subscription above, no need to re-fetch here.
    } catch (error: unknown) {
      showErrorToast('Failed to update preferences. Please Try Again Later.');
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
        <h1 className={workspacePageTitleClass}>AI Manager Preferences</h1>
        <p className="mt-2 text-sm text-secondary">
          Configure how SocioGenie generated content behaves, default languages,
          and auto-posting rules.
        </p>
      </div>

      <div className="space-y-8">
        {/* Language & Output Section */}
        <section className="glass-card rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6 border-b border-default pb-4">
            <div className="p-2 bg-primary-purple/10 rounded-lg text-preview">
              <Bot className="h-5 w-5" />
            </div>
            <h2 className="text-section text-default">AI Output Settings</h2>
          </div>

          <div className="flex sm:flex-row-reverse flex-col-reverse gap-4 justify-between">
            <div>
              <label className="text-sm font-semibold text-default block mb-2">
                Emoji Usage
              </label>
              <p className="text-xs text-secondary mb-3">
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
                      socialSalesContactUsage,
                      needApproval,
                      timeZone,
                      captionObject,
                      preferredTime
                    );
                  }}
                  className={cn(
                    'relative inline-flex h-7 w-12 shrink-0 rounded-full transition-expo border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-primary-purple focus:ring-offset-2',
                    emojiUsage ? 'bg-primary-purple' : 'bg-element'
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none inline-block h-6 w-6 transform rounded-full bg-default transition-transform',
                      emojiUsage ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
                <span className="text-sm font-medium text-default">
                  {emojiUsage ? 'Enabled' : 'Disabled'}
                </span>
                <Smile
                  className={cn(
                    'h-4 w-4 ml-1',
                    emojiUsage ? 'text-preview' : 'text-secondary'
                  )}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-default block mb-2">
                Logo Preference
              </label>
              <p className="text-xs text-secondary mb-3">
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
                      socialSalesContactUsage,
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
                      <SelectItem value="bottom-center">
                        Bottom Center
                      </SelectItem>
                      <SelectItem value="bottom-right">Bottom Right</SelectItem>
                    </SelectContent>
                  </SelectTrigger>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex justify-between">
            <div className="mt-8">
              <label className="text-sm font-semibold text-default block mb-2">
                Social Sales Email Usage
              </label>
              <p className="text-xs text-secondary mb-3">
                Include your social sales email in the generated captions
                automatically.
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
                      socialSalesContactUsage,
                      needApproval,
                      timeZone,
                      captionObject,
                      preferredTime
                    );
                  }}
                  className={cn(
                    'relative inline-flex h-7 w-12 shrink-0 rounded-full transition-expo border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-primary-purple focus:ring-offset-2',
                    socialSalesEmailUsage ? 'bg-primary-purple' : 'bg-element'
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none inline-block h-6 w-6 transform rounded-full bg-default transition-transform',
                      socialSalesEmailUsage ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
                <span className="text-sm font-medium text-default">
                  {socialSalesEmailUsage ? 'Enabled' : 'Disabled'}
                </span>
                <Mail
                  className={cn(
                    'h-4 w-4 ml-1',
                    socialSalesEmailUsage ? 'text-preview' : 'text-secondary'
                  )}
                />
              </div>
            </div>
            <div className="mt-8">
              <label className="text-sm font-semibold text-default block mb-2">
                Social Sales Contact Usage
              </label>
              <p className="text-xs text-secondary mb-3">
                Include your social sales contact number in the generated
                captions automatically.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={socialSalesContactUsage}
                  onClick={() => {
                    const newValue = !socialSalesContactUsage;
                    setSocialSalesContactUsage(newValue);
                    handleSubmit(
                      logoPreference,
                      emojiUsage,
                      socialSalesEmailUsage,
                      newValue,
                      needApproval,
                      timeZone,
                      captionObject,
                      preferredTime
                    );
                  }}
                  className={cn(
                    'relative inline-flex h-7 w-12 shrink-0 rounded-full transition-expo border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-primary-purple focus:ring-offset-2',
                    socialSalesContactUsage ? 'bg-primary-purple' : 'bg-element'
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none inline-block h-6 w-6 transform rounded-full bg-default transition-transform',
                      socialSalesContactUsage
                        ? 'translate-x-5'
                        : 'translate-x-0'
                    )}
                  />
                </button>
                <span className="text-sm font-medium text-default">
                  {socialSalesContactUsage ? 'Enabled' : 'Disabled'}
                </span>
                <Phone
                  className={cn(
                    'h-4 w-4 ml-1',
                    socialSalesEmailUsage ? 'text-preview' : 'text-secondary'
                  )}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Content Length Section */}
        <section className="glass-card rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6 border-b border-default pb-4">
            <div className="p-2 bg-preview rounded-lg text-preview">
              <Type className="h-5 w-5" />
            </div>
            <h2 className="text-section text-default">Caption Length</h2>
          </div>

          <p className="text-sm text-secondary mb-5">
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
                      socialSalesContactUsage,
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
                    'flex-1 rounded-full border px-6 py-4 text-center transition-expo bg-default relative overflow-hidden',
                    isSelected
                      ? 'border-primary ring-1 ring-primary'
                      : 'border-default hover:border-default hover:bg-hover'
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-0 inset-x-0 h-1 bg-primary-purple" />
                  )}
                  <span
                    className={cn(
                      'block text-sm font-bold capitalize',
                      isSelected ? 'text-link' : 'text-default'
                    )}
                  >
                    {len.id}
                  </span>
                  <span className="block mt-1 text-xs text-secondary">
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
                      socialSalesContactUsage,
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
                    'flex-1 rounded-full border px-6 py-4 text-center transition-expo bg-default relative overflow-hidden',
                    isSelected
                      ? 'border-primary ring-1 ring-primary'
                      : 'border-default hover:border-default hover:bg-hover'
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-0 inset-x-0 h-1 bg-primary-purple" />
                  )}
                  <span
                    className={cn(
                      'block text-sm font-bold capitalize',
                      isSelected ? 'text-link' : 'text-default'
                    )}
                  >
                    {len.id}
                  </span>
                  <span className="block mt-1 text-xs text-secondary">
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
                      socialSalesContactUsage,
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
                    'flex-1 rounded-full border px-6 py-4 text-center transition-expo bg-default relative overflow-hidden',
                    isSelected
                      ? 'border-primary ring-1 ring-primary'
                      : 'border-default hover:border-default hover:bg-hover'
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-0 inset-x-0 h-1 bg-primary-purple" />
                  )}
                  <span
                    className={cn(
                      'block text-sm font-bold capitalize',
                      isSelected ? 'text-link' : 'text-default'
                    )}
                  >
                    {len.id}
                  </span>
                  <span className="block mt-1 text-xs text-secondary">
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
          <div className="flex items-center gap-3 mb-6 border-b border-default pb-4">
            <div className="p-2 bg-success rounded-lg text-success">
              <CheckSquare className="h-5 w-5" />
            </div>
            <h2 className="text-section text-default">
              Approval Workflow & Scheduling
            </h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-default block mb-2">
                Post Approval Mode
              </label>
              <p className="text-xs text-secondary mb-4">
                In{' '}
                <span className="font-semibold text-default">Auto Approve</span>
                , posts are reviewed by an admin and published automatically
                without your input. With{' '}
                <span className="font-semibold text-default">
                  Manual Review
                </span>
                , every post must be reviewed and approved by you before it can
                be published.
              </p>
              <div className="flex rounded-xl bg-element p-1 border border-default">
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
                        socialSalesContactUsage,
                        true,
                        timeZone,
                        captionObject,
                        preferredTime
                      );
                    }}
                    className={cn(
                      'w-full rounded-full py-2.5 text-sm font-semibold transition-expo',
                      needApproval === true
                        ? 'bg-success text-default/90 ring-1 ring-border'
                        : 'text-secondary hover:text-default hover:bg-hover'
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
                        socialSalesContactUsage,
                        false,
                        timeZone,
                        captionObject,
                        preferredTime
                      );
                    }}
                    className={cn(
                      'w-full rounded-full py-2.5 text-sm font-semibold transition-expo',
                      needApproval === false
                        ? 'bg-success text-default/90 ring-1 ring-[var(--border-success)]'
                        : 'text-secondary hover:text-default hover:bg-hover'
                    )}
                  >
                    Auto Approve
                  </button>
                </UpgradeGate>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-secondary" />
                <label className="text-sm font-semibold text-default block">
                  Default Timezone
                </label>
              </div>
              <p className="text-xs text-secondary mb-3">
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
                    socialSalesContactUsage,
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
              <label className="text-sm font-semibold text-default block mb-2">
                Analytics-based optimal posting time
              </label>
              <p className="text-xs text-secondary mb-3">
                When enabled, AI-engine scheduled posts use your best posting
                hour derived from synced social analytics. With fewer than 5
                synced posts, the first posts try different times of day (e.g.
                1:30am, 8:30am, noon, 5pm, 9pm) so we can learn what works —
                then we recommend an hour and refine at :15 / :30 / :45. Your
                preferred time below is used when this is off.
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
                      socialSalesContactUsage,
                      needApproval,
                      timeZone,
                      captionObject,
                      preferredTime,
                      newValue
                    );
                  }}
                  className={cn(
                    'relative inline-flex h-7 w-12 shrink-0 rounded-full transition-expo border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-primary-purple focus:ring-offset-2',
                    useAnalyticsOptimalPostingTime
                      ? 'bg-primary-purple'
                      : 'bg-element'
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none inline-block h-6 w-6 transform rounded-full bg-default transition-transform',
                      useAnalyticsOptimalPostingTime
                        ? 'translate-x-5'
                        : 'translate-x-0'
                    )}
                  />
                </button>
                <span className="text-sm font-medium text-default">
                  {useAnalyticsOptimalPostingTime ? 'On' : 'Off'}
                </span>
              </div>
              {selectedPlatforms.length === 0 ? (
                <div className="rounded-xl border border-dashed border-default bg-element px-4 py-6 text-center text-sm text-secondary">
                  Select at least one social platform on the AI Manager page to
                  see per-platform optimal posting times here.
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
                          'flex flex-col gap-3 rounded-2xl border border-default bg-default p-4 transition-',
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
                              <p className="text-sm font-semibold text-default">
                                {PLATFORM_LABELS[platform]}
                              </p>
                              <p className="text-[11px] uppercase tracking-wide text-secondary">
                                {state.connected
                                  ? 'Connected'
                                  : 'Not connected'}
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
                                'inline-flex h-8 w-8 items-center justify-center rounded-full border transition-expo focus:outline-none focus:ring-2 focus:ring-primary-purple focus:ring-offset-1',
                                disabledRefresh
                                  ? 'cursor-not-allowed border-default bg-element text-secondary/50'
                                  : 'border-default bg-default text-secondary hover:border-strong hover:text-preview'
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
                          <p className="text-2xl font-semibold tabular-nums text-default">
                            {state.hhmm ?? '—'}
                          </p>
                          {!state.connected ? (
                            <p className="mt-1 flex items-center gap-1 text-xs text-secondary">
                              <Plug className="h-3 w-3" />
                              Connect on the social-media integration page.
                            </p>
                          ) : state.hhmm ? (
                            <p className="mt-1 text-xs text-secondary">
                              {state.meta?.source === 'exploration'
                                ? `Next posting time`
                                : state.meta?.source === 'refining'
                                  ? 'Refining minute within the best hour'
                                  : state.meta?.sampleSize
                                    ? `From ${state.meta.sampleSize} posts`
                                    : 'From recent posts'}
                              {state.meta?.source === 'ai_openai'
                                ? ' · AI picked'
                                : state.meta?.source === 'aggregated_posts'
                                  ? ' · Engagement-weighted'
                                  : state.meta?.source === 'exploration'
                                    ? ''
                                    : state.meta?.source === 'refining'
                                      ? ' · Quarter-hour probe'
                                      : ''}
                            </p>
                          ) : (
                            <p className="mt-1 text-xs text-secondary">
                              Refresh to load the next warmup posting time, or
                              wait for the next scheduled post.
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
              <label className="text-sm font-semibold text-default block mb-2">
                Preferred Time
                <p className="text-xs text-secondary mb-3">
                  Fallback when analytics-based optimal time is off or
                  unavailable. Used for manual scheduling preferences. Times are
                  24-hour and interpreted in your selected timezone above (DST
                  is applied automatically).
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
                      socialSalesContactUsage,
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
                      className="text-secondary font-semibold select-none"
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
                    <span className="text-xs text-secondary ml-1 hidden sm:inline">
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
