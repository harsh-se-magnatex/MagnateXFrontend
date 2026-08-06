'use client';

import { createAutomatedPost } from '@/src/service/api/social.servce';
import { waitForParentJobDocs } from '@/src/lib/wait-for-parent-job';
import { useEffect, useMemo, useState } from 'react';
import {
  useFestivePostState,
  type FestiveEventItem,
} from '@/src/stores/festivePostState';
import {
  Zap,
  CheckCircle2,
  Edit2,
  Trash2,
  Save,
  X,
  CalendarDays,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  WORKSPACE_NAV_HREFS,
  workspacePageTitle,
} from '@/lib/workspace-nav';
import { motion, AnimatePresence } from 'framer-motion';
import { getTodatDate } from '@/utils/getTodayDate';
import { EVENTS, isFestiveDateWithinPlanRange } from './events';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserPlanCredits } from '../_components/UserPlanCreditsProvider';
import { useTimestampFormatter } from '@/lib/user-timezone';
import Link from 'next/link';
import { showErrorToast } from '@/lib/show-error-toast';
import { auth } from '@/lib/firebase';
import { PageLoadingState } from '@/components/shared/PageLoadingState';
import { NonSubscribedFeatureBlock } from '@/components/shared/NonSubscribedFeatureBlock';
import { isPlanInactive } from '@/lib/plan-access';
import {
  allPlatformsSelectionLabel,
  areAllEnabledSelected,
  listEnabledPlatforms,
  togglePlatformSelection,
  validateGenerationPlatformSelection,
} from '@/lib/platform-selection';
import type { SocialPlatform } from '@/src/stores/festivePostState';
import { useTourDemo } from '@/src/stores/tourState';
import { toast } from 'sonner';

const CREDIT_PER_EVENT = 2;

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

