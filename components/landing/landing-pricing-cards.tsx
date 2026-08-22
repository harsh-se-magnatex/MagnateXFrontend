'use client';

import { cn } from '@/lib/utils';
import {
  planButtonDisplayName,
  pricingPlansForMode,
  type PlanMode,
} from '@/lib/landing-pricing';
import { GuestAuthLink } from '@/components/auth/GuestAuthLink';
import { Dot } from 'lucide-react';
import { useState } from 'react';

export function LandingPricingCards() {
  const [planMode, setPlanMode] = useState<PlanMode>('AI');
  const visiblePlans = pricingPlansForMode(planMode);

  return (
    <div>
      <div
        role="tablist"
        aria-label="Plan mode"
        className="mx-auto mb-8 flex w-full max-w-md items-center justify-center gap-1 rounded-full border border-border/60 bg-muted/40 p-1 backdrop-blur-sm"
      >
        {(['AI', 'Studio'] as const).map((mode) => {
          const selected = planMode === mode;
          const label = mode === 'Studio' ? 'Studio' : 'AI';
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
                'flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus:outline-none focus:ring-2 focus:ring-primary-blue/40',
                selected
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'
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
              'group relative flex h-full min-h-0 flex-col rounded-2xl border p-6 transition-[background-color,border-color,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:p-8',
              p.highlighted
                ? 'animated-border border-transparent bg-card shadow-2xl shadow-primary-purple/20 md:scale-[1.04] z-10'
                : 'border-border/50 bg-card/80 hover:-translate-y-1.5 hover:border-primary-purple/40 hover:bg-card hover:shadow-xl hover:shadow-primary-purple/10'
            )}
          >
            {p.badge ? (
              <div className="absolute -top-3.5 left-0 right-0 mx-auto w-max rounded-full bg-gradient-primary px-4 py-1 text-[10px] font-bold uppercase tracking-wide text-white sm:text-xs">
                {p.badge}
              </div>
            ) : null}
            <h3 className="text-lg font-extrabold text-foreground">{p.name}</h3>
            <p className="mt-1 font-(--font-dm-sans) text-sm text-muted-foreground">
              {p.subtitle}
            </p>
            <div className="mt-5 mb-6">
              <div className="flex flex-wrap items-baseline gap-x-1">
                <span className="text-4xl font-black tracking-tight text-foreground">
                  {p.price}
                </span>
                {p.period ? (
                  <span className="text-muted-foreground">{p.period}</span>
                ) : null}
              </div>
            </div>
            <ul className="flex-1 space-y-3 font-(--font-dm-sans) text-sm text-muted-foreground">
              {p.lines.map((line) => (
                <li key={line.text} className="flex gap-2.5 items-start">
                  <Dot className="mt-0.5 h-4 w-4 shrink-0 text-primary-purple" aria-hidden />
                  <span className="text-pretty leading-snug">{line.text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 pt-2">
              <GuestAuthLink
                href="/sign-up"
                className={cn(
                  'group/btn relative flex w-full items-center justify-center overflow-hidden rounded-full py-3.5 text-sm font-bold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95',
                  p.highlighted
                    ? 'bg-gradient-primary text-white shadow-lg shadow-primary-purple/35 hover:shadow-xl hover:shadow-primary-purple/50 hover:-translate-y-0.5'
                    : 'border border-border bg-transparent text-foreground hover:-translate-y-0.5 hover:border-primary-purple/50 hover:bg-accent'
                )}
              >
                <span className="relative z-10">Start {planButtonDisplayName(p.name)}</span>
                {p.highlighted ? (
                  <span
                    className="absolute inset-0 bg-white/0 transition-colors duration-300 group-hover/btn:bg-white/10"
                    aria-hidden
                  />
                ) : null}
              </GuestAuthLink>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
