import type { Metadata } from 'next';
import { SocialPreviewPage } from '@/components/landing/social-preview/social-preview-page';

export const metadata: Metadata = {
  title: 'AI-Generated Jewelry Posts & Page Styles | SocioGenie',
  description:
    'Marketing visuals, carousels, posts and UGC videos made by SocioGenie for a jewelry brand — plus seven page styles. No person designed any of it.',
  alternates: {
    canonical: 'https://www.sociogenie.ai/how-it-looks',
  },
  openGraph: {
  title: 'AI-Generated Jewelry Posts & Page Styles | SocioGenie',
    description:
    'Marketing visuals, carousels, posts and UGC videos made by SocioGenie for a jewelry brand — plus seven page styles. No person designed any of it.',
    siteName: 'SocioGenie',
    url: 'https://www.sociogenie.ai/how-it-looks',
    type: 'website',
  },
};

export default function HowItLooksPage() {
  return <SocialPreviewPage />;
}
