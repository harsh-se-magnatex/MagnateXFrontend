'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import {
  postAnalyticsWeeklyVerdict,
  type WeeklyVerdictPayload,
} from '@/src/service/api/analyticService';
import { cn } from '@/lib/utils';

/**
 * Mini-report style verdict card rendered at the top of each analytics
 * platform tab. Replaces the old bullet/structured AI Recommendations
 * cards with a graded performance table, ordered priorities, and a
 * "what's working" list — all driven by the last 3 weeks of synced data.
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
    badge: 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/30',
    text: 'text-emerald-300',
  },
  B: {
    badge: 'bg-lime-100 text-lime-800 ring-lime-200',
    text: 'text-lime-700',
  },
  C: {
    badge: 'bg-amber-500/20 text-amber-300 ring-amber-500/30',
    text: 'text-amber-300',
  },
  D: {
    badge: 'bg-orange-100 text-orange-800 ring-orange-200',
    text: 'text-orange-700',
  },
  F: { badge: 'bg-red-100 text-red-800 ring-red-200', text: 'text-red-700' },
};

const PLATFORM_ACCENT: Record<Platform, string> = {
  facebook: 'from-primary/10 to-card ring-primary/20',
  instagram: 'from-secondary/10 to-card ring-secondary/20',
  linkedin: 'from-sky-500/10 to-card ring-sky-500/20',
};

function stableSerialize(ctx: Record<string, unknown>): string {
  return JSON.stringify(ctx);
}

function VerdictSkeleton() {
  return (
    <div className="space-y-3 p-5">
      <div className="h-3 w-1/3 animate-pulse rounded bg-accent" />
      <div className="space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-accent" />
        <div className="h-3 w-11/12 animate-pulse rounded bg-accent" />
        <div className="h-3 w-9/12 animate-pulse rounded bg-accent" />
      </div>
      <div className="mt-4 grid gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-8 w-full animate-pulse rounded bg-muted"
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Public wrapper — remounts the inner fetcher when `context` changes so
 * the inner state initialises straight to "loading" without us calling
 * setState inside an effect (react-hooks/set-state-in-effect).
 */
export function AnalyticsWeeklyVerdict({
  platform,
  context,
  className,
}: {
  platform: Platform;
  context: Record<string, unknown>;
  className?: string;
}) {
  const cacheKey = useMemo(() => stableSerialize(context), [context]);
  return (
    <AnalyticsWeeklyVerdictInner
      key={`${platform}:${cacheKey}`}
      platform={platform}
      context={context}
      className={className}
    />
  );
}

function AnalyticsWeeklyVerdictInner({
  platform,
  context,
  className,
}: {
  platform: Platform;
  context: Record<string, unknown>;
  className?: string;
}) {
  const [state, setState] = useState<FetchState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await postAnalyticsWeeklyVerdict({ platform, context });
        if (cancelled) return;
        setState({
          status: 'ready',
          payload: res.data.verdict,
          source: res.data.source,
        });
      } catch (err) {
        if (cancelled) return;
        setState({
          status: 'error',
          error:
            err instanceof Error
              ? err.message
              : 'Could not load the weekly verdict',
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [platform, context]);

  return (
    <section
      aria-label="AI weekly verdict"
      className={cn(
        'overflow-hidden rounded-xl border border-border/80 bg-gradient-to-br shadow-sm ring-1',
        PLATFORM_ACCENT[platform],
        className
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b border-border/60 bg-card/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-600" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-foreground">
              Recommendations
            </p>
            <p className="text-[11px] text-muted-foreground">
              Graded mini-report from the last 3 weeks of synced data
            </p>
          </div>
        </div>
        {state.status === 'loading' ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : state.status === 'ready' && state.source === 'fallback' ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Rule-based
          </span>
        ) : null}
      </header>

      {state.status === 'loading' ? (
        <VerdictSkeleton />
      ) : state.status === 'error' ? (
        <p className="px-5 py-6 text-sm text-red-600">{state.error}</p>
      ) : (
        <div className="space-y-5 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              This week&apos;s verdict
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground">
              {state.payload.verdict}
            </p>
          </div>

          {state.payload.breakdown.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Performance breakdown
              </p>
              <div className="mt-2 overflow-hidden rounded-lg border border-border bg-card">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted text-left text-xs font-medium text-muted-foreground">
                      <th className="px-3 py-2">Area</th>
                      <th className="px-3 py-2 text-center">Grade</th>
                      <th className="px-3 py-2 text-center">Score</th>
                      <th className="px-3 py-2">Reading</th>
                    </tr>
                  </thead>
                  <tbody className="text-foreground">
                    {state.payload.breakdown.map((row, i) => {
                      const style = GRADE_STYLES[row.grade];
                      return (
                        <tr
                          key={row.area + i}
                          className="border-b border-border/60 last:border-0"
                        >
                          <td className="px-3 py-2 font-medium text-foreground">
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
                          <td className="px-3 py-2 text-xs leading-relaxed text-muted-foreground">
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
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <TrendingDown
                  className="h-3.5 w-3.5 text-red-500"
                  aria-hidden
                />
                What&apos;s pulling the score down (in priority)
              </p>
              <ol className="mt-2 space-y-2">
                {state.payload.pullingDown.map((item, i) => (
                  <li
                    key={i}
                    className="flex gap-3 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2"
                  >
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-200 text-[11px] font-semibold text-red-800">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {item.headline}
                      </p>
                      {item.detail ? (
                        <p className="mt-0.5 text-xs leading-relaxed text-foreground">
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
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <TrendingUp
                  className="h-3.5 w-3.5 text-emerald-600"
                  aria-hidden
                />
                What&apos;s working (don&apos;t break these)
              </p>
              <ul className="mt-2 space-y-1.5">
                {state.payload.working.map((line, i) => (
                  <li
                    key={i}
                    className="flex gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-foreground"
                  >
                    <span
                      className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
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
