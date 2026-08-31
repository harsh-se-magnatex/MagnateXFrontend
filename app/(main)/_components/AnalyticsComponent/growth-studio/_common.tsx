'use client';

import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Placeholder primitives used by the four Growth Studio cards (A1, A2, B1, B2)
 * before their real implementations land. When a section is replaced by the
 * live version, its file is rewritten; these primitives can be deleted once
 * none of the four reference them.
 */

export type Accent = 'amber' | 'sky' | 'emerald' | 'violet';

const ACCENT_BORDER: Record<Accent, string> = {
  amber: 'border-warning',
  sky: 'border-info',
  emerald: 'border-success',
  violet: 'border-preview',
};

const ACCENT_BG: Record<Accent, string> = {
  amber: 'bg-warning',
  sky: 'bg-info',
  emerald: 'bg-success',
  violet: 'bg-preview',
};

const ACCENT_ICON_BG: Record<Accent, string> = {
  amber: 'bg-warning',
  sky: 'bg-info',
  emerald: 'bg-success',
  violet: 'bg-preview',
};

const ACCENT_ICON: Record<Accent, string> = {
  amber: 'text-warning',
  sky: 'text-info',
  emerald: 'text-success',
  violet: 'text-preview',
};

export function PlaceholderShell({
  icon: Icon,
  title,
  description,
  accent = 'sky',
  className,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  accent?: Accent;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        ACCENT_BORDER[accent],
        ACCENT_BG[accent],
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={cn('mt-0.5 rounded-lg p-2', ACCENT_ICON_BG[accent])}
            aria-hidden
          >
            <Icon className={cn('h-4 w-4', ACCENT_ICON[accent])} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-default">{title}</p>
            <p className="text-xs leading-relaxed text-secondary">
              {description}
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="shrink-0 bg-default text-[10px] font-medium uppercase tracking-wide text-secondary"
        >
          Coming soon
        </Badge>
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

/** Generic platform identifier shared by the four growth-studio sections. */
export type GrowthStudioPlatform = 'facebook' | 'instagram' | 'linkedin';

export type PreloadedEngagementSuggestion = {
  suggestion: string;
  source: 'openai' | 'fallback';
};

export type PreloadedReplySuggestions = Record<
  string,
  PreloadedEngagementSuggestion
>;

const PLATFORM_LABELS: Record<GrowthStudioPlatform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
};

export function platformLabel(platform: GrowthStudioPlatform): string {
  return PLATFORM_LABELS[platform];
}
