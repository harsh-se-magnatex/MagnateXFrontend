'use client';

import { useAuth } from '@/src/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CreditCard,
  Coins,
  Clock,
  Loader2,
  Sparkles,
  ReceiptText,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PLAN_COMPARISON_BULLETS } from '@/lib/landing-pricing';
import {
  claimElitePromotion,
  getAvailablePlansAndCreditPacks,
  getTransactions,
  handlePlanPurchaseTransaction,
  handleTopUpTransaction,
  upgradePlan,
  type PlanSummary,
  type UserTransaction,
} from '@/src/service/api/transactionService';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useUserPlanCredits } from '../../_components/UserPlanCreditsProvider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const PLAN_COMPARISON_ORDER = ['prime', 'elite', 'legacy'] as const;

const TOP_UP_PACK_LABELS = ['Starter', 'Basic', 'Growth', 'Business'] as const;

const PLAN_PRICING_DISPLAY: Record<
  string,
  { discounted: number; original: number; discountLabel: string }
> = {
  prime: { discounted: 1999, original: 1999, discountLabel: '' },
  elite: { discounted: 3499, original: 3499, discountLabel: '' },
  legacy: { discounted: 5999, original: 5999, discountLabel: '' },
};

const PLAN_PLATFORM_LIMIT: Record<string, number> = {
  prime: 1,
  elite: 2,
  legacy: 3,
};

/** Fallback when API plan docs omit credits; aligns with upgrade copy. */
const PLAN_MONTHLY_CREDITS_FALLBACK: Record<string, number> = {
  prime: 50,
  elite: 120,
  legacy: 260,
};

/** When API omits tiers, still show Prime / Elite / Legacy rows in the modal. */
const STATIC_PLAN_FALLBACK: Record<
  (typeof PLAN_COMPARISON_ORDER)[number],
  PlanSummary
> = {
  prime: {
    id: 'prime',
    name: 'prime',
    description: '1 platform — monthly credits for on-demand actions',
    price: PLAN_PRICING_DISPLAY.prime.discounted,
  },
  elite: {
    id: 'elite',
    name: 'elite',
    description: 'Up to 2 platforms — higher monthly credits',
    price: PLAN_PRICING_DISPLAY.elite.discounted,
  },
  legacy: {
    id: 'legacy',
    name: 'legacy',
    description: 'Up to 3 platforms — highest monthly credits',
    price: PLAN_PRICING_DISPLAY.legacy.discounted,
  },
};

const PLAN_COMING_SOON = new Set(['prime', 'legacy']);

type FirestoreTimestamp = {
  seconds: number;
  nanoseconds: number;
};

