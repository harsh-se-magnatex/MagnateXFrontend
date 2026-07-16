'use client';

import { useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';

import {
  getWhereToSpend,
  type WhereToSpendPayload,
} from '@/src/service/api/analyticService';
import { useWhereToSpendCache } from '@/src/stores/whereToSpendCache';

import { BoostRecommendationCard } from './BoostRecommendationCard';
import { type GrowthStudioPlatform } from './_common';

/**
 * Growth Studio A2 — Where to spend (boost recommendation).
 *
 * Fetches the boost recommendation payload for the current platform tab
 * and routes to one of three states:
 *
 *   • stage0  → `BoostRecommendationCard` with "build your base" copy.
 *   • amplify → `BoostRecommendationCard` with a post preview and
 *               1.8×-median amplification copy.
 *   • none    → a single soft line (no card, no CTA).
 *
 * No third-party API calls; the backend reads only from the analytics
 * docs we already sync. See plan section A2.
 */
type FetchState =
  | { status: 'loading' }
  | { status: 'success'; payload: WhereToSpendPayload }
  | { status: 'error'; error: string };

function initialStateFor(platform: GrowthStudioPlatform): FetchState {
  const cached = useWhereToSpendCache.getState().getFresh(platform);
  return cached
    ? { status: 'success', payload: cached }
    : { status: 'loading' };
}

export function WhereToSpendSection({
  platform,
}: {
  platform: GrowthStudioPlatform;
}) {
  // `platform` is fixed per mount (each platform tab renders its own
  // GrowthStudioBlock), so the effect runs exactly once. We hydrate
  // synchronously from the zustand cache when available; otherwise the
  // effect fetches and writes back.
  const [state, setState] = useState<FetchState>(() => initialStateFor(platform));

  useEffect(() => {
    const cache = useWhereToSpendCache.getState();
    if (cache.getFresh(platform)) return;
    let cancelled = false;
    getWhereToSpend(platform)
      .then((res) => {
        if (cancelled) return;
        useWhereToSpendCache.getState().set(platform, res.data);
        setState({ status: 'success', payload: res.data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          status: 'error',
          error: 'Something went wrong',
        });
      });
    return () => {
      cancelled = true;
    };
  }, [platform]);

  return (
    <section
      aria-labelledby="growth-studio-where-to-spend-heading"
      className="space-y-3"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="growth-studio-where-to-spend-heading"
          className="flex items-center gap-2 text-sm font-semibold text-foreground"
        >
          <Megaphone className="h-4 w-4 text-violet-600" aria-hidden />
          Where to spend
        </h2>
      </header>

      {state.status === 'loading' ? (
        <div
          role="status"
          aria-label="Loading boost recommendation"
          className="h-32 animate-pulse rounded-xl border border-violet-500/25 bg-violet-500/10"
        />
      ) : state.status === 'error' ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Couldn’t load boost recommendation: {state.error}
        </p>
      ) : state.payload.card &&
        (state.payload.mode === 'stage0' || state.payload.mode === 'amplify') ? (
        <BoostRecommendationCard
          mode={state.payload.mode}
          card={state.payload.card}
          platform={platform}
        />
      ) : (
        <p className="rounded-lg border border-border bg-muted px-3 py-3 text-xs text-muted-foreground">
          {state.payload.reason ??
            'No boost candidate this week — your next post might be the one.'}
        </p>
      )}
    </section>
  );
}
