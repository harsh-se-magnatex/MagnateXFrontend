import { OG_SIZE, ogCard } from '@/lib/og-card';
import type { Guide } from '@/lib/guides';

export { OG_CONTENT_TYPE as contentType } from '@/lib/og-card';
export const size = OG_SIZE;

/** Share card for a guide: its title, with the cluster as the eyebrow. */
export function guideOgImage(guide: Guide | undefined) {
  return ogCard({
    eyebrow:
      guide?.kind === 'pillar' ? 'The complete guide' : 'SocioGenie guide',
    headline: guide?.title ?? 'SocioGenie guides',
    accent:
      guide?.pillar === 'smm'
        ? 'Social media marketing'
        : 'AI social media marketing',
    footer: `${guide?.readingMinutes ?? 5} min read`,
    compact: true,
  });
}
