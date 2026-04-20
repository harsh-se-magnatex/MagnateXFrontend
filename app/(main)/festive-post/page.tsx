'use client';

import { createAutomatedPost } from '@/src/service/api/social.servce';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Zap,
  CheckCircle2,
  Edit2,
  Trash2,
  Save,
  X,
  CalendarDays,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { getTodatDate } from '@/utils/getTodayDate';
import { EVENTS } from './events';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useUserPlanCredits,
  formatTimestamp,
} from '../_components/UserPlanCreditsProvider';
import Link from 'next/link';
import { toast } from 'sonner';

const CREDIT_PER_EVENT = 2;

const PLATFORM_ORDER = ['instagram', 'facebook', 'linkedin'] as const;
type FestivePlatform = (typeof PLATFORM_ORDER)[number] | 'all_platforms';

function firstEnabledPlatform(
  accounts: Partial<Record<FestivePlatform, boolean>> | null | undefined
): FestivePlatform | undefined {
  if (!accounts) return undefined;
  return PLATFORM_ORDER.find((p) => accounts[p] === true);
}

type EventItem = {
  id: string;
  name: string;
  date: string;
  description: string;
  reason: string;
};

const BUILT_IN_EVENTS: EventItem[] = EVENTS.map(
  ({ id, name, date, description, reason }) => ({
    id,
    name,
    date,
    description,
    reason,
  })
);

