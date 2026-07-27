import { apiDelete, apiGet, apiPost } from '@/lib/api-client';
import type { ApiEnvelope } from '@/lib/api-types';

/** Card / UPI details returned from GET /api/v1/payment/summary when `dodoLinked` is true. */
export type PaymentMethodSummary = {
  paymentMethodId: string;
  paymentMethod: string;
  paymentMethodType: string;
  createdAt: string;
  cardLastFour: string | null;
  cardNetwork: string | null;
  cardType: string | null;
  cardHolderName: string | null;
  expiryMonth: string | null;
  expiryYear: string | null;
  recurringEnabled: boolean | null;
};

export type ScheduledPlanAddonSummary = {
  addonId: string;
  name: string;
  quantity: number;
};

export type ScheduledPlanChangeSummary = {
  id: string;
  productId: string;
  quantity: number;
  effectiveAt: string;
  createdAt: string;
  productName: string | null;
  productDescription: string | null;
  /** Display name (normalized tier or Dodo product name). */
  planLabel: string;
  addons: ScheduledPlanAddonSummary[];
};

export type PaymentSubscriptionSummary = {
  subscriptionId: string;
  status: string;
  planName: string | null;
  productId: string;
  amount: number | null;
  amountCurrency: string;
  recurringPreTaxAmount: number;
  taxInclusive: boolean;
  currency: string;
  quantity: number;
  createdAt: string;
  expiresAt: string;
  nextBillingDate: string;
  previousBillingDate: string;
  paymentFrequencyInterval: string;
  paymentFrequencyCount: number;
  subscriptionPeriodInterval: string;
  subscriptionPeriodCount: number;
  cancelAtNextBillingDate: boolean;
  cancelledAt: string | null;
  paymentMethodId: string | null;
  canDeletePaymentMethod: boolean;
  /** Next-cycle plan change from Dodo, if any. */
  scheduledPlanChange?: ScheduledPlanChangeSummary | null;
  /** Our Firestore pending plan change (source of truth for planName). */
  pendingPlanChange?: {
    productId: string | null;
    planId: string | null;
    planName: string | null;
    previousPlan: string | null;
  } | null;
};

export type PaymentSummaryPayload = {
  dodoLinked: boolean;
  data?: PaymentMethodSummary | null;
  subscription?: PaymentSubscriptionSummary | null;
};

export const createOrder = async ({planId, creditPackId}: {planId: string, creditPackId: string}) => {
  return apiPost<ApiEnvelope<{ checkoutUrl: string, orderId: string }>>(
    '/api/v1/payment/create-order',
    { planId, creditPackId }
  );
};

export const createTestOrder = async (dodoProductId: string) => {
  return apiPost<ApiEnvelope<{ checkoutUrl: string; orderId: string }>>(
    '/api/v1/payment/create-test-order',
    { dodoProductId },
  );
};

export const getPaymentSummary = async () => {
  return apiGet<ApiEnvelope<PaymentSummaryPayload>>('/api/v1/payment/summary');
};

export const createCustomerPortalSession = async () => {
  return apiPost<ApiEnvelope<{ portalUrl: string }>>(
    '/api/v1/payment/portal-session',
    {}
  );
};

export const cancelSubscription = async () => {
  return apiPost<
    ApiEnvelope<{
      subscriptionId: string;
      status: string;
      cancelAtNextBillingDate: boolean;
      nextBillingDate: string | null;
    }>
  >('/api/v1/payment/cancel-subscription', {});
};

export const revokeSubscription = async () => {
  return apiPost<ApiEnvelope<{ success: boolean }>>(
    '/api/v1/payment/revoke-subscription',
  );
};
export const deletePaymentMethod = async (paymentMethodId: string) => {
  return apiDelete<ApiEnvelope<{ success: boolean }>>(
    `/api/v1/payment/payment-methods/${encodeURIComponent(paymentMethodId)}`
  );
};

/** Maps to Dodo [cancel scheduled plan change](https://docs.dodopayments.com/api-reference/subscriptions/cancel-change-plan). */
export const cancelScheduledPlanChange = async () => {
  return apiDelete<ApiEnvelope<{ success: boolean }>>(
    '/api/v1/payment/subscription/scheduled-plan-change'
  );
};

export type ReconcileCheckoutPayload = {
  orderStatus: 'pending' | 'paid' | 'failed';
  orderId: string;
  sessionPaymentStatus?: string | null;
};

/** Confirms checkout server-side (fast path before webhook). Idempotent. */
export const reconcileCheckoutSession = async (params: {
  sessionId?: string;
  orderId?: string;
}) => {
  return apiPost<ApiEnvelope<ReconcileCheckoutPayload>>(
    '/api/v1/payment/reconcile-checkout',
    params
  );
};

export const getOrderPaymentStatus = async (orderId: string) => {
  return apiGet<ApiEnvelope<{ orderId: string; status: string }>>(
    `/api/v1/payment/orders/${encodeURIComponent(orderId)}/status`
  );
};

/** Mirrors backend `serializeSubscriptionPlanChangePreview` (Dodo preview-change-plan). */
export type SubscriptionPlanPreviewLineItem =
  | {
      type: 'subscription';
      name: string;
      quantity: number;
      unitPrice: number;
      currency: string;
      tax: number | null;
      prorationFactor: number;
    }
  | {
      type: 'addon';
      name: string;
      quantity: number;
      unitPrice: number;
      currency: string;
      tax: number | null;
      prorationFactor: number;
    }
  | {
      type: 'meter';
      name: string;
      currency: string;
      unitsConsumed: string;
      chargeableUnits: string;
      subtotal: number;
      tax: number | null;
    };

export type SubscriptionPlanChangePreviewPayload = {
  subscriptionId: string;
  previousProductId: string;
  targetProductId: string;
  targetPlanLabel: string;
  targetPlanNiceName: string;
  immediateCharge: {
    effectiveAt: string;
    summary: {
      totalAmount: number;
      settlementAmount: number;
      settlementCurrency: string | null;
      tax: number | null;
      customerCredits: number;
      currency: string;
    };
    lineItems: SubscriptionPlanPreviewLineItem[];
  };
  newPlan: {
    productId: string;
    recurringPreTaxAmount: number;
    currency: string;
    taxInclusive: boolean;
    nextBillingDate: string;
    paymentFrequencyCount: number;
    paymentFrequencyInterval: string;
  };
};

export type ChangeSubscriptionPlanResult = {
  success: boolean;
  subscriptionId: string;
  productId: string;
};

/** Server calls Dodo `previewChangePlan` with same body as eventual `changePlan`. */
export const previewSubscriptionPlanChange = async (body: {
  planId: string;
}) => {
  return apiPost<ApiEnvelope<SubscriptionPlanChangePreviewPayload>>(
    '/api/v1/payment/subscription/preview-plan-change',
    body
  );
};

/** Schedule subscription product change at next billing date (Dodo `changePlan`). */
export const changeSubscriptionPlan = async (body: { planId: string }) => {
  return apiPost<ApiEnvelope<ChangeSubscriptionPlanResult>>(
    '/api/v1/payment/subscription/change-plan',
    body
  );
};