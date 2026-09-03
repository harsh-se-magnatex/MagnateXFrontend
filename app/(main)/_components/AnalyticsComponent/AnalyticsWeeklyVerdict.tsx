'use client';

import { useEffect, useState } from 'react';
import { Loader2, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import {
  postAnalyticsWeeklyVerdict,
  type WeeklyVerdictPayload,
} from '@/src/service/api/analyticService';
import { useWeeklyVerdictCache } from '@/src/stores/weeklyVerdictCache';
import { cn } from '@/lib/utils';

/**
 * Mini-report style verdict card rendered at the top of each analytics
 * platform tab. Replaces the old bullet/structured AI Recommendations
 * cards with a graded performance table, ordered priorities, and a
 * "what's working" list — all driven by the last 3 weeks of synced data.
 *
 * Reads from the cron-built analytics snapshot (seeded into the zustand
 * cache on page load) and only falls back to a live API call when no
 * cached verdict exists yet.
 */

type Platform = 'facebook' | 'instagram' | 'linkedin';

type FetchState =
  | { status: 'loading' }
  | {
      status: 'ready';
      payload: WeeklyVerdictPayload;
      source: 'openai' | 'fallback';
    }
  | { status: 'error'; error: string };

const GRADE_STYLES: Record<
  'A' | 'B' | 'C' | 'D' | 'F',
  { badge: string; text: string }
> = {
  A: {
    badge: 'bg-success text-success ring-[var(--border-success)]',
    text: 'text-success',
  },
  B: {
    badge: 'bg-lime-100 text-lime-800 ring-lime-200',
    text: 'text-lime-700',
  },
  C: {
    badge: 'bg-warning text-warning ring-[var(--border-warning)]',
    text: 'text-warning',
  },
  D: {
    badge: 'bg-warning text-warning ring-[var(--border-warning)]',
    text: 'text-warning',
  },
  F: {
    badge: 'bg-danger text-danger ring-[var(--border-danger)]',
    text: 'text-danger',
  },
};

const PLATFORM_ACCENT: Record<Platform, string> = {
  facebook: 'from-primary/10 to-card ring-strong',
  instagram: 'from-brand/10 to-card ring-brand/20',
  linkedin: 'from-[var(--blue-9)] to-card ring-[var(--border-info)]',
};

function VerdictSkeleton() {
  return (
    <div className="space-y-3 p-5">
      <div className="h-3 w-1/3 animate-pulse rounded bg-hover" />
      <div className="space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-hover" />
        <div className="h-3 w-11/12 animate-pulse rounded bg-hover" />
        <div className="h-3 w-9/12 animate-pulse rounded bg-hover" />
      </div>
      <div className="mt-4 grid gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-8 w-full animate-pulse rounded bg-element"
          />
        ))}
      </div>
    </div>
  );
}

function initialStateFor(platform: Platform): FetchState {
  const cached = useWeeklyVerdictCache.getState().getFresh(platform);
  return cached
    ? { status: 'ready', payload: cached.payload, source: cached.source }
    : { status: 'loading' };
}

