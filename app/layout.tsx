import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { AnalyticsProvider } from '@/components/AnalyticsProvider';
import { ConsentAwareAnalytics } from '@/components/ConsentAwareAnalytics';
import { CookieBanner } from '@/components/CookieBanner';
import { Toaster } from '@/components/ui/sonner';
import { MotionProvider } from '@/components/shared/MotionProvider';
import { CurrencyProvider } from '@/components/pricing/currency-provider';
import './globals.css';

// Two families, and only two. Inter carries everything UI and display;
// weight and letter-spacing do the work a second display face used to.
// `--font-sora` / `--font-dm-sans` / `--font-bricolage` / `--font-geist-*`
// / `--font-display` are all aliased to this same font in globals.css, so
// every existing className reference across the app keeps resolving without
// a mass find-replace.
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
});

/**
 * The mono face is not just for code. It is a deliberate texture: eyebrow
 * labels above section headings, big stat numbers, badges, table numerics.
 * Setting a metric in mono with negative tracking is what makes a stat band
 * read as engineered rather than decorative — and it is the detail that
 * distinguishes this system from a generic sans-only interface.
 */
const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ??
  'https://www.sociogenie.ai';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: 'SocioGenie — AI Social Media Management for Growing Businesses',
  description:
    'SocioGenie plans, writes, designs and publishes your Instagram, Facebook and LinkedIn posts. Automated from $49.99/month, or six AI tools you run yourself from $14.99.',
  authors: [{ name: 'SocioGenie' }],
  alternates: {
    canonical: 'https://www.sociogenie.ai/',
  },
  // No `images`: each route's `opengraph-image.tsx` supplies the share card,
  // and a static image here would override the generated ones.
  openGraph: {
    title: 'SocioGenie — AI Social Media Management for Growing Businesses',
    description:
      'SocioGenie plans, writes, designs and publishes your Instagram, Facebook and LinkedIn posts. From $14.99/month.',
    siteName: 'SocioGenie',
    url: 'https://www.sociogenie.ai/',
    type: 'website',
  },

  facebook: {
    appId: '949135284535930',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'SocioGenie — AI Social Media Management for Growing Businesses',
    description:
      'SocioGenie plans, writes, designs and publishes your Instagram, Facebook and LinkedIn posts. From $14.99/month.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

/**
 * Site-identity JSON-LD, rendered once so every route shares one entity
 * graph. Per-page schema (Offer, FAQPage) lives on the pages that own that
 * data instead of being duplicated here.
 */
const ORGANIZATION_JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://www.sociogenie.ai/#organization',
      name: 'SocioGenie',
      legalName: 'MAGNATEX LLP',
      url: 'https://www.sociogenie.ai/',
      logo: 'https://www.sociogenie.ai/logo.png',
      foundingDate: '2026',
      areaServed: 'Worldwide',
      description:
        'AI social media management software for growing businesses worldwide. Plans, writes, designs and publishes posts to Instagram, Facebook and LinkedIn via official platform APIs.',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Ahmedabad',
        addressRegion: 'Gujarat',
        addressCountry: 'IN',
      },
      sameAs: [
        'https://www.instagram.com/sociogenie/',
        'https://www.facebook.com/sociogenie/',
        'https://x.com/sociogenie',
      ],
    },
    {
      '@type': 'WebSite',
      '@id': 'https://www.sociogenie.ai/#website',
      url: 'https://www.sociogenie.ai/',
      name: 'SocioGenie',
      inLanguage: 'en',
      publisher: { '@id': 'https://www.sociogenie.ai/#organization' },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#4A8FF6" />
        <meta property="fb:app_id" content="949135284535930" />
        {/* og:url is set per-page via each route's `openGraph.url` metadata
            instead of hardcoded here, so it varies correctly by route. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSON_LD) }}
        />
      </head>
      <body className="antialiased text-default min-h-screen relative">
        <CurrencyProvider>
          <MotionProvider>{children}</MotionProvider>
        </CurrencyProvider>
        <Toaster />
        <AnalyticsProvider />
        <ConsentAwareAnalytics />
        <CookieBanner />
      </body>
    </html>
  );
}
