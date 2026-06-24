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
  amber: 'border-amber-500/30',
  sky: 'border-sky-500/30',
  emerald: 'border-emerald-500/30',
  violet: 'border-violet-500/30',
};

const ACCENT_BG: Record<Accent, string> = {
  amber: 'bg-amber-500/10',
  sky: 'bg-sky-500/10',
  emerald: 'bg-emerald-500/10',
  violet: 'bg-violet-500/10',
};

const ACCENT_ICON_BG: Record<Accent, string> = {
  amber: 'bg-amber-500/20',
  sky: 'bg-sky-500/20',
  emerald: 'bg-emerald-500/20',
  violet: 'bg-violet-500/20',
};

const ACCENT_ICON: Record<Accent, string> = {
  amber: 'text-amber-300',
  sky: 'text-sky-300',
  emerald: 'text-emerald-300',
  violet: 'text-violet-300',
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
        'rounded-xl border p-4 shadow-sm',
        ACCENT_BORDER[accent],
        ACCENT_BG[accent],
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'mt-0.5 rounded-lg p-2',
              ACCENT_ICON_BG[accent]
            )}
            aria-hidden
          >
            <Icon className={cn('h-4 w-4', ACCENT_ICON[accent])} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="shrink-0 bg-card/70 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
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

const PLATFORM_LABELS: Record<GrowthStudioPlatform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
};

export function platformLabel(platform: GrowthStudioPlatform): string {
  return PLATFORM_LABELS[platform];
}
