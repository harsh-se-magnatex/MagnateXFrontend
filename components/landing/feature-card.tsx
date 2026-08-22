'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Card whose interaction reads the same on a phone as on a desktop.
 *
 * The previous version tracked the cursor with a mousemove handler, which
 * meant touch devices — where there is no cursor — got nothing at all.
 * This is pure CSS: a gradient edge, an interior wash and a one-shot
 * sheen, driven by `:hover` on pointer devices and `:active` everywhere,
 * so a tap produces the same result as a hover.
 *
 * No JS, no state, no listeners — it also costs nothing on scroll.
 */
export function FeatureCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('feature-card group/card', className)}>
      <span className="feature-card__wash" aria-hidden />
      <span className="feature-card__edge" aria-hidden />
      <span className="feature-card__sheen" aria-hidden />
      <div className="relative z-10 flex h-full flex-col">{children}</div>
    </div>
  );
}
