'use client';

import type { ReactNode } from 'react';
import { PlatformIcon, PLATFORM_META } from '@/components/home/dashboard-ui';
import type { PreviewPlatform } from '@/components/landing/social-preview/constants';

type PreviewDeviceFrameProps = {
  platform: PreviewPlatform;
  children: ReactNode;
  /** When true, inner mockup handles its own column scrolling instead of the frame. */
  nestedScroll?: boolean;
};

export function PreviewDeviceFrame({
  platform,
  children,
  nestedScroll = false,
}: PreviewDeviceFrameProps) {
  const meta = PLATFORM_META[platform];

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-2xl shadow-primary-purple/10 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <PlatformIcon platform={platform} className="h-10 w-10 sm:h-11 sm:w-11" />
          <div>
            <p className="text-sm font-bold text-foreground sm:text-base">{meta.label}</p>
            <p className="text-xs text-muted-foreground">Live platform preview</p>
          </div>
        </div>
        <span className="rounded-full border border-primary-purple/30 bg-primary-purple/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-purple">
          SocioGenie
        </span>
      </div>
      <div
        className={
          nestedScroll
            ? 'h-[min(92vh,1100px)] overflow-hidden bg-neutral-50'
            : 'max-h-[min(92vh,1100px)] overflow-y-auto bg-neutral-50'
        }
      >
        {children}
      </div>
    </div>
  );
}
