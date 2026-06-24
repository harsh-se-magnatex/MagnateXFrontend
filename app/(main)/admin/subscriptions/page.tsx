'use client';

import { PageLoadingState } from '@/components/shared/PageLoadingState';
import {
  activateAdminUserSubscription,
  getAdminPlans,
  getAdminUsers,
  type AdminPlan,
  type AdminSubscriptionChangeType,
  type AdminUser,
} from '@/src/service/api/adminService';
import { useUser } from '../../_components/useUser';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { showErrorToast } from '@/lib/show-error-toast';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const TIER_RANK: Record<string, number> = {
  prime: 1,
  elite: 2,
  legacy: 3,
};

function extractTier(planName: string): string | null {
  const lower = planName.toLowerCase();
  if (lower.includes('prime')) return 'prime';
  if (lower.includes('elite')) return 'elite';
  if (lower.includes('legacy')) return 'legacy';
  return null;
}

function inferChangeType(
  previousPlan: string,
  targetPlan: AdminPlan | null
): AdminSubscriptionChangeType | null {
  if (!targetPlan) return null;
  if (!previousPlan || previousPlan === 'non-subscribed') return 'activate';
  const prevTier = extractTier(previousPlan);
  const newTier = extractTier(targetPlan.name);
  if (!prevTier || !newTier) return 'change';
  if (TIER_RANK[newTier] > TIER_RANK[prevTier]) return 'upgrade';
  if (TIER_RANK[newTier] < TIER_RANK[prevTier]) return 'downgrade';
  return 'change';
}

const CHANGE_LABEL: Record<AdminSubscriptionChangeType, string> = {
  activate: 'Activate',
  upgrade: 'Upgrade',
  downgrade: 'Downgrade',
  change: 'Change plan',
};

const CHANGE_BADGE: Record<AdminSubscriptionChangeType, string> = {
  activate: 'bg-emerald-500/20 text-emerald-200',
  upgrade: 'bg-sky-500/20 text-sky-200',
  downgrade: 'bg-amber-500/20 text-amber-200',
  change: 'bg-violet-500/20 text-violet-200',
};

