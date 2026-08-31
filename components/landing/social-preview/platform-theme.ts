import type { CSSProperties } from 'react';
import type { PreviewPlatform } from '@/components/landing/social-preview/constants';

/**
 * Dark-mode palettes for the three platform replicas.
 *
 * These are the platforms' own published dark values, not our brand tokens —
 * the mockups are a faithful copy of a foreign UI, so they deliberately sit
 * outside the Expo design system (see "Deliberate exceptions" in
 * docs/design-system.md). What they must NOT be is light: a white slab inside
 * a dark marketing page reads as an unstyled section rather than a screenshot.
 *
 * Applied once as CSS custom properties on the frame wrapper in
 * `preview-device-frame.tsx`; every descendant — including the three shared
 * components (`showcase-grid`, `showcase-media`, `showcase-post-detail`) —
 * then inherits the right palette with no prop threading and no per-platform
 * branching.
 */
export type PlatformTheme = {
  /** Page ground behind the whole mockup. */
  bg: string;
  /** Card / post surface. */
  surface: string;
  /** Secondary surface — media letterbox, hover, inset rows. */
  surface2: string;
  /** Hairline separators. */
  border: string;
  /** Primary copy. */
  text: string;
  /** Secondary copy — timestamps, handles, meta. */
  textMuted: string;
  /** The platform's own accent, used sparingly for native affordances. */
  accent: string;
};

export const PLATFORM_THEMES: Record<PreviewPlatform, PlatformTheme> = {
  instagram: {
    bg: '#000000',
    surface: '#000000',
    surface2: '#121212',
    border: '#262626',
    text: '#f5f5f5',
    textMuted: '#a8a8a8',
    accent: '#e1306c',
  },
  facebook: {
    bg: '#18191a',
    surface: '#242526',
    surface2: '#3a3b3c',
    border: '#3e4042',
    text: '#e4e6eb',
    textMuted: '#b0b3b8',
    accent: '#2d88ff',
  },
  linkedin: {
    bg: '#1b1f23',
    surface: '#1d2226',
    surface2: '#293138',
    border: '#38434f',
    text: '#e8e8e8',
    textMuted: '#a3a3a3',
    accent: '#70b5f9',
  },
};

/** Spread onto a wrapper's `style` so descendants can read `var(--pf-*)`. */
export function platformThemeVars(platform: PreviewPlatform): CSSProperties {
  const theme = PLATFORM_THEMES[platform];
  return {
    '--pf-bg': theme.bg,
    '--pf-surface': theme.surface,
    '--pf-surface-2': theme.surface2,
    '--pf-border': theme.border,
    '--pf-text': theme.text,
    '--pf-text-muted': theme.textMuted,
    '--pf-accent': theme.accent,
  } as CSSProperties;
}
