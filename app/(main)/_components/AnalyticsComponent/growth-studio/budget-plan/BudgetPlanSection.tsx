'use client';
import { Skeleton } from '@/components/ui/skeleton';
import type { GrowthStudioPlatform } from '../_common';
import { BudgetPostSuggestions } from './BudgetPostSuggestions';
import { MonthlyBudgetCard } from './MonthlyBudgetCard';
import { useBudgetPlan } from './useBudgetPlan';
export function BudgetPlanSection({
  platform,
}: {
  platform: GrowthStudioPlatform;
}) {
  const { state, save } = useBudgetPlan(platform);
  if (state.status === 'loading')
    return <Skeleton className="h-48 w-full rounded-xl" />;
  if (state.status === 'error')
    return (
      <p className="rounded-xl border border-warning bg-warning p-3 text-sm text-warning">
        {state.error}
      </p>
    );
  if (!state.data.visible)
    return <p className="text-sm text-secondary">{state.data.reason}</p>;
  return (
    <div className="space-y-4">
      {state.error ? (
        <p className="rounded-xl border border-warning bg-warning p-3 text-sm text-warning">
          {state.error}
        </p>
      ) : null}
      <MonthlyBudgetCard data={state.data} save={save} />
      <BudgetPostSuggestions data={state.data} />
    </div>
  );
}
