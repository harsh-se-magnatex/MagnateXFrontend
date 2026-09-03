'use client';

import { PageLoadingState } from '@/components/shared/PageLoadingState';
import { useAuth } from '@/src/hooks/useAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CreditCard,
  Coins,
  Clock,
  Info,
  Loader2,
  Sparkles,
  ReceiptText,
  ExternalLink,
  Wallet,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { workspacePageTitleClass } from '@/lib/workspace-ui';
import {
  PLAN_COMPARISON_BULLETS,
  PRICING_PLANS_BY_ID,
  pricingPlansForMode,
  planButtonDisplayName,
  type PlanId,
} from '@/lib/landing-pricing';
import {
  getAvailablePlansAndCreditPacks,
  getTransactions,
  type PlanSummary,
  type UserTransaction,
} from '@/src/service/api/transactionService';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/show-error-toast';
import { useUserPlanCredits } from '../../_components/UserPlanCreditsProvider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  cancelScheduledPlanChange,
  cancelSubscription,
  changeSubscriptionPlan,
  createCustomerPortalSession,
  createOrder,
  deletePaymentMethod,
  getPaymentSummary,
  previewSubscriptionPlanChange,
  revokeSubscription,
  type PaymentMethodSummary,
  type PaymentSubscriptionSummary,
  type PaymentSummaryPayload,
  type SubscriptionPlanChangePreviewPayload,
} from '@/src/service/api/paymentService';
import {
  useTimestampFormatter,
  parseTimestampInput,
  type TimestampInput,
} from '@/lib/user-timezone';
import { EmailVerificationPurchaseAlert } from '@/components/shared/EmailVerificationPurchaseAlert';
import { AccountFrozenAlert } from '@/components/shared/AccountFrozenAlert';
import {
  EMAIL_VERIFICATION_PURCHASE_MESSAGE,
  TOP_UP_REQUIRES_PLAN_MESSAGE,
  needsEmailVerificationForPurchase,
} from '@/lib/email-verification-for-purchase';
import { isPlanInactive } from '@/lib/plan-access';
import { PriceDisplay } from '@/components/pricing/price-display';

type PlanModeDisplay = 'AIManager' | 'Studio';
type PlanMode = 'auto' | 'manual';
const TOP_UP_PACK_LABELS = ['Starter', 'Basic', 'Growth', 'Business'] as const;

/**
 * Fallback when API plan docs omit credits; aligns with upgrade copy
 * and `CREDITS_BY_TIER_MODE` in `scripts/seed-plans.ts`. Manual ("Studio")
 * plans get MORE credits than Auto ("AI") plans within a tier because
 * Studio users pay for every action; AI users get most of their content
 * generated free by the daily orchestrator.
 */
const PLAN_MONTHLY_CREDITS_FALLBACK: Record<string, number> = {
  studio: 100,
  'prime-AI': 50,
  'elite-AI': 100,
  'legacy-AI': 150,
};

/** Tab labels match the public pricing page (Studio vs AI). */
const PLAN_MODE_TAB: Record<
  PlanModeDisplay,
  { label: string; sublabel: string }
> = {
  AIManager: { label: 'AI Manager', sublabel: 'Personalized AI' },
  Studio: { label: 'Studio', sublabel: 'You create every post' },
};

function planModeToDisplay(mode: PlanMode): PlanModeDisplay {
  return mode === 'auto' ? 'AIManager' : 'Studio';
}

function displayModeToPlan(mode: PlanModeDisplay): PlanMode {
  return mode === 'AIManager' ? 'auto' : 'manual';
}

const PLAN_KEY_ALIASES: Record<string, PlanId> = {
  studio: 'studio',
  'prime-ai': 'prime-AI',
  'elite-ai': 'elite-AI',
  'legacy-ai': 'legacy-AI',
  'prime-studio': 'studio',
  'elite-studio': 'studio',
  'legacy-studio': 'studio',
};

function normalizePlanKey(value: string | null | undefined): string {
  if (!value) return '';
  const key = value.toLowerCase().trim();
  return PLAN_KEY_ALIASES[key] ?? key;
}

/** Marketing display name (e.g. `prime-AI` → `Prime AI`). */
function formatPlanDisplayName(value: string | null | undefined): string {
  const key = normalizePlanKey(value) as PlanId;
  return PRICING_PLANS_BY_ID[key]?.name ?? formatTitleCase(value);
}

/** Fallback catalog used while the API plan list is loading or incomplete. */
const STATIC_PLAN_FALLBACK: Record<string, PlanSummary> = (
  Object.keys(PRICING_PLANS_BY_ID) as PlanId[]
).reduce<Record<string, PlanSummary>>((acc, planId) => {
  const landing = PRICING_PLANS_BY_ID[planId];
  acc[planId] = {
    id: planId,
    name: planId,
    price: landing.priceUsd,
  };
  return acc;
}, {});

function formatUsd(amount: number | undefined): string {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return '—';
  return `$${amount.toLocaleString('en-IN')}`;
}

function formatCurrencyMinorUnits(
  amount: number | null | undefined,
  currency: string | null | undefined
): string | null {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || !currency) {
    return null;
  }
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
    }).format(amount / 100);
  } catch {
    return `${currency.toUpperCase()} ${(amount / 100).toLocaleString()}`;
  }
}

