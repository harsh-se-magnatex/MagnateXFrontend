import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sociogenie Pricing',
  description:
    'Plans for AI and Studio modes: daily content, human review before publishing, and automated scheduling.',
  alternates: {
    canonical: 'https://sociogenie.in/pricing',
  },
  openGraph: {
    title: 'Sociogenie Pricing',
    description:
      'Pricing for our plans and credit packs.',
    siteName: 'SocioGenie',
    url: 'https://sociogenie.in/pricing',
    type: 'website',
    images: ['/logo.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sociogenie Pricing',
    description:
      'Plans with daily AI content, human review, and automated publishing.',
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
