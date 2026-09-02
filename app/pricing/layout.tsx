import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SocioGenie Pricing — Plans from $14.99/month',
  description:
    'Studio is $14.99/month with 100 credits. AI Manager tiers run $49.99 for one platform to $84.99 for three. Credit packs from $6.99. No contracts, cancel anytime.',
  alternates: {
    canonical: 'https://www.sociogenie.ai/pricing',
  },
  openGraph: {
  title: 'SocioGenie Pricing — Plans from $14.99/month',
    description: 'Pricing for our plans and credit packs.',
    siteName: 'SocioGenie',
    url: 'https://www.sociogenie.ai/pricing',
    type: 'website',
    images: ['/logo.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SocioGenie Pricing — Plans from $14.99/month',
    description:
      'Studio is $14.99/month with 100 credits. AI Manager tiers run $49.99 for one platform to $84.99 for three. Credit packs from $6.99. No contracts, cancel anytime.',
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
