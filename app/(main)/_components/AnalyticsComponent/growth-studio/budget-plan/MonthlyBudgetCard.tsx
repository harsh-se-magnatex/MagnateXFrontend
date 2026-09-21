'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { BudgetPlanResponse } from '@/src/service/api/analyticService';

const money = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const shortDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
const range = (from: string, to: string) =>
  `${new Date(`${from}T00:00:00`).getDate()}–${new Date(`${to}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;

export function MonthlyBudgetCard({
  data,
  save,
}: {
  data: BudgetPlanResponse;
  save: (amount: number) => Promise<void>;
}) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const amount = Number(value);
  const valid =
    Number.isInteger(amount) &&
    amount >= data.minBudget &&
    amount <= data.maxBudget;
  if (!data.plan)
    return (
      <section className="rounded-xl border border-default bg-default p-4 space-y-3">
        <h2 className="text-section text-default">
          Ad budget · {data.monthLabel}
        </h2>
        <p className="text-sm text-secondary">
          Set how much you want to spend on ads this month. You can set it once.
          The next change is possible from {shortDate(data.nextBudgetDate)}.
        </p>
        <p className="text-xs text-secondary">
          The plan covers posts from the 1st of {data.monthLabel}, including
          posts published before you set the budget.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex-1 space-y-1">
            <span className="text-xs text-secondary">Monthly budget (INR)</span>
            <Input
              type="number"
              min={data.minBudget}
              max={data.maxBudget}
              step={50}
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </label>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={!valid || saving}>Set budget</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Lock {money(amount)} for {data.monthLabel.split(' ')[0]}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  You can&apos;t change it until{' '}
                  {shortDate(data.nextBudgetDate)}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={saving}
                  onClick={async () => {
                    setSaving(true);
                    try {
                      await save(amount);
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  Confirm
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>
    );
  const plan = data.plan;
  const pots = [
    {
      label: 'Always-on',
      amount: plan.split.alwaysOnAmount,
      note: `${money(plan.split.alwaysOnDaily)}/day`,
    },
    { label: 'Weekly boosts', amount: plan.split.weeklyPoolAmount, note: '' },
    {
      label: 'Super-post reserve',
      amount: plan.split.reserveAmount,
      note: `${money(plan.split.reserveLeft)} left`,
    },
  ];
  return (
    <section className="rounded-xl border border-default bg-default p-4 space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-section text-default">
            Ad budget · {data.monthLabel}
          </h2>
          <p className="text-lg font-semibold text-default">
            {money(plan.monthlyBudget)}
          </p>
        </div>
        <Badge variant="outline">
          Locked until {shortDate(data.nextBudgetDate)}
        </Badge>
      </header>
      <div className="space-y-2">
        <div className="flex h-3 overflow-hidden rounded-xl bg-element">
          {pots.map((pot) => (
            <div
              key={pot.label}
              className="bg-success border-r border-default last:border-r-0"
              style={{
                width: `${(pot.amount / plan.monthlyBudget) * 100}%`,
                opacity:
                  pot.label === 'Always-on'
                    ? 0.55
                    : pot.label === 'Weekly boosts'
                      ? 0.8
                      : 1,
              }}
            />
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {pots.map((pot) => (
            <div key={pot.label} className="text-xs">
              <span className="font-medium text-default">
                {pot.label} {money(pot.amount)}
              </span>
              {pot.note ? (
                <span className="block text-secondary">{pot.note}</span>
              ) : null}
            </div>
          ))}
        </div>
        <p className="text-xs text-secondary">{plan.split.explanation}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {plan.weeks.map((week) => (
          <div
            key={week.index}
            className={`rounded-xl border p-3 ${week.status === 'this-week' ? 'border-success bg-success' : 'border-default bg-element'}`}
          >
            <p className="text-xs font-semibold text-default">
              Week {week.index} · {range(week.from, week.to)}
            </p>
            <p className="mt-1 text-xs text-secondary">
              {week.plannedPostsEstimated ? '~' : ''}
              {week.plannedPosts} posts planned
            </p>
            <p className="text-xs text-default">Box {money(week.boxAmount)}</p>
            {week.rolledIn > 0 ? (
              <p className="text-xs text-success">
                +{money(week.rolledIn)} rolled in
              </p>
            ) : null}
            <p className="mt-2 text-xs text-secondary">
              {week.status === 'done'
                ? `Suggested ${money(week.suggested)} · ${money(week.moneyLeft)} moved on`
                : week.status === 'this-week'
                  ? `${money(week.moneyLeft)} left this week`
                  : week.status === 'coming'
                    ? 'Waiting'
                    : 'Before your budget'}
            </p>
          </div>
        ))}
      </div>
      <div className="space-y-1 text-sm">
        <p className="font-semibold text-default">
          Left for the month: {money(plan.leftForMonth)}
        </p>
        <p className="text-secondary">
          {money(plan.keptForLaterWeeks)} kept for {plan.upcomingPlannedPosts}{' '}
          more planned posts.
        </p>
        <p className="text-secondary">
          Run a follower campaign at {money(plan.split.alwaysOnDaily)}/day from{' '}
          {shortDate(plan.startDate)} for the rest of the month.
        </p>
      </div>
    </section>
  );
}
