'use client';

import { MotionConfig } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Makes every Framer Motion animation in the app honour the OS
 * "reduce motion" setting.
 *
 * The `prefers-reduced-motion` blocks in `globals.css` / `landing-3d.css`
 * only reach CSS-driven animation (aurora, shimmer, the conic border).
 * Framer Motion animates through inline styles, so a media query can't
 * switch it off — without this, a user who has asked their OS to reduce
 * motion still gets every hero stagger, scroll reveal and page transition.
 *
 * `reducedMotion="user"` keeps opacity fades (which don't trigger
 * vestibular symptoms) while dropping transform/layout movement.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