function formatTitleCase(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function formatBillingFrequency(
  subscription: PaymentSubscriptionSummary | null | undefined
): string {
  if (!subscription?.paymentFrequencyInterval) return '—';
  const count = subscription.paymentFrequencyCount || 1;
  const interval = subscription.paymentFrequencyInterval.toLowerCase();
  if (count === 1) return `Every ${formatTitleCase(interval)}`;
  return `Every ${count} ${interval}s`;
}

function formatSubscriptionPrice(
  subscription: PaymentSubscriptionSummary | null | undefined
): string | null {
  if (!subscription) return null;
  if (
    typeof subscription.amount === 'number' &&
    Number.isFinite(subscription.amount) &&
    subscription.amountCurrency.toUpperCase() === 'INR'
  ) {
    const count = subscription.paymentFrequencyCount || 1;
    const interval = subscription.paymentFrequencyInterval.toLowerCase();
    const amount = formatUsd(subscription.amount);
    if (count === 1) return `${amount}/${interval}`;
    return `${amount}/every ${count} ${interval}s`;
  }
  const amount = formatCurrencyMinorUnits(
    subscription.recurringPreTaxAmount,
    subscription.currency
  );
  if (!amount) return null;
  const count = subscription.paymentFrequencyCount || 1;
  const interval = subscription.paymentFrequencyInterval.toLowerCase();
  if (count === 1) return `${amount}/${interval}`;
  return `${amount}/every ${count} ${interval}s`;
}

function formatPaymentChannel(summary: PaymentMethodSummary): {
  label: string;
  detail: string;
} {
  const raw = summary.paymentMethodType?.toLowerCase() ?? '';
  const isUpi =
    raw.includes('upi') || summary.paymentMethod?.toLowerCase().includes('upi');
  if (isUpi) {
    return {
      label: 'UPI',
      detail: 'UPI payment method',
    };
  }
  const network = summary.cardNetwork?.trim();
  const last = summary.cardLastFour?.trim();
  const brand = formatTitleCase(network) || 'Card';
  const type =
    formatTitleCase(summary.cardType) ||
    formatTitleCase(summary.paymentMethodType) ||
    'Payment';
  return {
    label: `${type} card`,
    detail: last ? `${brand} ••••• ${last}` : brand,
  };
}

function txnDescription(row: UserTransaction): string {
  if (row.type === 'deduction') return row.description ?? 'Credit usage';
  return row.description ?? '—';
}

function txnAmountCell(row: UserTransaction): string {
  if (row.type === 'deduction') return '—';
  return formatUsd(row.amount);
}

function planCreditsPerMonth(
  plan: PlanSummary | undefined,
  planNameKey: string
): number {
  const extra = plan as PlanSummary & {
    credits?: number;
    monthlyCredits?: number;
  };
  if (typeof extra?.monthlyCredits === 'number' && extra.monthlyCredits > 0)
    return extra.monthlyCredits;
  if (typeof extra?.credits === 'number' && extra.credits > 0)
    return extra.credits;
  return PLAN_MONTHLY_CREDITS_FALLBACK[planNameKey] ?? 150;
}

export default function BillingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fmtTimestamp = useTimestampFormatter();
  const formatFirestoreDate = (v: unknown) =>
    fmtTimestamp(v as TimestampInput, { style: 'date' });
  const formatTxnDate = (v: unknown) =>
    fmtTimestamp(v as TimestampInput, { style: 'date' });
  const formatIsoDateTime = (v: unknown) =>
    fmtTimestamp(v as TimestampInput, { style: 'datetime' });
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
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [planPurchaseLoading, setPlanPurchaseLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [deletePaymentMethodLoading, setDeletePaymentMethodLoading] =
    useState(false);
  const [cancelSubscriptionLoading, setCancelSubscriptionLoading] =
    useState(false);
  const [cancelScheduledChangeLoading, setCancelScheduledChangeLoading] =
    useState(false);
  const [revokeCancellationLoading, setRevokeCancellationLoading] =
    useState(false);
  const [selectedCreditPack, setSelectedCreditPack] = useState<{
    id: string;
    name: string;
    credits?: number;
  } | null>(null);
  const [paymentSummary, setPaymentSummary] =
    useState<PaymentSummaryPayload | null>(null);
  const [paymentSummaryLoading, setPaymentSummaryLoading] = useState(true);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  /**
   * Which half of the plan matrix (Auto vs Manual) the upgrade dialog is
   * currently showing. Defaults to the user's existing mode; otherwise Auto
   * (the recommended path).
   */
  const [upgradeMode, setUpgradeMode] = useState<PlanMode>('auto');

  // Deep-link entry: routes that send the user here to upgrade (e.g. the
  // product-tour CTA, the TopNav "Upgrade" pill, etc.) append `?upgrade=1`.
  // Pop the dialog once and strip the query so a refresh doesn't reopen it.
  useEffect(() => {
    if (searchParams?.get('upgrade') !== '1') return;
    setUpgradeOpen(true);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('upgrade');
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  }, [searchParams]);

  // Seed the upgrade-dialog tab from the user's current mode whenever it
  // changes (e.g. after a fulfillment write). New subscribers default to Auto.
  useEffect(() => {
    if (billing?.mode === 'auto' || billing?.mode === 'manual') {
      setUpgradeMode(billing.mode);
    }
  }, [billing?.mode]);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [billingHistory, setBillingHistory] = useState<UserTransaction[]>([]);
  const clickedPurchasePlan = useRef<string | null>(null);
  const clickedTopUp = useRef<string | null>(null);
  const [planChoiceBusyId, setPlanChoiceBusyId] = useState<string | null>(null);
  const [planSwitchOpen, setPlanSwitchOpen] = useState(false);
  const [planSwitchSubmitting, setPlanSwitchSubmitting] = useState(false);
  const [planSwitchTarget, setPlanSwitchTarget] = useState<{
    planId: string;
    displayTitle: string;
  } | null>(null);
  const [planSwitchPreview, setPlanSwitchPreview] =
    useState<SubscriptionPlanChangePreviewPayload | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [revokeConfirmOpen, setRevokeConfirmOpen] = useState(false);
  const [
    cancelScheduledChangeConfirmOpen,
    setCancelScheduledChangeConfirmOpen,
  ] = useState(false);
  const [deletePaymentMethodTargetId, setDeletePaymentMethodTargetId] =
    useState<string | null>(null);

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
        (r) =>
          r.type === 'purchase' || r.type === 'plan' || r.type === 'credits'
      );
      const sorted =
        purchaseLike.length > 0
          ? purchaseLike
          : rows.filter((r) => r.type !== 'deduction');
      setBillingHistory(sorted.slice(0, sorted.length));
    } catch {
      setBillingHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  const fetchPaymentSummary = useCallback(async () => {
    if (!user) return;
    try {
      setPaymentSummaryLoading(true);
      const res = await getPaymentSummary();
      setPaymentSummary(res.data);
    } catch (error: unknown) {
      console.error('Failed to fetch payment summary', error);
      setPaymentSummary(null);
    } finally {
      setPaymentSummaryLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchCreditPacks();
  }, [fetchCreditPacks]);

  useEffect(() => {
    void fetchBillingHistory();
  }, [fetchBillingHistory]);

  useEffect(() => {
    void fetchPaymentSummary();
  }, [fetchPaymentSummary]);

  const subscriptionSummary = paymentSummary?.subscription ?? null;

  const canChangePlanViaSubscription = useMemo(() => {
    if (!subscriptionSummary?.subscriptionId) return false;
    const status = (subscriptionSummary.status ?? '').toLowerCase();
    if (!['active', 'trialing'].includes(status)) return false;
    if (subscriptionSummary.cancelAtNextBillingDate) return false;
    return true;
  }, [subscriptionSummary]);

  const currentPlanKey = useMemo(() => {
    return (
      subscriptionSummary?.planName ??
      billing?.activePlan ??
      ''
    ).toLowerCase();
  }, [subscriptionSummary?.planName, billing?.activePlan]);

  const currentPlanRecord = useMemo(() => {
    const key = normalizePlanKey(currentPlanKey);
    return plans.find(
      (p) => normalizePlanKey(p.name) === key || normalizePlanKey(p.id) === key
    );
  }, [plans, currentPlanKey]);

  const displayPlanName = useMemo(() => {
    if (subscriptionSummary?.planName) {
      return formatPlanDisplayName(
        subscriptionSummary.planName.split(' ').join('-')
      );
    }
    if (!billing?.activePlan || billing.activePlan === 'non-subscribed')
      return 'No active plan';
    return formatPlanDisplayName(billing.activePlan);
  }, [subscriptionSummary?.planName, billing?.activePlan]);

  const creditsPerMonthCopy = useMemo(() => {
    const k = normalizePlanKey(currentPlanKey);
    return planCreditsPerMonth(currentPlanRecord, k);
  }, [currentPlanRecord, currentPlanKey]);

  const monthlyPriceDisplay = useMemo(() => {
    const subscriptionPrice = formatSubscriptionPrice(subscriptionSummary);
    if (subscriptionPrice) return subscriptionPrice;
    if (!currentPlanRecord || billing?.activePlan === 'non-subscribed')
      return null;

    return formatUsd(currentPlanRecord.price) + '/month';
  }, [subscriptionSummary, currentPlanRecord, billing?.activePlan]);

  const planRenewalDisplay = subscriptionSummary?.nextBillingDate
    ? formatIsoDateTime(subscriptionSummary.nextBillingDate)
    : formatFirestoreDate(billing?.planExpiresAt);
  const subscriptionStatus = formatTitleCase(subscriptionSummary?.status);
  const billingFrequencyDisplay = formatBillingFrequency(subscriptionSummary);

  /** Show platform reminder within 15 days of renewal (any active plan). */
  const showRenewalPlatformReminder = useMemo(() => {
    if (!subscriptionSummary?.nextBillingDate) return false;
    if (subscriptionSummary.cancelAtNextBillingDate) return false;
    if (billing?.activePlan === 'non-subscribed') return false;

    const renewAt = new Date(subscriptionSummary.nextBillingDate).getTime();
    if (!Number.isFinite(renewAt)) return false;
    const msUntilRenew = renewAt - Date.now();
    const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;
    return msUntilRenew >= 0 && msUntilRenew <= fifteenDaysMs;
  }, [
    billing?.activePlan,
    subscriptionSummary?.nextBillingDate,
    subscriptionSummary?.cancelAtNextBillingDate,
  ]);

  const nextPlanPlatformSelectionComplete = useMemo(() => {
    const pending = billing?.pendingSelected;
    if (!pending) return false;
    const target =
      subscriptionSummary?.pendingPlanChange?.planName ??
      billing?.pendingSelectedForPlan ??
      billing?.activePlan;
    if (!target || billing?.pendingSelectedForPlan !== target) {
      // Allow match when forPlan equals active and no scheduled change.
      if (
        billing?.pendingSelectedForPlan &&
        billing.pendingSelectedForPlan === billing.activePlan &&
        !subscriptionSummary?.pendingPlanChange?.planName
      ) {
        return (
          [pending.facebook, pending.instagram, pending.linkedin].filter(
            Boolean
          ).length >= 1
        );
      }
      return false;
    }
    return (
      [pending.facebook, pending.instagram, pending.linkedin].filter(Boolean)
        .length >= 1
    );
  }, [
    billing?.pendingSelected,
    billing?.pendingSelectedForPlan,
    billing?.activePlan,
    subscriptionSummary?.pendingPlanChange?.planName,
  ]);

  const planComparisonRows = useMemo(() => {
    const modeDisplay = planModeToDisplay(upgradeMode);
    return pricingPlansForMode(modeDisplay).map((landingPlan) => {
      const checkoutPlanId = landingPlan.id;
      const landingPlanId = landingPlan.id;
      const fromApi = plans.find(
        (p) =>
          p.id === checkoutPlanId ||
          normalizePlanKey(p.id) === landingPlanId ||
          normalizePlanKey(p.name) === landingPlanId
      );
      const plan = fromApi ?? STATIC_PLAN_FALLBACK[checkoutPlanId];
      return {
        tierKey: landingPlan.id,
        checkoutPlanId,
        landingPlanId,
        landingPlan,
        plan,
      };
    });
  }, [plans, upgradeMode]);

  const emailVerificationRequired = needsEmailVerificationForPurchase(user);
  const topUpRequiresPlan = isPlanInactive(billing);

  const handleCreditPackPurchase = async (creditPackId: string) => {
    if (!user) return;
    if (emailVerificationRequired) {
      showErrorToast(EMAIL_VERIFICATION_PURCHASE_MESSAGE);
      return;
    }
    if (topUpRequiresPlan) {
      showErrorToast(TOP_UP_REQUIRES_PLAN_MESSAGE);
      return;
    }
    if (clickedTopUp.current === creditPackId) return;
    try {
      setTopUpLoading(true);
      clickedTopUp.current = creditPackId;
      const res = await createOrder({ planId: '', creditPackId });
      window.location.href = res.data.checkoutUrl;
    } catch (error: unknown) {
      console.error('Failed to purchase credit pack', error);
      showErrorToast('Failed to purchase credit pack. Please Try Again Later.');
    } finally {
      setTopUpLoading(false);
    }
  };

  const handlePlanPurchase = async (planId: string) => {
    if (!user) return;
    if (emailVerificationRequired) {
      showErrorToast(EMAIL_VERIFICATION_PURCHASE_MESSAGE);
      return;
    }
    if (clickedPurchasePlan.current === planId) return;
    try {
      clickedPurchasePlan.current = planId;
      setPlanPurchaseLoading(true);
      const res = await createOrder({ planId, creditPackId: '' });
      const data = res.data as { checkoutUrl: string; orderId: string };
      window.location.href = data.checkoutUrl;
    } catch (error: any) {
      clickedPurchasePlan.current = null;
      showErrorToast('Failed to purchase plan. Please Try Again Later.');
    } finally {
      setPlanPurchaseLoading(false);
    }
  };

  const initiatePlanChoice = async (planId: string, displayTitle: string) => {
    if (!user) return;
    if (emailVerificationRequired) {
      showErrorToast(EMAIL_VERIFICATION_PURCHASE_MESSAGE);
      return;
    }
    if (planChoiceBusyId) return;

    if (canChangePlanViaSubscription) {
      setPlanChoiceBusyId(planId);
      try {
        const res = await previewSubscriptionPlanChange({ planId });
        setPlanSwitchTarget({ planId, displayTitle });
        setPlanSwitchPreview(res.data);
        setPlanSwitchOpen(true);
      } catch (error: unknown) {
        showErrorToast(
          'Could not preview plan change. Please Try Again Later.'
        );
      } finally {
        setPlanChoiceBusyId(null);
      }
      return;
    }

    void handlePlanPurchase(planId);
  };

  const confirmScheduledPlanSwitch = async () => {
    if (!planSwitchTarget?.planId) return;
    setPlanSwitchSubmitting(true);
    try {
      await changeSubscriptionPlan({
        planId: planSwitchTarget.planId,
      });
      toast.success(
        'Plan change scheduled for your next billing date. You keep your current plan benefits until then.'
      );
      setPlanSwitchOpen(false);
      setPlanSwitchPreview(null);
      setPlanSwitchTarget(null);
      setUpgradeOpen(false);
      void fetchPaymentSummary();
    } catch (error: unknown) {
      showErrorToast('Could not schedule plan change. Please Try Again Later.');
    } finally {
      setPlanSwitchSubmitting(false);
    }
  };

  const handleChangePaymentMethod = async () => {
    if (!user) return;
    try {
      setPortalLoading(true);
      const res = await createCustomerPortalSession();
      window.location.href = res.data.portalUrl;
    } catch (error: unknown) {
      showErrorToast('Could not open payment portal. Please Try Again Later.');
      setPortalLoading(false);
    }
  };

  const requestDeletePaymentMethod = (paymentMethodId: string) => {
    if (!user) return;
    const sub = paymentSummary?.subscription;
    if (sub && sub.canDeletePaymentMethod === false) {
      showErrorToast('Cannot remove payment method. Please Try Again Later.', {
        description:
          'You can only delete this payment method after your subscription ends.',
      });
      return;
    }
    setDeletePaymentMethodTargetId(paymentMethodId);
  };

  const handleDeletePaymentMethod = async (paymentMethodId: string) => {
    if (!user) return;
    try {
      setDeletePaymentMethodLoading(true);
      await deletePaymentMethod(paymentMethodId);
      toast.success('Payment method deleted');
      void fetchPaymentSummary();
    } catch (error: unknown) {
      showErrorToast(
        'Could not delete payment method. Please Try Again Later.'
      );
    } finally {
      setDeletePaymentMethodLoading(false);
    }
  };

  const handleCancelScheduledPlanChange = async () => {
    if (!user) return;
    try {
      setCancelScheduledChangeLoading(true);
      await cancelScheduledPlanChange();
      toast.success('Scheduled plan change cancelled.');
      void fetchPaymentSummary();
    } catch (error: unknown) {
      showErrorToast(
        'Could not cancel scheduled plan change. Please Try Again Later.'
      );
    } finally {
      setCancelScheduledChangeLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user) return;
    try {
      setCancelSubscriptionLoading(true);
      const res = await cancelSubscription();
      const cancelled = res.data;
      const endPhrase = cancelled?.nextBillingDate
        ? ` You keep full access until ${formatTxnDate(cancelled.nextBillingDate)} — you will not be charged again after that date.`
        : ' Your access continues until the end of your current billing period.';
      toast.success(
        `Cancellation is scheduled with your payment provider.${endPhrase}`
      );
      void fetchPaymentSummary();
    } catch (error: unknown) {
      showErrorToast('Could not cancel subscription. Please Try Again Later.');
    } finally {
      setCancelSubscriptionLoading(false);
    }
  };

  const handleRevokeCancellation = async () => {
    if (!user) return;
    try {
      setRevokeCancellationLoading(true);
      await revokeSubscription();
      toast.success('Cancellation revoked.');
      void fetchPaymentSummary();
    } catch (error: unknown) {
      showErrorToast('Could not revoke cancellation. Please Try Again Later.');
    } finally {
      setRevokeCancellationLoading(false);
    }
  };

  const isSubscribed =
    (subscriptionSummary?.status
      ? ['active', 'trialing'].includes(
          subscriptionSummary.status.toLowerCase()
        )
      : false) ||
    (!!billing?.activePlan && billing.activePlan !== 'non-subscribed');

  const canCancelSubscription =
    isSubscribed &&
    !paymentSummaryLoading &&
    !subscriptionSummary?.cancelAtNextBillingDate &&
    !['cancelled', 'expired'].includes(
      (subscriptionSummary?.status ?? '').toLowerCase()
    );

  if (loading) return <PageLoadingState />;
  if (!user) return null;

  if (plansLoading) {
    return <PageLoadingState className="min-h-[240px]" />;
  }

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500 pb-12">
      <div className="mb-8">
        <h1 className={workspacePageTitleClass}>Billing &amp; subscription</h1>
        <p className="mt-2 text-sm text-secondary max-w-2xl">
          Manage your plan, credits, and billing activity. Personalized AI
          continues on its own schedule; credits cover on-demand actions only.
        </p>
      </div>

      <AccountFrozenAlert className="mb-8" showBillingLink={false} />

      <EmailVerificationPurchaseAlert user={user} className="mb-8" />

      <div className="space-y-8">
        {/* Current plan */}
        <section
          className={cn(
            'glass-card rounded-3xl border border-default p-6 sm:p-8 transition-expo',
            isSubscribed && 'border-success'
          )}
        >
          <div className="flex items-center gap-3 mb-6 border-b border-default pb-4">
            <div className="p-2 bg-primary-purple/10 rounded-lg text-preview">
              <CreditCard className="h-5 w-5" />
            </div>
            <h2 className="text-section text-default">Current plan</h2>
          </div>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <p className="text-lg font-semibold text-default">
                  {displayPlanName}
                  {monthlyPriceDisplay ? (
                    <span className="font-normal text-secondary">
                      {' '}
                      — {monthlyPriceDisplay}
                    </span>
                  ) : null}
                </p>
                {isSubscribed ? (
                  <>
                    <span
                      className="inline-flex items-center rounded-full bg-success px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-success ring-1 ring-[var(--border-success)]"
                      title="This plan is currently active on your account"
                    >
                      {subscriptionStatus || 'Active'}
                    </span>
                    {subscriptionSummary?.cancelAtNextBillingDate ? (
                      <span
                        className="inline-flex items-center rounded-full bg-warning px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-warning ring-1 ring-[var(--border-warning)]"
                        title="Your billing provider has this subscription set to end after the current period"
                      >
                        Cancellation scheduled
                      </span>
                    ) : null}
                    {subscriptionSummary?.scheduledPlanChange ? (
                      <span
                        className="inline-flex items-center rounded-full bg-primary-purple/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-preview ring-1 ring-strong"
                        title="A different plan will start on your next billing date"
                      >
                        Plan change scheduled
                      </span>
                    ) : null}
                  </>
                ) : null}
              </div>
              {subscriptionSummary ? (
                <>
                  <dl className="mt-5 grid overflow-hidden rounded-2xl border border-default bg-element text-sm sm:grid-cols-3 sm:divide-x sm:divide-border">
                    <div className="border-b border-default px-4 py-3 sm:border-b-0">
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-secondary">
                        Billing cycle
                      </dt>
                      <dd className="mt-1 font-semibold text-default">
                        {billingFrequencyDisplay}
                      </dd>
                    </div>
                    <div className="border-b border-default px-4 py-3 sm:border-b-0">
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-secondary">
                        Started
                      </dt>
                      <dd className="mt-1 font-semibold text-default">
                        {formatTxnDate(
                          subscriptionSummary.createdAt ??
                            billing?.planStartedAt
                        )}
                      </dd>
                    </div>
                    <div className="border-b border-default px-4 py-3 sm:border-b-0">
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-secondary">
                        {subscriptionSummary.cancelAtNextBillingDate
                          ? 'Access until'
                          : 'Next billing'}
                      </dt>
                      <dd className="mt-1 font-semibold text-default">
                        {formatTxnDate(
                          subscriptionSummary.nextBillingDate ??
                            billing?.planExpiresAt
                        )}
                      </dd>
                    </div>
                  </dl>
                  {subscriptionSummary.scheduledPlanChange ? (
                    <div
                      className="mt-5 flex flex-col gap-3 rounded-2xl border border-primary-purple/25 bg-primary-purple/10 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                      role="region"
                      aria-label="Scheduled plan change"
                    >
                      <div className="min-w-0 space-y-2 text-sm">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-preview">
                          Scheduled plan change
                        </p>
                        <p className="font-semibold text-default">
                          Then:{' '}
                          {subscriptionSummary.scheduledPlanChange.planLabel}
                        </p>
                        <p className="text-secondary leading-relaxed">
                          Starts on{' '}
                          <span className="font-medium text-default">
                            {formatIsoDateTime(
                              subscriptionSummary.scheduledPlanChange
                                .effectiveAt
                            )}
                          </span>
                          . Until then you keep your current plan and limits.{' '}
                          Please select platforms for your next plan so renewal
                          applies the right accounts automatically.
                          <Link
                            href="/settings/next-plan-platforms"
                            className="ml-1 font-semibold text-preview underline-offset-2 hover:underline"
                          >
                            Select next-plan platforms
                          </Link>
                        </p>
                        {(subscriptionSummary.scheduledPlanChange?.addons
                          ?.length ?? 0) > 0 ? (
                          <ul className="text-xs text-secondary list-disc pl-4 space-y-0.5">
                            {subscriptionSummary.scheduledPlanChange?.addons?.map(
                              (a) => (
                                <li key={a.addonId}>
                                  {a.name} × {a.quantity}
                                </li>
                              )
                            )}
                          </ul>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="shrink-0 rounded-full border-danger bg-transparent text-danger hover:bg-danger hover:text-danger"
                        disabled={
                          cancelScheduledChangeLoading ||
                          !!subscriptionSummary.cancelAtNextBillingDate
                        }
                        title={
                          subscriptionSummary.cancelAtNextBillingDate
                            ? 'Cancel subscription cancellation first if you need to change plans.'
                            : undefined
                        }
                        onClick={() =>
                          setCancelScheduledChangeConfirmOpen(true)
                        }
                      >
                        {cancelScheduledChangeLoading ? (
                          <Loader2
                            className="h-4 w-4 animate-spin"
                            aria-hidden
                          />
                        ) : null}
                        Cancel scheduled change
                      </Button>
                    </div>
                  ) : null}
                  {showRenewalPlatformReminder ? (
                    <div
                      className="mt-5 rounded-2xl border border-warning bg-warning px-4 py-4 text-sm text-warning ring-1 ring-[var(--border-warning)]"
                      role="status"
                    >
                      <p className="text-[11px] font-bold uppercase tracking-wide text-warning">
                        Before your next renewal
                      </p>
                      <p className="mt-2 leading-relaxed text-warning">
                        Your plan renews on{' '}
                        <span className="font-semibold text-warning">
                          {formatTxnDate(subscriptionSummary.nextBillingDate)}
                        </span>
                        . For a smoother experience, select the platforms you
                        want for your next plan now
                        {nextPlanPlatformSelectionComplete
                          ? ' — you already have a next-cycle selection saved'
                          : ''}
                        . If you skip this, we will continue with your current
                        platforms.
                      </p>
                      <Button
                        asChild
                        size="sm"
                        className="mt-3 rounded-full bg-[var(--amber-9)] text-white hover:bg-warning"
                      >
                        <Link href="/settings/next-plan-platforms">
                          {nextPlanPlatformSelectionComplete
                            ? 'Review next-plan platforms'
                            : 'Select next-plan platforms'}
                        </Link>
                      </Button>
                    </div>
                  ) : null}
                </>
              ) : isSubscribed &&
                (billing?.planStartedAt || billing?.planExpiresAt) ? (
                <dl className="mt-5 grid overflow-hidden rounded-2xl border border-default bg-element text-sm sm:grid-cols-3 sm:divide-x sm:divide-border">
                  <div className="border-b border-default px-4 py-3 sm:border-b-0">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-secondary">
                      Billing cycle
                    </dt>
                    <dd className="mt-1 font-semibold text-default">Monthly</dd>
                  </div>
                  <div className="border-b border-default px-4 py-3 sm:border-b-0">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-secondary">
                      Started
                    </dt>
                    <dd className="mt-1 font-semibold text-default">
                      {billing?.planStartedAt
                        ? formatFirestoreDate(billing.planStartedAt)
                        : '—'}
                    </dd>
                  </div>
                  <div className="border-b border-default px-4 py-3 sm:border-b-0">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-secondary">
                      Access until
                    </dt>
                    <dd className="mt-1 font-semibold text-default">
                      {billing?.planExpiresAt
                        ? formatFirestoreDate(billing.planExpiresAt)
                        : '—'}
                    </dd>
                  </div>
                </dl>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
              <Button
                type="button"
                className="rounded-full"
                onClick={() => setUpgradeOpen(true)}
              >
                Manage plan
              </Button>
              {isSubscribed && subscriptionSummary?.subscriptionId ? (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  title={
                    subscriptionSummary?.cancelAtNextBillingDate
                      ? 'Cancellation is already scheduled.'
                      : undefined
                  }
                  onClick={() => {
                    if (subscriptionSummary?.cancelAtNextBillingDate) {
                      setRevokeConfirmOpen(true);
                    } else {
                      setCancelConfirmOpen(true);
                    }
                  }}
                >
                  {cancelSubscriptionLoading || revokeCancellationLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  {subscriptionSummary?.cancelAtNextBillingDate
                    ? 'Revoke cancellation'
                    : 'Cancel subscription'}
                </Button>
              ) : null}
            </div>
          </div>
          {subscriptionSummary?.cancelAtNextBillingDate ? (
            <div
              className="mt-6 flex gap-3 rounded-2xl border border-success bg-success px-4 py-4 text-success ring-1 ring-[var(--border-success)] sm:px-5"
              role="status"
              aria-live="polite"
            >
              <div className="mt-0.5 shrink-0 text-success" aria-hidden>
                <Info className="h-5 w-5" />
              </div>
              <div className="min-w-0 space-y-1 text-sm">
                <p className="font-semibold text-success">
                  Cancellation is scheduled — you&apos;re all set
                </p>
                <p className="leading-relaxed text-success">
                  This is saved as a &ldquo;cancel at end of billing
                  period&rdquo; on your payment provider — same as when you
                  confirm in their billing flow. You keep full access until{' '}
                  <span className="font-semibold text-success">
                    {formatTxnDate(subscriptionSummary.nextBillingDate)}
                  </span>
                  , and you will not be charged again for this plan after that
                  date.
                </p>
              </div>
            </div>
          ) : null}
        </section>

        {/* Payment method */}
        <section className="glass-card rounded-3xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-default pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-purple/10 rounded-lg text-preview">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-section text-default">Payment method</h2>
                <p className="text-sm text-secondary mt-0.5">
                  The latest method used for your subscription or credit top-up.
                </p>
              </div>
            </div>
          </div>
          {paymentSummaryLoading ? (
            <div className="flex justify-center py-10">
              <Spinner className="size-6" />
            </div>
          ) : !paymentSummary ? (
            <p className="text-sm text-secondary">
              Couldn&apos;t load payment details. Try again later.
            </p>
          ) : paymentSummary.dodoLinked && !paymentSummary.data ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-default">
                No saved payment method
              </p>
              <p className="text-sm text-secondary">
                Use the billing portal to add a payment method for future
                purchases or renewals.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-3 rounded-full"
                onClick={handleChangePaymentMethod}
                disabled={portalLoading}
              >
                {portalLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Open billing portal
              </Button>
            </div>
          ) : !paymentSummary.dodoLinked ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-default">
                No payment method
              </p>
              <p className="text-sm text-secondary">
                After you complete a purchase through our checkout, your saved
                payment method appears here.
              </p>
            </div>
          ) : (
            (() => {
              const d = paymentSummary.data;
              if (!d) {
                return (
                  <p className="text-sm text-secondary">
                    Payment details are not available.
                  </p>
                );
              }
              const channel = formatPaymentChannel(d);
              const canDeletePaymentMethod =
                paymentSummary.subscription?.canDeletePaymentMethod === true;
              const deleteDisabled =
                deletePaymentMethodLoading || !d.paymentMethodId;
              return (
                <div className="rounded-2xl border border-default bg-element p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-default text-link ring-1 ring-border">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-preview">
                          Saved payment
                        </p>
                        <p className="mt-2 text-2xl font-semibold tracking-tight text-default">
                          {channel.detail}
                        </p>
                        <p className="mt-1 text-sm text-secondary">
                          {channel.label}
                        </p>
                      </div>
                    </div>
                    <span className="w-fit rounded-full bg-success px-3 py-1 text-xs font-semibold text-success ring-1 ring-[var(--border-success)]">
                      Active
                    </span>
                  </div>

                  <div className="mt-6 flex flex-col gap-4 border-t border-default pt-5 lg:flex-row lg:items-end lg:justify-between">
                    <dl className="grid flex-1 grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                      {d.cardHolderName ? (
                        <div>
                          <dt className="text-secondary">Cardholder</dt>
                          <dd className="mt-1 font-medium text-default">
                            {d.cardHolderName}
                          </dd>
                        </div>
                      ) : null}
                      <div>
                        <dt className="text-secondary">Added on</dt>
                        <dd className="mt-1 font-medium text-default">
                          {formatIsoDateTime(d.createdAt)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-secondary">Processed by</dt>
                        <dd className="mt-1 font-medium text-default">
                          Dodo Payments
                        </dd>
                      </div>
                    </dl>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full bg-default"
                        onClick={handleChangePaymentMethod}
                        disabled={portalLoading}
                      >
                        {portalLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : null}
                        Change payment method
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        className="rounded-full"
                        onClick={() =>
                          requestDeletePaymentMethod(d.paymentMethodId)
                        }
                        disabled={deleteDisabled}
                        title={
                          canDeletePaymentMethod
                            ? undefined
                            : 'You can only delete this after your subscription ends.'
                        }
                      >
                        {deletePaymentMethodLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Delete
                      </Button>
                    </div>
                  </div>
                  {!canDeletePaymentMethod ? (
                    <p className="mt-3 text-xs text-secondary">
                      You can only delete this payment method after your
                      subscription ends.
                    </p>
                  ) : null}
                </div>
              );
            })()
          )}
        </section>

        {/* Credits — planCredits / topupCredits (UserDocument pools) */}
        <section className="glass-card rounded-3xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 border-b border-default pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning rounded-lg text-warning">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-section text-default">Credits balance</h2>
                <p className="text-sm text-secondary mt-0.5">
                  Total usable:{' '}
                  <span className="font-semibold tabular-nums text-default">
                    {billingLoading ? '…' : (billing?.credits ?? '—')}
                  </span>
                  {!billingLoading && billing != null ? (
                    <span className="text-secondary"> credits</span>
                  ) : null}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0 self-start">
              <Button
                type="button"
                className="rounded-full"
                onClick={() => setTopUpOpen(true)}
                disabled={topUpRequiresPlan || emailVerificationRequired}
              >
                Top up credits
              </Button>
              {topUpRequiresPlan ? (
                <p className="text-xs text-warning max-w-[16rem] sm:text-right">
                  {TOP_UP_REQUIRES_PLAN_MESSAGE}
                </p>
              ) : emailVerificationRequired ? (
                <p className="text-xs text-warning max-w-[16rem] sm:text-right">
                  {EMAIL_VERIFICATION_PURCHASE_MESSAGE}
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-warning bg-warning overflow-hidden divide-y divide-border/60">
            {/* Subscription (plan) pool */}
            <div className="p-4 sm:p-5">
              <p className="text-xs font-medium text-warning uppercase tracking-wide">
                Plan credits
              </p>
              <p className="text-xs text-warning mt-1 mb-3">
                Included with your subscription; typically aligns with your
                billing period.
              </p>
              <p className="text-2xl font-bold text-default tabular-nums">
                {billingLoading ? '…' : (billing?.planCredits ?? '—')}
                {!billingLoading && billing != null ? (
                  <span className="text-base font-semibold text-secondary ml-2">
                    credits
                  </span>
                ) : null}
              </p>
              <p className="text-sm text-secondary flex items-start gap-2 mt-3">
                <Clock className="h-4 w-4 shrink-0 mt-0.5 text-secondary" />
                <span>
                  {(() => {
                    const expiry = parseTimestampInput(
                      billing?.planCreditsExpiresAt as TimestampInput
                    );
                    return expiry && expiry.getTime() < Date.now() ? (
                      <span className="text-danger">Expired on</span>
                    ) : (
                      'Expires / resets'
                    );
                  })()}{' '}
                  <span className="font-medium text-default">
                    {formatFirestoreDate(billing?.planCreditsExpiresAt ?? null)}
                  </span>
                </span>
              </p>
            </div>

            {/* Top-up pool */}
            <div className="p-4 sm:p-5 bg-element">
              <p className="text-xs font-medium text-preview uppercase tracking-wide">
                Top-up credits
              </p>
              <p className="text-xs text-preview mt-1 mb-3">
                From purchased credit packs; separate pool from plan credits.
              </p>
              <p className="text-2xl font-bold text-default tabular-nums">
                {billingLoading
                  ? '…'
                  : billing?.usesSplitCreditPools === true
                    ? (billing.topupCredits ?? 0)
                    : 0}
                {!billingLoading && billing != null ? (
                  <span className="text-base font-semibold text-secondary ml-2">
                    credits
                  </span>
                ) : null}
              </p>
              <p className="text-sm text-secondary flex items-start gap-2 mt-3">
                <Clock className="h-4 w-4 shrink-0 mt-0.5 text-secondary" />
                {billing?.isTopupCreditsExpired ? (
                  <span className="text-sm text-secondary">
                    Top-up credits expired
                  </span>
                ) : null}
                {!billing?.isTopupCreditsExpired ? (
                  <span>
                    Expires on{' '}
                    <span className="font-medium text-default">
                      {billing?.usesSplitCreditPools === true
                        ? formatFirestoreDate(
                            billing?.topupCreditsExpiresAt ?? null
                          )
                        : '—'}
                    </span>
                  </span>
                ) : null}
              </p>
            </div>
          </div>
        </section>

        {/* Explainer */}
        <section className="glass-card rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-element rounded-lg text-default">
              <Sparkles className="h-5 w-5" />
            </div>
            <h2 className="text-section text-default">Credit usage</h2>
          </div>
          <p className="text-sm text-secondary mb-4">
            Credit used per post by <strong>Manual Trigger</strong>
          </p>
          <ul className="text-sm text-default space-y-2 list-none pl-0">
            <li>· Product Posts: 4 credits</li>
            <li>· Campaign post: 3 credits per post</li>
            <li>· Create Post: 2 credits</li>
            <li>· Occasion Posts: 2 credits</li>
            <li>· Carousel: 3 credits per slide</li>
            <li>· Video Generation: 100 credits</li>
            <li>· Regeneration: 1 credit (First regen free)</li>
          </ul>
        </section>

        {/* Billing history */}
        <section className="glass-card rounded-3xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-default pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-element rounded-lg text-default">
                <ReceiptText className="h-5 w-5" />
              </div>
              <h2 className="text-section text-default">Billing history</h2>
            </div>
            <Link
              href="/settings/transactions"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-preview hover:text-preview hover:underline"
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
            <p className="text-sm text-secondary py-6 text-center">
              No billing entries yet. Purchases and top-ups will appear here —{' '}
              <Link
                href="/settings/transactions"
                className="font-medium text-preview hover:underline"
              >
                open transaction history
              </Link>
              .
            </p>
          ) : (
            <Table
              containerClassName="max-h-80 overflow-y-auto custom-scrollbar -mx-1 px-1"
              className="border-separate border-spacing-0"
            >
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="sticky top-0 z-10 bg-default text-secondary">
                    Date
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-default text-secondary">
                    Description
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-default text-secondary text-right">
                    Amount
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-default text-secondary text-right">
                    Invoice
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingHistory.map((row, index) => (
                  <TableRow key={`${txnDescription(row)}-${index}`}>
                    <TableCell className="text-default tabular-nums whitespace-nowrap">
                      {formatTxnDate(row.createdAt)}
                    </TableCell>
                    <TableCell className="text-default max-w-[220px] truncate sm:max-w-[320px]">
                      {txnDescription(row)}
                    </TableCell>
                    <TableCell className="text-right text-default tabular-nums">
                      {txnAmountCell(row)}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.invoiceUrl ? (
                        <Link
                          href={row.invoiceUrl}
                          target="_blank"
                          className="text-sm font-medium text-preview hover:underline"
                        >
                          View
                        </Link>
                      ) : (
                        <span className="text-sm text-secondary">
                          Not available
                        </span>
                      )}
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
            <DialogTitle className="text-lg sm:text-xl text-default">
              Choose your plan
            </DialogTitle>
            <DialogDescription className="text-secondary text-left space-y-2">
              {billing?.activePlan === 'non-subscribed' ? (
                <span>
                  You do not have an active subscription yet. Choose a plan to
                  unlock manual creation and scheduling across all three
                  platforms, plus monthly credits.
                </span>
              ) : (
                <span>
                  Your current plan includes {creditsPerMonthCopy}{' '}
                  credits/month. Manual creation and scheduling are available
                  across Facebook, Instagram, and LinkedIn on every paid plan.
                </span>
              )}
              <span>
                AI Manager tiers differ by how many selected platforms their AI Manager can
                automate.
              </span>
            </DialogDescription>
          </DialogHeader>

          {/* Mode toggle: Studio vs AI — same labels as the public pricing page. */}
          <div
            role="tablist"
            aria-label="Plan mode"
            className="flex rounded-xl w-full justify-center p-1 border border-default self-center"
          >
            {(['AIManager', 'Studio'] as const).map((mode) => {
              const selected = planModeToDisplay(upgradeMode) === mode;
              const { label, sublabel } = PLAN_MODE_TAB[mode];
              return (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setUpgradeMode(displayModeToPlan(mode))}
                  className={cn(
                    'min-w-[10rem] rounded-full px-4 py-2 text-sm font-semibold transition-expo',
                    selected
                      ? 'bg-default text-default ring-1 ring-border'
                      : 'text-secondary hover:text-default hover:bg-hover'
                  )}
                >
                  <span className="block leading-none">{label}</span>
                  <span className="mt-0.5 block text-[10px] font-medium opacity-80">
                    {sublabel}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            className={`pt-2 ${upgradeMode === 'auto' ? 'grid gap-4 md:grid-cols-3 md:items-stretch ' : 'flex w-full justify-center items-center'}`}
          >
            {planComparisonRows.map(
              ({
                tierKey,
                checkoutPlanId,
                landingPlanId,
                landingPlan,
                plan,
              }) => {
                const meta = PLAN_COMPARISON_BULLETS[landingPlanId];
                const activeKey = normalizePlanKey(billing?.activePlan ?? '');
                const isActive = activeKey === landingPlanId;
                const displayPrice = landingPlan.priceUsd;
                return (
                  <div
                    key={tierKey}
                    className={cn(
                      'relative flex h-full min-h-0 flex-col rounded-2xl border border-default p-5 bg-default transition-[box-,background-color,border-color]',
                      upgradeMode === 'manual' && 'max-w-[35%]',
                      isActive &&
                        'border-2 border-success bg-gradient-to-b from-[var(--green-9)] to-card ring-2 ring-[var(--border-success)]',
                      !isActive &&
                        landingPlan.highlighted &&
                        'border-2 border-primary/50 bg-gradient-to-b from-primary/10 to-card ring-2 ring-strong'
                    )}
                  >
                    {isActive ? (
                      <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-bold bg-[var(--green-9)] text-white pl-2 pr-2.5 py-0.5 rounded-full ring-2 ring-white">
                        <Check className="h-3 w-3 stroke-[3]" aria-hidden />
                      </span>
                    ) : landingPlan.badge ? (
                      <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 inline-flex h-5 items-center rounded-full border border-preview bg-preview px-2.5 text-eyebrow text-preview">
                        {landingPlan.badge}
                      </span>
                    ) : null}
                    <h3 className="text-subsection text-default mt-1">
                      {landingPlan.name}
                    </h3>
                    <p className="text-sm text-secondary text-center mt-1 leading-snug">
                      {landingPlan.mode === 'AIManager'
                        ? 'AI Manager'
                        : 'Manual Plan'}
                    </p>
                    <div className="mt-1 mb-4 text-center">
                      <p className="text-sm font-semibold text-default">
                        <PriceDisplay usd={displayPrice} period="/mo" />
                      </p>
                    </div>
                    {isActive ? (
                      <p className="text-sm text-default text-center space-y-3">
                        Active
                      </p>
                    ) : null}
                    <ul className="text-xs text-secondary space-y-2 flex flex-col justify-end flex-1">
                      {(
                        meta?.bullets ??
                        landingPlan.lines.map((line) => line.text)
                      ).map((b, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-link shrink-0">·</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto w-full pt-4">
                      {isActive && (
                        <div
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-success bg-success py-2.5 text-sm font-semibold text-success"
                          role="status"
                          aria-label="This is your current plan"
                        >
                          <Check
                            className="h-4 w-4 shrink-0 text-success"
                            aria-hidden
                          />
                          Your plan
                        </div>
                      )}
                      {!isActive && (
                        <div className="space-y-2">
                          <Button
                            variant="outline"
                            className="h-auto w-full flex-col gap-0.5 rounded-full py-3"
                            disabled={
                              emailVerificationRequired ||
                              planPurchaseLoading ||
                              planChoiceBusyId === plan.id
                            }
                            onClick={() =>
                              void initiatePlanChoice(plan.id, landingPlan.name)
                            }
                          >
                            {planChoiceBusyId === plan.id ? (
                              <>
                                <Loader2
                                  className="h-4 w-4 shrink-0 animate-spin"
                                  aria-hidden
                                />
                                Preparing preview…
                              </>
                            ) : planPurchaseLoading &&
                              clickedPurchasePlan.current === plan.id ? (
                              <>
                                <Loader2
                                  className="h-4 w-4 shrink-0 animate-spin"
                                  aria-hidden
                                />
                                Opening checkout…
                              </>
                            ) : (
                              <>
                                <span className="text-sm font-semibold leading-tight text-default">
                                  Start{' '}
                                  {planButtonDisplayName(landingPlan.name)}
                                </span>
                              </>
                            )}
                          </Button>
                          {emailVerificationRequired ? (
                            <p className="text-[11px] leading-snug text-warning text-center">
                              {EMAIL_VERIFICATION_PURCHASE_MESSAGE}
                            </p>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>

          {emailVerificationRequired ? (
            <p className="rounded-xl border border-warning bg-warning px-3 py-2 text-center text-xs font-medium text-warning">
              {EMAIL_VERIFICATION_PURCHASE_MESSAGE}
            </p>
          ) : null}

          <p className="text-center text-xs text-secondary pt-2">
            {canChangePlanViaSubscription ? (
              <>
                Plan switches apply on your next billing date. You keep your
                current plan until then.
              </>
            ) : (
              <>
                Your first paid invoice matches whichever plan you choose above.
              </>
            )}
          </p>
          {/* Prices here are listed in USD, the settlement currency. Marketing
              pages may show an approximate local figure, so say plainly what
              determines the real charge before sending anyone to Dodo. */}
          <p className="text-center text-xs text-tertiary">
            Plan prices are shown in USD. Your final amount and currency are set
            at checkout by Dodo Payments, our Merchant of Record, and may differ
            depending on your billing country, local taxes, and exchange rate.
          </p>
        </DialogContent>
      </Dialog>

      <Dialog
        open={planSwitchOpen}
        onOpenChange={(open) => {
          setPlanSwitchOpen(open);
          if (!open) {
            setPlanSwitchPreview(null);
            setPlanSwitchTarget(null);
          }
        }}
      >
        <DialogContent
          showCloseButton
          className="sm:max-w-md rounded-2xl max-h-[90vh] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle>Confirm plan change</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-secondary space-y-3">
            {planSwitchPreview && planSwitchTarget ? (
              <>
                <p>
                  You&apos;re switching to{' '}
                  <strong className="text-default">
                    {planSwitchPreview.targetPlanNiceName}
                  </strong>
                  . This is scheduled for your{' '}
                  <strong className="text-default">next billing date</strong>.
                  Until then, your subscription and limits stay exactly as they
                  are today.
                </p>
                <div className="rounded-xl border border-default bg-element px-4 py-3 text-sm space-y-2">
                  <div className="flex justify-between gap-2 flex-wrap">
                    <span className="text-secondary shrink-0">
                      Estimated charge now
                    </span>
                    <span className="font-semibold tabular-nums text-default text-right">
                      {formatCurrencyMinorUnits(
                        planSwitchPreview.immediateCharge.summary.totalAmount,
                        planSwitchPreview.immediateCharge.summary.currency
                      ) ?? '—'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 flex-wrap">
                    <span className="text-secondary shrink-0">
                      New plan renewal (before tax lines)
                    </span>
                    <span className="font-semibold tabular-nums text-default text-right">
                      {formatCurrencyMinorUnits(
                        planSwitchPreview.newPlan.recurringPreTaxAmount,
                        planSwitchPreview.newPlan.currency
                      ) ?? '—'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 flex-wrap">
                    <span className="text-secondary shrink-0">
                      Next renewal date (preview)
                    </span>
                    <span className="tabular-nums text-default text-right">
                      {formatIsoDateTime(
                        planSwitchPreview.newPlan.nextBillingDate
                      )}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-secondary">
                  Figures come from your payment provider preview. Taxes and
                  final amounts may vary.
                </p>
              </>
            ) : (
              <p>Loading preview…</p>
            )}
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={planSwitchSubmitting}
              className="rounded-full"
              onClick={() => setPlanSwitchOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-full gap-2"
              disabled={
                planSwitchSubmitting || !planSwitchPreview?.subscriptionId
              }
              onClick={() => void confirmScheduledPlanSwitch()}
            >
              {planSwitchSubmitting ? (
                <Loader2
                  className="h-4 w-4 shrink-0 animate-spin"
                  aria-hidden
                />
              ) : null}
              {planSwitchSubmitting ? 'Scheduling…' : 'Schedule plan change'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletePaymentMethodTargetId}
        onOpenChange={(open) => {
          if (deletePaymentMethodLoading) return;
          if (!open) setDeletePaymentMethodTargetId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete saved payment method?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the saved card or UPI from your account. You can add
              a new method later from the billing portal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePaymentMethodLoading}>
              Keep it
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletePaymentMethodLoading}
              onClick={(event) => {
                event.preventDefault();
                const id = deletePaymentMethodTargetId;
                if (!id) return;
                void (async () => {
                  await handleDeletePaymentMethod(id);
                  setDeletePaymentMethodTargetId(null);
                })();
              }}
            >
              {deletePaymentMethodLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={cancelScheduledChangeConfirmOpen}
        onOpenChange={(open) => {
          if (cancelScheduledChangeLoading) return;
          setCancelScheduledChangeConfirmOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel scheduled plan change?</AlertDialogTitle>
            <AlertDialogDescription>
              You will stay on your current plan through your next renewal
              unless you schedule a different change.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelScheduledChangeLoading}>
              Keep change scheduled
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={cancelScheduledChangeLoading}
              onClick={(event) => {
                event.preventDefault();
                void (async () => {
                  await handleCancelScheduledPlanChange();
                  setCancelScheduledChangeConfirmOpen(false);
                })();
              }}
            >
              {cancelScheduledChangeLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              Cancel scheduled change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={revokeConfirmOpen}
        onOpenChange={(open) => {
          if (revokeCancellationLoading) return;
          setRevokeConfirmOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke cancellation?</AlertDialogTitle>
            <AlertDialogDescription>
              Your subscription will continue to renew. You will be charged for
              your current plan at the end of your current billing period.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokeCancellationLoading}>
              Keep cancellation
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={revokeCancellationLoading}
              onClick={(event) => {
                event.preventDefault();
                void (async () => {
                  await handleRevokeCancellation();
                  setRevokeConfirmOpen(false);
                })();
              }}
            >
              {revokeCancellationLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              Revoke cancellation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={cancelConfirmOpen}
        onOpenChange={(open) => {
          if (cancelSubscriptionLoading) return;
          setCancelConfirmOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              You keep access until the end of your current billing period
              {subscriptionSummary?.nextBillingDate ? (
                <>
                  {' '}
                  (
                  <span className="font-medium text-default">
                    {formatTxnDate(subscriptionSummary.nextBillingDate)}
                  </span>
                  )
                </>
              ) : null}
              . You will not be charged again for this plan after that date.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelSubscriptionLoading}>
              Keep subscription
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={cancelSubscriptionLoading}
              onClick={(event) => {
                event.preventDefault();
                void (async () => {
                  await handleCancelSubscription();
                  setCancelConfirmOpen(false);
                })();
              }}
            >
              {cancelSubscriptionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              Cancel subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={topUpOpen} onOpenChange={setTopUpOpen}>
        <DialogContent
          showCloseButton
          className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle>Top up your credits</DialogTitle>
            <DialogDescription className="text-left text-secondary space-y-3">
              <p>
                Credits are used for product ads, instant posts, festive
                campaigns, and regenerations. Valid for 30 days from purchase.
              </p>
              {topUpRequiresPlan ? (
                <p className="text-xs font-medium text-warning bg-warning border border-warning rounded-lg px-3 py-2">
                  {TOP_UP_REQUIRES_PLAN_MESSAGE}
                </p>
              ) : emailVerificationRequired ? (
                <p className="text-xs font-medium text-warning bg-warning border border-warning rounded-lg px-3 py-2">
                  {EMAIL_VERIFICATION_PURCHASE_MESSAGE}
                </p>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            {[...creditPacks]
              .sort((a, b) => a.price - b.price)
              .map((pack, packIndex) => (
                <div
                  key={pack.id}
                  className="rounded-2xl border border-default bg-default p-4 flex flex-col gap-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-default">
                      {pack.label ?? TOP_UP_PACK_LABELS[packIndex] ?? pack.name}
                    </p>
                    <p className="text-lg font-bold text-default mt-1">
                      <PriceDisplay usd={pack.price} />
                    </p>
                    <p className="text-sm text-secondary">
                      {pack.credits} credits
                    </p>
                  </div>
                  <div className="mt-auto space-y-2">
                    <Button
                      className="w-full rounded-full"
                      disabled={
                        topUpRequiresPlan ||
                        emailVerificationRequired ||
                        topUpLoading
                      }
                      onClick={() => {
                        setSelectedCreditPack(pack);
                        void handleCreditPackPurchase(pack.id);
                      }}
                    >
                      {topUpLoading && selectedCreditPack?.id === pack.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Purchase'
                      )}
                    </Button>
                    {topUpRequiresPlan ? (
                      <p className="text-[11px] leading-snug text-warning text-center">
                        {TOP_UP_REQUIRES_PLAN_MESSAGE}
                      </p>
                    ) : emailVerificationRequired ? (
                      <p className="text-[11px] leading-snug text-warning text-center">
                        {EMAIL_VERIFICATION_PURCHASE_MESSAGE}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
          </div>
          <p className="text-center text-xs text-tertiary pt-1">
            Pack prices are shown in USD. Your final amount and currency are set
            at checkout by Dodo Payments, our Merchant of Record, and may differ
            depending on your billing country, local taxes, and exchange rate.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
