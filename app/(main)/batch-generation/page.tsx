'use client';

import { useAuth } from '@/src/hooks/useAuth';
import Link from 'next/link';
import { DownloadPngButton } from '@/components/download-png-button';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  CalendarCheck2,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { addDays, format, startOfToday } from 'date-fns';
import {
  generateInstantPostsBatchApi,
  getAiEngineDateStatusApi,
  type AiEngineDateStatusRow,
  type BatchDayResult,
  type InstantGenerationPlatform,
} from '@/src/service/api/instant-generation.service';
import { useUserPlanCredits } from '../_components/UserPlanCreditsProvider';

const MAX_DATES = 5;
const DATE_WINDOW_DAYS = 45;

const PLATFORM_ORDER = ['instagram', 'facebook', 'linkedin'] as const;

const PLATFORMS: {
  id: InstantGenerationPlatform;
  label: string;
  hint: string;
}[] = [
  {
    id: 'instagram',
    label: 'Instagram',
    hint: 'Square-friendly visuals and punchy captions.',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    hint: 'Conversational tone with room for longer copy.',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    hint: 'Professional, insight-led hooks.',
  },
];

export default function BatchGenerationPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [selectedByPlatform, setSelectedByPlatform] = useState<
    Record<InstantGenerationPlatform, string[]>
  >({
    instagram: [],
    facebook: [],
    linkedin: [],
  });
  const [generatingByPlatform, setGeneratingByPlatform] = useState<
    Partial<Record<InstantGenerationPlatform, boolean>>
  >({});
  const [errorsByPlatform, setErrorsByPlatform] = useState<
    Partial<Record<InstantGenerationPlatform, string>>
  >({});
  const [batchResultsByPlatform, setBatchResultsByPlatform] = useState<
    Partial<Record<InstantGenerationPlatform, BatchDayResult[]>>
  >({});
  const [statusByPlatform, setStatusByPlatform] = useState<
    Partial<Record<InstantGenerationPlatform, AiEngineDateStatusRow[]>>
  >({});
  const [statusLoadingByPlatform, setStatusLoadingByPlatform] = useState<
    Partial<Record<InstantGenerationPlatform, boolean>>
  >({});
  const [activePreviewDateByPlatform, setActivePreviewDateByPlatform] = useState<
    Partial<Record<InstantGenerationPlatform, string | null>>
  >({
    instagram: null,
    facebook: null,
    linkedin: null,
  });
  const { billing, loading: creditsLoading } = useUserPlanCredits();
  const selectedAccounts = billing?.selected;
  const planExpiresAt = billing?.planExpiresAt;

  const hasSelectablePlatforms = useMemo(() => {
    return PLATFORM_ORDER.some((p) => !!selectedAccounts?.[p]);
  }, [selectedAccounts]);

  const selectedPlatforms = useMemo(() => {
    return PLATFORM_ORDER.filter((p) => !!selectedAccounts?.[p]);
  }, [selectedAccounts]);

  /** Connected / plan-selected cards first; upgrade prompts last. */
  const platformsForDisplay = useMemo(() => {
    const connected = PLATFORMS.filter((m) => !!selectedAccounts?.[m.id]);
    const unconnected = PLATFORMS.filter((m) => !selectedAccounts?.[m.id]);
    return [...connected, ...unconnected];
  }, [selectedAccounts]);

  const showSelectAccountsFirst =
    !creditsLoading && billing != null && !hasSelectablePlatforms;

  const todayStart = useMemo(() => startOfToday(), []);
  const planExpiresAtDate = useMemo(() => {
    if (!planExpiresAt) return undefined;
    return new Date(
      planExpiresAt.seconds * 1000 + planExpiresAt.nanoseconds / 1e6
    );
  }, [planExpiresAt]);

  const dateKeys = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < DATE_WINDOW_DAYS; i += 1) {
      const d = addDays(todayStart, i);
      if (planExpiresAtDate && d > planExpiresAtDate) break;
      out.push(format(d, 'yyyy-MM-dd'));
    }
    return out;
  }, [todayStart, planExpiresAtDate]);

  const fetchStatusForPlatform = useCallback(
    async (platform: InstantGenerationPlatform) => {
      if (!user?.uid || dateKeys.length === 0) return;
      try {
        setStatusLoadingByPlatform((prev) => ({ ...prev, [platform]: true }));
        const rows = await getAiEngineDateStatusApi({
          userId: user.uid,
          dates: dateKeys,
          platform,
          includePostPreview: true,
        });
        setStatusByPlatform((prev) => ({ ...prev, [platform]: rows }));
      } finally {
        setStatusLoadingByPlatform((prev) => ({ ...prev, [platform]: false }));
      }
    },
    [user?.uid, dateKeys]
  );

  useEffect(() => {
    if (!user?.uid || dateKeys.length === 0) return;
    let cancelled = false;
    const loadingMap: Partial<Record<InstantGenerationPlatform, boolean>> = {};
    PLATFORM_ORDER.forEach((p) => {
      loadingMap[p] = selectedPlatforms.includes(p);
    });
    setStatusLoadingByPlatform(loadingMap);

    if (selectedPlatforms.length === 0) {
      setStatusByPlatform({});
      setStatusLoadingByPlatform({
        instagram: false,
        facebook: false,
        linkedin: false,
      });
      return;
    }

    (async () => {
      try {
        const rows = await Promise.all(
          selectedPlatforms.map((platform) =>
            getAiEngineDateStatusApi({
              userId: user.uid,
              dates: dateKeys,
              platform,
              includePostPreview: true,
            })
          )
        );
        if (cancelled) return;
        const next: Partial<Record<InstantGenerationPlatform, AiEngineDateStatusRow[]>> = {};
        selectedPlatforms.forEach((p, i) => {
          next[p] = rows[i];
        });
        setStatusByPlatform((prev) => {
          const merged = { ...prev };
          PLATFORM_ORDER.forEach((p) => {
            if (!selectedPlatforms.includes(p)) delete merged[p];
          });
          return { ...merged, ...next };
        });
      } catch {
        if (!cancelled) setStatusByPlatform({});
      } finally {
        if (!cancelled) {
          setStatusLoadingByPlatform({
            instagram: false,
            facebook: false,
            linkedin: false,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, dateKeys, selectedPlatforms]);

  const toggleDate = useCallback(
    (platform: InstantGenerationPlatform, dateKey: string) => {
      const platformRows = statusByPlatform[platform] || [];
      const isBlocked = platformRows.some((r) => r.date === dateKey && r.exists);
      if (isBlocked) return;
      setSelectedByPlatform((prev) => {
        const current = prev[platform] || [];
        if (current.includes(dateKey)) {
          return { ...prev, [platform]: current.filter((d) => d !== dateKey) };
        }
        if (current.length >= MAX_DATES) return prev;
        return { ...prev, [platform]: [...current, dateKey].sort() };
      });
      setErrorsByPlatform((prev) => ({ ...prev, [platform]: '' }));
    },
    [statusByPlatform]
  );

  const handleGenerateForPlatform = useCallback(
    async (platform: InstantGenerationPlatform) => {
      setErrorsByPlatform((prev) => ({ ...prev, [platform]: '' }));
      setBatchResultsByPlatform((prev) => ({ ...prev, [platform]: [] }));
      const selectedDates = selectedByPlatform[platform] || [];
      if (!user?.uid) {
        setErrorsByPlatform((prev) => ({
          ...prev,
          [platform]: 'You must be signed in to generate posts.',
        }));
        return;
      }
      if (!selectedDates.length) {
        setErrorsByPlatform((prev) => ({
          ...prev,
          [platform]: `Select at least one day (up to ${MAX_DATES}).`,
        }));
        return;
      }
      try {
        setGeneratingByPlatform((prev) => ({ ...prev, [platform]: true }));
        const out = await generateInstantPostsBatchApi({
          userId: user.uid,
          platform,
          dates: selectedDates,
        });
        const finalResults = (out?.batch || []) as BatchDayResult[];
        setBatchResultsByPlatform((prev) => ({ ...prev, [platform]: finalResults }));
        setSelectedByPlatform((prev) => ({ ...prev, [platform]: [] }));
        await fetchStatusForPlatform(platform);
      } catch (e: any) {
        setErrorsByPlatform((prev) => ({
          ...prev,
          [platform]:
            e?.response?.data?.message || e.message || 'Something went wrong.',
        }));
      } finally {
        setGeneratingByPlatform((prev) => ({ ...prev, [platform]: false }));
      }
    },
    [selectedByPlatform, user?.uid, fetchStatusForPlatform]
  );

  if (authLoading) {
    return (
      <div className="mx-auto flex min-h-[40vh] max-w-6xl items-center justify-center pb-20">
        <Loader2
          className="h-10 w-10 animate-spin text-indigo-600"
          aria-hidden
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg animate-in fade-in duration-500 pb-20">
        <div className="glass-card rounded-3xl p-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Batch post generator
          </h1>
          <p className="mt-3 text-slate-600 leading-relaxed">
            Sign in to draft and schedule multiple days of content for your
            connected accounts.
          </p>
          <button
            type="button"
            onClick={() => router.push('/sign-in')}
            className="mt-6 w-full rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 sm:w-auto"
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  if (billing?.activePlan === 'non-subscribed') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center animate-in fade-in duration-500 pb-20 px-4 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          <span className="block">You are not eligible for this feature.</span>
          <span className="block">
            Please subscribe to a plan to use this feature.
          </span>
        </h1>
        <p className="mt-3 max-w-xl text-base text-slate-600">
          You can subscribe to a plan{' '}
          <Link
            href="/settings/billings"
            className="font-semibold text-indigo-600 underline underline-offset-2 hover:text-indigo-700"
          >
            here
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in duration-500 pb-20 px-2">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Batch post generator
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
          Pick up to {MAX_DATES} days per platform. We use your{' '}
          <Link
            href="/template-dna"
            className="font-semibold text-indigo-600 underline-offset-2 hover:underline"
          >
            brand profile
          </Link>{' '}
          and posting preferences to create each post and add it to your queue
          automatically.
        </p>
      </header>

      <p className="mt-2 text-xs text-slate-500">
        Green dates already have an AI-generated post for that specific platform and cannot be selected again.
      </p>
      <div className="mt-6 grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        {platformsForDisplay.map((meta) => {
          const platform = meta.id;
          const selected = selectedByPlatform[platform] || [];
          const rows = statusByPlatform[platform] || [];
          const generatedRows = rows.filter((r) => r.exists);
          const activePreviewDate = activePreviewDateByPlatform[platform] || null;
          const activePreviewRow = generatedRows.find((r) => r.date === activePreviewDate);
          const selectedSet = new Set(selected);
          const blockedSet = new Set(generatedRows.map((r) => r.date));
          const openDatesCount = dateKeys.filter((d) => !blockedSet.has(d)).length;
          const connected = !!selectedAccounts?.[platform];
          const isGenerating = !!generatingByPlatform[platform];
          const statusLoading = !!statusLoadingByPlatform[platform];
          const platformError = errorsByPlatform[platform];
          const justGenerated = batchResultsByPlatform[platform] || [];

          return (
            <section
              key={platform}
              className="glass-card rounded-3xl p-5 sm:p-6 flex flex-col gap-4"
            >
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{meta.label}</h2>
                <p className="mt-1 text-xs text-slate-500">{meta.hint}</p>
              </div>

              {!connected ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 leading-relaxed">
                  Connect this platform in social settings to enable generation.{' '}
                  <Link
                    href="/settings/billings"
                    className="font-semibold text-indigo-700 underline underline-offset-2 hover:text-indigo-800"
                  >
                    Upgrade your plan
                  </Link>{' '}
                  to add this platform.
                </div>
              ) : (
                <>
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Dates ({selected.length}/{MAX_DATES} selected)
                  </p>
                  <span className="text-[11px] text-emerald-700 font-medium">
                    Green = already generated
                  </span>
                </div>
                {statusLoading ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-2 text-xs text-indigo-900 animate-pulse">
                      Finding occupied dates for {meta.label}...
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from({ length: 9 }).map((_, idx) => (
                        <div
                          key={`${platform}-skeleton-${idx}`}
                          className="h-14 rounded-lg border border-slate-200 bg-slate-100 animate-pulse"
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {dateKeys.map((dateKey) => {
                      const blocked = blockedSet.has(dateKey);
                      const selectedDate = selectedSet.has(dateKey);
                      const previewing = blocked && activePreviewDate === dateKey;
                      return (
                        <button
                          key={`${platform}-${dateKey}`}
                          type="button"
                          disabled={!connected || isGenerating}
                          onClick={() => {
                            if (blocked) {
                              setActivePreviewDateByPlatform((prev) => ({
                                ...prev,
                                [platform]: prev[platform] === dateKey ? null : dateKey,
                              }));
                              return;
                            }
                            toggleDate(platform, dateKey);
                          }}
                          className={[
                            'rounded-lg border px-2 py-2 text-center text-xs font-semibold transition',
                            blocked
                              ? previewing
                                ? 'border-emerald-700 bg-emerald-200 text-emerald-950'
                                : 'border-emerald-300 bg-emerald-100 text-emerald-800'
                              : selectedDate
                                ? 'border-indigo-500 bg-indigo-600 text-white'
                                : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100',
                          ].join(' ')}
                        >
                          <span className="block">{format(new Date(`${dateKey}T12:00:00`), 'MMM d')}</span>
                          <span className="block text-[10px] opacity-75">
                            {format(new Date(`${dateKey}T12:00:00`), 'EEE')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={
                  !connected ||
                  isGenerating ||
                  selected.length === 0 ||
                  openDatesCount === 0
                }
                onClick={() => void handleGenerateForPlatform(platform)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" aria-hidden />
                    Generate {selected.length || 0} day{selected.length === 1 ? '' : 's'}
                  </>
                )}
              </button>
              {connected && !statusLoading && openDatesCount === 0 && (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                  All visible dates already have generated posts for this platform.
                </p>
              )}

              {platformError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                  {platformError}
                </div>
              )}

              {justGenerated.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-700 mb-2">Latest run</p>
                  <div className="space-y-2">
                    {justGenerated.map((r) => (
                      <div key={`${platform}-${r.date}`} className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-800">
                          {format(new Date(`${r.date}T12:00:00`), 'EEE, MMM d')}
                        </span>
                        {r.success ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                            <Check className="h-3 w-3" />
                            Scheduled
                          </span>
                        ) : (
                          <span className="text-red-700 font-semibold">Failed</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  Generated preview
                </p>
                {!activePreviewRow ? (
                  <p className="text-xs text-slate-500">
                    Click a green date to view the generated post for that day.
                  </p>
                ) : (
                  <article className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-emerald-900">
                        {format(new Date(`${activePreviewRow.date}T12:00:00`), 'EEEE, MMM d')}
                      </p>
                      <span className="text-[10px] font-mono text-emerald-800">
                        {activePreviewRow.scheduledPostId?.slice(0, 8)}
                      </span>
                    </div>
                    {activePreviewRow.post?.imageUrl ? (
                      <img
                        src={activePreviewRow.post.imageUrl}
                        alt={`${meta.label} generated post ${activePreviewRow.date}`}
                        className="mt-2 h-28 w-full rounded-lg object-cover"
                      />
                    ) : null}
                    {activePreviewRow.post?.imageUrl ? (
                      <div className="flex flex-col sm:flex-row gap-4 mt-3">
                        <DownloadPngButton
                          url={activePreviewRow.post.imageUrl}
                          getFilename={() =>
                            `batch-${platform}-${activePreviewRow.date}-${Date.now()}.png`
                          }
                        />
                      </div>
                    ) : null}
                    <p className="mt-2 text-xs text-slate-700 line-clamp-3">
                      {activePreviewRow.post?.message?.trim() || 'Caption unavailable'}
                    </p>
                  </article>
                )}
              </div>
                </>
              )}
            </section>
          );
        })}
      </div>

      {showSelectAccountsFirst && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          Select your platform accounts first in{' '}
          <Link href="/social-media-integration" className="font-semibold underline">
            social setup
          </Link>{' '}
          to enable batch generation.
        </div>
      )}

      <Link
        href="/scheduled-post"
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
      >
        <CalendarCheck2 className="h-4 w-4" aria-hidden />
        View scheduled posts
      </Link>
    </div>
  );
}
