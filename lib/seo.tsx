export const HOMEPAGE_ANSWER =
  'SocioGenie is AI social media management software for small businesses. It plans your month, writes and designs each post, and publishes to Instagram, Facebook and LinkedIn through the official platform APIs. Studio starts at $14.99 a month; AI Manager, which runs the calendar for you, starts at $49.99.';

export const SOFTWARE_APPLICATION_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  '@id': 'https://www.sociogenie.ai/#software',
  name: 'SocioGenie',
  applicationCategory: 'BusinessApplication',
  applicationSubCategory: 'Social Media Management',
  operatingSystem: 'Web',
  url: 'https://www.sociogenie.ai/',
  description: HOMEPAGE_ANSWER,
  featureList: [
    'AI Manager — automated monthly content calendar on Prime, Elite and Legacy',
    'Human review before publishing on Prime, Elite and Legacy',
    'Publishing via official Instagram, Facebook and LinkedIn APIs',
    'Six AI creation tools on every plan, including Studio',
    'Campaigns, carousels, product posts, occasion posts and generated video',
    'Analytics graded across seven areas with recommended next posts',
  ],
  publisher: { '@id': 'https://www.sociogenie.ai/#organization' },
  offers: {
    '@type': 'AggregateOffer',
    priceCurrency: 'USD',
    lowPrice: '14.99',
    highPrice: '84.99',
    offerCount: '4',
    url: 'https://www.sociogenie.ai/pricing',
  },
} as const;

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
