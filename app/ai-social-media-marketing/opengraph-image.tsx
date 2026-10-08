import { getGuide } from '@/lib/guides';
import { guideOgImage } from '@/components/guides/guide-og';

export { contentType, size } from '@/components/guides/guide-og';
export const alt = 'SocioGenie — the complete guide';

export default function Image() {
  return guideOgImage(getGuide('ai-social-media-marketing'));
}
