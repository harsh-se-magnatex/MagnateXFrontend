import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from '@/lib/og-card';

export const alt =
  'SocioGenie — AI social media manager for growing businesses. Your social media, handled without an agency.';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OpengraphImage() {
  return ogCard({
    eyebrow: 'AI social media manager',
    headline: 'Your social media,',
    accent: 'handled without an agency.',
  });
}
