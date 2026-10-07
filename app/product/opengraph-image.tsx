import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from '@/lib/og-card';

export const alt =
  'SocioGenie features — seven AI creation tools and an AI Manager that runs your social calendar.';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function ProductOpengraphImage() {
  return ogCard({
    eyebrow: 'Features',
    headline: 'Seven AI creation tools.',
    accent: 'One AI Manager.',
  });
}
