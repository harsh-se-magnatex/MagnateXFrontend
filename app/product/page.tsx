import type { Metadata } from 'next';
import { ProductPageContent } from '@/components/landing/product-page-content';
import { JsonLd, SOFTWARE_APPLICATION_JSON_LD } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'AI Social Media Management Software: All Features | SocioGenie',
  description:
    'See how SocioGenie researches, writes, designs and publishes to Instagram, Facebook and LinkedIn — 14 tools, an automated monthly calendar, and human review on every AI Manager plan.',
  alternates: {
    canonical: 'https://www.sociogenie.ai/product',
  },
  openGraph: {
  title: 'AI Social Media Management Software: All Features | SocioGenie',
    description:
    'See how SocioGenie researches, writes, designs and publishes to Instagram, Facebook and LinkedIn — 14 tools, an automated monthly calendar, and human review on every AI Manager plan.',
    siteName: 'SocioGenie',
    url: 'https://www.sociogenie.ai/product',
    images: ['/logo.png'],
    type: 'website',
  },
};

export default function ProductPage() {
  return <><JsonLd data={SOFTWARE_APPLICATION_JSON_LD} /><ProductPageContent /></>;
}