export default function AutomatedPostPage() {
  // Transient-only UI state.
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editReason, setEditReason] = useState('');

  // Session state: in-memory Zustand, survives SPA navigation within the tab.
  const selected = useFestivePostState((s) => s.selected);
  const toggleSelected = useFestivePostState((s) => s.toggleSelected);
  const clearSelected = useFestivePostState((s) => s.clearSelected);
  const customEvents = useFestivePostState((s) => s.customEvents);
  const addCustomEvent = useFestivePostState((s) => s.addCustomEvent);
  const updateCustomEvent = useFestivePostState((s) => s.updateCustomEvent);
  const removeCustomEvent = useFestivePostState((s) => s.removeCustomEvent);
  const search = useFestivePostState((s) => s.search);
  const setSearch = useFestivePostState((s) => s.setSearch);
  const genPlatforms = useFestivePostState((s) => s.genPlatforms);
  const setGenPlatforms = useFestivePostState((s) => s.setGenPlatforms);
  const isSubmitting = useFestivePostState((s) => s.isSubmitting);
  const setIsSubmitting = useFestivePostState((s) => s.setIsSubmitting);

  const formattedToday = getTodatDate();
  const { billing, loading: planCreditsLoading } = useUserPlanCredits();
  const fmtTimestamp = useTimestampFormatter();
  const isTourDemo = useTourDemo();
  const userCredits = billing?.credits ?? 0;
  const selectedAccounts = billing?.selected;
  const planExpiresAt = billing?.planExpiresAt;
  const formattedPlanExpiresAt = planExpiresAt
    ? fmtTimestamp(planExpiresAt)
    : '—';
  const planExpiresYmd = planExpiresAt
    ? fmtTimestamp(planExpiresAt, { format: 'yyyy-MM-dd' })
    : null;

  const builtInEvents = useMemo<FestiveEventItem[]>(
    () =>
      EVENTS.filter((event) =>
        isFestiveDateWithinPlanRange(
          event.date,
          formattedToday,
          planExpiresYmd
        )
      ).map(({ id, name, date, description, reason }) => ({
        id,
        name,
        date,
        description,
        reason,
      })),
    [formattedToday, planExpiresYmd]
  );
  const hasSelectablePlatforms = useMemo(
    () => isTourDemo || !!firstEnabledPlatform(selectedAccounts),
    [selectedAccounts, isTourDemo]
  );

  const showSelectAccountsFirst =
    !isTourDemo &&
    !planCreditsLoading &&
    billing != null &&
    !hasSelectablePlatforms;

  useEffect(() => {
    if (planCreditsLoading) return;
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
  }, [selectedAccounts, genPlatforms, setGenPlatforms, planCreditsLoading]);

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

  const allPlatformsSelected = areAllEnabledSelected(
    genPlatforms,
    allowedPlatforms
  );

  const platformCount = Math.max(genPlatforms.length, 0);
  const totalCost = selected.length * CREDIT_PER_EVENT * platformCount;
  const insufficientCredits =
    platformCount > 0 &&
    selected.length > 0 &&
    userCredits < totalCost;

  const canSubmit =
    selected.length > 0 &&
    !isSubmitting &&
    !planCreditsLoading &&
    platformSelection.ok &&
    !insufficientCredits;

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

  const handleToggle = (eventId: string) => toggleSelected(eventId);

  const handleSubmit = async () => {
    if (isTourDemo) return;
    if (planCreditsLoading || isSubmitting) return;
    const cost = selected.length * CREDIT_PER_EVENT * genPlatforms.length;
    if (cost > userCredits) {
      setMessage('Not enough credits. Please top up your account.');
      setTimeout(() => setMessage(''), 5000);
      return;
    }
    const eventMap = new Map(
      allEvents.map((event) => [event.id, event])
    );
    const selectedEvents = selected
      .map((id) => eventMap.get(id))
      .filter((event): event is FestiveEventItem => !!event)
      .filter((event) =>
        isFestiveDateWithinPlanRange(
          event.date,
          formattedToday,
          planExpiresYmd
        )
      )
      .map((event) => ({
        id: event.id,
        name: event.name,
        date: event.date,
        description: event.description,
        reason: event.reason,
      }));
    if (!selectedEvents.length) {
      setMessage('Please select at least one valid event.');
      setTimeout(() => setMessage(''), 5000);
      return;
    }
    setIsSubmitting(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        showErrorToast('You must be signed in to schedule events.');
        setIsSubmitting(false);
        return;
      }
      const response = await createAutomatedPost(selectedEvents, genPlatforms);
      clearSelected();
      if ((response.failedCount ?? 0) > 0) {
        showErrorToast('Event studio creation failed. Please try again later.');
        setIsSubmitting(false);
        return;
      }
      const expected =
        (response.eventCount || selectedEvents.length) *
        Math.max(1, response.platforms?.length ?? genPlatforms.length);
      if (response.parentJobId) {
        const wait = await waitForParentJobDocs({
          uid,
          collectionName: 'eventPosts',
          parentJobId: response.parentJobId,
          expectedCount: expected,
        });
        if (wait.outcome === 'generated') toast.success('Generated');
        else showErrorToast('Event studio creation failed. Please try again later.');
      } else {
        showErrorToast('Event studio creation failed. Please try again later.');
      }
      setIsSubmitting(false);
    } catch (error: unknown) {
      showErrorToast('Event studio creation failed. Please try again later.');
      setIsSubmitting(false);
    } finally {
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const allEvents = useMemo(
    () => [
      ...builtInEvents,
      ...customEvents.filter((event) =>
        isFestiveDateWithinPlanRange(
          event.date,
          formattedToday,
          planExpiresYmd
        )
      ),
    ],
    [builtInEvents, customEvents, formattedToday, planExpiresYmd]
  );

  // Drop selections that fall outside the visible plan window.
  useEffect(() => {
    const visibleIds = new Set(allEvents.map((event) => event.id));
    const stale = selected.filter((id) => !visibleIds.has(id));
    if (stale.length === 0) return;
    for (const id of stale) {
      toggleSelected(id);
    }
  }, [allEvents, selected, toggleSelected]);

  const sortedEvents = allEvents
    .filter((e) => e && e.date)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const q = search.trim().toLowerCase();
  const displayedEvents = q
    ? sortedEvents.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.reason.toLowerCase().includes(q)
    )
    : sortedEvents;

  if (planCreditsLoading) {
    return <PageLoadingState message="Loading your account..." />;
  }

  if (!isTourDemo && isPlanInactive(billing)) {
    return <NonSubscribedFeatureBlock />;
  }

  return (
    <div className="mx-auto animate-in fade-in duration-500 pb-20">
      <header className="mb-8 w-full flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            {workspacePageTitle(WORKSPACE_NAV_HREFS.festivePost)}
          </h1>
          <p className="mt-2 text-base text-slate-500 max-w-2xl">
            Select upcoming events and let SocioGenie automatically
            generate and schedule campaigns.
          </p>
        </div>

        {/* Credit Card */}
        <div className="glass-card flex items-center gap-4 rounded-2xl px-5 py-4 shrink-0 shadow-sm border border-slate-200">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Available Credits
            </p>
            <div className="flex items-center gap-2">
              {planCreditsLoading ? (
                <Skeleton className="h-8 w-14 rounded-md" />
              ) : (
                <p className="text-xl font-bold text-slate-900">
                  {userCredits}
                </p>
              )}
              {!planCreditsLoading && userCredits < totalCost && (
                <span className="text-[10px] font-medium bg-rose-50 text-rose-600 px-2 rounded-full whitespace-nowrap border border-rose-100">
                  Need {totalCost}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              'mb-8 p-4 rounded-2xl border flex items-center gap-3 shadow-sm',
              message.includes('successfully')
                ? 'bg-emerald-50 border-emerald-200/60 text-emerald-800'
                : 'bg-rose-50 border-rose-200/60 text-rose-800'
            )}
          >
            <CheckCircle2
              className={cn(
                'w-5 h-5',
                message.includes('successfully')
                  ? 'text-emerald-500'
                  : 'text-rose-500'
              )}
            />
            <p className="text-sm font-semibold">{message}</p>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-8">
          <section className="glass-card rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-border flex items-center gap-3 bg-card/50">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div className="flex items-center justify-between w-full">
                <h2 className="text-lg font-bold text-slate-900">
                  Events Calendar
                </h2>
                <Input
                  placeholder="Search events"
                  value={search}
                  className="w-[50%]"
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div
              id="tour-fp-events"
              className="overflow-x-auto max-h-[calc(100vh-10rem)] overflow-y-auto custom-scrollbar"
            >
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-accent">
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="p-4 pl-6 w-12 text-center">Sel</th>
                    <th className="p-4">Event Details</th>
                    <th className="p-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedEvents.map((fest) => {
                    const isEditing = editingId === fest.id;
                    const isCustom = customEvents.some((e) => e.id === fest.id);
                    const isSelected = selected.includes(fest.id);

                    return (
                      <tr
                        key={fest.id}
                        className={cn(
                          'transition-colors group',
                          isSelected
                            ? 'bg-indigo-50/30'
                            : 'hover:bg-accent/40'
                        )}
                      >
                        <td className="p-4 pl-6 text-center align-start pt-5">
                          <div className="flex justify-center">
                            <button
                              onClick={() => handleToggle(fest.id)}
                              className={cn(
                                'w-5 h-5 rounded flex items-center justify-center transition-all border',
                                isSelected
                                  ? 'bg-indigo-600 border-indigo-600 text-white'
                                  : 'border-slate-300 bg-white hover:border-indigo-400'
                              )}
                            >
                              {isSelected && (
                                <svg
                                  viewBox="0 0 14 14"
                                  fill="none"
                                  className="w-3.5 h-3.5"
                                >
                                  <path
                                    d="M3 7.5L5.5 10L11 4"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              )}
                            </button>
                          </div>
                        </td>

                        <td className="p-4 min-w-[200px]">
                          {isEditing ? (
                            <div className="space-y-3">
                              <input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                placeholder="Event Name"
                              />
                              <input
                                value={editDescription}
                                onChange={(e) =>
                                  setEditDescription(e.target.value)
                                }
                                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-600"
                                placeholder="Description"
                              />
                            </div>
                          ) : (
                            <div>
                              <div className="font-bold text-slate-900 mb-1 flex items-center gap-2">
                                {fest.name || 'Unnamed Event'}
                                {isCustom && (
                                  <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                    Custom
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-slate-500 line-clamp-1">
                                {fest.description || 'No description provided.'}
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="p-4 whitespace-nowrap text-sm font-medium text-slate-700 align-start pt-5">
                          {isEditing ? (
                            <input
                              type="date"
                              min={formattedToday}
                              max={planExpiresYmd ?? undefined}
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                          ) : fest.date ? (
                            new Date(fest.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          ) : (
                            'Invalid Date'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {displayedEvents.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="p-8 text-center text-slate-500 text-sm"
                      >
                        No events found. Add a custom event to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="mt-6">
          <section className="glass-card rounded-3xl p-6 border border-indigo-100/50 bg-indigo-50/20 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-6">Summary</h2>

            <div className="space-y-4 text-sm mb-6">
              <div className="space-y-2">
                <span className="font-medium text-slate-600">Post platforms:</span>
                {showSelectAccountsFirst ? (
                  <div
                    role="status"
                    className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950"
                  >
                    <p className="font-medium">Select your accounts first</p>
                    <p className="mt-1 text-amber-900/90">
                      Choose which platforms you use in onboarding or social
                      settings, then come back here to schedule posts.
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
                    <div className="flex flex-wrap gap-4">
                      {allowedPlatforms.map((p) => (
                        <label
                          key={p}
                          htmlFor={`festive-platform-${p}`}
                          className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800"
                        >
                          <input
                            id={`festive-platform-${p}`}
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
                          htmlFor="festive-platform-all"
                          className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800"
                        >
                          <input
                            id="festive-platform-all"
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
                      <p className="text-xs text-amber-700">{platformSelection.error}</p>
                    ) : (
                      <p className="text-xs text-slate-500">
                        {allPlatformsSelected
                          ? `Schedules one post per event on each connected platform (${allowedPlatforms.length}).`
                          : genPlatforms.length > 1
                            ? `Schedules one post per event on each selected platform (${genPlatforms.length}).`
                            : 'Select one or more platforms for this run.'}
                      </p>
                    )}
                  </>
                )}
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-medium">Selected Events:</span>
                <span className="font-bold text-slate-900">
                  {selected.length}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-medium">Cost per Event:</span>
                <span className="font-bold text-slate-900">
                  {CREDIT_PER_EVENT * platformCount}{' '}
                  <span className="text-xs font-normal text-slate-500">
                    credits
                  </span>
                </span>
              </div>
              <div className="pt-4 border-t border-border/60 flex justify-between items-center bg-card/40 -mx-6 px-6 py-4 rounded-b-xl -mb-6">
                <span className="font-bold text-slate-900">
                  Credits to charge:
                </span>
                <span
                  className={cn(
                    'text-xl font-black',
                    userCredits < totalCost
                      ? 'text-rose-600'
                      : 'text-indigo-600'
                  )}
                >
                  {totalCost}
                </span>
              </div>
            </div>

            <div className="mt-8">
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition-all hover:bg-indigo-700 hover:-translate-y-0.5 active:scale-[0.98] disabled:transform-none disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Generating...
                  </span>
                ) : (
                  `Confirm & Schedule${insufficientCredits ? ' (insufficient credits)' : ''}`
                )}
              </button>
              {isSubmitting && (
                <p className="mt-4 text-xs font-medium text-indigo-700">
                  Generating...
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <Link
                href={WORKSPACE_NAV_HREFS.gallery}
                className="w-full text-center py-3 rounded-full bg-cyan-600 text-white font-semibold hover:opacity-90 transition"
              >
                {workspacePageTitle(WORKSPACE_NAV_HREFS.gallery)}
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
