'use client';

import { cn } from '@/lib/utils';
import {
  planButtonDisplayName,
  pricingPlansForMode,
  type PlanMode,
} from '@/lib/landing-pricing';
import { GuestAuthLink } from '@/components/auth/GuestAuthLink';
import {
  PriceDisplay,
  PricingDisclaimer,
} from '@/components/pricing/price-display';
import { Dot } from 'lucide-react';
import { useState } from 'react';

export function LandingPricingCards() {
  const [planMode, setPlanMode] = useState<PlanMode>('AutoPilot');
  const visiblePlans = pricingPlansForMode(planMode);

  return (
    <div>
      <div
        role="tablist"
        aria-label="Plan mode"
        className="mx-auto mb-8 flex w-full max-w-md items-center justify-center gap-1 rounded-full border border-default bg-element p-1 backdrop-blur-sm"
      >
        {(['AutoPilot', 'Studio'] as const).map((mode) => {
          const selected = planMode === mode;
          const label = mode === 'Studio' ? 'Studio' : 'AutoPilot';
          const sublabel =
            mode === 'Studio' ? 'You create every post' : 'Personalized AI';
          return (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setPlanMode(mode)}
              className={cn(
                'flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-expo ease-[cubic-bezier(0.4,0,0.2,1)] focus:outline-none focus:ring-2 focus:ring-strong',
                selected
                  ? 'bg-foreground text-background'
                  : 'text-secondary hover:bg-foreground/5 hover:text-default'
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
        className={cn(
          'grid gap-6 items-stretch mx-auto',
          visiblePlans.length === 1 ? 'max-w-md' : 'md:grid-cols-3'
        )}
      >
        {visiblePlans.map((p) => (
          <article
            key={p.id}
            className={cn(
              'group relative flex h-full min-h-0 flex-col rounded-2xl border p-6 transition-[background-color,border-color,transform] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] sm:p-8',
              p.highlighted
                ? 'animated-border border-transparent bg-default z-10'
                : 'border-default bg-default hover:border-strong hover:bg-default'
            )}
          >
            {p.badge ? (
              <div className="absolute -top-3.5 left-0 right-0 mx-auto w-max rounded-full bg-gradient-primary px-4 py-1 text-[10px] font-bold uppercase tracking-wide text-white sm:text-xs">
                {p.badge}
              </div>
            ) : null}
            <h3 className="text-lg font-extrabold text-default">{p.name}</h3>

            <PriceDisplay
              usd={p.priceUsd}
              period={p.period}
              className="mt-5 mb-6"
              amountClassName="text-display-2 text-default"
            />
            <ul className="flex-1 space-y-3 font-(--font-dm-sans) text-sm text-secondary">
              {p.lines.map((line) => (
                <li key={line.text} className="flex gap-2.5 items-start">
                  <Dot
                    className="mt-0.5 h-4 w-4 shrink-0 text-preview"
                    aria-hidden
                  />
                  <span className="text-pretty leading-snug">{line.text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 pt-2">
              <GuestAuthLink
                href="/sign-up"
                className={cn(
                  'group/btn relative flex w-full items-center justify-center overflow-hidden rounded-full py-3.5 text-sm font-bold transition-expo ease-[cubic-bezier(0.4,0,0.2,1)]',
                  p.highlighted
                    ? 'bg-gradient-primary text-white'
                    : 'border border-default bg-transparent text-default hover:border-strong hover:bg-hover'
                )}
              >
                <span className="relative z-10">
                  Start {planButtonDisplayName(p.name)}
                </span>
                {p.highlighted ? (
                  <span
                    className="absolute inset-0 bg-default transition-expo group-hover/btn:bg-default"
                    aria-hidden
                  />
                ) : null}
              </GuestAuthLink>
            </div>
          </article>
        ))}
      </div>

      <PricingDisclaimer className="mx-auto mt-8 max-w-2xl text-center" />
    </div>
  );
}
