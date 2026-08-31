import type { Metadata } from 'next';
import { SocialPreviewPage } from '@/components/landing/social-preview/social-preview-page';

export const metadata: Metadata = {
  title: 'How It Looks — Sociogenie | Social Media Preview',
  description:
    'Preview how your brand could look on Instagram, Facebook, and LinkedIn with Sociogenie-generated content.',
  alternates: {
    canonical: 'https://www.sociogenie.ai/how-it-looks',
  },
  openGraph: {
    title: 'How It Looks — Sociogenie | Social Media Preview',
    description:
      'Preview how your brand could look on Instagram, Facebook, and LinkedIn with Sociogenie-generated content.',
    siteName: 'SocioGenie',
    url: 'https://www.sociogenie.ai/how-it-looks',
    images: ['/logo.png'],
    type: 'website',
  },
};

export default function HowItLooksPage() {
  return <SocialPreviewPage />;
}
