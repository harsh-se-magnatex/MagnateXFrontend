'use client';

import { useCallback, useState } from 'react';
import { Check, Loader2, Sparkles, WandSparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { generateAiLogoPicks } from '@/src/service/api/userService';
import { showErrorToast } from '@/lib/show-error-toast';
import { toast } from 'sonner';

export const MAX_ONBOARDING_AI_LOGOS = 2;

export type OnboardingLogoPick = {
  preview: string;
  url: string;
};

type OnboardingAiLogoSectionProps = {
  businessName: string;
  industry: string;
  /** Called when user picks a generated logo (storage URL for submit, preview for UI). */
  onSelect: (args: { url: string; preview: string }) => void;
  selectedUrl?: string | null;
  /** True when upload / suggestion / prior pick already set a logo. */
  hasExistingLogo?: boolean;
  /** Lifted state so generation count survives step navigation. */
  picks: OnboardingLogoPick[];
  onPicksChange: (picks: OnboardingLogoPick[]) => void;
  generationUsed: number;
  onGenerationUsedChange: (count: number) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function OnboardingAiLogoSection({
  businessName,
  industry,
  onSelect,
  selectedUrl,
  hasExistingLogo = false,
  picks,
  onPicksChange,
  generationUsed,
  onGenerationUsedChange,
  open,
  onOpenChange,
}: OnboardingAiLogoSectionProps) {
  const [requirements, setRequirements] = useState('');
  const [generating, setGenerating] = useState(false);

  const limitReached = generationUsed >= MAX_ONBOARDING_AI_LOGOS;
  const canGenerate =
    Boolean(businessName.trim() && industry.trim()) && !limitReached && !generating;

  const runGeneration = useCallback(async () => {
    if (!businessName.trim() || !industry.trim()) {
      showErrorToast('Add your business name and industry first.');
      return;
    }
    if (limitReached) {
      showErrorToast(
        `You can generate up to ${MAX_ONBOARDING_AI_LOGOS} logos during onboarding.`
      );
      return;
    }

    try {
      setGenerating(true);
      const response = await generateAiLogoPicks(requirements, 1, {
        context: 'onboarding',
        businessName: businessName.trim(),
        industry: industry.trim(),
      });
      const nextPreview = response?.data?.picks?.[0];
      const nextUrl = response?.data?.urls?.[0] || nextPreview;
      if (!nextPreview || !nextUrl) {
        throw new Error('No logo was generated.');
      }
      onPicksChange(
        [{ preview: nextPreview, url: nextUrl }, ...picks].slice(
          0,
          MAX_ONBOARDING_AI_LOGOS
        )
      );
      const remaining = response?.data?.remaining;
      if (typeof remaining === 'number') {
        onGenerationUsedChange(
          Math.max(0, MAX_ONBOARDING_AI_LOGOS - remaining)
        );
      } else {
        onGenerationUsedChange(generationUsed + 1);
      }
      toast.success('Logo ready — pick one to use.');
    } catch (error: unknown) {
      showErrorToast(
        error instanceof Error ? error.message : 'Failed to generate AI logo. Please Try Again Later.'
      );
    } finally {
      setGenerating(false);
    }
  }, [
    businessName,
    industry,
    generationUsed,
    limitReached,
    onGenerationUsedChange,
    onPicksChange,
    picks,
    requirements,
  ]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary-purple/35 bg-primary-purple/5 px-4 py-3.5 text-sm font-semibold text-foreground transition-colors',
          'hover:border-primary-purple/55 hover:bg-primary-purple/10'
        )}
      >
        <WandSparkles className="size-4 text-primary-purple" />
        {hasExistingLogo
          ? 'Generate another logo with AI'
          : 'No logo? Generate one with AI'}
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <WandSparkles className="size-4 text-primary-purple" />
            AI logo
          </p>
          <p className="text-xs text-muted-foreground">
            Up to {MAX_ONBOARDING_AI_LOGOS} free generations for{' '}
            <span className="font-medium text-foreground">
              {businessName.trim() || 'your brand'}
            </span>
            .
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
          {generationUsed}/{MAX_ONBOARDING_AI_LOGOS}
        </span>
      </div>

      <Textarea
        value={requirements}
        onChange={(e) => setRequirements(e.target.value)}
        rows={2}
        maxLength={400}
        placeholder="Optional style notes — e.g. minimal icon, deep blue, geometric"
        className="resize-none rounded-xl text-sm"
      />

      <Button
        type="button"
        onClick={() => void runGeneration()}
        disabled={!canGenerate}
        className="h-10 w-full rounded-xl bg-gradient-primary font-semibold text-white hover:opacity-95"
      >
        {generating ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Generating…
          </>
        ) : (
          <>
            <Sparkles className="size-4" />
            {limitReached
              ? 'Generation limit reached'
              : picks.length > 0
                ? 'Generate another'
                : 'Generate logo'}
          </>
        )}
      </Button>

      {(picks.length > 0 || generating) && (
        <div className="grid grid-cols-2 gap-2.5">
          {generating && (
            <div className="aspect-square animate-pulse rounded-xl border border-border bg-muted/60" />
          )}
          {picks.map((pick, idx) => {
            const active = selectedUrl === pick.url;
            return (
              <button
                key={`${pick.url}-${idx}`}
                type="button"
                onClick={() =>
                  onSelect({ url: pick.url, preview: pick.preview })
                }
                style={{ backgroundColor: '#ffffff' }}
                className={cn(
                  'group relative aspect-square overflow-hidden rounded-xl border p-2 transition',
                  active
                    ? 'border-primary-purple ring-2 ring-primary-purple/25'
                    : 'border-border hover:border-primary-purple/40'
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pick.preview}
                  alt={`AI logo option ${idx + 1}`}
                  className="h-full w-full object-contain"
                />
                {active && (
                  <span className="absolute right-1.5 top-1.5 inline-flex size-6 items-center justify-center rounded-full bg-gradient-primary text-white shadow">
                    <Check className="size-3.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {picks.length > 0 && (
        <p className="text-center text-[11px] text-muted-foreground">
          Tap a logo to use it — you can still upload a file instead.
        </p>
      )}
    </div>
  );
}
