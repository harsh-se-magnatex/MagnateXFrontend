import type { Metadata } from 'next';
import { GuideArticle } from '@/components/guides/GuideArticle';
import { guideMetadata } from '@/components/guides/guide-metadata';
import { getGuide } from '@/lib/guides';

const SLUG = 'social-media-marketing';

export function generateMetadata(): Metadata {
  return guideMetadata(getGuide(SLUG)!);
}

/** Pillar page: the head-term guide, served at the top level. */
export default function PillarPage() {
  return <GuideArticle guide={getGuide(SLUG)!} />;
}
