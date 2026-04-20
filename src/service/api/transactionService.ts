import { apiGet, apiPost } from '@/lib/api-client';
import type { ApiEnvelope } from '@/lib/api-types';

export type CreditPackSummary = {
  id: string;
  name: string;
  credits: number;
  price: number;
  label?: string;
};

export type PlanSummary = {
  id: string;
  name: string;
  description: string;
  price: number;
};

/** Shape of documents in `transactions` for the current user (see transactions.controller). */
export type UserTransaction = {
  userId?: string;
  type?: string;
  amount?: number;
  balanceAfter?: number;
  description?: string;
  credits?: number;
  creditPackId?: string;
  planId?: string;
  createdAt?: unknown;
  spendedOn?: string;
};

export const getAvailablePlansAndCreditPacks = async () => {
  return apiGet<ApiEnvelope<{ creditPacks: CreditPackSummary[]; plans: PlanSummary[] }>>(
    '/api/v1/transaction/get-available-plans-and-credit-packs'
  );
};

export const handleTopUpTransaction = async ({creditPackId}: {creditPackId: string}) => {
  return apiPost<ApiEnvelope<{ transactionId: string }>>(
    '/api/v1/transaction/handle-top-up-transaction',
    { creditPackId }
  );
};

export const handlePlanPurchaseTransaction = async ({planId}: {planId: string}) => {
  return apiPost<ApiEnvelope<{ subscriptionId: string }>>(
    '/api/v1/transaction/handle-plan-purchase',
    { planId }
  );
};

export const getTransactions = async () => {
  return apiGet<ApiEnvelope<{ transactions: UserTransaction[] }>>(
    '/api/v1/transaction/get-transactions'
  );
};

export const upgradePlan = async ({ planId }: { planId: string }) => {
  return apiPost<ApiEnvelope<{ subscriptionId: string }>>(
    '/api/v1/transaction/upgrade-plan',
    { planId }
  );
};

export const claimElitePromotion = async () => {
  return apiPost<ApiEnvelope<{ subscriptionId: string }>>(
    '/api/v1/transaction/claim-elite-promotion',
    {}
  );
};