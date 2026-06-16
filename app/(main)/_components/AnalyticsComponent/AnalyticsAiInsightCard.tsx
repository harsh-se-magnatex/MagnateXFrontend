'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  postAnalyticsRecommendations,
  type AnalyticsRecommendationPayload,
} from '@/src/service/api/analyticService';
import { AnalyticsStructuredInsightsPanel } from './AnalyticsStructuredInsightsPanel';
import { useUserPlanCredits } from '../UserPlanCreditsProvider';
import { useRouter } from 'next/navigation';

function stableSerialize(ctx: Record<string, unknown>): string {
  return JSON.stringify(ctx);
}

export function AnalyticsAiInsightCard({
  platform,
  scope,
  context,
  className = '',
  compact = false,
  embed = false,
  expandMaxHeight = '32rem',
}: {
  platform: 'facebook' | 'instagram' | 'linkedin';
  scope: 'page' | 'post';
  context: Record<string, unknown>;
  className?: string;
  compact?: boolean;
  embed?: boolean;
  /** CSS length; sets --analytics-ai-insights-max on the card */
  expandMaxHeight?: string;
}) {
  const [data, setData] = useState<AnalyticsRecommendationPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [structuredPayload, setStructuredPayload] =
    useState<AnalyticsRecommendationPayload | null>(null);
  const [structuredLoading, setStructuredLoading] = useState(false);
  const [structuredError, setStructuredError] = useState<string | null>(null);
  /** Tracks which `cacheKey` the structured response was fetched for */
  const structuredReadyKeyRef = useRef<string | null>(null);
  const { billing, loading: planCreditsLoading } = useUserPlanCredits();
  const cacheKey = useMemo(() => stableSerialize(context), [context]);
  const showPageExpand = scope === 'page' && !compact && !embed;
  const router = useRouter();
  
  useEffect(() => {
    structuredReadyKeyRef.current = null;
    setStructuredPayload(null);
    setStructuredError(null);
  }, [cacheKey]);
  
  useEffect(() => {
    if (!expanded || !showPageExpand) return;
    if (structuredReadyKeyRef.current === cacheKey) {
      setStructuredLoading(false);
      return;
    }
    
    let cancelled = false;
    setStructuredLoading(true);
    setStructuredError(null);
    
    (async () => {
      try {
        const res = await postAnalyticsRecommendations({
          scope: 'page',
          platform,
          context,
          layout: 'structured',
        });
        if (!cancelled) {
          structuredReadyKeyRef.current = cacheKey;
          setStructuredPayload(res.data);
        }
      } catch (e) {
        if (!cancelled) {
          setStructuredError(
            e instanceof Error ? e.message : 'Could not load insights'
          );
          setStructuredPayload(null);
          structuredReadyKeyRef.current = null;
        }
      } finally {
        if (!cancelled) setStructuredLoading(false);
      }
    })();
    
    return () => {
      cancelled = true;
    };
  }, [expanded, showPageExpand, cacheKey, platform, context]);
  
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await postAnalyticsRecommendations({
          scope,
          platform,
          context,
          layout: 'bullet',
        });
        if (!cancelled) setData(res.data);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : 'Could not load recommendations'
          );
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [platform, scope, cacheKey, context]);
  
  
  const ring =
    platform === 'facebook'
      ? 'ring-blue-100/80 bg-gradient-to-br from-blue-50/90 to-white'
      : 'ring-pink-100/80 bg-gradient-to-br from-pink-50/90 to-white';

  const shell = embed
    ? `rounded-none border-0 bg-transparent shadow-none ring-0 ${className}`
    : `rounded-xl border border-zinc-200/80 shadow-sm ring-1 ${ring} ${className}`;

  return (
    <div
      className={cn(
        shell,
        showPageExpand &&
          'flex max-h-[min(70vh,var(--analytics-ai-insights-max,32rem))] flex-col overflow-y-auto overscroll-contain'
      )}
      style={
        showPageExpand
          ? ({
              ['--analytics-ai-insights-max' as string]: expandMaxHeight,
            } as CSSProperties)
          : undefined
      }
    >
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-3',
          compact ? 'py-2' : '',
          embed
            ? 'border-t border-zinc-200 px-0 pt-4'
            : 'border-b border-zinc-100/90'
        )}
      >
        <Sparkles
          className={cn(
            'shrink-0',
            compact ? 'h-4 w-4' : 'h-5 w-5',
            platform === 'facebook' ? 'text-blue-600' : 'text-pink-600'
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'font-semibold text-zinc-900',
              compact ? 'text-xs' : 'text-sm'
            )}
          >
            AI recommendations
          </p>
          {!compact && data?.source === 'fallback' ? (
            <p className="text-[10px] font-normal text-zinc-500">
              Rule-based insights (set OpenAI key on the server for richer tips)
            </p>
          ) : null}
        </div>
        {loading ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-zinc-400" />
        ) : null}
      </div>
      <div
        className={cn(
          compact ? 'px-3 py-2' : 'px-4 py-3',
          embed ? 'px-0 pb-0 pt-0' : ''
        )}
      >
        {error ? (
          <p className="text-sm text-center text-red-600">{error}</p>
        ) : loading && !data ? (
          <ul className="space-y-2">
            {[1, 2, 3].map((i) => (
              <li
                key={i}
                className="h-3 animate-pulse rounded bg-zinc-200/80"
                style={{ width: `${78 - i * 6}%` }}
              />
            ))}
          </ul>
        ) : data?.bullets?.length ? (
          <ul
            className={cn(
              'list-disc space-y-1.5 pl-4 text-zinc-700',
              compact ? 'text-xs' : 'text-sm'
            )}
          >
            {data.bullets.map((line, i) => (
              <li key={i} className="leading-snug">
                {line}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-zinc-500">No suggestions yet.</p>
        )}
      </div>

      {showPageExpand ? (
        <>
          <div
            className={cn(
              'grid transition-[grid-template-rows] duration-200 ease-out',
              expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
            )}
            aria-hidden={!expanded}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="border-t border-zinc-100 px-2 py-3 sm:px-4">
                {expanded ? (
                  <AnalyticsStructuredInsightsPanel
                    platform={platform}
                    context={context}
                    payload={structuredPayload}
                    loading={
                      structuredLoading && !structuredPayload?.structured
                    }
                    error={structuredError}
                  />
                ) : null}
              </div>
            </div>
          </div>
          <div className="mt-auto  flex justify-end border-t border-zinc-100/80 px-4 py-2">
            <Button
              type="button"
              variant="link"
              size="sm"
              className={cn("h-auto px-2 text-xs font-medium", billing?.activePlan!=="legacy" && "hidden")}
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
            >
              {expanded ? 'View less' : 'View more'}
            </Button>
            {billing?.activePlan!=="legacy" && <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto px-2 text-xs font-medium"
              onClick={() => router.push('/settings/billings')}
              aria-expanded={expanded}
            >
              Upgrade to get more insights</Button>}
          </div>
        </>
      ) : null}
    </div>
  );
}