function formatFirestoreDate(
  ts: FirestoreTimestamp | null | undefined
): string {
  if (ts == null) return '—';
  if (typeof ts === 'object' && ts !== null) {
    const o = ts as { _seconds?: number; seconds?: number | string };
    const raw =
      typeof o._seconds === 'number'
        ? o._seconds
        : o.seconds != null
          ? Number(o.seconds)
          : NaN;
    if (Number.isFinite(raw)) {
      return new Date(raw * 1000).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  }
  return '—';
}

function formatTxnDate(value: unknown): string {
  if (value == null) return '—';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  if (typeof value === 'object' && value !== null) {
    const o = value as { _seconds?: number; seconds?: number | string };
    const raw =
      typeof o._seconds === 'number'
        ? o._seconds
        : o.seconds != null
          ? Number(o.seconds)
          : NaN;
    if (Number.isFinite(raw)) {
      return new Date(raw * 1000).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  }
  return '—';
}

function formatInr(amount: number | undefined): string {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return '—';
  return `₹${amount.toLocaleString('en-IN')}`;
}

function txnDescription(row: UserTransaction): string {
  if (row.type === 'deduction') return row.description ?? 'Credit usage';
  return row.description ?? '—';
}

function txnAmountCell(row: UserTransaction): string {
  if (row.type === 'deduction') return '—';
  return formatInr(row.amount);
}

function planCreditsPerMonth(
  plan: PlanSummary | undefined,
  planNameKey: string
): number {
  const extra = plan as PlanSummary & { credits?: number };
  if (typeof extra?.credits === 'number' && extra.credits > 0)
    return extra.credits;
  return PLAN_MONTHLY_CREDITS_FALLBACK[planNameKey] ?? 150;
}

function planTierIndex(planKey: string): number {
  const k = planKey.trim().toLowerCase();
  return PLAN_COMPARISON_ORDER.indexOf(
    k as (typeof PLAN_COMPARISON_ORDER)[number]
  );
}

/** True when `toKey` is strictly higher than `fromKey` on Prime → Elite → Legacy. */
function isPlanUpgrade(fromKey: string, toKey: string): boolean {
  const from = planTierIndex(fromKey);
  const to = planTierIndex(toKey);
  if (from < 0 || to < 0) return false;
  return to > from;
}

export default function BillingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [plansLoading, setPlansLoading] = useState(false);
  const [creditPacks, setCreditPacks] = useState<
    {
      id: string;
      name: string;
      credits: number;
      price: number;
      label?: string;
    }[]
  >([]);
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const { billing, loading: billingLoading } = useUserPlanCredits();
  const [claimLoading, setClaimLoading] = useState(false);
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [planPurchaseLoading, setPlanPurchaseLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null);
  const [selectedCreditPack, setSelectedCreditPack] = useState<{
    id: string;
    name: string;
    credits?: number;
  } | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [billingHistory, setBillingHistory] = useState<UserTransaction[]>([]);
  const clickedPurchasePlan = useRef<string | null>(null);
  const clickedUpgradePlan = useRef<string | null>(null);
  const clickedTopUp = useRef<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/sign-in');
  }, [loading, user, router]);

  const fetchCreditPacks = useCallback(async () => {
    if (!user) return;
    try {
      setPlansLoading(true);
      const response = await getAvailablePlansAndCreditPacks();
      setCreditPacks(response.data.creditPacks);
      setPlans(response.data.plans);
    } catch {
      setCreditPacks([]);
      setPlans([]);
    } finally {
      setPlansLoading(false);
    }
  }, [user]);

  const fetchBillingHistory = useCallback(async () => {
    if (!user) return;
    try {
      setHistoryLoading(true);
      const res = await getTransactions();
      const rows = res.data.transactions ?? [];
      const purchaseLike = rows.filter(
        (r) => r.type === 'purchase' || r.type === 'plan'
      );
      const sorted =
        purchaseLike.length > 0
          ? purchaseLike
          : rows.filter((r) => r.type !== 'deduction');
      setBillingHistory(sorted.slice(0, 5));
    } catch {
      setBillingHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchCreditPacks();
  }, [fetchCreditPacks]);

  useEffect(() => {
    void fetchBillingHistory();
  }, [fetchBillingHistory]);

  const currentPlanRecord = useMemo(() => {
    const key = (billing?.activePlan ?? '').toLowerCase();
    return plans.find((p) => p.name.toLowerCase() === key);
  }, [plans, billing?.activePlan]);

  const displayPlanName = useMemo(() => {
    if (!billing?.activePlan || billing.activePlan === 'non-subscribed')
      return 'No active plan';
    return billing.activePlan[0].toUpperCase() + billing.activePlan.slice(1);
  }, [billing?.activePlan]);

  const platformCount = useMemo(() => {
    const k = (billing?.activePlan ?? '').toLowerCase();
    if (k === 'non-subscribed' || !billing?.activePlan) return 0;
    return PLAN_PLATFORM_LIMIT[k] ?? 0;
  }, [billing?.activePlan]);

  const creditsPerMonthCopy = useMemo(() => {
    const k = (billing?.activePlan ?? '').toLowerCase();
    return planCreditsPerMonth(currentPlanRecord, k);
  }, [currentPlanRecord, billing?.activePlan]);

  const promoEliteOnly = useMemo(
    () =>
      plans.length === 1 &&
      (plans[0]?.name ?? '').toLowerCase() === 'elite' &&
      creditPacks.length === 0,
    [plans, creditPacks]
  );

  const monthlyPriceDisplay = useMemo(() => {
    if (!currentPlanRecord || billing?.activePlan === 'non-subscribed')
      return null;
    if (
      promoEliteOnly &&
      (billing?.activePlan ?? '').toLowerCase() === 'elite'
    ) {
      return 'Complimentary · 2 months';
    }
    return formatInr(currentPlanRecord.price) + '/month';
  }, [currentPlanRecord, billing?.activePlan, promoEliteOnly]);

  const planComparisonRows = useMemo(() => {
    return PLAN_COMPARISON_ORDER.map((tierKey) => {
      const fromApi = plans.find((p) => p.name.toLowerCase() === tierKey);
      const plan = fromApi ?? STATIC_PLAN_FALLBACK[tierKey];
      return { tierKey, plan };
    });
  }, [plans]);

  const handleTopUp = async (creditPackId: string) => {
    if (!user) return;
    if (clickedTopUp.current === creditPackId) return;
    try {
      setTopUpLoading(true);
      clickedTopUp.current = creditPackId;
      await handleTopUpTransaction({ creditPackId });
      toast.success('Top up successful');
      setTopUpOpen(false);
      setSelectedCreditPack(null);
      void fetchBillingHistory();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to top up';
      toast.error(message);
    } finally {
      setTopUpLoading(false);
      setSelectedCreditPack(null);
      clickedTopUp.current = null;
    }
  };

  const handlePlanPurchase = async (planId: string) => {
    if (!user) return;
    if (clickedPurchasePlan.current === planId) return;
    try {
      clickedPurchasePlan.current = planId;
      setPlanPurchaseLoading(true);
      await handlePlanPurchaseTransaction({ planId });
      toast.success('Plan updated successfully');
      setUpgradeOpen(false);
      void fetchCreditPacks();
      void fetchBillingHistory();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to purchase plan';
      toast.error(message);
    } finally {
      setPlanPurchaseLoading(false);
      clickedPurchasePlan.current = null;
    }
  };

  const handleClaimElite = async () => {
    if (!user) return;
    try {
      setClaimLoading(true);
      const res = await claimElitePromotion();
      if (res.success) {
        toast.success(res.message || 'Elite access activated for 2 months');
        setUpgradeOpen(false);
        void fetchCreditPacks();
        void fetchBillingHistory();
      } else {
        toast.error(res.message || 'Could not claim Elite');
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Could not claim Elite';
      toast.error(message);
    } finally {
      setClaimLoading(false);
    }
  };

  const handleUpgradePlan = async (planId: string) => {
    if (!user) return;
    if (clickedUpgradePlan.current === planId) return;
    try {
      clickedUpgradePlan.current = planId;
      setUpgradeLoading(true);
      setUpgradingPlanId(planId);
      const res = await upgradePlan({ planId });
      if (res.success) {
        toast.success(res.message || 'Plan upgraded successfully');
        setUpgradeOpen(false);
        void fetchBillingHistory();
      } else {
        toast.error(res.message || 'Failed to upgrade plan');
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to upgrade plan';
      toast.error(message);
    } finally {
      setUpgradeLoading(false);
      setUpgradingPlanId(null);
      clickedUpgradePlan.current = null;
    }
  };

  const isSubscribed =
    !!billing?.activePlan && billing.activePlan !== 'non-subscribed';

  if (loading) return null;
  if (!user) return null;

  if (plansLoading) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <Spinner className="flex items-center justify-center size-6" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500 pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Billing &amp; subscription
        </h1>
        <p className="mt-2 text-sm text-slate-500 max-w-2xl">
          {promoEliteOnly
            ? 'Claim complimentary Elite for two months, track credits, and view billing activity. Credit top-ups are paused during this promotion.'
            : 'Manage your plan, credits, and billing activity. Daily automated posts continue on their own schedule; credits cover on-demand actions only.'}
        </p>
      </div>

      <div className="space-y-8">
        {/* Current plan */}
        <section
          className={cn(
            'glass-card rounded-3xl p-6 sm:p-8 transition-colors',
            isSubscribed &&
              'ring-1 ring-emerald-200/80 bg-gradient-to-br from-emerald-50/40 via-white to-white'
          )}
        >
          <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <CreditCard className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">
              Current plan
            </h2>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <p className="text-lg font-semibold text-slate-900">
                  {displayPlanName}
                  {monthlyPriceDisplay ? (
                    <span className="font-normal text-slate-600">
                      {' '}
                      — {monthlyPriceDisplay}
                    </span>
                  ) : null}
                </p>
                {isSubscribed ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-900 ring-1 ring-emerald-300/60"
                    title="This plan is currently active on your account"
                  >
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-40" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-600" />
                    </span>
                    Active
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Renews on{' '}
                <span className="font-medium text-slate-800">
                  {formatFirestoreDate(billing?.planExpiresAt)}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="rounded-xl"
                onClick={() => setUpgradeOpen(true)}
              >
                {promoEliteOnly && billing?.activePlan === 'non-subscribed'
                  ? 'Claim Elite'
                  : 'Manage plan'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={billing?.activePlan === 'non-subscribed'}
                onClick={() =>
                  toast.message('Cancel subscription', {
                    description:
                      'Contact support to cancel or change billing — self-serve cancel is coming soon.',
                  })
                }
              >
                Cancel subscription
              </Button>
            </div>
          </div>
        </section>

        {/* Credits */}
        <section className="glass-card rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Coins className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">
              Credits balance
            </h2>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-amber-800 uppercase tracking-wide">
                Remaining this cycle
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                {billingLoading ? '…' : (billing?.credits ?? '—')}{' '}
                <span className="text-base font-semibold text-slate-500">
                  credits
                </span>
              </p>
            </div>
            {!promoEliteOnly ? (
              <Button
                type="button"
                className="rounded-xl shrink-0"
                onClick={() => setTopUpOpen(true)}
                disabled={billing?.activePlan === 'non-subscribed'}
              >
                Top up credits
              </Button>
            ) : null}
          </div>
          {promoEliteOnly ? (
            <p className="text-sm text-amber-800/90 bg-amber-50/80 border border-amber-100 rounded-xl px-4 py-3 mb-4">
              Credit top-ups aren&apos;t available during the Elite promotion.
              Your monthly allowance is included with your plan.
            </p>
          ) : null}
          <p className="text-sm text-slate-600 flex items-start gap-2">
            <Clock className="h-4 w-4 shrink-0 mt-0.5 text-slate-400" />
            Credits expires on{' '}
            <span className="font-medium text-slate-800">
              {formatFirestoreDate(billing?.creditsExpiresAt)}
            </span>
          </p>
        </section>

        {/* Explainer */}
        <section className="glass-card rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
              <Sparkles className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">
              Credit usage
            </h2>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Credits are used for on-demand content actions. Daily automated
            posts continue independently of your credit balance.
          </p>
          <ul className="text-sm text-slate-700 space-y-2 list-none pl-0">
            <li>· Product Advert post: 4 credits</li>
            <li>· Instant generation post: 2 credits</li>
            <li>· Festive post: 2 credits</li>
            <li>· Regeneration post: 1 credit</li>
          </ul>
        </section>

        {/* Billing history */}
        <section className="glass-card rounded-3xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
                <ReceiptText className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900">
                Billing history
              </h2>
            </div>
            <Link
              href="/settings/transactions"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              Full transaction history
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
          {historyLoading ? (
            <div className="flex justify-center py-10">
              <Spinner className="size-6" />
            </div>
          ) : billingHistory.length === 0 ? (
            <p className="text-sm text-slate-600 py-6 text-center">
              No billing entries yet. Purchases and top-ups will appear here —{' '}
              <Link
                href="/settings/transactions"
                className="font-medium text-indigo-600 hover:underline"
              >
                open transaction history
              </Link>
              .
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-slate-600">Date</TableHead>
                  <TableHead className="text-slate-600">Description</TableHead>
                  <TableHead className="text-slate-600 text-right">
                    Amount
                  </TableHead>
                  <TableHead className="text-slate-600 text-right">
                    Invoice
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingHistory.map((row, index) => (
                  <TableRow key={`${txnDescription(row)}-${index}`}>
                    <TableCell className="text-slate-900 tabular-nums whitespace-nowrap">
                      {formatTxnDate(row.createdAt)}
                    </TableCell>
                    <TableCell className="text-slate-700 max-w-[220px] truncate sm:max-w-[320px]">
                      {txnDescription(row)}
                    </TableCell>
                    <TableCell className="text-right text-slate-900 tabular-nums">
                      {txnAmountCell(row)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href="/settings/transactions"
                        className="text-sm font-medium text-indigo-600 hover:underline"
                      >
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      </div>

      {/* Purchase plan modal */}
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent
          showCloseButton
          className="sm:max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl"
        >
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              {promoEliteOnly && billing?.activePlan === 'non-subscribed'
                ? 'Claim complimentary Elite'
                : 'Unlock more platforms and content'}
            </DialogTitle>
            <DialogDescription className="text-slate-600 text-left space-y-2">
              {promoEliteOnly && billing?.activePlan === 'non-subscribed' ? (
                <span>
                  Get full Elite access for two months at no charge — connect up
                  to two platforms and use your monthly credit allowance. No
                  checkout required.
                </span>
              ) : billing?.activePlan === 'non-subscribed' ? (
                <span>
                  You do not have an active subscription yet. Choose a plan to
                  unlock platform connections and monthly credits.
                </span>
              ) : (
                <span>
                  Your current plan supports {platformCount} platform
                  {platformCount === 1 ? '' : 's'} and {creditsPerMonthCopy}{' '}
                  credits/month.
                </span>
              )}
              {!promoEliteOnly ? (
                <span>
                  Upgrade to connect more platforms and create more content.
                </span>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          {promoEliteOnly &&
          isSubscribed &&
          (billing?.activePlan ?? '').toLowerCase() !== 'elite' &&
          (billing?.activePlan ?? '').toLowerCase() !== 'non-subscribed' ? (
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              You&apos;re on a different plan. In-app upgrades are paused during
              this promotion. Contact support if you need to change your plan.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-3 md:items-stretch pt-2">
              {planComparisonRows.map(({ tierKey, plan }) => {
                const key = tierKey;
                const meta = PLAN_COMPARISON_BULLETS[key];
                const displayPricing = PLAN_PRICING_DISPLAY[key];
                const activeKey = (billing?.activePlan ?? '').toLowerCase();
                const isActive = activeKey === key;
                const isComingSoon = PLAN_COMING_SOON.has(key);
                const canUpgradeTo =
                  !promoEliteOnly &&
                  !isComingSoon &&
                  isSubscribed &&
                  !isActive &&
                  isPlanUpgrade(activeKey, key);
                const showChooseInitial =
                  !isSubscribed && !isActive && !isComingSoon;
                const actionBusy =
                  (showChooseInitial &&
                    !promoEliteOnly &&
                    planPurchaseLoading &&
                    clickedPurchasePlan.current === plan.id) ||
                  (showChooseInitial &&
                    promoEliteOnly &&
                    key === 'elite' &&
                    claimLoading) ||
                  (canUpgradeTo && upgradeLoading);

                return (
                  <div
                    key={tierKey}
                    className={cn(
                      'relative flex h-full min-h-0 flex-col rounded-2xl border p-5 bg-white transition-[box-shadow,background-color,border-color]',
                      meta?.recommended &&
                        !isActive &&
                        'ring-2 ring-indigo-500 border-indigo-200 shadow-sm',
                      isActive &&
                        'border-2 border-emerald-400 bg-gradient-to-b from-emerald-50/90 to-white shadow-md shadow-emerald-900/5 ring-2 ring-emerald-400/35',
                      isComingSoon && 'bg-slate-50/80'
                    )}
                  >
                    {isActive ? (
                      <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-bold bg-emerald-600 text-white pl-2 pr-2.5 py-0.5 rounded-full shadow-sm ring-2 ring-white">
                        <Check className="h-3 w-3 stroke-[3]" aria-hidden />
                      </span>
                    ) : isComingSoon ? (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-wide font-semibold bg-slate-500 text-white px-2 py-0.5 rounded-full">
                        Coming soon
                      </span>
                    ) : !isComingSoon && meta?.recommended ? (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-wide font-semibold bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                        Offer
                      </span>
                    ) : null}
                    <h3 className="font-semibold text-slate-900 text-center mt-1">
                      {meta?.title ?? plan.name}
                    </h3>
                    <div className="mt-1 mb-4 text-center">
                      {isComingSoon && displayPricing ? (
                        <>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                            Indicative pricing
                          </p>
                          {displayPricing.original !==
                          displayPricing.discounted ? (
                            <>
                              <p className="text-xs text-slate-400 line-through decoration-rose-500/70 decoration-2">
                                {formatInr(displayPricing.original)}/mo
                              </p>
                              <p className="text-sm font-semibold text-slate-700">
                                {formatInr(displayPricing.discounted)}/mo
                              </p>
                            </>
                          ) : (
                            <p className="text-sm font-semibold text-slate-700">
                              {formatInr(displayPricing.discounted)}/mo
                            </p>
                          )}
                          <p className="text-xs font-medium text-slate-500 mt-2">
                            Coming soon
                          </p>
                        </>
                      ) : promoEliteOnly && showChooseInitial ? (
                        <>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 mb-1">
                            Promotional access
                          </p>
                          <p className="text-lg font-bold text-slate-900">
                            ₹0 · 2 months
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Regularly{' '}
                            {formatInr(
                              displayPricing?.discounted ?? plan.price
                            )}
                            /mo after promo
                          </p>
                        </>
                      ) : displayPricing ? (
                        <>
                          {displayPricing.discountLabel ? (
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 mb-1">
                              Save {displayPricing.discountLabel}
                            </p>
                          ) : null}
                          {displayPricing.original !==
                          displayPricing.discounted ? (
                            <p className="text-xs text-slate-400 line-through decoration-rose-500/70 decoration-2">
                              {formatInr(displayPricing.original)}/mo
                            </p>
                          ) : null}
                          <p className="text-sm font-semibold text-slate-700">
                            {formatInr(displayPricing.discounted)}/mo
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-slate-500">
                            {formatInr(plan.price)}/mo
                          </p>
                        </>
                      )}
                    </div>
                    {isActive ? (
                      <p className="text-sm text-slate-800 text-center space-y-3">Active</p>
                    ) : null}
                    <ul className="text-xs text-slate-600 space-y-2 flex flex-col justify-end flex-1">
                      {(meta?.bullets ?? [plan.description]).map((b, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-indigo-500 shrink-0">·</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto w-full pt-4">
                      {isComingSoon ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="w-full rounded-xl"
                          disabled
                        >
                          Coming soon
                        </Button>
                      ) : isActive ? (
                        <div
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 py-2.5 text-sm font-semibold text-emerald-900"
                          role="status"
                          aria-label="This is your current plan"
                        >
                          <Check
                            className="h-4 w-4 shrink-0 text-emerald-600"
                            aria-hidden
                          />
                          Your plan
                        </div>
                      ) : canUpgradeTo ? (
                        <Button
                          className="w-full rounded-xl"
                          disabled={actionBusy}
                          onClick={() => void handleUpgradePlan(plan.id)}
                        >
                          {upgradingPlanId === plan.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            `Upgrade to ${meta?.title ?? plan.name} ${formatInr(displayPricing?.discounted ?? plan.price)}/month`
                          )}
                        </Button>
                      ) : showChooseInitial ? (
                        <Button
                          variant="outline"
                          className="w-full rounded-xl"
                          disabled={
                            promoEliteOnly && key === 'elite'
                              ? claimLoading
                              : planPurchaseLoading
                          }
                          onClick={() =>
                            promoEliteOnly && key === 'elite'
                              ? void handleClaimElite()
                              : void handlePlanPurchase(plan.id)
                          }
                        >
                          {promoEliteOnly && key === 'elite' ? (
                            claimLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Claim Elite — 2 months free'
                            )
                          ) : planPurchaseLoading &&
                            clickedPurchasePlan.current === plan.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            `Choose ${meta?.title ?? plan.name}`
                          )}
                        </Button>
                      ) : (
                        <p className="text-center text-xs text-slate-500 py-2">
                          Your current plan is already above this tier.
                          Downgrades aren&apos;t available in-app — contact
                          support if you need to change.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-center text-xs text-slate-500 pt-2">
            {promoEliteOnly
              ? 'No payment required to claim · Access lasts 2 months from claim date'
              : 'Cancel anytime · Takes effect immediately'}
          </p>
        </DialogContent>
      </Dialog>

      {/* Top-up modal */}
      {!promoEliteOnly ? (
        <Dialog open={topUpOpen} onOpenChange={setTopUpOpen}>
          <DialogContent
            showCloseButton
            className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto"
          >
            <DialogHeader>
              <DialogTitle>Top up your credits</DialogTitle>
              <DialogDescription className="text-left text-slate-600 space-y-3">
                <p>
                  Credits are used for product ads, instant posts, festive
                  campaigns, and regenerations. Valid for 30 days from purchase.
                </p>
                {/* <p className="text-xs font-medium text-amber-900 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Credits require an active subscription to use.
              </p> */}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 sm:grid-cols-2">
              {[...creditPacks]
                .sort((a, b) => a.price - b.price)
                .map((pack, packIndex) => (
                  <div
                    key={pack.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {pack.label ??
                          TOP_UP_PACK_LABELS[packIndex] ??
                          pack.name}
                      </p>
                      <p className="text-lg font-bold text-slate-900 mt-1">
                        {formatInr(pack.price)}
                      </p>
                      <p className="text-sm text-slate-600">
                        {pack.credits} credits
                      </p>
                    </div>
                    <Button
                      className="w-full rounded-xl mt-auto"
                      disabled
                      onClick={() => {
                        setSelectedCreditPack(pack);
                        void handleTopUp(pack.id);
                      }}
                    >
                      {topUpLoading && selectedCreditPack?.id === pack.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Coming Soon'
                      )}
                    </Button>
                  </div>
                ))}
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
