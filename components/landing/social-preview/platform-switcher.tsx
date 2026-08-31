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
            aria-pressed={isActive}
            className={cn(
              'flex min-w-[200px] flex-1 items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-expo sm:max-w-[240px]',
              isActive
                ? 'nav-active border-[color-mix(in_srgb,var(--brand-violet)_45%,var(--border-default))]'
                : 'border-default bg-element hover:border-strong hover:bg-subtle'
            )}
          >
            <PlatformIcon platform={platform.id} className="h-10 w-10" />
            <div className="min-w-0">
              <p
                className={cn(
                  'text-sm font-semibold',
                  isActive ? 'text-default' : 'text-secondary'
                )}
              >
                {platform.label}
              </p>
              <p className="truncate text-xs text-tertiary">
                {platform.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
