export const HOMEPAGE_ANSWER =
  'SocioGenie is AI social media software for growing businesses worldwide. It plans, designs and publishes your Instagram, Facebook and LinkedIn posts through the official APIs. Studio from $14.99 a month; AI Manager, which runs your calendar, from $49.99.';

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
  areaServed: 'Worldwide',
  featureList: [
    'AI Manager — automated monthly content calendar on Prime, Elite and Legacy',
    'Human review before publishing on Prime, Elite and Legacy',
    'Publishing via official Instagram, Facebook and LinkedIn APIs',
    'Seven AI creation tools on every plan, including Studio',
    'Marketing visuals that place your product on billboards, transit lightboxes, magazine spreads and storefront windows',
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