export function AnalyticsWeeklyVerdict({
  platform,
  context,
  className,
}: {
  platform: Platform;
  /** Kept for live fallback when no snapshot exists yet. */
  context: Record<string, unknown>;
  className?: string;
}) {
  const [state, setState] = useState<FetchState>(() =>
    initialStateFor(platform)
  );

  useEffect(() => {
    const cache = useWeeklyVerdictCache.getState();
    const cached = cache.getFresh(platform);
    if (cached) {
      setState({
        status: 'ready',
        payload: cached.payload,
        source: cached.source,
      });
      return;
    }

    let cancelled = false;
    setState({ status: 'loading' });
    (async () => {
      try {
        const res = await postAnalyticsWeeklyVerdict({ platform, context });
        if (cancelled) return;
        useWeeklyVerdictCache
          .getState()
          .set(platform, res.data.verdict, res.data.source);
        setState({
          status: 'ready',
          payload: res.data.verdict,
          source: res.data.source,
        });
      } catch (err) {
        if (cancelled) return;
        setState({
          status: 'error',
          error: 'Could not load the weekly verdict',
        });
      }
    })();
    return () => {
      cancelled = true;
    };
    // Context is only used for the live fallback when no snapshot/cache exists.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- platform-keyed cache
  }, [platform]);

  return (
    <section
      aria-label="AI weekly verdict"
      className={cn(
        'overflow-hidden rounded-xl border border-default',
        PLATFORM_ACCENT[platform],
        className
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b border-default bg-default px-5 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-warning" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-default">
              Recommendations
            </p>
            <p className="text-[11px] text-secondary">
              Graded mini-report from the last 3 weeks of synced data
            </p>
          </div>
        </div>
        {state.status === 'loading' ? (
          <Loader2 className="h-4 w-4 animate-spin text-secondary" />
        ) : state.status === 'ready' && state.source === 'fallback' ? (
          <span className="rounded-full bg-element px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-secondary">
            Rule-based
          </span>
        ) : null}
      </header>

      {state.status === 'loading' ? (
        <VerdictSkeleton />
      ) : state.status === 'error' ? (
        <p className="px-5 py-6 text-sm text-danger">{state.error}</p>
      ) : (
        <div className="space-y-5 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
              This week&apos;s verdict
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-default">
              {state.payload.verdict}
            </p>
          </div>

          {state.payload.breakdown.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                Performance breakdown
              </p>
              <div className="mt-2 overflow-hidden rounded-lg border border-default bg-default">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-default bg-element text-left text-xs font-medium text-secondary">
                      <th className="px-3 py-2">Area</th>
                      <th className="px-3 py-2 text-center">Grade</th>
                      <th className="px-3 py-2 text-center">Score</th>
                      <th className="px-3 py-2">Reading</th>
                    </tr>
                  </thead>
                  <tbody className="text-default">
                    {state.payload.breakdown.map((row, i) => {
                      const style = GRADE_STYLES[row.grade];
                      return (
                        <tr
                          key={row.area + i}
                          className="border-b border-default last:border-0"
                        >
                          <td className="px-3 py-2 font-medium text-default">
                            {row.area}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={cn(
                                'inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ring-1 ring-inset',
                                style.badge
                              )}
                            >
                              {row.grade}
                            </span>
                          </td>
                          <td
                            className={cn(
                              'px-3 py-2 text-center text-sm font-semibold tabular-nums',
                              style.text
                            )}
                          >
                            {row.score}
                          </td>
                          <td className="px-3 py-2 text-xs leading-relaxed text-secondary">
                            {row.reading}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {state.payload.pullingDown.length > 0 ? (
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-secondary">
                <TrendingDown className="h-3.5 w-3.5 text-danger" aria-hidden />
                What&apos;s pulling the score down (in priority)
              </p>
              <ol className="mt-2 space-y-2">
                {state.payload.pullingDown.map((item, i) => (
                  <li
                    key={i}
                    className="flex gap-3 rounded-lg border border-danger bg-danger px-3 py-2"
                  >
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-danger text-[11px] font-semibold text-danger">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-default">
                        {item.headline}
                      </p>
                      {item.detail ? (
                        <p className="mt-0.5 text-xs leading-relaxed text-default">
                          {item.detail}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {state.payload.working.length > 0 ? (
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-secondary">
                <TrendingUp className="h-3.5 w-3.5 text-success" aria-hidden />
                What&apos;s working (don&apos;t break these)
              </p>
              <ul className="mt-2 space-y-1.5">
                {state.payload.working.map((line, i) => (
                  <li
                    key={i}
                    className="flex gap-2 rounded-lg border border-success bg-success px-3 py-2 text-sm text-default"
                  >
                    <span
                      className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--green-9)]"
                      aria-hidden
                    />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
