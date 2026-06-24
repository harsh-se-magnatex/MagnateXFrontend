'use client';

import { useState } from 'react';
import {
  Check,
  Copy,
  Sparkles,
  Stars,
  TrendingUp,
  Users,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type {
  WhereToSpendCard,
  WhereToSpendMode,
} from '@/src/service/api/analyticService';

import {
  BoostSettingsList,
  formatBoostSettingsForClipboard,
} from './BoostSettingsList';
import { platformLabel, type GrowthStudioPlatform } from './_common';

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return String(Math.round(value));
}

function formatMoney(currency: string, amount: number): string {
  const symbol = currency === 'INR' ? '₹' : `${currency} `;
  return `${symbol}${amount.toLocaleString('en-IN')}`;
}

/**
 * The actual boost recommendation card — rendered for `stage0` and
 * `amplify` modes. Layout, top to bottom:
 *
 *   • Mode pill + headline
 *   • Post preview (amplify only)
 *   • Budget summary
 *   • Expected reach band
 *   • Copy-pasteable settings list
 *   • [Copy all settings] button
 */
export function BoostRecommendationCard({
  mode,
  card,
  platform,
}: {
  mode: Extract<WhereToSpendMode, 'stage0' | 'amplify'>;
  card: WhereToSpendCard;
  platform: GrowthStudioPlatform;
}) {
  const [copied, setCopied] = useState(false);

  const headline =
    mode === 'stage0'
      ? `Build a base on ${platformLabel(platform)}`
      : `Amplify a ${platformLabel(platform)} winner`;

  const subhead =
    mode === 'stage0'
      ? `Spend a little to prime the algorithm. Use the settings below in ${platformLabel(platform)}'s native boost dialog.`
      : `One of your recent posts is outperforming. Boost it with the settings below before momentum fades.`;

  const handleCopy = async () => {
    const text = formatBoostSettingsForClipboard(
      card.settings,
      card.budget,
      card.budget.currency
    );
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is best-effort; the user can still read the visible block.
    }
  };

  const previewCaption =
    card.postPreview?.caption?.trim().slice(0, 220) ?? '';

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] font-medium uppercase tracking-wide',
              mode === 'stage0'
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                : 'border-violet-500/30 bg-violet-500/10 text-violet-200'
            )}
          >
            {mode === 'stage0' ? 'Build your base' : 'Amplify a winner'}
          </Badge>
          <p className="text-sm font-semibold text-foreground">{headline}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">{subhead}</p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Users className="h-3.5 w-3.5" aria-hidden />
          <span>{formatNumber(card.followers)} followers</span>
        </div>
      </header>

      {card.postPreview ? (
        <div className="flex gap-3 rounded-lg border border-violet-500/25 bg-violet-500/10 p-3">
          {card.postPreview.mediaUrl ? (
            <img
              src={card.postPreview.mediaUrl}
              alt=""
              className="h-20 w-20 shrink-0 rounded-md object-cover"
              loading="lazy"
            />
          ) : (
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md bg-card text-violet-400"
              aria-hidden
            >
              <Sparkles className="h-6 w-6" />
            </div>
          )}
          <div className="min-w-0 space-y-1.5">
            <p className="text-xs text-foreground line-clamp-3">
              {previewCaption || 'Recent post'}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1 font-medium text-violet-700">
                <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                {(
                  card.postPreview.engagementRate /
                  Math.max(card.postPreview.medianEngagementRate, 0.0001)
                ).toFixed(1)}
                × your median
              </span>
              <span>
                {card.postPreview.engagementRate.toFixed(2)}% eng rate
              </span>
              <span>{card.postPreview.hoursSincePost}h old</span>
              {card.postPreview.permalinkUrl ? (
                <a
                  href={card.postPreview.permalinkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-violet-700 underline-offset-2 hover:underline"
                >
                  View post
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs sm:grid-cols-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Daily budget
          </p>
          <p className="text-sm font-semibold text-foreground">
            {formatMoney(card.budget.currency, card.budget.dailyAmount)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Total / duration
          </p>
          <p className="text-sm font-semibold text-foreground">
            {formatMoney(card.budget.currency, card.budget.totalAmount)}
            <span className="font-normal text-muted-foreground">
              {' '}
              · {card.budget.durationDays}d
            </span>
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Expected reach
          </p>
          <p className="text-sm font-semibold text-foreground">
            {formatNumber(card.expectedReach.low)}–
            {formatNumber(card.expectedReach.high)}
          </p>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Settings — paste into the boost dialog
          </p>
          {card.targetingSource === 'openai' ? (
            <Badge
              variant="outline"
              className="gap-1 border-violet-500/30 bg-violet-500/10 text-[10px] font-medium text-violet-200"
            >
              <Stars className="h-3 w-3" aria-hidden />
              AI-tailored
            </Badge>
          ) : null}
        </div>
        <BoostSettingsList settings={card.settings} />
        {card.rationale ? (
          <p className="mt-3 rounded-md border border-violet-500/25 bg-violet-500/10 px-3 py-2 text-[11px] leading-relaxed text-violet-200">
            {card.rationale}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
        <p className="text-[11px] text-muted-foreground">
          Budget is a starting point — adjust as you learn what your audience
          responds to.
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleCopy}
          className="gap-1.5"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" aria-hidden />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" aria-hidden />
              Copy all settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
