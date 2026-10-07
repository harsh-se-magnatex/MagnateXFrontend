import type { MetadataRoute } from 'next';

const BASE_URL = 'https://www.sociogenie.ai';

/**
 * When each page's content last actually changed. Fixed dates rather than
 * `new Date()`: a lastmod that moves on every build tells crawlers nothing,
 * and Google stops trusting it. Bump the entry when you edit that page.
 */
const LAST_UPDATED = {
  home: '2026-10-06',
  product: '2026-10-06',
  pricing: '2026-10-06',
  tryIt: '2026-09-03',
  howItLooks: '2026-09-02',
  legal: '2026-09-15',
} as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const marketingPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: LAST_UPDATED.home, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE_URL}/product`, lastModified: LAST_UPDATED.product, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/pricing`, lastModified: LAST_UPDATED.pricing, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/try-it`, lastModified: LAST_UPDATED.tryIt, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/how-it-looks`, lastModified: LAST_UPDATED.howItLooks, changeFrequency: 'monthly', priority: 0.7 },
  ];

  const legalPages: MetadataRoute.Sitemap = [
    'privacy',
    'terms',
    'refund',
    'cookie',
    'acceptable-use',
    'ai-disclosure',
    'sub-processors',
    'licenses',
    'facebook-data-deletion-instruction',
    'instagram-data-deletion-instruction',
  ].map((slug) => ({
    url: `${BASE_URL}/legal/${slug}`,
    lastModified: LAST_UPDATED.legal,
    changeFrequency: 'yearly',
    priority: 0.3,
  }));

  return [...marketingPages, ...legalPages];
}