export default function AutomatedPostPage() {
  const submitGuardRef = useRef(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customEvents, setCustomEvents] = useState<EventItem[]>([]);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editReason, setEditReason] = useState('');
  const formattedToday = getTodatDate();
  const { billing, loading: planCreditsLoading } = useUserPlanCredits();
  const userCredits = billing?.credits ?? 0;
  const selectedAccounts = billing?.selected;
  const creditsExpiresAt = billing?.creditsExpiresAt;
  const [selectedPlatform, setSelectedPlatform] =
    useState<FestivePlatform>('instagram');

  useEffect(() => {
    if (selectedPlatform === 'all_platforms') return;

    const first = firstEnabledPlatform(selectedAccounts);
    if (!first) return;
    if (!selectedAccounts?.[selectedPlatform]) {
      setSelectedPlatform(first);
    }
  }, [selectedAccounts, selectedPlatform]);

  const handleToggle = (eventId: string) =>
    setSelected((prev) =>
      prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId]
    );

  const handleSubmit = async () => {
    if (planCreditsLoading || submitGuardRef.current) return;
    submitGuardRef.current = true;
    const cost =
      selected.length *
      CREDIT_PER_EVENT *
      (selectedPlatform === 'all_platforms'
        ? Object.keys(selectedAccounts ?? {}).filter(
            (p) =>
              selectedAccounts?.[p as keyof typeof selectedAccounts] === true
          ).length
        : 1);
    if (cost > userCredits) {
      setMessage('Not enough credits. Please top up your account.');
      setTimeout(() => setMessage(''), 5000);
      submitGuardRef.current = false;
      return;
    }
    const eventMap = new Map(
      [...BUILT_IN_EVENTS, ...customEvents].map((event) => [event.id, event])
    );
    const selectedEvents = selected
      .map((id) => eventMap.get(id))
      .filter((event): event is EventItem => !!event)
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
      submitGuardRef.current = false;
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await createAutomatedPost(
        selectedEvents,
        selectedPlatform
      );
      const payload = response?.data;
      const successCount = Number(payload?.successCount || 0);
      const failedCount = Number(payload?.failedCount || 0);
      if (successCount > 0) {
        toast.success(
          `Scheduled ${successCount} event(s) on ${selectedPlatform} successfully.`
        );
        setSelected([]);
      }
      if (failedCount > 0) {
        toast.success(
          `${successCount} scheduled, ${failedCount} failed. Check logs and retry failed events.`
        );
      }
    } catch (error: unknown) {
      const typedError = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const errorMessage =
        typedError?.response?.data?.message ||
        typedError?.message ||
        'Failed to schedule automated posts.';
      toast.error(errorMessage);
    } finally {
      submitGuardRef.current = false;
      setIsSubmitting(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const handleDeleteCustomEvent = (id: string) => {
    setCustomEvents((prev) => prev.filter((e) => e.id !== id));
    setSelected((prev) => prev.filter((e) => e !== id));
    if (editingId === id) setEditingId(null);
  };

  const handleEditCustomEvent = (event: EventItem) => {
    setEditingId(event.id);
    setEditName(event.name);
    setEditDate(event.date);
    setEditDescription(event.description);
    setEditReason(event.reason);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    setCustomEvents((prev) =>
      prev.map((e) =>
        e.id === editingId
          ? {
              ...e,
              name: editName,
              date: editDate,
              description: editDescription,
              reason: editReason,
            }
          : e
      )
    );
    setEditingId(null);
  };

  const allEvents = [...BUILT_IN_EVENTS, ...customEvents];
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

  const totalCost =
    selected.length *
    CREDIT_PER_EVENT *
    (selectedPlatform === 'all_platforms'
      ? Object.keys(selectedAccounts ?? {}).filter(
          (p) => selectedAccounts?.[p as keyof typeof selectedAccounts] === true
        ).length
      : 1);

  const formattedCreditsExpiresAt = creditsExpiresAt
    ? formatTimestamp(creditsExpiresAt)
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
      <header className="mb-8 w-full flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            Festive Posting
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100/50">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                AI Powered
              </span>
            </div>
          </h1>
          <p className="mt-2 text-base text-slate-500 max-w-2xl">
            Select upcoming events or add your own, and let our AI automatically
            generate and schedule cohesive campaigns.
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
            <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-white/50">
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

            <div className="overflow-x-auto max-h-[calc(100vh-10rem)] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-accent">
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="p-4 pl-6 w-12 text-center">Sel</th>
                    <th className="p-4">Event Details</th>
                    <th className="p-4">Date</th>
                    <th className="p-4 pr-6 text-right">Actions</th>
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
                            : 'hover:bg-slate-50/50'
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

                        <td className="p-4 pr-6 text-right align-start pt-5">
                          {isCustom ? (
                            <div className="flex items-center justify-end gap-2">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={handleSaveEdit}
                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-200"
                                    title="Save"
                                  >
                                    <Save className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                                    title="Cancel"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleEditCustomEvent(fest)}
                                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-200 opacity-0 group-hover:opacity-100"
                                    title="Edit"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDeleteCustomEvent(fest.id)
                                    }
                                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200 opacity-0 group-hover:opacity-100"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium px-2">
                              —
                            </span>
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
              <div className="flex justify-between items-center text-slate-600 gap-4">
                <span className="font-medium">Post Platform:</span>
                <select
                  disabled={!selectedAccounts}
                  value={selectedPlatform}
                  onChange={(e) =>
                    setSelectedPlatform(
                      e.target.value as 'instagram' | 'facebook' | 'linkedin'
                    )
                  }
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-800 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                >
                  {selectedAccounts?.instagram && (
                    <option value="instagram">Instagram</option>
                  )}
                  {selectedAccounts?.facebook && (
                    <option value="facebook">Facebook</option>
                  )}
                  {selectedAccounts?.linkedin && (
                    <option value="linkedin">LinkedIn</option>
                  )}
                  {allowedPlatforms.length > 1 && (
                    <option value="all_platforms">
                      {allowedPlatforms.length === 2
                        ? 'Both platforms'
                        : 'All platforms'}
                    </option>
                  )}
                </select>
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
                  {CREDIT_PER_EVENT *
                    (selectedPlatform === 'all_platforms'
                      ? Object.keys(selectedAccounts ?? {}).filter(
                          (p) =>
                            selectedAccounts?.[
                              p as keyof typeof selectedAccounts
                            ] === true
                        ).length
                      : 1)}{' '}
                  <span className="text-xs font-normal text-slate-500">
                    credits
                  </span>
                </span>
              </div>
              <div className="pt-4 border-t border-slate-200/60 flex justify-between items-center bg-white/50 -mx-6 px-6 py-4 rounded-b-xl -mb-6">
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
                disabled={
                  selected.length === 0 || isSubmitting || planCreditsLoading
                }
                className="w-full rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition-all hover:bg-indigo-700 hover:-translate-y-0.5 active:scale-[0.98] disabled:transform-none disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
              >
                {isSubmitting ? 'Scheduling...' : 'Confirm & Schedule'}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <Link
                href="/media-library"
                className="w-full text-center py-3 rounded-full bg-cyan-600 text-white font-semibold hover:opacity-90 transition"
              >
                Download PNGs (Media Library)
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
