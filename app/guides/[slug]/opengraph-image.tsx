import { clusterGuides, getGuide } from '@/lib/guides';
import { guideOgImage } from '@/components/guides/guide-og';

export { contentType, size } from '@/components/guides/guide-og';
export const alt = 'SocioGenie guide';

export function generateStaticParams() {
  return clusterGuides().map((g) => ({ slug: g.slug }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return guideOgImage(getGuide((await params).slug));
}
