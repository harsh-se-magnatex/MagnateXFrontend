'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  createBudgetPlan,
  getBudgetPlan,
  type BudgetPlanResponse,
} from '@/src/service/api/analyticService';
import type { GrowthStudioPlatform } from '../_common';

type State =
  | { status: 'loading' }
  | { status: 'ready'; data: BudgetPlanResponse; error?: string }
  | { status: 'error'; error: string };
export function useBudgetPlan(platform: GrowthStudioPlatform) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const fetchPlan = useCallback(async () => {
    try {
      const response = await getBudgetPlan(platform);
      setState({ status: 'ready', data: response.data });
    } catch (error) {
      setState({
        status: 'error',
        error:
          error instanceof Error
            ? error.message
            : 'Could not load the budget plan.',
      });
    }
  }, [platform]);
  useEffect(() => {
    void fetchPlan();
  }, [fetchPlan]);
  const save = useCallback(
    async (amount: number) => {
      try {
        const response = await createBudgetPlan({
          platform,
          monthlyBudget: amount,
        });
        setState({ status: 'ready', data: response.data });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Could not set the budget.';
        if (message.includes('Budget already set')) {
          try {
            const response = await getBudgetPlan(platform);
            setState({
              status: 'ready',
              data: response.data,
              error: 'Budget already set for this month.',
            });
          } catch {
            setState({ status: 'error', error: message });
          }
        } else {
          setState({ status: 'error', error: message });
        }
      }
    },
    [platform]
  );
  return { state, save };
}
