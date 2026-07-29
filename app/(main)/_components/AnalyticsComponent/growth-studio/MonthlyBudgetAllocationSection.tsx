'use client';

import { useState } from 'react';
import { IndianRupee, Loader2, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  postBudgetAllocation,
  type BudgetAllocationPayload,
  type PostBudgetAllocation,
} from '@/src/service/api/analyticService';

import { type GrowthStudioPlatform } from './_common';

type IdleState = { status: 'idle' };
type LoadingState = { status: 'loading' };
type SuccessState = { status: 'success'; payload: BudgetAllocationPayload };
type ErrorState = { status: 'error'; error: string };
type FetchState = IdleState | LoadingState | SuccessState | ErrorState;

function formatMoney(currency: string, amount: number): string {
  const symbol = currency === 'INR' ? '₹' : `${currency} `;
  return `${symbol}${amount.toLocaleString('en-IN')}`;
}

function formatHours(hours: number): string {
  if (!Number.isFinite(hours) || hours >= 9999) return '—';
  if (hours < 1) return '<1h ago';
  if (hours < 48) return `${Math.round(hours)}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function AllocationRow({
  item,
  currency,
}: {
  item: PostBudgetAllocation;
  currency: string;
}) {
  return (
    <li className="rounded-lg border border-border/80 bg-card/40 p-3">
      <div className="flex gap-3">
        {item.mediaUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.mediaUrl}
            alt=""
            className="h-14 w-14 shrink-0 rounded-md object-cover"
          />
        ) : (
          <div
            aria-hidden
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] uppercase tracking-wide text-muted-foreground"
          >
            {item.format}
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="text-sm font-semibold text-foreground">
              {formatMoney(currency, item.amount)}
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                ({item.percent}%)
              </span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              {(item.engagementRate * 100).toFixed(2)}% eng ·{' '}
              {formatHours(item.hoursSincePost)}
            </p>
          </div>
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {item.caption}
          </p>
          <p className="text-xs leading-relaxed text-foreground/90">
            {item.rationale}
          </p>
          {item.permalinkUrl ? (
            <a
              href={item.permalinkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-[11px] text-emerald-400 hover:underline"
            >
              View post
            </a>
          ) : null}
        </div>
      </div>
    </li>
  );
}

/**
 * Growth Studio — Monthly budget allocation.
 *
 * User enters a monthly INR budget; we use this calendar month's posts,
 * recommend how many to allot, and split spend across that set.
 */
export function MonthlyBudgetAllocationSection({
  platform,
}: {
  platform: GrowthStudioPlatform;
}) {
  const [budgetInput, setBudgetInput] = useState('');
  const [state, setState] = useState<FetchState>({ status: 'idle' });

  async function handleSuggest() {
    const monthlyBudget = Number(budgetInput.replace(/,/g, '').trim());
    if (!Number.isFinite(monthlyBudget) || monthlyBudget < 100) {
      setState({
        status: 'error',
        error: 'Enter a monthly budget of at least ₹100.',
      });
      return;
    }

    setState({ status: 'loading' });
    try {
      const res = await postBudgetAllocation({ platform, monthlyBudget });
      setState({ status: 'success', payload: res.data });
    } catch {
      setState({
        status: 'error',
        error: 'Something went wrong',
      });
    }
  }

  return (
    <section
      aria-labelledby="growth-studio-budget-allocation-heading"
      className="space-y-3"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="growth-studio-budget-allocation-heading"
          className="flex items-center gap-2 text-sm font-semibold text-foreground"
        >
          <IndianRupee className="h-4 w-4 text-emerald-500" aria-hidden />
          Monthly budget split
        </h2>
      </header>

      <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3 space-y-3">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Enter your monthly ad budget. We&apos;ll use this month&apos;s posts
          and tell you how many to put budget behind.
        </p>

        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-[10rem] flex-1 space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">
              Monthly budget (INR)
            </span>
            <Input
              type="number"
              min={100}
              step={50}
              inputMode="numeric"
              placeholder="e.g. 15000"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleSuggest();
                }
              }}
              disabled={state.status === 'loading'}
              className="bg-background/60"
            />
          </label>
          <Button
            type="button"
            size="sm"
            onClick={() => void handleSuggest()}
            disabled={state.status === 'loading' || !budgetInput.trim()}
            className="gap-1.5"
          >
            {state.status === 'loading' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
            )}
            Suggest allocation
          </Button>
        </div>
      </div>

      {state.status === 'loading' ? (
        <div
          role="status"
          aria-label="Loading budget allocation"
          className="h-36 animate-pulse rounded-xl border border-emerald-500/25 bg-emerald-500/10"
        />
      ) : null}

      {state.status === 'error' ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {state.error}
        </p>
      ) : null}

      {state.status === 'success' ? (
        !state.payload.visible || state.payload.allocations.length === 0 ? (
          <p className="rounded-lg border border-border bg-muted px-3 py-3 text-xs text-muted-foreground">
            {state.payload.reason ??
              'Couldn’t allocate budget across this month’s posts.'}
          </p>
        ) : (
          <div className="space-y-3">
            <div
              className={cn(
                'rounded-lg border px-3 py-2.5 text-sm',
                'border-emerald-500/30 bg-emerald-500/10 text-foreground'
              )}
            >
              <p className="font-semibold leading-snug">
                You have {state.payload.postsThisMonth} post
                {state.payload.postsThisMonth === 1 ? '' : 's'} this month
                {' — '}
                allot budget to {state.payload.recommendedPostCount} of them.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Total{' '}
                <strong className="text-foreground">
                  {formatMoney(
                    state.payload.currency,
                    state.payload.monthlyBudget
                  )}
                </strong>{' '}
                across {state.payload.recommendedPostCount} recommended post
                {state.payload.recommendedPostCount === 1 ? '' : 's'}
                <span className="ml-2 text-[10px] uppercase tracking-wide">
                  {state.payload.source === 'openai' ? 'AI' : 'Weighted'}
                </span>
              </p>
            </div>
            {state.payload.summary ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {state.payload.summary}
              </p>
            ) : null}
            <ul className="space-y-2">
              {state.payload.allocations.map((item) => (
                <AllocationRow
                  key={item.postId}
                  item={item}
                  currency={state.payload.currency}
                />
              ))}
            </ul>
          </div>
        )
      ) : null}
    </section>
  );
}
