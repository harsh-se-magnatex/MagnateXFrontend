'use client';

import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * A marketing card that carries an accent hue.
 *
 * Two earlier lives worth knowing about. First it tracked the cursor with a
 * mousemove handler, so touch devices — which have no cursor — got nothing.
 * Then it became a flat neutral rectangle, which was legible but made a grid
 * of them read as a spec sheet rather than as a product that makes colourful
 * things.
 *
 * This is the third: a low accent wash, an accent-tinted border, and a 150ms
 * colour change on hover. Still no JS, no state, no listeners, nothing that
 * moves — the energy is in the palette, so it costs nothing on scroll and
 * behaves identically under a finger and a mouse.
 *
 * `accent` accepts any of the `--brand-*` tokens. Left unset it falls back to
 * violet, so existing call sites keep working.
 */
export function FeatureCard({
  children,
  className,
  accent,
}: {
  children: ReactNode;
  className?: string;
  accent?: string;
}) {
  return (
    <div
      className={cn('brand-card group/card', className)}
      style={
        accent ? ({ '--card-accent': accent } as CSSProperties) : undefined
      }
    >
      <div className="relative z-10 flex h-full flex-col">{children}</div>
    </div>
  );
}
