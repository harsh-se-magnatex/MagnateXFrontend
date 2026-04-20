import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sociogenie Pricing – 2 months of Elite, free',
  description:
    'Complimentary Elite access for two months: daily AI content, human review before publishing, and automated scheduling. Claim after sign-up.',
  alternates: {
    canonical: 'https://sociogenie.in/pricing',
  },
  openGraph: {
    title: 'Sociogenie Pricing – 2 months of Elite, free',
    description:
      'Complimentary Elite access for two months. Daily AI content, human review, automated publishing.',
    siteName: 'SocioGenie',
    url: 'https://sociogenie.in/pricing',
    type: 'website',
    images: ['/logo.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sociogenie Pricing – 2 months of Elite, free',
    description:
      'Two months of Elite on us. Daily AI content, human review, automated publishing.',
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
