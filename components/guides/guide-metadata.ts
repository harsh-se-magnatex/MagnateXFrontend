import type { Metadata } from 'next';
import { SITE_URL, type Guide } from '@/lib/guides';

/** Self-referencing metadata for a guide. The share image comes from the
 *  route's `opengraph-image.tsx`, so none is set here. */
export function guideMetadata(guide: Guide): Metadata {
  const url = `${SITE_URL}${guide.path}`;
  // Brand the title only when it still fits Google's ~60-character display.
  const branded = `${guide.seoTitle} | SocioGenie`;
  const title = branded.length <= 60 ? branded : guide.seoTitle;
  return {
    title,
    description: guide.description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: guide.description,
      url,
      siteName: 'SocioGenie',
      type: 'article',
      modifiedTime: guide.updated,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: guide.description,
    },
  };
}
