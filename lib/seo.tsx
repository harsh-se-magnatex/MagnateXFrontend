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

const SITE = 'https://www.sociogenie.ai';

/** Article schema for a guide. The publisher is the site Organization. */
export function articleJsonLd(article: {
  title: string;
  description: string;
  path: string;
  updated: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    mainEntityOfPage: `${SITE}${article.path}`,
    url: `${SITE}${article.path}`,
    image: `${SITE}${article.path}/opengraph-image`,
    datePublished: article.updated,
    dateModified: article.updated,
    inLanguage: 'en',
    author: {
      '@type': 'Organization',
      name: 'SocioGenie',
      url: `${SITE}/about`,
    },
    publisher: { '@id': `${SITE}/#organization` },
  };
}

export function faqJsonLd(items: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        // Answers are written in light markdown; schema wants plain text.
        text: item.answer
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
          .replace(/[*`]/g, ''),
      },
    })),
  };
}

/** `trail` is ordered from the home page down: [{ name, path }, …]. */
export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: `${SITE}${crumb.path}`,
    })),
  };
}
