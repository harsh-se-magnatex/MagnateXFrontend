import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from '@/lib/og-card';

export const alt =
  'SocioGenie pricing — Studio from $14.99 a month, AI Manager from $49.99.';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function PricingOpengraphImage() {
  return ogCard({
    eyebrow: 'Pricing',
    headline: 'Plans from $14.99 a month.',
    accent: 'AI Manager from $49.99.',
    footer: 'No contracts · Cancel anytime',
  });
}
