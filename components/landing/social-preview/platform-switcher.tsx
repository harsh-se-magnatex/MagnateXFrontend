'use client';

import { cn } from '@/lib/utils';
import { PlatformIcon } from '@/components/home/dashboard-ui';
import {
  PLATFORM_OPTIONS,
  type PreviewPlatform,
} from '@/components/landing/social-preview/constants';

type PlatformSwitcherProps = {
  active: PreviewPlatform;
  onChange: (platform: PreviewPlatform) => void;
};

export function PlatformSwitcher({ active, onChange }: PlatformSwitcherProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
      {PLATFORM_OPTIONS.map((platform) => {
        const isActive = active === platform.id;
        return (
          <button
            key={platform.id}
            type="button"
            onClick={() => onChange(platform.id)}
            className={cn(
              'group flex min-w-[220px] flex-1 items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-200 sm:max-w-[240px]',
              isActive
                ? 'border-primary-purple/50 bg-card/90 shadow-lg shadow-primary-purple/15 ring-1 ring-primary-purple/25'
                : 'border-border/50 bg-card/40 hover:border-border hover:bg-card/70'
            )}
          >
            <PlatformIcon
              platform={platform.id}
              className={cn(
                'h-10 w-10 transition-transform duration-200',
                isActive ? 'scale-105' : 'group-hover:scale-105'
              )}
            />
            <div className="min-w-0">
              <p
                className={cn(
                  'text-sm font-bold',
                  isActive ? 'text-foreground' : 'text-foreground/80'
                )}
              >
                {platform.label}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {platform.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
