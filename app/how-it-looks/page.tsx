import type { Metadata } from 'next';
import { SocialPreviewPage } from '@/components/landing/social-preview/social-preview-page';

export const metadata: Metadata = {
  title: 'See AI-Generated Social Posts for 5 Real Brands | SocioGenie',
  description:
    'Every post here was generated, scheduled and published automatically — five brands, three platforms, seven visual styles. No person wrote or designed any of it.',
  alternates: {
    canonical: 'https://www.sociogenie.ai/how-it-looks',
  },
  openGraph: {
  title: 'See AI-Generated Social Posts for 5 Real Brands | SocioGenie',
    description:
    'Every post here was generated, scheduled and published automatically — five brands, three platforms, seven visual styles. No person wrote or designed any of it.',
    siteName: 'SocioGenie',
    url: 'https://www.sociogenie.ai/how-it-looks',
    images: ['/logo.png'],
    type: 'website',
  },
};

export default function HowItLooksPage() {
  return <SocialPreviewPage />;
}
