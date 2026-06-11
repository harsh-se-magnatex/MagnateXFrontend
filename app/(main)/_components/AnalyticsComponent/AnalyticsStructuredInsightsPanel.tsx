'use client';

import { type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import type {
  AnalyticsRecommendationPayload,
  AnalyticsStructuredSections,
} from '@/src/service/api/analyticService';
import { cn } from '@/lib/utils';
import { formatCompact } from './utils/facebook_components/util_component';

function SubBlock({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <div className="text-sm leading-relaxed text-zinc-800">{children}</div>
    </div>
  );
}

function Section({
  number,
  title,
  description,
  children,
}: {
  number: number;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-zinc-100 bg-zinc-50/50 p-4">
      <div>
        <h3 className="text-base font-semibold text-zinc-900">
          {number}. {title}
        </h3>
        {description ? (
          <p className="mt-1 text-xs text-zinc-500 leading-snug">{description}</p>
        ) : null}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function formatPct(n: number | null): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return `${n}%`;
}

/** Plain-language roll-up of synced metrics (section 3). */
function NaturalLanguageSnapshot({
  context,
  platform,
}: {
  context: Record<string, unknown>;
  platform: 'facebook' | 'instagram' | 'linkedin';
}) {
  const bits: string[] = [];
  const pageName = context.pageName;
  const username = context.username;
  const displayName = context.displayName;
  if (typeof pageName === 'string' && pageName.trim()) {
    bits.push(`Facebook page “${pageName.trim()}”`);
  } else if (typeof username === 'string' && username.trim()) {
    bits.push(`Instagram @${username.trim()}`);
  } else if (typeof displayName === 'string' && displayName.trim()) {
    bits.push(`LinkedIn profile “${displayName.trim()}”`);
  }
  const followers = Number(context.followers);
  if (followers) bits.push(`${formatCompact(followers)} followers`);
  const reach = Number(context.reach);
  const impressions = Number(context.impressions);
  if (platform === 'linkedin' && impressions) {
    bits.push(`${formatCompact(impressions)} impressions`);
  } else if (reach) {
    bits.push(`${formatCompact(reach)} reach`);
  }
  const postsAnalyzed = Number(context.postsAnalyzed);
  const mediaCount = Number(context.mediaCount);
  if ((platform === 'facebook' || platform === 'linkedin') && postsAnalyzed) {
    bits.push(`${postsAnalyzed} posts in this analytics view`);
  } else if (mediaCount) {
    bits.push(`${formatCompact(mediaCount)} media in account snapshot`);
  }
  const eng = Number(context.engagementTotal) || Number(context.interactions);
  if (eng) bits.push(`${formatCompact(eng)} engagement-related activity in summary`);
  const views = Number(context.views);
  if (platform === 'instagram' && views) bits.push(`${formatCompact(views)} views`);

  const paragraph =
    bits.length > 0
      ? `In human-readable terms: ${bits.join('; ')}. Use the numbered sections below for interpretation—not raw dashboards alone.`
      : 'Sync analytics to populate a readable snapshot of followers, reach, and activity.';

  return <p className="text-sm leading-relaxed text-zinc-800">{paragraph}</p>;
}

export function AnalyticsStructuredInsightsPanel({
  platform,
  context,
  payload,
  loading,
  error,
}: {
  platform: 'facebook' | 'instagram' | 'linkedin';
  context: Record<string, unknown>;
  payload: AnalyticsRecommendationPayload | null;
  loading: boolean;
  error: string | null;
}) {
  if (error) {
    return <p className="py-4 text-sm text-red-600">{error}</p>;
  }

  if (loading || !payload?.structured) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-zinc-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Generating structured insights…
      </div>
    );
  }

  const s: AnalyticsStructuredSections = payload.structured;

  const { a1, p2, v5, an6, se4 } = {
    a1: s.automatedInsights,
    p2: s.predictiveAnalytics,
    v5: s.viralContent,
    an6: s.anomalyDetection,
    se4: s.sentimentComments,
  };

  const hasSentimentNumbers =
    se4.positivePercent !== null &&
    se4.neutralPercent !== null &&
    se4.negativePercent !== null;

  const accent =
    platform === 'facebook'
      ? 'text-blue-700'
      : platform === 'linkedin'
        ? 'text-[#0a66c2]'
        : 'text-pink-600';

  return (
    <div className="space-y-4 pb-2">
      {payload?.source === 'fallback' ? (
        <p className="text-[11px] text-zinc-500">
          Rule-based structured fill-in. Configure the server OpenAI key for full AI narrative in every section.
        </p>
      ) : null}

      <Section
        number={1}
        title="Automated insights"
        description="Best-performing content, optimal posting patterns, audience engagement, and image/carousel recommendations from your synced metrics."
      >
        <SubBlock label="Best-performing">{a1.bestPerforming}</SubBlock>
        <SubBlock label="Optimal posting">{a1.optimalPosting}</SubBlock>
        <SubBlock label="Audience engagement">{a1.audienceEngagement}</SubBlock>
        <SubBlock label="Content recommendations">{a1.contentRecommendations}</SubBlock>
      </Section>

      <Section
        number={2}
        title="Predictive analytics"
        description="Qualitative outlooks from historical performance—illustrative, not guarantees."
      >
        <SubBlock label="Expected reach of a new post">{p2.expectedReachNewPost}</SubBlock>
        <SubBlock label="Probability / upside (“viral”) discussion">{p2.viralProbability}</SubBlock>
        <SubBlock label="Audience behavior trends">{p2.audienceBehaviorTrends}</SubBlock>
      </Section>

      <Section
        number={3}
        title="Natural language reporting"
        description="Key numbers translated into a short readable summary—complement to charts and tables."
      >
        <NaturalLanguageSnapshot context={context} platform={platform} />
      </Section>

      <Section
        number={4}
        title="Viral content detection"
        description="Signals to watch; example phrasing is illustrative."
      >
        <SubBlock label="Rapid engagement">{v5.rapidEngagement}</SubBlock>
        <SubBlock label="High share velocity">{v5.highShareVelocity}</SubBlock>
        <SubBlock label="Increasing comment rate">{v5.increasingCommentRate}</SubBlock>
        <SubBlock label="Example alert">
          <span className={cn('font-medium', accent)}>{v5.exampleAlert}</span>
        </SubBlock>
      </Section>

      <Section
        number={5}
        title="Anomaly detection"
        description="Unusual changes worth investigating when the data supports it."
      >
        <ul className="list-disc space-y-2 pl-4 text-sm text-zinc-800">
          {an6.items.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </Section>

      <Section
        number={6}
        title="Sentiment analysis on comments"
        description="Positive, neutral, and negative mix. Percentages only when sentiment exists in your metrics payload."
      >
        <p className="text-sm text-zinc-700">{se4.narrative}</p>
        <div className="overflow-hidden rounded-md border border-zinc-200 bg-white text-sm">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium text-zinc-600">
                <th className="px-3 py-2">Sentiment</th>
                <th className="px-3 py-2">Percentage</th>
              </tr>
            </thead>
            <tbody className="text-zinc-800">
              <tr className="border-b border-zinc-100">
                <td className="px-3 py-2">Positive</td>
                <td className="px-3 py-2 tabular-nums">{formatPct(se4.positivePercent)}</td>
              </tr>
              <tr className="border-b border-zinc-100">
                <td className="px-3 py-2">Neutral</td>
                <td className="px-3 py-2 tabular-nums">{formatPct(se4.neutralPercent)}</td>
              </tr>
              <tr>
                <td className="px-3 py-2">Negative</td>
                <td className="px-3 py-2 tabular-nums">{formatPct(se4.negativePercent)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {!hasSentimentNumbers ? (
          <p className="text-xs text-zinc-500">
            Percentages stay blank until comment sentiment is supplied in analytics data.
          </p>
        ) : null}
      </Section>
    </div>
  );
}
