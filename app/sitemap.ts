import type { MetadataRoute } from 'next';

const BASE_URL = 'https://www.sociogenie.ai';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const marketingPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE_URL}/product`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/pricing`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/try-it`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/how-it-looks`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
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
    lastModified: now,
    changeFrequency: 'yearly',
    priority: 0.3,
  }));

  return [...marketingPages, ...legalPages];
}