export default function AdminSubscriptionsPage() {
  const { user } = useUser();
  const router = useRouter();

  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [userSearch, setUserSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [planId, setPlanId] = useState('');
  const [durationMonths, setDurationMonths] = useState(1);
  const [note, setNote] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const selectedUser = useMemo(
    () => users.find((u) => u.userId === selectedUserId) ?? null,
    [selectedUserId, users]
  );

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === planId) ?? null,
    [planId, plans]
  );

  const changeType = useMemo(
    () =>
      inferChangeType(selectedUser?.activePlan ?? 'non-subscribed', selectedPlan),
    [selectedPlan, selectedUser]
  );

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users.slice(0, 50);
    return users
      .filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.userId.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.subscriptionId ?? '').toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [userSearch, users]);

  useEffect(() => {
    if (user && !user.admin) {
      router.replace('/home');
      return;
    }
  }, [router, user]);

  useEffect(() => {
    if (!user?.admin) return;

    const load = async () => {
      setLoading(true);
      try {
        const [plansRes, usersRes] = await Promise.all([
          getAdminPlans(),
          getAdminUsers(),
        ]);
        setPlans(plansRes.data.plans);
        setUsers(usersRes.data.users);
      } catch {
        showErrorToast('Failed to load subscription admin data');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  if (!user?.admin) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedUserId) {
      showErrorToast('Select a user');
      return;
    }
    if (!planId) {
      showErrorToast('Select a target plan');
      return;
    }

    setConfirmOpen(true);
  };

  const applySubscription = async () => {
    if (!selectedUserId || !planId) return;

    setSubmitting(true);
    try {
      const response = await activateAdminUserSubscription({
        userId: selectedUserId,
        planId,
        durationMonths,
        creditMode: 'set',
        note: note.trim() || undefined,
      });
      const result = response.data;
      toast.success(
        `Subscription ${result.changeType} applied — ${result.previousPlan} → ${result.newPlan}`
      );
      setUsers((prev) =>
        prev.map((u) =>
          u.userId === selectedUserId
            ? {
                ...u,
                activePlan: result.newPlan,
                subscriptionStatus: 'active',
              }
            : u
        )
      );
      setConfirmOpen(false);
    } catch (error: unknown) {
      showErrorToast(
        error instanceof Error ? error.message : 'Failed to activate subscription'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const confirmActionLabel = changeType
    ? CHANGE_LABEL[changeType]
    : 'Apply';

  return (
    <div className="min-h-screen bg-[#0B1020] text-white px-6 py-8 md:px-10">
      <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-[#6C5CE7] to-[#00D1FF] mb-2">
        Admin - Subscription Activation
      </h1>
      <p className="mb-8 max-w-3xl text-sm text-gray-300">
        Manually activate, upgrade, or downgrade a user&apos;s subscription.
        This writes directly to Firestore (same fields as payment fulfillment)
        without going through Dodo billing.
      </p>

      {loading ? (
        <PageLoadingState
          className="min-h-[320px]"
          message="Loading plans and users..."
        />
      ) : (
        <form
          onSubmit={handleSubmit}
          className="grid gap-6 lg:grid-cols-[1fr_1fr]"
        >
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6 space-y-5">
            <h2 className="text-lg font-semibold text-white">1. Select user</h2>
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Filter by name, email, or user ID"
              className="h-11 w-full rounded-lg border border-white/20 bg-white/10 px-3 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00D1FF]/60"
            />
            <div className="max-h-72 overflow-y-auto rounded-xl border border-white/10">
              {filteredUsers.length === 0 ? (
                <div className="p-4 text-sm text-gray-400">No users found.</div>
              ) : (
                filteredUsers.map((u) => {
                  const isSelected = u.userId === selectedUserId;
                  return (
                    <button
                      key={u.userId}
                      type="button"
                      onClick={() => setSelectedUserId(u.userId)}
                      className={`w-full border-b border-white/5 px-4 py-3 text-left transition-colors last:border-b-0 ${
                        isSelected
                          ? 'bg-[#00D1FF]/15'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="font-medium">{u.name}</div>
                      <div className="text-xs text-gray-400 font-mono">
                        {u.userId}
                      </div>
                      <div className="mt-1 text-xs text-gray-300">
                        Plan: {u.activePlan}
                        {u.subscriptionStatus
                          ? ` · Sub: ${u.subscriptionStatus}`
                          : ''}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6 space-y-5">
            <h2 className="text-lg font-semibold text-white">2. Target plan</h2>

            {selectedUser ? (
              <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
                <div className="text-gray-400">Selected user</div>
                <div className="font-semibold">{selectedUser.name}</div>
                <div className="mt-2 text-gray-300">
                  Current plan:{' '}
                  <span className="text-white">{selectedUser.activePlan}</span>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/20 p-4 text-sm text-gray-400">
                Pick a user from the list.
              </div>
            )}

            <label className="block text-sm">
              <span className="mb-1.5 block text-gray-300">Target plan</span>
              <select
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                className="h-11 w-full rounded-lg border border-white/20 bg-[#0B1020] px-3 text-white focus:outline-none focus:ring-2 focus:ring-[#00D1FF]/60 [&>option]:bg-[#0B1020] [&>option]:text-white"
              >
                <option value="">Select a plan...</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.displayName} — ${plan.price}/mo
                  </option>
                ))}
              </select>
            </label>

            {selectedPlan ? (
              <div className="rounded-xl border border-[#00D1FF]/30 bg-[#00D1FF]/10 p-4 text-sm">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-400">
                      Plan
                    </div>
                    <div className="mt-1 font-semibold text-white">
                      {selectedPlan.displayName}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-400">
                      Credit allotment
                    </div>
                    <div className="mt-1 text-2xl font-bold text-[#00D1FF]">
                      {selectedPlan.credits}
                    </div>
                    <div className="text-xs text-gray-400">
                      credits / month (from plan)
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-400">
                      Price
                    </div>
                    <div className="mt-1 font-semibold text-white">
                      ${selectedPlan.price}/mo
                    </div>
                    <div className="text-xs capitalize text-gray-400">
                      {selectedPlan.mode === 'auto' ? 'AI mode' : 'Studio mode'}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {changeType && selectedPlan ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400">Action:</span>
                <span
                  className={`rounded-full px-2.5 py-1 font-semibold capitalize ${CHANGE_BADGE[changeType]}`}
                >
                  {CHANGE_LABEL[changeType]}
                </span>
                <span className="text-gray-400">
                  → {selectedPlan.displayName}
                </span>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-1">
              <label className="block text-sm">
                <span className="mb-1.5 block text-gray-300">Duration (months)</span>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={durationMonths}
                  onChange={(e) =>
                    setDurationMonths(Math.max(1, Number(e.target.value) || 1))
                  }
                  className="h-11 w-full rounded-lg border border-white/20 bg-white/10 px-3 text-white focus:outline-none focus:ring-2 focus:ring-[#00D1FF]/60"
                />
              </label>
            </div>

            <label className="block text-sm">
              <span className="mb-1.5 block text-gray-300">
                Admin note (optional)
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Reason for manual activation..."
                className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00D1FF]/60"
              />
            </label>

            <button
              type="submit"
              disabled={submitting || !selectedUserId || !planId}
              className="h-11 w-full rounded-lg bg-[#00D1FF] px-5 font-semibold text-[#0B1020] hover:bg-[#32dbff] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? 'Applying...'
                : changeType
                  ? `${CHANGE_LABEL[changeType]} subscription`
                  : 'Apply subscription'}
            </button>
          </section>
        </form>
      )}

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (submitting) return;
          setConfirmOpen(open);
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmActionLabel} subscription?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left text-sm text-muted-foreground">
                <p>
                  Apply this change for{' '}
                  <span className="font-medium text-foreground">
                    {selectedUser?.name ?? selectedUserId}
                  </span>
                  . This writes directly to Firestore without Dodo billing.
                </p>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 rounded-lg border bg-muted/40 p-3">
                  <dt>Current plan</dt>
                  <dd className="font-medium text-foreground">
                    {selectedUser?.activePlan ?? 'non-subscribed'}
                  </dd>
                  <dt>Target plan</dt>
                  <dd className="font-medium text-foreground">
                    {selectedPlan?.displayName ?? planId}
                  </dd>
                  <dt>Credit allotment</dt>
                  <dd className="font-medium text-foreground">
                    {selectedPlan?.credits ?? 0} credits
                  </dd>
                  <dt>Duration</dt>
                  <dd className="font-medium text-foreground">
                    {durationMonths} month{durationMonths === 1 ? '' : 's'}
                  </dd>
                </dl>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={submitting}
              onClick={(event) => {
                event.preventDefault();
                void applySubscription();
              }}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              {confirmActionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
